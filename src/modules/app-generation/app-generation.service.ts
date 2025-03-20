import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as QRCode from 'qrcode';
import { Client, Query, Storage } from 'node-appwrite';
import * as AdmZip from 'adm-zip';
import * as crypto from 'crypto';

@Injectable()
export class AppGenerationService {
  private readonly logger = new Logger(AppGenerationService.name);
  private otaPackHashCache = new Map<string, string>(); // Cache for OTA pack content hashes

  /**
   * Generates or updates the Flutter app.
   * @param fullAppData The full configuration data for the app.
   * @param updateOnlyOta If true, only update OTA packs without triggering a full rebuild.
   * @param forceRebuild If true, force a rebuild even when an APK already exists.
   */
  async generateOrUpdateFlutterApp(
    fullAppData: any, 
    updateOnlyOta: boolean = false,
    forceRebuild: boolean = false
  ): Promise<any> {
    try {
      // Step 1: Determine appId and setup working directories.
      const appId = fullAppData.mobileApp?._id ? String(fullAppData.mobileApp._id) : 'no_id';
      const workingDir = path.join('C:\\Users\\WT\\Desktop\\PFE PROJECT\\flutter_builds', appId);
      const globalTemplateDir = path.join('C:\\Users\\WT\\Desktop\\PFE PROJECT\\flutter_template');

      // Get repository information - fix property access
      const repositoryInfo = fullAppData.repository || {};
      const appName = repositoryInfo.repositoryName || repositoryInfo.name || fullAppData.mobileApp?.name || 'My Generated App';
      const appLogo = repositoryInfo.image || null;

      this.logger.log(`Starting app generation for appId: ${appId}, name: ${appName}`);
      this.logger.log(`Update only OTA: ${updateOnlyOta}, Force rebuild: ${forceRebuild}`);

      // Step 2: Ensure Flutter template exists.
      if (!fs.existsSync(globalTemplateDir)) {
        this.logger.error(`Template folder does not exist: ${globalTemplateDir}`);
        throw new Error(`Source template folder does not exist: ${globalTemplateDir}`);
      }

      // Step 3: Create working directory and copy template if needed.
      let isNewApp = false;
      if (!fs.existsSync(workingDir)) {
        isNewApp = true;
        fs.mkdirSync(workingDir, { recursive: true });
        this.logger.log(`Created new working directory: ${workingDir}`);
        this.copyFolder(globalTemplateDir, workingDir);
      } else {
        this.logger.log(`Working directory already exists: ${workingDir}`);
      }

      // Step 4: Generate OTA packs from fullAppData.
      const otaPacks = this.splitIntoOTAPacks(fullAppData);
      if (!otaPacks || Object.keys(otaPacks).length === 0) {
        this.logger.error("OTA Pack generation failed!");
        throw new Error('OTA Pack generation failed!');
      }

      // Step 5: Write OTA packs as JSON files.
      const packsDir = path.join(workingDir, 'assets', 'ota_packs');
      fs.mkdirSync(packsDir, { recursive: true });
      await Promise.all(
        Object.entries(otaPacks).map(async ([packName, packData]) => {
          const filePath = path.join(packsDir, `${packName}_pack.json`);
          await fs.promises.writeFile(filePath, JSON.stringify(packData, null, 2), 'utf8');
          this.logger.log(`Wrote OTA pack for ${packName} at ${filePath}`);
        })
      );

      // Check if APK already exists in Appwrite before deciding on the update approach
      const existingApkFileId = await this.checkExistingApk(appId);
      
      // If forceRebuild is true, delete the existing APK
      if (forceRebuild && existingApkFileId) {
        await this.deleteExistingApk(existingApkFileId);
        this.logger.log(`Force rebuild requested. Deleted existing APK with ID: ${existingApkFileId}`);
      }
      
      // Determine if we should update OTA only, based on:
      // 1. The updateOnlyOta flag
      // 2. The existence of an APK
      // 3. The forceRebuild flag (which overrides both)
      const shouldUpdateOtaOnly = (updateOnlyOta || existingApkFileId !== null) && !forceRebuild;

      // Step 5.1: Upload OTA packs to Appwrite with content-based optimization
      // Pass true to force update and bypass cache when force rebuild is requested
      const otaUploads = await this.uploadOtaPacksToCloud(workingDir, appId, forceRebuild);
      this.logger.log(`OTA packs uploaded to cloud: ${JSON.stringify(otaUploads)}`);

      // Step 5.2: Generate OTA endpoints in the required format.
      const otaEndpoints = this.generateOtaEndpoints(otaUploads);
      const endpointsFilePath = path.join(workingDir, 'assets', 'ota_packs', 'endpoints.json');
      await fs.promises.writeFile(endpointsFilePath, JSON.stringify(otaEndpoints, null, 2), 'utf8');
      this.logger.log(`OTA endpoints written to ${endpointsFilePath}`);

      // ───────────────────────────────────────────────
      // NEW: Upload updated endpoints.json to Appwrite OTA bucket using a stable file ID.
      try {
        const client = new Client();
        client
          .setEndpoint(process.env.APPWRITE_ENDPOINT)
          .setProject(process.env.APPWRITE_PROJECT_ID)
          .setKey(process.env.APPWRITE_API_KEY);
        const storage = new Storage(client);
        const customEndpointsFileName = `${appId}_endpoints.json`;
        // Use a stable ID for the endpoints file too
        const shortHash = crypto.createHash('md5').update(appId).digest('hex').slice(0, 8);
        const stableEndpointsId = `${shortHash}_endpoints`
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, '_')
          .slice(0, 36);
        
        // Try to delete any existing file with this ID first
        try {
          await storage.deleteFile(process.env.APPWRITE_OTA_BUCKET_ID, stableEndpointsId);
          this.logger.log(`Deleted existing endpoints file with ID ${stableEndpointsId}`);
        } catch (deleteError) {
          // It's okay if the file doesn't exist yet
          this.logger.log(`No existing endpoints file to delete or delete failed: ${deleteError.message}`);
        }
        
        const endpointsContent = await fs.promises.readFile(endpointsFilePath);
        const blob = new Blob([endpointsContent], { type: 'application/json' });
        // Create the file using the stable ID
        const endpointsUploadResponse = await storage.createFile(
          process.env.APPWRITE_OTA_BUCKET_ID,
          stableEndpointsId,
          new File([blob], customEndpointsFileName, { type: 'application/json' })
        );
        this.logger.log(`Uploaded endpoints file to Appwrite with stable ID: ${stableEndpointsId}`);
        // Update the endpoints object with a "global" key that uses the stable ID
        otaEndpoints['global'] = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_OTA_BUCKET_ID}/files/${stableEndpointsId}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
      } catch (err) {
        this.logger.error(`Failed to update endpoints file in Appwrite: ${err.message}`);
      }
      // ───────────────────────────────────────────────

      // Step 6: Update pubspec.yaml to include OTA assets.
      this.updatePubspecYaml(workingDir);
      this.logger.log('Updated pubspec.yaml with OTA assets');

      // If APK already exists or updateOnlyOta is true, skip rebuild and return existing APK info
      if (shouldUpdateOtaOnly) {
        let apkDownloadUrl = null;
        let publicDownloadUrl = null;
        let qrCodeDataUrl = null;

        if (existingApkFileId) {
          // Generate APK URLs since we already have an APK file
          apkDownloadUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_APK_BUCKET_ID}/files/${existingApkFileId}/download?project=${process.env.APPWRITE_PROJECT_ID}&mode=admin`;
          publicDownloadUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_APK_BUCKET_ID}/files/${existingApkFileId}/download?project=${process.env.APPWRITE_PROJECT_ID}`;
          qrCodeDataUrl = await QRCode.toDataURL(publicDownloadUrl);
        }

        this.logger.log(`OTA packs updated. Using existing APK: ${existingApkFileId !== null}`);

        return {
          success: true,
          message: 'OTA packs updated. No rebuild triggered as APK already exists.',
          appName: appName,
          appLogo: appLogo,
          apkUrl: apkDownloadUrl,
          qrCodeDataUrl,
          otaPacks: Object.fromEntries(
            Object.keys(otaPacks).map((packName) => [
              packName,
              {
                localPath: path.join(packsDir, `${packName}_pack.json`),
                cloudFileId: otaUploads[`${packName}_pack.json`] || null,
                endpoint: otaEndpoints[packName] || null,
              },
            ])
          ),
        };
      }

      // Continue with full rebuild flow if no existing APK or force rebuild requested
      // Step 7: Trigger GitHub Actions workflow to build the app.
      await this.triggerBuildWorkflow(fullAppData, otaEndpoints);
      this.logger.log("GitHub Actions workflow triggered with OTA endpoints");

      // Step 8: Track workflow until completion (to ensure build is done).
      const githubArtifact = await this.trackWorkflow(appId);
      this.logger.log("Build workflow completed");

      // Step 8.5: Download GitHub artifact, extract APK, and upload to Appwrite.
      const apkFileId = await this.downloadAndUploadApkToAppwrite(githubArtifact, appId);
      this.logger.log(`APK uploaded to Appwrite with file ID: ${apkFileId}`);

      // Generate APK download URL for internal use with admin privileges
      const apkDownloadUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_APK_BUCKET_ID}/files/${apkFileId}/download?project=${process.env.APPWRITE_PROJECT_ID}&mode=admin`;
      this.logger.log(`APK download URL (admin): ${apkDownloadUrl}`);
      
      // Generate a public download URL for the QR code, which doesn't require authentication
      const publicDownloadUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_APK_BUCKET_ID}/files/${apkFileId}/download?project=${process.env.APPWRITE_PROJECT_ID}`;
      this.logger.log(`APK public download URL: ${publicDownloadUrl}`);

      // Step 9: Generate QR code for the public APK download URL
      const qrCodeDataUrl = await QRCode.toDataURL(publicDownloadUrl);
      this.logger.log("QR Code generated for public APK download URL");

      // Step 10: Return build result with OTA pack details, live endpoints, and APK download info.
      const resultData = {
        success: true,
        message: isNewApp
          ? 'Flutter app creation triggered and build completed successfully'
          : 'Flutter app update triggered and build completed successfully',
        appName: appName,
        appLogo: appLogo,
        apkUrl: apkDownloadUrl,
        qrCodeDataUrl,
        otaPacks: Object.fromEntries(
          Object.keys(otaPacks).map((packName) => [
            packName,
            {
              localPath: path.join(packsDir, `${packName}_pack.json`),
              cloudFileId: otaUploads[`${packName}_pack.json`] || null,
              endpoint: otaEndpoints[packName] || null,
            },
          ])
        ),
      };

      // Log the result without the QR code data to avoid console clutter
      this.logger.log(`Build result: ${JSON.stringify({...resultData, qrCodeDataUrl: '[QR Code data omitted for brevity]'})}`);
      return resultData;
    } catch (error) {
      this.logger.error(`Error generating/updating Flutter app: ${error.message}`);
      throw error;
    }
  }

  // New method to check if APK already exists in Appwrite
  async checkExistingApk(mobileAppId: string): Promise<string | null> {
    try {
      // Initialize Appwrite client
      const client = new Client();
      client
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
      
      const storage = new Storage(client);
      const customZipPattern = `${mobileAppId}_flutter-apks.zip`;
      
      // List files that match our naming pattern
      const existingFiles = await storage.listFiles(process.env.APPWRITE_APK_BUCKET_ID, [
        Query.equal("name", customZipPattern)
      ]);
      
      // If we found any matching files, return the first one's ID
      if (existingFiles.files && existingFiles.files.length > 0) {
        this.logger.log(`Found existing APK for app ${mobileAppId}: ${existingFiles.files[0].$id}`);
        return existingFiles.files[0].$id;
      }
      
      this.logger.log(`No existing APK found for app ${mobileAppId}`);
      return null;
    } catch (error) {
      this.logger.error(`Error checking for existing APK: ${error.message}`);
      return null; // Return null on error to be safe (will trigger a rebuild)
    }
  }

  // New method to delete an existing APK file
  async deleteExistingApk(fileId: string): Promise<void> {
    try {
      // Initialize Appwrite client
      const client = new Client();
      client
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
      
      const storage = new Storage(client);
      
      // Delete the file
      await storage.deleteFile(process.env.APPWRITE_APK_BUCKET_ID, fileId);
      this.logger.log(`Successfully deleted APK file with ID: ${fileId}`);
    } catch (error) {
      this.logger.error(`Error deleting APK file: ${error.message}`);
      // Don't throw the error to avoid blocking the build process
    }
  }

  // Enhanced version of uploadOtaPacksToCloud with better error handling and cache management
  async uploadOtaPacksToCloud(
    workingDir: string, 
    mobileAppId: string, 
    forceUpdate: boolean = false
  ): Promise<Record<string, string>> {
    const packsDir = path.join(workingDir, 'assets', 'ota_packs');
    const files = fs.readdirSync(packsDir);
    if (files.length === 0) {
      this.logger.error(`No OTA pack files found in ${packsDir}`);
      throw new Error(`No OTA pack files found in ${packsDir}`);
    }
    
    this.logger.log(`Starting OTA pack upload for ${files.length} files, force update: ${forceUpdate}`);
    
    // Initialize Appwrite client.
    const client = new Client();
    client
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const storage = new Storage(client);
    const uploadResults: Record<string, string> = {};
  
    for (const fileName of files) {
      // Skip endpoints.json, we'll generate it later
      if (fileName === 'endpoints.json') continue;
      
      const filePath = path.join(packsDir, fileName);
      // Generate a custom file name that includes mobileAppId.
      const customFileName = `${mobileAppId}_${fileName}`;
      // Create a stable and valid file ID within Appwrite's constraints
      const shortHash = crypto.createHash('md5').update(mobileAppId).digest('hex').slice(0, 8);
      const packType = fileName.replace('_pack.json', '');
      // Ensure the ID is valid and under 36 chars with only allowed characters
      const stableFileId = `${shortHash}_${packType}`
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '_')
        .slice(0, 36);
      
      try {
        // Read the file content and calculate hash
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const contentHash = crypto.createHash('md5').update(fileContent).digest('hex');
        const cacheKey = `${mobileAppId}_${fileName}`;
        this.logger.log(`Processing file: ${fileName}, content hash: ${contentHash}`);
        
        // Check if file content has changed since last upload (skip if forceUpdate is true)
        if (!forceUpdate && this.otaPackHashCache.get(cacheKey) === contentHash) {
          // Content hasn't changed, we don't need to upload again
          this.logger.log(`Content hash match found in cache for ${fileName}`);
          
          try {
            // Verify the file exists by trying to view it
            await storage.getFileView(process.env.APPWRITE_OTA_BUCKET_ID, stableFileId);
            uploadResults[fileName] = stableFileId;
            this.logger.log(`Content unchanged for ${fileName}, using existing file ${stableFileId}`);
            continue; // Skip to the next file
          } catch (viewError) {
            this.logger.warn(`File ${stableFileId} couldn't be viewed in Appwrite, will re-upload. Error: ${viewError.message}`);
            // Fall through to upload the file again
          }
        }
        
        // Content has changed, force update is requested, or file doesn't exist - proceed with upload
        this.logger.log(`Preparing to upload ${fileName} with stable ID: ${stableFileId}`);
        
        try {
          // Try to delete any existing file with this ID first
          try {
            await storage.deleteFile(process.env.APPWRITE_OTA_BUCKET_ID, stableFileId);
            this.logger.log(`Deleted existing file with ID ${stableFileId}`);
          } catch (deleteError) {
            // It's okay if the file doesn't exist yet
            this.logger.log(`No existing file to delete for ID ${stableFileId} or delete failed: ${deleteError.message}`);
          }
          
          // Create a Blob and File from the content
          const blob = new Blob([fileContent], { type: 'application/json' });
          const file = new File([blob], customFileName, { type: 'application/json' });
          
          // Upload the file with our stable ID
          this.logger.log(`Uploading ${customFileName} to Appwrite with ID: ${stableFileId}...`);
          const response = await storage.createFile(
            process.env.APPWRITE_OTA_BUCKET_ID,
            stableFileId, // Use our stable ID instead of random 'unique()'
            file
          );
          
          // Verify the file was uploaded correctly by fetching a preview
          await storage.getFileView(process.env.APPWRITE_OTA_BUCKET_ID, stableFileId);
          
          // Update our cache with the new content hash
          this.otaPackHashCache.set(cacheKey, contentHash);
          
          uploadResults[fileName] = stableFileId;
          this.logger.log(`✅ Successfully uploaded ${customFileName} with stable file ID ${stableFileId}`);
        } catch (uploadError) {
          this.logger.error(`❌ Failed to upload ${customFileName}: ${uploadError.message}`);
          throw uploadError; // Re-throw to handle it at the method level
        }
      } catch (error) {
        this.logger.error(`Error processing ${fileName}: ${error.message}`);
        throw new Error(`Failed to upload OTA pack ${fileName}: ${error.message}`);
      }
    }
    
    this.logger.log(`Completed OTA pack uploads. Results: ${JSON.stringify(uploadResults)}`);
    return uploadResults;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Download GitHub artifact and upload to Appwrite as is, without extraction
  async downloadAndUploadApkToAppwrite(githubArtifact: any, mobileAppId: string): Promise<string> {
    const artifactId = githubArtifact.id;
    // Correct API URL format for downloading artifacts
    const downloadUrl = `https://api.github.com/repos/Farouk-chtioui/flutter_template/actions/artifacts/${artifactId}/zip`;
    this.logger.log(`Downloading artifact from GitHub API: ${downloadUrl}`);
    
    // Get the GitHub token
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN is missing!');
    }
    
    try {
      // Download the zip artifact from GitHub using the correct API endpoint
      const response = await axios.get(downloadUrl, {
        headers: { 
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${token}`
        },
        responseType: 'arraybuffer'
      });
      
      this.logger.log(`Downloaded artifact zip file, size: ${response.data.byteLength} bytes`);
      
      // Initialize Appwrite client
      const client = new Client();
      client
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
      
      const storage = new Storage(client);
      // Generate a custom file name that includes mobileAppId
      const customZipName = `${mobileAppId}_flutter-apks.zip`;
      
      // List and delete any existing files with the same name
      const existingFiles = await storage.listFiles(process.env.APPWRITE_APK_BUCKET_ID, [
        Query.equal("name", customZipName)
      ]);
      
      if (existingFiles.files && existingFiles.files.length > 0) {
        for (const existingFile of existingFiles.files) {
          await storage.deleteFile(process.env.APPWRITE_APK_BUCKET_ID, existingFile.$id);
          this.logger.log(`Deleted old zip file ${existingFile.$id} with name ${customZipName}`);
        }
      }
      
      // Upload the artifact zip as is without extraction
      const blob = new Blob([response.data], { type: 'application/zip' });
      const file = new File([blob], customZipName, { type: 'application/zip' });
      
      const uploadResponse = await storage.createFile(
        process.env.APPWRITE_APK_BUCKET_ID,
        'unique()', // Let Appwrite generate a unique file ID
        file
      );
      
      this.logger.log(`Successfully uploaded artifact zip to Appwrite with file ID: ${uploadResponse.$id}`);
      return uploadResponse.$id;
    } catch (error) {
      this.logger.error(`Failed to download and upload artifact: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Generate OTA endpoints using the real URL format.
  private generateOtaEndpoints(otaUploads: Record<string, string>): Record<string, string> {
    const endpoints: Record<string, string> = {};
    
    for (const fileName in otaUploads) {
      const fileId = otaUploads[fileName];
      // Remove the '_pack.json' suffix to use a clean key.
      const key = fileName.replace('_pack.json', '');
      
      // Use a URL format that's accessible and returns the raw file contents
      endpoints[key] = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_OTA_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
    }
    
    // Log the generated endpoints for debugging
    this.logger.log(`Generated OTA endpoints: ${JSON.stringify(endpoints)}`);
    
    return endpoints;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Track GitHub Actions workflow until completion.
  async trackWorkflow(appId: string): Promise<any> {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN is missing!');
    }
    const repoOwner = 'Farouk-chtioui';
    const repoName = 'flutter_template';
    let runId: number | null = null;

    this.logger.log(`Tracking workflow for appId: ${appId}`);

    const runsApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs?event=repository_dispatch`;
    let attempts = 0;
    const maxRunAttempts = 30;
    while (attempts < maxRunAttempts && !runId) {
      this.logger.log(`Checking workflow runs (attempt ${attempts + 1})`);
      const runsResponse = await axios.get(runsApiUrl, {
        headers: { Authorization: `token ${token}` },
      });
      const runs = runsResponse.data.workflow_runs;
      const activeRuns = runs.filter((run: any) =>
        run.status === 'queued' || run.status === 'in_progress'
      );
      if (activeRuns.length > 0) {
        runId = activeRuns[0].id;
        this.logger.log(`Found active workflow run with id: ${runId}`);
        break;
      }
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    if (!runId) {
      this.logger.error("No active workflow run found for the build event");
      throw new Error("No active workflow run found for the build event");
    }

    attempts = 0;
    const runApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs/${runId}`;
    let runStatus = "";
    const maxStatusAttempts = 60;
    while (attempts < maxStatusAttempts) {
      const runResponse = await axios.get(runApiUrl, {
        headers: { Authorization: `token ${token}` },
      });
      runStatus = runResponse.data.status;
      this.logger.log(`Workflow run status: ${runStatus} (attempt ${attempts + 1})`);
      if (runStatus === "completed") {
        break;
      }
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    if (runStatus !== "completed") {
      this.logger.error("Workflow run did not complete in the expected time");
      throw new Error("Workflow run did not complete in the expected time");
    }

    const artifactsApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs/${runId}/artifacts`;
    let artifact: any = null;
    const maxArtifactAttempts = 10;
    for (let i = 0; i < maxArtifactAttempts; i++) {
      this.logger.log(`Polling artifacts (attempt ${i + 1})`);
      try {
        const artifactsResponse = await axios.get(artifactsApiUrl, {
          headers: { Authorization: `token ${token}` },
        });
        const artifacts = artifactsResponse.data.artifacts;
        this.logger.log(`Found ${artifacts.length} artifacts`);
        artifact = artifacts.find((a: any) => a.name === "flutter-apks");
        if (artifact) {
          this.logger.log("Artifact 'flutter-apks' found");
          break;
        }
      } catch (err) {
        this.logger.error(`Error fetching artifacts: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    if (!artifact) {
      this.logger.error("Artifact 'flutter-apks' not found after polling");
      throw new Error("Artifact 'flutter-apks' not found");
    }
    // Return the artifact details instead of just a URL
    this.logger.log(`Workflow complete. Found artifact ID: ${artifact.id}`);
    return artifact;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Update the APK URL and generate a QR code.
  async updateApkUrlAndGenerateQr(appId: string, apkUrl: string): Promise<any> {
    this.logger.log(`Updating app (${appId}) with APK URL: ${apkUrl}`);
    const qrCodeDataUrl = await QRCode.toDataURL(apkUrl);
    this.logger.log(`QR Code generated for APK URL`);
    const result = { success: true, appId, apkUrl, qrCodeDataUrl };
    // Log without the QR code
    this.logger.log(`Result: ${JSON.stringify({...result, qrCodeDataUrl: '[QR Code data omitted for brevity]'})}`);
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Split fullAppData into separate OTA packs.
  private splitIntoOTAPacks(fullAppData: any): Record<string, any> {
    const packs: Record<string, any> = {};
    packs.design = fullAppData.appDesign || {};
    packs.layout = fullAppData.appLayout || {};
    packs.screens = fullAppData.screens || [];
    packs.onboarding = fullAppData.onboardingScreens || [];
    
    const mobileApp = fullAppData.mobileApp || {};
    // Include repository information in the config pack
    const repository = fullAppData.repository || {};
    
    this.logger.log(`Repository info for OTA packs: ${JSON.stringify(repository)}`);
    
    // Create a comprehensive config object with correct property access
    packs.config = {
      appName: repository.repositoryName || mobileApp.name || 'My Generated App',
      _id: mobileApp._id ? String(mobileApp._id) : undefined,
      repositoryName: repository.repositoryName || mobileApp.name || 'My App',
      repositoryImage: repository.image || null,
      repositoryDescription: repository.description || null,
      coverImage: repository.coverImage || null,
    };
    
    return packs;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Recursively copy the Flutter template folder to the working directory.
  private copyFolder(src: string, dest: string) {
    if (!fs.existsSync(src)) throw new Error(`Source folder does not exist: ${src}`);
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyFolder(srcPath, destPath);
      } else {
        // Skip copying OTA pack files from the template.
        if (!destPath.includes('ota_packs')) {
          if (!fs.existsSync(destPath)) {
            try {
              if (process.platform === 'win32') {
                fs.copyFileSync(srcPath, destPath);
              } else {
                fs.symlinkSync(srcPath, destPath, 'file');
              }
            } catch (err) {
              this.logger.error(`Failed to copy/symlink file: ${srcPath} -> ${destPath}`);
            }
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Update pubspec.yaml to include OTA packs and endpoints.
  private updatePubspecYaml(workingDir: string) {
    const pubspecPath = path.join(workingDir, 'pubspec.yaml');
    if (fs.existsSync(pubspecPath)) {
      let pubspecContent = fs.readFileSync(pubspecPath, 'utf8');
      if (!pubspecContent.includes('assets/ota_packs/')) {
        const assetConfig = `
flutter:
  assets:
    - assets/config.json
    - assets/ota_packs/endpoints.json
    - assets/ota_packs/design_pack.json
    - assets/ota_packs/layout_pack.json
    - assets/ota_packs/screens_pack.json
    - assets/ota_packs/onboarding_pack.json
    - assets/ota_packs/config_pack.json
`;
        pubspecContent = pubspecContent.replace(/(flutter:\s*)/, `$1\n${assetConfig}`);
        fs.writeFileSync(pubspecPath, pubspecContent, 'utf8');
        this.logger.log("Updated pubspec.yaml with OTA assets configuration");
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Trigger the GitHub Actions workflow via repository_dispatch.
  private async triggerBuildWorkflow(configPayload: any, otaEndpoints: any): Promise<void> {
    const token = process.env.GITHUB_TOKEN || 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN';
    if (!token) {
      this.logger.error('❌ GITHUB_TOKEN is missing!');
      throw new Error('GITHUB_TOKEN is missing!');
    }
    const repoOwner = 'Farouk-chtioui';
    const repoName = 'flutter_template';
    const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/dispatches`;
    try {
      // Extract repository info with better logging
      const repository = configPayload.repository || {};
      this.logger.log(`Repository info for build: ${JSON.stringify(repository)}`);
      
      // Extract app name from repository with correct property access
      const appName = repository.repositoryName || configPayload.mobileApp?.name || 'My Generated App';
      
      // Create a valid Dart package name (lowercase, alphanumeric with underscores, start with letter)
      const packageName = appName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_') // Replace any non-alphanumeric chars with underscore
        .replace(/^[^a-z]+/, 'app'); // Ensure starts with a letter
      
      // Create a more comprehensive configuration that includes what the app needs
      const completeConfig = {
        appId: configPayload.mobileApp?._id ? String(configPayload.mobileApp._id) : null,
        appName: appName,
        packageName: packageName,
        appDescription: repository.description || '',
        appVersion: '1.0.0',
        buildNumber: '1',
        endpointsUrl: null
      };
      
      const appLogo = repository.image || null;
      
      this.logger.log(`Using app name: ${appName}, package name: ${packageName}`);
      this.logger.log(`Repository details - name: "${repository.repositoryName}", description: "${repository.description}", image: ${repository.image ? "Present" : "Not present"}`);
      
      // Validate otaEndpoints to ensure they're in the expected format
      if (!otaEndpoints || typeof otaEndpoints !== 'object') {
        this.logger.warn('OTA endpoints may not be in the correct format');
      }
      
      // Prepare the payload
      const payload = {
        event_type: 'build_app',
        client_payload: { 
          config: completeConfig,
          otaEndpoints: otaEndpoints,
          appName: appName,
          packageName: packageName,
          appLogo: appLogo,
          repository: {
            name: repository.repositoryName || '',
            image: repository.image || '',
            description: repository.description || '',
            coverImage: repository.coverImage || ''
          }
        }
      };
      
      // Log the payload for debugging - remove sensitive data if needed
      this.logger.log(`GitHub dispatch payload prepared: ${JSON.stringify({
        ...payload,
        client_payload: {
          ...payload.client_payload,
          appLogo: payload.client_payload.appLogo ? "[Image data present]" : null,
          repository: {
            ...payload.client_payload.repository,
            image: payload.client_payload.repository.image ? "[Image data present]" : null,
            coverImage: payload.client_payload.repository.coverImage ? "[Image data present]" : null,
          }
        }
      })}`);
      
      try {
        const response = await axios.post(
          githubApiUrl,
          payload,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
              Authorization: `token ${token}`,
            },
          }
        );
        this.logger.log(`✅ GitHub Actions Triggered! Response: ${response.status}`);
      } catch (axiosError) {
        if (axiosError.response) {
          this.logger.error(`GitHub API error - Status: ${axiosError.response.status}`);
          this.logger.error(`Response data: ${JSON.stringify(axiosError.response.data)}`);
          this.logger.error(`Response headers: ${JSON.stringify(axiosError.response.headers)}`);
          if (axiosError.response.data && axiosError.response.data.message) {
            if (axiosError.response.data.message.includes('OAuth')) {
              throw new Error(`GitHub authentication error: ${axiosError.response.data.message}. Please check your token permissions.`);
            } else if (axiosError.response.data.message.includes('Not Found')) {
              throw new Error(`Repository not found: ${repoOwner}/${repoName}. Please verify the repository exists and your token has access.`);
            } else if (axiosError.response.data.errors && axiosError.response.data.errors.length > 0) {
              const errorDetails = axiosError.response.data.errors.map(e => e.message).join('; ');
              throw new Error(`GitHub API validation error: ${errorDetails}`);
            }
          }
        }
        throw new Error(`GitHub API request failed: ${axiosError.message}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to trigger GitHub Actions: ${error.message}`);
      throw error;
    }
  }
}
