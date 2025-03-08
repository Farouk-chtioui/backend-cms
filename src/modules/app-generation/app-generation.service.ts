import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppGenerationService {
  private readonly logger = new Logger(AppGenerationService.name);

  async generateOrUpdateFlutterApp(fullAppData: any): Promise<any> {
    try {
      // 1) Get the appId as a string for folder naming
      const appIdString = fullAppData.mobileApp?._id
        ? String(fullAppData.mobileApp._id)
        : 'no_id';

      // We'll store each app's code in a folder named after the appId
      const workingDir = path.join('../../../tmp/flutter_builds', appIdString);

      // 2) Check if the folder already exists
      let isNewApp = false;
      if (!fs.existsSync(workingDir)) {
        // No folder yet => first time build => copy template
        isNewApp = true;
        fs.mkdirSync(workingDir, { recursive: true });

        const templateDir = path.join(__dirname, '../../../../flutter_template');
        this.copyFolder(templateDir, workingDir);
      }

      // 3) Generate the OTA packs
      const otaPacks = this.splitIntoOTAPacks(fullAppData);

      // 4) Write (or overwrite) these packs in the same folder
      const packsDir = path.join(workingDir, 'ota_packs');
      fs.mkdirSync(packsDir, { recursive: true });

      // Overwrite or create JSON files for each pack
      Object.entries(otaPacks).forEach(([packName, packData]) => {
        fs.writeFileSync(
          path.join(packsDir, `${packName}_pack.json`),
          JSON.stringify(packData, null, 2),
          'utf8'
        );
      });

      // 5) Optionally update a Dart config file
      const mobileApp = fullAppData.mobileApp || {};
      const configDir = path.join(workingDir, 'lib', 'config');
      fs.mkdirSync(configDir, { recursive: true });

      const appConfigDart = `
        // Auto-generated config file
        class AppConfig {
          static const String appId = "${mobileApp._id ?? ''}";
          static const String name = "${mobileApp.name ?? ''}";
          static const String packageName = "${mobileApp.packageName ?? ''}";
          static const String version = "${mobileApp.version ?? ''}";
          static const String environment = "${mobileApp.environment ?? ''}";
          // Add more fields as needed
        }
      `;
      fs.writeFileSync(path.join(configDir, 'app_config.dart'), appConfigDart, 'utf8');

      // 6) Decide if you want to run flutter commands every time or only on first creation
      //    If you want a full build for updates as well, keep it as is. Otherwise, skip for updates.
      //    Example: run on first build only
      if (isNewApp) {
        await this.runCommand('flutter pub get', { cwd: workingDir });
        await this.runCommand('flutter build apk --release', { cwd: workingDir });
      } else {
        // Optionally re-run build if needed:
        // await this.runCommand('flutter build apk --release', { cwd: workingDir });
      }

      // 7) Where is the APK, if built?
      const apkPath = path.join(
        workingDir,
        'build',
        'app',
        'outputs',
        'apk',
        'release',
        'app-release.apk'
      );

      return {
        success: true,
        message: isNewApp
          ? 'Flutter app created successfully'
          : 'Flutter app updated successfully',
        appName: mobileApp.name || 'My Generated App',
        apkPath: fs.existsSync(apkPath) ? apkPath : null,
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

  /**
   * Splits the fullAppData into separate OTA packs
   */
  private splitIntoOTAPacks(fullAppData: any): Record<string, any> {
    const packs: Record<string, any> = {};

    // For example:
    packs.design = fullAppData.appDesign || {};
    packs.layout = fullAppData.appLayout || {};
    packs.screens = fullAppData.screens || [];
    packs.onboarding = fullAppData.onboardingScreens || [];
    // Put entire mobileApp data into config pack
    const mobileApp = fullAppData.mobileApp || {};
    packs.config = {
      ...mobileApp,
      _id: mobileApp._id ? String(mobileApp._id) : undefined,
    };

    return packs;
  }

  private copyFolder(src: string, dest: string) {
    if (!fs.existsSync(src)) {
      throw new Error(`Source folder does not exist: ${src}`);
    }
    fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyFolder(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  private runCommand(command: string, options: { cwd: string }): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, options, (error, stdout, stderr) => {
        if (error) {
          this.logger.error(`Command failed: ${command}, error: ${error.message}`);
          this.logger.error(stderr);
          return reject(error);
        }
        this.logger.debug(`Command succeeded: ${command}\n${stdout}`);
        return resolve(stdout);
      });
    });
  }
}
