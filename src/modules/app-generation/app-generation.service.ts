import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as QRCode from 'qrcode';
import { Client, Query, Storage } from 'node-appwrite';
import * as AdmZip from 'adm-zip'; // Add this import

@Injectable()
export class AppGenerationService {
  private readonly logger = new Logger(AppGenerationService.name);

  /**
   * Generates or updates the Flutter app.
   * @param fullAppData The full configuration data for the app.
   * @param updateOnlyOta If true, only update OTA packs without triggering a full rebuild.
   */
  async generateOrUpdateFlutterApp(fullAppData: any, updateOnlyOta: boolean = false): Promise<any> {
    try {
      // Step 1: Determine appId and setup working directories.
      const appId = fullAppData.mobileApp?._id ? String(fullAppData.mobileApp._id) : 'no_id';
      const workingDir = path.join('C:\\Users\\WT\\Desktop\\PFE PROJECT\\flutter_builds', appId);
      const globalTemplateDir = path.join('C:\\Users\\WT\\Desktop\\PFE PROJECT\\flutter_template');

      this.logger.log(`Starting app generation for appId: ${appId}`);

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

      // Step 5.1: Upload OTA packs to Appwrite.
      // Pass appId so we can include it in the file name.
      const otaUploads = await this.uploadOtaPacksToCloud(workingDir, appId);
      this.logger.log(`OTA packs uploaded to cloud: ${JSON.stringify(otaUploads)}`);

      // Step 5.2: Generate OTA endpoints in the required format.
      const otaEndpoints = this.generateOtaEndpoints(otaUploads);
      const endpointsFilePath = path.join(workingDir, 'assets', 'ota_packs', 'endpoints.json');
      await fs.promises.writeFile(endpointsFilePath, JSON.stringify(otaEndpoints, null, 2), 'utf8');
      this.logger.log(`OTA endpoints written to ${endpointsFilePath}`);

      // Step 6: Update pubspec.yaml to include OTA assets.
      this.updatePubspecYaml(workingDir);
      this.logger.log('Updated pubspec.yaml with OTA assets');

      // If updateOnlyOta is true and an APK already exists, skip triggering the build workflow.
      if (updateOnlyOta) {
        // Optionally, check if the APK exists.
        const apkPath = path.join(workingDir, 'build', 'app', 'outputs', 'apk', 'release', 'app-release.apk');
        let existingApkUrl = '';
        if (fs.existsSync(apkPath)) {
          // In a real scenario, you would retrieve the actual APK URL (e.g., stored in a database)
          existingApkUrl = 'existing_apk_url'; // Placeholder value.
        }
        return {
          success: true,
          message: 'OTA packs updated. No rebuild triggered as APK already exists.',
          appName: fullAppData.mobileApp?.name || 'My Generated App',
          apkUrl: existingApkUrl,
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

      // Step 7: Trigger GitHub Actions workflow to build the app.
      await this.triggerBuildWorkflow(fullAppData);
      this.logger.log("GitHub Actions workflow triggered");

      // Step 8: Track workflow until completion (to ensure build is done).
      const githubArtifact = await this.trackWorkflow(appId);
      this.logger.log("Build workflow completed");

      // Step 8.5: Download GitHub artifact, extract APK, and upload to Appwrite.
      const apkFileId = await this.downloadAndUploadApkToAppwrite(githubArtifact, appId);
      this.logger.log(`APK uploaded to Appwrite with file ID: ${apkFileId}`);

      // Generate APK download URL.
      const apkDownloadUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_APK_BUCKET_ID}/files/${apkFileId}/download?project=${process.env.APPWRITE_PROJECT_ID}&mode=admin`;
      this.logger.log(`APK download URL: ${apkDownloadUrl}`);

      // Step 9: Generate QR code for the APK download URL.
      const qrCodeDataUrl = await QRCode.toDataURL(apkDownloadUrl);
      this.logger.log("QR Code generated for APK download URL");

      // Step 10: Return build result with OTA pack details, live endpoints, and APK download info.
      return {
        success: true,
        message: isNewApp
          ? 'Flutter app creation triggered and build completed successfully'
          : 'Flutter app update triggered and build completed successfully',
        appName: fullAppData.mobileApp?.name || 'My Generated App',
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
    } catch (error) {
      this.logger.error(`Error generating/updating Flutter app: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Upload OTA packs to Appwrite cloud storage with mobileAppId included in the file name.
  async uploadOtaPacksToCloud(workingDir: string, mobileAppId: string): Promise<Record<string, string>> {
    const packsDir = path.join(workingDir, 'assets', 'ota_packs');
    const files = fs.readdirSync(packsDir);
    if (files.length === 0) {
      this.logger.error(`No OTA pack files found in ${packsDir}`);
      throw new Error(`No OTA pack files found in ${packsDir}`);
    }
    // Initialize Appwrite client.
    const client = new Client();
    client
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const storage = new Storage(client);
    const uploadResults: Record<string, string> = {};
  
    for (const fileName of files) {
      const filePath = path.join(packsDir, fileName);
      // Generate a custom file name that includes mobileAppId.
      const customFileName = `${mobileAppId}_${fileName}`;
      try {
        // List existing files with this custom name using proper query syntax.
        const existingFiles = await storage.listFiles(process.env.APPWRITE_OTA_BUCKET_ID, [
          Query.equal("name", customFileName)
        ]);
        if (existingFiles.files && existingFiles.files.length > 0) {
          // Delete all matching files.
          for (const existingFile of existingFiles.files) {
            await storage.deleteFile(process.env.APPWRITE_OTA_BUCKET_ID, existingFile.$id);
            this.logger.log(`Deleted old OTA file ${existingFile.$id} with name ${customFileName}`);
          }
        }
        // Read the file as a Buffer.
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer]);
        const file = new File([blob], customFileName, { type: 'application/json' });
        // Upload the file with a unique ID.
        const response = await storage.createFile(
          process.env.APPWRITE_OTA_BUCKET_ID,
          'unique()', // Let Appwrite generate a unique file ID.
          file
        );
        uploadResults[fileName] = response.$id;
        this.logger.log(`Uploaded ${customFileName} with file ID ${response.$id}`);
      } catch (error) {
        this.logger.error(`Error uploading ${fileName}: ${error.message}`);
        throw error;
      }
    }
    return uploadResults;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Upload the APK file to Appwrite and return its file ID.
  // ─────────────────────────────────────────────────────────────────────────────
  // Download GitHub artifact, extract APK, and upload to Appwrite
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
      
      // Process the downloaded zip file in memory
      const zip = new AdmZip(Buffer.from(response.data));
      const zipEntries = zip.getEntries();
      
      // Find the APK file in the zip
      let apkEntry = null;
      for (const entry of zipEntries) {
        if (entry.entryName.endsWith('.apk')) {
          apkEntry = entry;
          break;
        }
      }
      
      if (!apkEntry) {
        throw new Error('No APK file found in the artifact!');
      }
      
      this.logger.log(`Found APK in artifact: ${apkEntry.entryName}`);
      
      // Extract APK data to a buffer
      const apkBuffer = apkEntry.getData();
      
      // Initialize Appwrite client
      const client = new Client();
      client
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
      
      const storage = new Storage(client);
      // Generate a custom file name that includes mobileAppId
      const customApkName = `${mobileAppId}_app-release.apk`;
      
      // List and delete any existing files with the same custom name
      const existingFiles = await storage.listFiles(process.env.APPWRITE_APK_BUCKET_ID, [
        Query.equal("name", customApkName)
      ]);
      
      if (existingFiles.files && existingFiles.files.length > 0) {
        for (const existingFile of existingFiles.files) {
          await storage.deleteFile(process.env.APPWRITE_APK_BUCKET_ID, existingFile.$id);
          this.logger.log(`Deleted old APK file ${existingFile.$id} with name ${customApkName}`);
        }
      }
      
      // Create a Blob and File object from the APK buffer
      const blob = new Blob([apkBuffer], { type: 'application/vnd.android.package-archive' });
      const file = new File([blob], customApkName, { type: 'application/vnd.android.package-archive' });
      
      // Upload the file to Appwrite
      const uploadResponse = await storage.createFile(
        process.env.APPWRITE_APK_BUCKET_ID,
        'unique()', // Let Appwrite generate a unique file ID
        file
      );
      
      this.logger.log(`Successfully uploaded APK to Appwrite with file ID: ${uploadResponse.$id}`);
      return uploadResponse.$id;
    } catch (error) {
      this.logger.error(`Failed to download and upload APK: ${error.message}`);
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
      endpoints[key] = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_OTA_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}&mode=admin`;
    }
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
    return { success: true, appId, apkUrl, qrCodeDataUrl };
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
    packs.config = {
      ...mobileApp,
      _id: mobileApp._id ? String(mobileApp._id) : undefined,
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
    - assets/ota_packs/design_pack.json
    - assets/ota_packs/layout_pack.json
    - assets/ota_packs/screens_pack.json
    - assets/ota_packs/onboarding_pack.json
    - assets/ota_packs/config_pack.json
    - assets/ota_packs/endpoints.json
`;
        pubspecContent = pubspecContent.replace(/(flutter:\s*)/, `$1\n${assetConfig}`);
        fs.writeFileSync(pubspecPath, pubspecContent, 'utf8');
        this.logger.log("Updated pubspec.yaml with OTA assets configuration");
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Trigger the GitHub Actions workflow via repository_dispatch.
  private async triggerBuildWorkflow(configPayload: any): Promise<void> {
    const token = process.env.GITHUB_TOKEN || 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN';
    if (!token) {
      this.logger.error('❌ GITHUB_TOKEN is missing!');
      throw new Error('GITHUB_TOKEN is missing!');
    }
    const repoOwner = 'Farouk-chtioui';
    const repoName = 'flutter_template';
    const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/dispatches`;
    try {
      this.logger.log(`🚀 Sending request to GitHub Actions: ${githubApiUrl}`);
      const response = await axios.post(
        githubApiUrl,
        {
          event_type: 'build_app',
          client_payload: { config: configPayload },
        },
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `token ${token}`,
          },
        }
      );
      this.logger.log(`✅ GitHub Actions Triggered! Response: ${response.status}`);
    } catch (error) {
      this.logger.error(`❌ Failed to trigger GitHub Actions: ${error.message}`);
      throw error;
    }
  }
}
