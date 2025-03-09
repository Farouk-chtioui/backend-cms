import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as QRCode from 'qrcode';

@Injectable()
export class AppGenerationService {
  private readonly logger = new Logger(AppGenerationService.name);

  async generateOrUpdateFlutterApp(fullAppData: any): Promise<any> {
    try {
      // 1️⃣ Get appId for folder naming
      const appId = fullAppData.mobileApp?._id ? String(fullAppData.mobileApp._id) : 'no_id';
      const workingDir = path.join('C:\\Users\\WT\\Desktop\\PFE PROJECT\\flutter_builds', appId);
      const globalTemplateDir = path.join('C:\\Users\\WT\\Desktop\\PFE PROJECT\\flutter_template');

      this.logger.log(`Starting app generation for appId: ${appId}`);

      // 2️⃣ Ensure the Flutter template exists
      if (!fs.existsSync(globalTemplateDir)) {
        this.logger.error(`Template folder does not exist: ${globalTemplateDir}`);
        throw new Error(`Source template folder does not exist: ${globalTemplateDir}`);
      }

      // 3️⃣ Create working directory if new app
      let isNewApp = false;
      if (!fs.existsSync(workingDir)) {
        isNewApp = true;
        fs.mkdirSync(workingDir, { recursive: true });
        this.logger.log(`Created new working directory: ${workingDir}`);
        this.copyFolder(globalTemplateDir, workingDir);
      } else {
        this.logger.log(`Working directory already exists: ${workingDir}`);
      }

      // 4️⃣ Generate OTA packs uniquely for this app
      const otaPacks = this.splitIntoOTAPacks(fullAppData);
      if (!otaPacks || Object.keys(otaPacks).length === 0) {
        this.logger.error("OTA Pack generation failed!");
        throw new Error('OTA Pack generation failed!');
      }

      // 5️⃣ Write the OTA packs in the assets folder
      const packsDir = path.join(workingDir, 'assets', 'ota_packs');
      fs.mkdirSync(packsDir, { recursive: true });
      await Promise.all(
        Object.entries(otaPacks).map(async ([packName, packData]) => {
          await fs.promises.writeFile(
            path.join(packsDir, `${packName}_pack.json`),
            JSON.stringify(packData, null, 2),
            'utf8'
          );
          this.logger.log(`Wrote OTA pack for ${packName}`);
        })
      );

      // 6️⃣ Update pubspec.yaml to include the OTA packs
      this.updatePubspecYaml(workingDir);
      this.logger.log('Updated pubspec.yaml to include OTA packs');

      // 7️⃣ Trigger GitHub Actions workflow to build the app
      await this.triggerBuildWorkflow(fullAppData);
      this.logger.log("GitHub Actions workflow triggered");

      // 8️⃣ Track GitHub Actions run until it completes and get artifact URL.
      const apkUrl = await this.trackWorkflow(appId);
      this.logger.log(`APK URL retrieved: ${apkUrl}`);

      // 9️⃣ Update build result by generating QR code for the apkUrl.
      const buildResult = await this.updateApkUrlAndGenerateQr(appId, apkUrl);
      this.logger.log("Build result updated with QR code");

      // 10️⃣ Return build result including the generated QR code.
      return {
        success: true,
        message: isNewApp
          ? 'Flutter app creation triggered and build completed successfully'
          : 'Flutter app update triggered and build completed successfully',
        appName: fullAppData.mobileApp?.name || 'My Generated App',
        apkUrl: buildResult.apkUrl,
        qrCodeDataUrl: buildResult.qrCodeDataUrl,
        otaPacks: Object.fromEntries(
          Object.keys(otaPacks).map((packName) => [
            packName,
            path.join(packsDir, `${packName}_pack.json`),
          ])
        ),
      };
    } catch (error) {
      this.logger.error(`Error generating/updating Flutter app: ${error.message}`);
      throw error;
    }
  }

  // New method to track the GitHub Actions workflow
  // New method to track the GitHub Actions workflow and poll for artifacts.
async trackWorkflow(appId: string): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is missing!');
  }
  const repoOwner = 'Farouk-chtioui';
  const repoName = 'flutter_template';
  let runId: number | null = null;

  this.logger.log(`Tracking workflow for appId: ${appId}`);

  // Poll GitHub Actions API to find the latest active workflow run for our repository_dispatch event.
  const runsApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs?event=repository_dispatch`;
  let attempts = 0;
  const maxRunAttempts = 30; // ~5 minutes
  while (attempts < maxRunAttempts && !runId) {
    this.logger.log(`Checking workflow runs (attempt ${attempts + 1})`);
    const runsResponse = await axios.get(runsApiUrl, {
      headers: { Authorization: `token ${token}` },
    });
    const runs = runsResponse.data.workflow_runs;
    // Filter out runs that are already completed; only pick those that are queued or in_progress.
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

  // Poll for the workflow run status until it's completed.
  attempts = 0;
  const runApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs/${runId}`;
  let runStatus = "";
  const maxStatusAttempts = 60; // ~10 minutes max wait
  while (attempts < maxStatusAttempts) {
    const runResponse = await axios.get(runApiUrl, {
      headers: { Authorization: `token ${token}` },
    });
    runStatus = runResponse.data.status; // e.g., "in_progress" or "completed"
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

  // Once completed, poll for the artifact until it's available.
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
  // Construct the correct UI URL for the artifact.
  const apkUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${runId}/artifacts/${artifact.id}`;
  this.logger.log(`Workflow complete. APK URL: ${apkUrl}`);
  return apkUrl;
}


  // New method to update APK URL and generate QR code.
  async updateApkUrlAndGenerateQr(appId: string, apkUrl: string): Promise<any> {
    this.logger.log(`Updating app (${appId}) with APK URL: ${apkUrl}`);
    // Generate a QR code as a data URL
    const qrCodeDataUrl = await QRCode.toDataURL(apkUrl);
    this.logger.log(`QR Code generated for APK URL`);
    return { success: true, appId, apkUrl, qrCodeDataUrl };
  }

  // Helper method to split fullAppData into OTA packs.
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

  // Helper method to copy the template folder
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

  // Helper method to update pubspec.yaml for OTA packs.
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
`;
        pubspecContent = pubspecContent.replace(/(flutter:\s*)/, `$1\n${assetConfig}`);
        fs.writeFileSync(pubspecPath, pubspecContent, 'utf8');
        this.logger.log("Updated pubspec.yaml with OTA assets configuration");
      }
    }
  }

  // Helper method to trigger the GitHub Actions workflow via repository_dispatch.
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
