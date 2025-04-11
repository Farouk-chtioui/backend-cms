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

  // -----------------------------------------------------------------
  // UPDATED METHOD: Now takes a separate `forceOtaUpdate` param
  // -----------------------------------------------------------------
  async generateOrUpdateFlutterApp(
    fullAppData: any, 
    updateOnlyOta: boolean = false,
    forceRebuild: boolean = false,
    forceOtaUpdate: boolean = false
  ): Promise<any> {
    try {
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

      this.logger.log(
        `Starting app generation for appId: ${appId}, name: ${appName}`
      );
      this.logger.log(
        `Update only OTA: ${updateOnlyOta}, Force rebuild: ${forceRebuild}, Force OTA update: ${forceOtaUpdate}`
      );

      // 1) Ensure local working directory is set up
      let hasSetupError = false;
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

      // 2) Generate local JSON (OTA packs)
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

      // 4) Decide if we only want an OTA update (based on user choice, not presence of an APK)
      const shouldUpdateOtaOnly = updateOnlyOta && !forceRebuild;

      // 5) Check if OTA has any changes
      //    Now we do NOT override with forceRebuild; we only override if forceOtaUpdate is true
      const hasOtaChanges = await this.checkOtaChanges(workingDir, appId, forceOtaUpdate);
      this.logger.log(`OTA changes detected: ${hasOtaChanges}`);

      // 6) If user requested OTA-only and no changes, skip everything
      if (shouldUpdateOtaOnly && !hasOtaChanges) {
        this.logger.log(
          'User requested OTA-only update, but no changes found in OTA packs. ' +
          'Skipping build & upload.'
        );

        // Return existing APK info if we have one
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
          message: 'No OTA changes, existing build remains valid; skipping everything.',
          appName,
          appLogo,
          apkUrl: apkDownloadUrl,
          qrCodeDataUrl,
          otaPacks: {},
        };
      }

      // 7) Upload OTA packs if changed or forced
      let uploadResults = {};
      let changedSomething = hasOtaChanges;
      // Now we pass `forceOtaUpdate` instead of `forceRebuild` to the uploader
      if (hasOtaChanges || forceOtaUpdate) {
        const result = await this.uploadOtaPacksToCloud(workingDir, appId, forceOtaUpdate);
        uploadResults = result.uploadResults;
        changedSomething = result.changedSomething;
      }

      // 8) Build endpoints for the new or existing OTA files
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
        const shortHash = crypto
          .createHash('md5')
          .update(appId)
          .digest('hex')
          .slice(0, 8);
        const stableEndpointsId = `${shortHash}_endpoints`
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, '_')
          .slice(0, 36);

        // Delete existing endpoints file if present
        try {
          await storage.deleteFile(process.env.APPWRITE_OTA_BUCKET_ID, stableEndpointsId);
        } catch {
          /* ignore if nonexistent */
        }

        const endpointsContent = await fs.promises.readFile(endpointsFilePath);
        const blob = new Blob([endpointsContent], { type: 'application/json' });
        const customFileName = `${appId}_endpoints.json`;
        await storage.createFile(
          process.env.APPWRITE_OTA_BUCKET_ID,
          stableEndpointsId,
          new File([blob], customFileName, { type: 'application/json' })
        );

        // Also add a “otaEndpoints.global” link that references endpoints.json
        otaEndpoints['global'] = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_OTA_BUCKET_ID}/files/${stableEndpointsId}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
      } catch (err) {
        this.logger.error(`Failed uploading endpoints file: ${err.message}`);
      }

      // 9) Update pubspec.yaml to include references to the assets/ota_packs
      this.updatePubspecYaml(workingDir);

      // 10) If we only needed OTA or if no new changes while an APK exists, skip full build
      //     i.e. user specifically said “OTA only”, or we have an existing APK and nothing changed
      const skipFullBuild = shouldUpdateOtaOnly || (!changedSomething && existingApkFileId);
      if (skipFullBuild) {
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
          message: 'OTA packs updated. No new build triggered.',
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

      // 11) If forcing a rebuild, remove the existing APK first
      if (forceRebuild && existingApkFileId) {
        await this.deleteExistingApk(existingApkFileId);
        this.logger.log(`Force rebuild: deleted existing APK ID = ${existingApkFileId}`);
      }

      // 12) Trigger GH Actions, wait for artifact, then upload
      await this.triggerBuildWorkflow(fullAppData, otaEndpoints);
      const githubArtifact = await this.trackWorkflow(appId);
      const apkFileId = await this.downloadAndUploadApkToAppwrite(githubArtifact, appId);

      // 13) Create final download/QR codes
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
      this.logger.error(`Failed to generate mobile app: ${error.message}`);
      throw error;
    }
  }

  // -----------------------------------------------------------------
  // Checks if there are changes to any local OTA JSON files by MD5.
  // We only override this with `true` if `forceOtaUpdate` is true,
  // meaning user specifically wants to forcibly re-upload everything.
  // -----------------------------------------------------------------
  private async checkOtaChanges(
    workingDir: string,
    appId: string,
    forceOtaUpdate: boolean
  ): Promise<boolean> {
    const packsDir = path.join(workingDir, 'assets', 'ota_packs');
    if (!fs.existsSync(packsDir)) {
      return false;
    }
    // Exclude endpoints.json
    const files = fs.readdirSync(packsDir).filter((f) => f !== 'endpoints.json');

    for (const fileName of files) {
      const filePath = path.join(packsDir, fileName);
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const contentHash = crypto.createHash('md5').update(rawContent).digest('hex');
      const cacheKey = `${appId}_${fileName}`;

      // If user forced OTA update or local file MD5 differs from what's cached
      if (forceOtaUpdate || this.otaPackHashCache.get(cacheKey) !== contentHash) {
        return true;
      }
    }
    return false;
  }

  // -----------------------------------------------------------------
  // Clones the flutter_template repo
  // -----------------------------------------------------------------
  private async cloneFlutterTemplate(workingDir: string) {
    const repoUrl = 'https://github.com/Farouk-chtioui/flutter_template.git';
    this.logger.log(`Cloning template from GitHub: ${repoUrl}`);
    execSync(`git clone --depth 1 ${repoUrl} .`, { cwd: workingDir });
    this.logger.log('Cloned flutter_template successfully');
  }

  // -----------------------------------------------------------------
  // Upload changed OTA packs to Appwrite (plus forced if `forceOtaUpdate`)
  // -----------------------------------------------------------------
  async uploadOtaPacksToCloud(
    workingDir: string,
    appId: string,
    forceOtaUpdate: boolean
  ) {
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

    // concurrency-limited parallel
    const concurrencyLimit = 5;
    const tasks: Array<() => Promise<void>> = [];

    for (const fileName of files) {
      // Skip endpoints.json; we do that after
      if (fileName === 'endpoints.json') {
        continue;
      }

      tasks.push(async () => {
        const filePath = path.join(packsDir, fileName);
        const rawContent = fs.readFileSync(filePath, 'utf8');
        const contentHash = crypto.createHash('md5').update(rawContent).digest('hex');
        const cacheKey = `${appId}_${fileName}`;

        // If we forced an OTA update or if MD5 changed, re-upload
        const isChanged = forceOtaUpdate ||
          this.otaPackHashCache.get(cacheKey) !== contentHash;

        if (!isChanged) {
          this.logger.log(`No changes for ${fileName}; skipping upload`);
          // We still store a "stableFileId" for reference
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
        // Re-upload
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

        // Delete old file if it exists
        try {
          await storage.getFile(process.env.APPWRITE_OTA_BUCKET_ID, stableFileId);
          this.logger.log(`Deleting old file ${stableFileId} before re-uploading`);
          await storage.deleteFile(process.env.APPWRITE_OTA_BUCKET_ID, stableFileId);
        } catch (errGet: any) {
          // If not found, ignore
          this.logger.debug(
            `No existing file for ID ${stableFileId}: ${errGet.message}`
          );
        }

        // Upload new
        const blob = new Blob([rawContent], { type: 'application/json' });
        const fileObj = new File([blob], `${appId}_${fileName}`, {
          type: 'application/json',
        });
        await storage.createFile(
          process.env.APPWRITE_OTA_BUCKET_ID,
          stableFileId,
          fileObj
        );

        // Update local cache
        this.otaPackHashCache.set(cacheKey, contentHash);

        // Store stableFileId
        uploadResults[fileName] = stableFileId;
        this.logger.log(`Uploaded ${fileName} -> ID: ${stableFileId}`);
      });
    }

    // concurrency-limited parallel
    await this.runConcurrently(tasks, concurrencyLimit);

    // Save updated cache
    const cacheObj = Object.fromEntries(this.otaPackHashCache);
    const cachePath = path.resolve(__dirname, 'ota-md5-cache.json');
    fs.writeFileSync(cachePath, JSON.stringify(cacheObj, null, 2), 'utf8');

    return { uploadResults, changedSomething };
  }

  // small helper for concurrency
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

  // -----------------------------------------------------------------
  // Check if there's an existing zip for the app in Appwrite
  // -----------------------------------------------------------------
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
        this.logger.log(
          `Found existing APK for ${mobileAppId}: ${res.files[0].$id}`
        );
        return res.files[0].$id;
      }
      return null;
    } catch (error) {
      this.logger.error(`checkExistingApk failed: ${error.message}`);
      return null;
    }
  }

  // -----------------------------------------------------------------
  // Delete an existing APK if needed
  // -----------------------------------------------------------------
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

  // -----------------------------------------------------------------
  // Download artifact from GitHub, store in Appwrite as a ZIP
  // -----------------------------------------------------------------
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
          `GitHub artifact download 404. Artifact may be missing: ${downloadUrl}`
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

    // Upload new
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

  // -----------------------------------------------------------------
  // Generate endpoints for each OTA pack
  // -----------------------------------------------------------------
  private generateOtaEndpoints(otaUploads: Record<string, string>): Record<string, string> {
    const endpoints: Record<string, string> = {};
    for (const fileName in otaUploads) {
      const fileId = otaUploads[fileName];
      const packKey = fileName.replace('_pack.json', '');
      endpoints[packKey] = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_OTA_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
    }
    return endpoints;
  }

  // -----------------------------------------------------------------
  // Trigger GH Actions exactly once
  // -----------------------------------------------------------------
  private async triggerBuildWorkflow(fullAppData: any, otaEndpoints: any) {
    const token = process.env.GITHUB_TOKEN;
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
      // GitHub API returns 204 on success
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
          'GitHub returned 403. Check your token scopes ("repo", "workflow") and that dispatch is enabled.'
        );
      }
      if (err.response?.status === 404) {
        this.logger.error(
          `GitHub 404. Check that the repo ${repoOwner}/${repoName} exists and the token has access.`
        );
      }
      throw err;
    }
    this.logger.log('Triggered GitHub Actions build workflow (single trigger).');
  }

  // -----------------------------------------------------------------
  // Poll GH for a new run, wait for completion, find “flutter-release-apk” artifact
  // -----------------------------------------------------------------
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
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    if (!runId) {
      throw new Error('No active repository_dispatch run found');
    }

    // 2) wait for completion
    const runApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs/${runId}`;
    for (let j = 0; j < 60; j++) {
      const runResp = await axios.get(runApiUrl, {
        headers: { Authorization: `token ${token}` },
      });
      if (runResp.data.status === 'completed') {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    // 3) find “flutter-release-apk” artifact
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
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    if (!artifact) {
      throw new Error("Artifact 'flutter-release-apk' not found");
    }
    return artifact;
  }

  // -----------------------------------------------------------------
  // Store an APK URL & generate a QR code
  // -----------------------------------------------------------------
  async updateApkUrlAndGenerateQr(appId: string, apkUrl: string) {
    const qrCodeDataUrl = await QRCode.toDataURL(apkUrl);
    return { success: true, appId, apkUrl, qrCodeDataUrl };
  }

  // -----------------------------------------------------------------
  // Break down config object into multiple packs
  // -----------------------------------------------------------------
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

  // -----------------------------------------------------------------
  // Insert references to the OTA pack assets into pubspec.yaml
  // -----------------------------------------------------------------
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
