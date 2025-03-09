import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

@Injectable()
export class AppGenerationService {
  private readonly logger = new Logger(AppGenerationService.name);

  async generateOrUpdateFlutterApp(fullAppData: any): Promise<any> {
    try {
      // 1️⃣ Get appId for folder naming
      const appIdString = fullAppData.mobileApp?._id ? String(fullAppData.mobileApp._id) : 'no_id';

      // Define working directory and template directory
      const workingDir = path.join('C:\\Users\\WT\\Desktop\\PFE PROJECT\\flutter_builds', appIdString);
      const globalTemplateDir = path.join('C:\\Users\\WT\\Desktop\\PFE PROJECT\\flutter_template');

      // 2️⃣ Ensure the Flutter template exists
      if (!fs.existsSync(globalTemplateDir)) throw new Error(`Source template folder does not exist: ${globalTemplateDir}`);

      // 3️⃣ Create working directory if new app
      let isNewApp = false;
      if (!fs.existsSync(workingDir)) {
        isNewApp = true;
        fs.mkdirSync(workingDir, { recursive: true });
        this.copyFolder(globalTemplateDir, workingDir);
      }

      // 4️⃣ Generate OTA packs uniquely for this app
      const otaPacks = this.splitIntoOTAPacks(fullAppData);
      if (!otaPacks || Object.keys(otaPacks).length === 0) throw new Error('OTA Pack generation failed!');

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
        })
      );

      // 6️⃣ Update pubspec.yaml to include the OTA packs
      this.updatePubspecYaml(workingDir);

      // 7️⃣ Trigger GitHub Actions workflow to build the app
      await this.triggerBuildWorkflow(fullAppData);

      // 8️⃣ Return response that build has started
      return {
        success: true,
        message: isNewApp ? 'Flutter app creation triggered successfully' : 'Flutter app update triggered successfully',
        appName: fullAppData.mobileApp?.name || 'My Generated App',
        apkPath: null, // CI/CD will handle builds, no local APK available
        otaPacks: Object.fromEntries(
          Object.keys(otaPacks).map((packName) => [
            packName, path.join(packsDir, `${packName}_pack.json`),
          ])
        ),
      };
    } catch (error) {
      this.logger.error(`Error generating/updating Flutter app: ${error.message}`);
      throw error;
    }
  }

  /**
   * Splits fullAppData into separate OTA packs.
   */
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

  /**
   * Copies the template folder to the destination.
   * Uses file copying instead of symlinks on Windows.
   */
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

  /**
   * Updates pubspec.yaml to include OTA packs without duplicates.
   */
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
      }
    }
  }

  /**
   * Triggers GitHub Actions workflow via repository_dispatch.
   */
  private async triggerBuildWorkflow(configPayload: any): Promise<void> {
    const token = process.env.GITHUB_TOKEN || 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN';
    if (!token) {
      this.logger.error('❌ GITHUB_TOKEN is missing!'); // Add logging
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
