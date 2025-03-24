import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as QRCode from 'qrcode';
import { Client, Query, Storage } from 'node-appwrite';
import * as AdmZip from 'adm-zip';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

@Injectable()
export class AppGenerationService {
  private readonly logger = new Logger(AppGenerationService.name);

  // MD5 hash cache: keys = `${appId}_${fileName}`, value = MD5 of the file
  private otaPackHashCache = new Map<string, string>();

  constructor() {
    // Load any existing cache from disk (ota-md5-cache.json in a known location)
    const cachePath = path.resolve(__dirname, 'ota-md5-cache.json');
    if (fs.existsSync(cachePath)) {
      try {
        const raw = fs.readFileSync(cachePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.otaPackHashCache = new Map(Object.entries(parsed));
      } catch {
        this.logger.warn('Failed reading existing ota-md5-cache.json');
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Top-level method (reordered logic)
  // ─────────────────────────────────────────────────────────────────────────────
  async generateOrUpdateFlutterApp(
    fullAppData: any,
    updateOnlyOta = false,
    forceRebuild = false
  ): Promise<any> {
    try {
      /**
       * If fullAppData.mobileApp._id is missing or empty,
       * create a fallback so we don’t end up with "no_id" for all apps.
       */
      const realId =
        fullAppData.mobileApp?._id && String(fullAppData.mobileApp._id).trim() !== ''
          ? String(fullAppData.mobileApp._id)
          : crypto.randomBytes(6).toString('hex');

      const appId = realId;
      const workingDir = path.join(
        'C:\\Users\\WT\\Desktop\\PFE PROJECT\\flutter_builds',
        appId
      );

      const repositoryInfo = fullAppData.repository || {};
      const appName =
        repositoryInfo.repositoryName ||
        repositoryInfo.name ||
        fullAppData.mobileApp?.name ||
        'My Generated App';
      const appLogo = repositoryInfo.image || null;

      this.logger.log(`Starting app generation for appId: ${appId}, name: ${appName}`);
      this.logger.log(`Update only OTA: ${updateOnlyOta}, Force rebuild: ${forceRebuild}`);

      let hasSetupError = false;

      // 1) Ensure the local working directory is set up:
      //    - If it does not exist, clone the flutter_template from GitHub
      let isNewApp = false;
      if (!fs.existsSync(workingDir)) {
        try {
          isNewApp = true;
          fs.mkdirSync(workingDir, { recursive: true });
          this.logger.log(`Created new working directory: ${workingDir}`);
          // Clone flutter_template into that folder
          await this.cloneFlutterTemplate(workingDir);
        } catch (err) {
          hasSetupError = true;
          this.logger.error(`Setup failed, cannot clone flutter template: ${err.message}`);
        }
      } else {
        this.logger.log(`Working directory already exists: ${workingDir}`);
      }

      if (hasSetupError) {
        throw new Error('Aborting because of errors in setup steps.');
      }

      // 2) Generate local JSON (OTA packs) from the fullAppData
      const otaPacks = this.splitIntoOTAPacks(fullAppData);
      if (!otaPacks || Object.keys(otaPacks).length === 0) {
        throw new Error('OTA Pack generation failed!');
      }

      const packsDir = path.join(workingDir, 'assets', 'ota_packs');
      fs.mkdirSync(packsDir, { recursive: true });
      await Promise.all(
        Object.entries(otaPacks).map(([packName, packData]) => {
          const outPath = path.join(packsDir, `${packName}_pack.json`);
          return fs.promises.writeFile(
            outPath,
            JSON.stringify(packData, null, 2),
            'utf8'
          );
        })
      );

      // 3) Check if an APK is already in Appwrite
      const existingApkFileId = await this.checkExistingApk(appId);

      // 4) Decide if this is an OTA-only update
      //    (We already have an APK AND user asked for OTA, and not forcing rebuild)
      const shouldUpdateOtaOnly =
        (updateOnlyOta || existingApkFileId !== null) && !forceRebuild;

      // 1) Check if OTA has any changes before uploading
      const hasOtaChanges = await this.checkOtaChanges(workingDir, appId, forceRebuild);
      this.logger.log(`OTA changes detected: ${hasOtaChanges}`);

      // 2) Trigger GH workflow if full rebuild or if OTA changes exist
      if (!shouldUpdateOtaOnly || hasOtaChanges) {
        // await this.triggerBuildWorkflow(fullAppData, {} /* pass empty endpoints now */);
        this.logger.log(`(Removed first GH trigger to avoid double-actions)`);
        if (forceRebuild && existingApkFileId) {
          await this.deleteExistingApk(existingApkFileId);
          this.logger.log(`Force rebuild: deleted existing APK ID = ${existingApkFileId}`);
        }
        // Now trigger GH once
        await this.triggerBuildWorkflow(fullAppData, {} /* pass empty endpoints now */);
        this.logger.log(`(First GH trigger called only if needed)`);
      }

      // 3) Actually upload packs only if changes exist (or forced)
      let uploadResults = {};
      let changedSomething = hasOtaChanges;
      if (hasOtaChanges || forceRebuild) {
        const result = await this.uploadOtaPacksToCloud(workingDir, appId, forceRebuild);
        uploadResults = result.uploadResults;
        changedSomething = result.changedSomething;
      }

      // 4) Build endpoints, skip second build if no changes & we have an existing APK
      const otaEndpoints = this.generateOtaEndpoints(uploadResults);
      const endpointsFilePath = path.join(packsDir, 'endpoints.json');
      await fs.promises.writeFile(
        endpointsFilePath,
        JSON.stringify(otaEndpoints, null, 2),
        'utf8'
      );

      // 8a) Also upload endpoints.json with a stable ID
      try {
        const client = new Client()
          .setEndpoint(process.env.APPWRITE_ENDPOINT)
          .setProject(process.env.APPWRITE_PROJECT_ID)
          .setKey(process.env.APPWRITE_API_KEY);

        const storage = new Storage(client);
        const shortHash = crypto.createHash('md5').update(appId).digest('hex').slice(0, 8);
        const stableEndpointsId = `${shortHash}_endpoints`
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, '_')
          .slice(0, 36);

        // Delete existing endpoints file if present
        try {
          await storage.deleteFile(process.env.APPWRITE_OTA_BUCKET_ID, stableEndpointsId);
        } catch {
          /* ignore if it doesn't exist */
        }

        const endpointsContent = await fs.promises.readFile(endpointsFilePath);
        const blob = new Blob([endpointsContent], { type: 'application/json' });
        const customFileName = `${appId}_endpoints.json`;
        await storage.createFile(
          process.env.APPWRITE_OTA_BUCKET_ID,
          stableEndpointsId,
          new File([blob], customFileName, { type: 'application/json' })
        );

        otaEndpoints['global'] = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_OTA_BUCKET_ID}/files/${stableEndpointsId}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
      } catch (err) {
        this.logger.error(`Failed uploading endpoints file: ${err.message}`);
      }

      // 9) Update pubspec.yaml to include references to the assets/ota_packs
      this.updatePubspecYaml(workingDir);

      // 10) If we only needed an OTA update, we skip the second build
      if (shouldUpdateOtaOnly || (!changedSomething && existingApkFileId)) {
        let apkDownloadUrl: string | null = null;
        let publicDownloadUrl: string | null = null;
        let qrCodeDataUrl: string | null = null;

        if (existingApkFileId) {
          apkDownloadUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_APK_BUCKET_ID}/files/${existingApkFileId}/download?project=${process.env.APPWRITE_PROJECT_ID}&mode=admin`;
          publicDownloadUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_APK_BUCKET_ID}/files/${existingApkFileId}/download?project=${process.env.APPWRITE_PROJECT_ID}`;
          qrCodeDataUrl = await QRCode.toDataURL(publicDownloadUrl);
        }

        return {
          success: true,
          message: 'OTA packs updated. No rebuild triggered (APK already exists).',
          appName,
          appLogo,
          apkUrl: apkDownloadUrl,
          qrCodeDataUrl,
          otaPacks: Object.fromEntries(
            Object.keys(otaPacks).map((packName) => [
              packName,
              {
                localPath: path.join(packsDir, `${packName}_pack.json`),
                cloudFileId: uploadResults[`${packName}_pack.json`] || null,
                endpoint: otaEndpoints[packName] || null,
              },
            ])
          ),
        };
      }

      // ─────────────────────────────────────────────────────────────────
      // 11) Otherwise, do a full rebuild: now that GH is triggered, wait
      //     for it to finish, download the artifact, and upload it to Appwrite
      // ─────────────────────────────────────────────────────────────────
      // Re-trigger GH with the final endpoints if you want them in the build
      await this.triggerBuildWorkflow(fullAppData, otaEndpoints);

      const githubArtifact = await this.trackWorkflow(appId);
      const apkFileId = await this.downloadAndUploadApkToAppwrite(githubArtifact, appId);

      // 12) Generate final download/QR codes
      const apkDownloadUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_APK_BUCKET_ID}/files/${apkFileId}/download?project=${process.env.APPWRITE_PROJECT_ID}&mode=admin`;
      const publicDownloadUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_APK_BUCKET_ID}/files/${apkFileId}/download?project=${process.env.APPWRITE_PROJECT_ID}`;
      const qrCodeDataUrl = await QRCode.toDataURL(publicDownloadUrl);

      const resultData = {
        success: true,
        message: isNewApp
          ? 'Flutter app creation and build completed successfully'
          : 'Flutter app update and build completed successfully',
        appName,
        appLogo,
        apkUrl: apkDownloadUrl,
        qrCodeDataUrl,
        otaPacks: Object.fromEntries(
          Object.keys(otaPacks).map((packName) => [
            packName,
            {
              localPath: path.join(packsDir, `${packName}_pack.json`),
              cloudFileId: uploadResults[`${packName}_pack.json`] || null,
              endpoint: otaEndpoints[packName] || null,
            },
          ])
        ),
      };

      this.logger.log(
        `Build complete: ${JSON.stringify({ ...resultData, qrCodeDataUrl: 'omitted' })}`
      );
      return resultData;
    } catch (error) {
      this.logger.error(`Error generating/updating Flutter app: ${error.message}`);
      throw error;
    }
  }

  // Helper method to detect if any OTA packs changed, without uploading
  private async checkOtaChanges(
    workingDir: string,
    appId: string,
    forceUpdate: boolean
  ): Promise<boolean> {
    const packsDir = path.join(workingDir, 'assets', 'ota_packs');
    if (!fs.existsSync(packsDir)) {
      return false;
    }
    const files = fs.readdirSync(packsDir).filter((f) => f !== 'endpoints.json');
    for (const fileName of files) {
      const filePath = path.join(packsDir, fileName);
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const contentHash = crypto.createHash('md5').update(rawContent).digest('hex');
      const cacheKey = `${appId}_${fileName}`;
      if (forceUpdate || this.otaPackHashCache.get(cacheKey) !== contentHash) {
        return true;
      }
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Clone the flutter_template repo into workingDir
  // ─────────────────────────────────────────────────────────────────────────────
  private async cloneFlutterTemplate(workingDir: string) {
    const repoUrl = 'https://github.com/Farouk-chtioui/flutter_template.git';
    this.logger.log(`Cloning template from GitHub: ${repoUrl}`);
    execSync(`git clone --depth 1 ${repoUrl} .`, { cwd: workingDir });
    this.logger.log('Cloned flutter_template successfully');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Build and upload OTA packs only if changed
  // ─────────────────────────────────────────────────────────────────────────────
  async uploadOtaPacksToCloud(workingDir: string, appId: string, forceUpdate: boolean) {
    const packsDir = path.join(workingDir, 'assets', 'ota_packs');
    const files = fs.readdirSync(packsDir);
    if (files.length === 0) {
      throw new Error(`No OTA pack files found in ${packsDir}`);
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const storage = new Storage(client);

    let changedSomething = false;
    const uploadResults: Record<string, string> = {};
    const concurrencyLimit = 5;
    const tasks: Array<() => Promise<void>> = [];

    for (const fileName of files) {
      if (fileName === 'endpoints.json') {
        // We'll handle endpoints.json separately
        continue;
      }

      tasks.push(async () => {
        const filePath = path.join(packsDir, fileName);
        const rawContent = fs.readFileSync(filePath, 'utf8');
        const contentHash = crypto.createHash('md5').update(rawContent).digest('hex');
        const cacheKey = `${appId}_${fileName}`;

        // 1) If not forced, skip if content unchanged
        const isChanged = forceUpdate || this.otaPackHashCache.get(cacheKey) !== contentHash;
        if (!isChanged) {
          this.logger.log(`No changes for ${fileName}; skipping upload`);
          // figure out stableFileId
          const shortHash = crypto.createHash('md5')
            .update(appId)
            .digest('hex')
            .slice(0, 8);
          const packType = fileName.replace('_pack.json', '');
          const stableFileId = `${shortHash}_${packType}`
            .toLowerCase()
            .replace(/[^a-z0-9._-]/g, '_')
            .slice(0, 36);
          uploadResults[fileName] = stableFileId;
          return;
        }

        changedSomething = true;
        // 2) The file changed (or forced), so re-upload
        const shortHash = crypto.createHash('md5')
          .update(appId)
          .digest('hex')
          .slice(0, 8);
        const packType = fileName.replace('_pack.json', '');
        const stableFileId = `${shortHash}_${packType}`
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, '_')
          .slice(0, 36);

        this.logger.log(`Uploading changed file: ${fileName}, stable ID: ${stableFileId}`);

        // Delete old file if exists
        try {
          await storage.getFile(process.env.APPWRITE_OTA_BUCKET_ID, stableFileId);
          this.logger.log(`Deleting old file ${stableFileId} before re-uploading`);
          await storage.deleteFile(process.env.APPWRITE_OTA_BUCKET_ID, stableFileId);
        } catch (errGet: any) {
          // If not found, ignore
          this.logger.debug(`No existing file for ID ${stableFileId}: ${errGet.message}`);
        }

        // 3) Upload new
        const blob = new Blob([rawContent], { type: 'application/json' });
        const fileObj = new File([blob], `${appId}_${fileName}`, {
          type: 'application/json',
        });
        await storage.createFile(
          process.env.APPWRITE_OTA_BUCKET_ID,
          stableFileId,
          fileObj
        );

        // 4) Update local hash
        this.otaPackHashCache.set(cacheKey, contentHash);
        uploadResults[fileName] = stableFileId;
        this.logger.log(`Uploaded ${fileName} -> ID: ${stableFileId}`);
      });
    }

    // concurrency-limited parallel
    await this.runConcurrently(tasks, concurrencyLimit);

    // Save updated cache to disk
    const cacheObj = Object.fromEntries(this.otaPackHashCache);
    const cachePath = path.resolve(__dirname, 'ota-md5-cache.json');
    fs.writeFileSync(cachePath, JSON.stringify(cacheObj, null, 2), 'utf8');

    return { uploadResults, changedSomething };
  }

  // Helper for concurrency
  private async runConcurrently(tasks: Array<() => Promise<void>>, limit: number) {
    const active: Promise<void>[] = [];
    for (const task of tasks) {
      const promise = task().finally(() => {
        const idx = active.indexOf(promise);
        if (idx !== -1) active.splice(idx, 1);
      });
      active.push(promise);
      if (active.length >= limit) {
        await Promise.race(active);
      }
    }
    await Promise.all(active);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // If there's an existing ZIP for the app, return its ID
  // ─────────────────────────────────────────────────────────────────────────────
  async checkExistingApk(mobileAppId: string): Promise<string | null> {
    try {
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const storage = new Storage(client);
      const fileNamePattern = `${mobileAppId}_flutter-apks.zip`;
      const res = await storage.listFiles(process.env.APPWRITE_APK_BUCKET_ID, [
        Query.equal('name', fileNamePattern),
      ]);
      if (res.files && res.files.length) {
        this.logger.log(`Found existing APK for ${mobileAppId}: ${res.files[0].$id}`);
        return res.files[0].$id;
      }
      return null;
    } catch (error) {
      this.logger.error(`checkExistingApk failed: ${error.message}`);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Delete an existing APK if needed
  // ─────────────────────────────────────────────────────────────────────────────
  async deleteExistingApk(fileId: string) {
    try {
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const storage = new Storage(client);
      await storage.deleteFile(process.env.APPWRITE_APK_BUCKET_ID, fileId);
      this.logger.log(`Deleted existing APK: fileId=${fileId}`);
    } catch (error) {
      this.logger.error(`deleteExistingApk error: ${error.message}`);
      // Don’t re-throw
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Download artifact from GitHub, store in Appwrite as a zip
  // ─────────────────────────────────────────────────────────────────────────────
  async downloadAndUploadApkToAppwrite(githubArtifact: any, mobileAppId: string) {
    const artifactId = githubArtifact.id;
    const downloadUrl = `https://api.github.com/repos/Farouk-chtioui/flutter_template/actions/artifacts/${artifactId}/zip`;
    this.logger.log(`Downloading artifact from GitHub: ${downloadUrl}`);

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN is missing!');
    }

    let data: ArrayBuffer;
    try {
      const response = await axios.get(downloadUrl, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${token}`,
        },
        responseType: 'arraybuffer',
      });
      data = response.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        this.logger.error(
          `GitHub artifact download 404. Repo or artifact may be missing: ${downloadUrl}`
        );
      }
      throw err;
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const storage = new Storage(client);

    // Remove any existing file with the same name
    const customZipName = `${mobileAppId}_flutter-apks.zip`;
    const existingFiles = await storage.listFiles(process.env.APPWRITE_APK_BUCKET_ID, [
      Query.equal('name', customZipName),
    ]);
    for (const f of existingFiles.files || []) {
      await storage.deleteFile(process.env.APPWRITE_APK_BUCKET_ID, f.$id);
    }

    // upload new
    const blob = new Blob([data], { type: 'application/zip' });
    const fileObj = new File([blob], customZipName, { type: 'application/zip' });

    const uploaded = await storage.createFile(
      process.env.APPWRITE_APK_BUCKET_ID,
      'unique()',
      fileObj
    );
    this.logger.log(`Uploaded artifact zip to Appwrite: fileId=${uploaded.$id}`);
    return uploaded.$id;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Generate endpoints for each OTA pack
  // ─────────────────────────────────────────────────────────────────────────────
  private generateOtaEndpoints(otaUploads: Record<string, string>): Record<string, string> {
    const endpoints: Record<string, string> = {};
    for (const fileName in otaUploads) {
      const fileId = otaUploads[fileName];
      const packKey = fileName.replace('_pack.json', '');
      endpoints[packKey] = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_OTA_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
    }
    return endpoints;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Trigger GH Actions
  // ─────────────────────────────────────────────────────────────────────────────
  private async triggerBuildWorkflow(fullAppData: any, otaEndpoints: any) {
    const token = process.env.GITHUB_TOKEN;
    console.log('GitHub token length:', token ? token.length : 'MISSING');
    if (!token) {
      throw new Error('GITHUB_TOKEN is missing!');
    }
    const repoOwner = 'Farouk-chtioui';
    const repoName = 'flutter_template';

    const repository = fullAppData.repository || {};
    const appName =
      repository.repositoryName || fullAppData.mobileApp?.name || 'My Generated App';
    const packageName = appName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^[^a-z]+/, 'app');

    const payload = {
      event_type: 'build_app',
      client_payload: {
        config: {
          appId: fullAppData.mobileApp?._id
            ? String(fullAppData.mobileApp._id)
            : null,
          appName,
          packageName,
          appDescription: repository.description || '',
          appVersion: '1.0.0',
          buildNumber: '1',
          endpointsUrl: null,
        },
        otaEndpoints,
        appName,
        packageName,
        appLogo: repository.image || null,
        repository: {
          name: repository.repositoryName || '',
          image: repository.image || '',
          description: repository.description || '',
          coverImage: repository.coverImage || '',
        },
      },
    };

    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/dispatches`;
    try {
      // The GitHub API returns 204 on success
      const res = await axios.post(url, payload, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${token}`,
        },
      });
      if (res.status !== 204) {
        throw new Error(`Unexpected GH status: ${res.status}`);
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        this.logger.warn(
          'GitHub returned 403. Check that your token has "repo" and "workflow" scopes, and repository dispatch is enabled.'
        );
      }
      if (err.response?.status === 404) {
        this.logger.error(
          `GitHub 404. Check that repo ${repoOwner}/${repoName} exists, your token has access, and dispatch is allowed.`
        );
      }
      throw err;
    }
    this.logger.log('Triggered GitHub Actions build workflow');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Poll GH for a new run, wait for it to complete, find “flutter-universal-apk”
  // ─────────────────────────────────────────────────────────────────────────────
  async trackWorkflow(appId: string) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN is missing!');
    }

    const repoOwner = 'Farouk-chtioui';
    const repoName = 'flutter_template';

    // 1) find a run that is queued or in_progress for event=repository_dispatch
    const runsUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs?event=repository_dispatch`;
    let runId: number | null = null;
    for (let i = 0; i < 30; i++) {
      const runsResp = await axios.get(runsUrl, {
        headers: { Authorization: `token ${token}` },
      });
      const run = runsResp.data.workflow_runs.find(
        (r: any) => r.status === 'queued' || r.status === 'in_progress'
      );
      if (run) {
        runId = run.id;
        break;
      }
      await new Promise((r) => setTimeout(r, 10000));
    }
    if (!runId) throw new Error('No active repository_dispatch run found');

    // 2) wait for completion
    const runApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs/${runId}`;
    for (let j = 0; j < 60; j++) {
      const runResp = await axios.get(runApiUrl, {
        headers: { Authorization: `token ${token}` },
      });
      if (runResp.data.status === 'completed') {
        break;
      }
      await new Promise((r) => setTimeout(r, 10000));
    }

    // 3) find “flutter-universal-apk” artifact
    const artifactsUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs/${runId}/artifacts`;
    let artifact: any = null;
    for (let k = 0; k < 10; k++) {
      const artifactsResp = await axios.get(artifactsUrl, {
        headers: { Authorization: `token ${token}` },
      });
      artifact = artifactsResp.data.artifacts.find(
        (a: any) => a.name === 'flutter-release-apk'
      );
      if (artifact) {
        break;
      }
      await new Promise((r) => setTimeout(r, 10000));
    }
    if (!artifact) throw new Error("Artifact 'flutter-release-apk' not found");
    return artifact;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Let external code store an APK URL & generate a QR code
  // ─────────────────────────────────────────────────────────────────────────────
  async updateApkUrlAndGenerateQr(appId: string, apkUrl: string) {
    const qrCodeDataUrl = await QRCode.toDataURL(apkUrl);
    return { success: true, appId, apkUrl, qrCodeDataUrl };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Separate the big config object into multiple packs
  // ─────────────────────────────────────────────────────────────────────────────
  private splitIntoOTAPacks(fullAppData: any): Record<string, any> {
    const packs: Record<string, any> = {
      design: fullAppData.appDesign || {},
      layout: fullAppData.appLayout || {},
      screens: fullAppData.screens || [],
      onboarding: fullAppData.onboardingScreens || [],
    };
    const mobileApp = fullAppData.mobileApp || {};
    const repository = fullAppData.repository || {};
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
  // Insert references in pubspec.yaml
  // ─────────────────────────────────────────────────────────────────────────────
  private updatePubspecYaml(workingDir: string) {
    const pubspecPath = path.join(workingDir, 'pubspec.yaml');
    if (!fs.existsSync(pubspecPath)) return;

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
      pubspecContent = pubspecContent.replace(
        /(flutter:\s*)/,
        `$1\n${assetConfig}`
      );
      fs.writeFileSync(pubspecPath, pubspecContent, 'utf8');
      this.logger.log('Updated pubspec.yaml to include OTA asset references');
    }
  }
}
