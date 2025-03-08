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

      // Define working directory and template directory
      const workingDir = path.join('C:\\Users\\WT\\Desktop\\PFE PROJECT\\flutter_builds', appIdString);
      const globalTemplateDir = path.join('C:\\Users\\WT\\Desktop\\PFE PROJECT\\flutter_template');

      // 2) Check if the template exists and if workingDir already exists
      let isNewApp = false;
      if (!fs.existsSync(globalTemplateDir)) {
        throw new Error(`Source template folder does not exist: ${globalTemplateDir}`);
      }
      if (!fs.existsSync(workingDir)) {
        isNewApp = true;
        fs.mkdirSync(workingDir, { recursive: true });
        // Copy the global template into the working directory.
        // Non-OTA files will be symlinked to save space.
        this.copyFolder(globalTemplateDir, workingDir);
      }

      // 3) Generate the OTA packs uniquely for this app
      const otaPacks = this.splitIntoOTAPacks(fullAppData);

      // 4) Write (or overwrite) these OTA packs in the assets folder so Flutter can access them
      const packsDir = path.join(workingDir, 'assets', 'ota_packs');
      fs.mkdirSync(packsDir, { recursive: true });
      Object.entries(otaPacks).forEach(([packName, packData]) => {
        fs.writeFileSync(
          path.join(packsDir, `${packName}_pack.json`),
          JSON.stringify(packData, null, 2),
          'utf8'
        );
      });

      // 5) Update Flutter's pubspec.yaml to include the OTA packs in assets
      const pubspecPath = path.join(workingDir, 'pubspec.yaml');
      if (fs.existsSync(pubspecPath)) {
        let pubspecContent = fs.readFileSync(pubspecPath, 'utf8');
        if (!pubspecContent.includes('assets/ota_packs/')) {
          pubspecContent += `
flutter:
  assets:
    - assets/ota_packs/design_pack.json
    - assets/ota_packs/layout_pack.json
    - assets/ota_packs/screens_pack.json
    - assets/ota_packs/onboarding_pack.json
    - assets/ota_packs/config_pack.json
`;
          fs.writeFileSync(pubspecPath, pubspecContent, 'utf8');
        }
      }

      // 6) Optionally update a Dart config file
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

      // 7) Optimize build process: run flutter commands only when needed.
      // Define the APK path.
      const apkPath = path.join(
        workingDir,
        'build',
        'app',
        'outputs',
        'apk',
        'release',
        'app-release.apk'
      );

      // Here we simply rebuild if it's a new app or if the APK doesn't exist yet.
      const dependenciesChanged = isNewApp || !fs.existsSync(apkPath);

      if (dependenciesChanged) {
        // Run flutter pub get to install dependencies.
        await this.runCommand('flutter pub get', { cwd: workingDir });
        // Use incremental build flags:
        await this.runCommand('flutter build apk --release --split-per-abi --no-tree-shake-icons', { cwd: workingDir });
      } else {
        this.logger.log(`Skipping full build. Using cached APK: ${apkPath}`);
      }

      // 8) Return result
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
   * Splits the fullAppData into separate OTA packs.
   * Each pack is unique per client.
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
   * Non-OTA files are symlinked to save storage,
   * while OTA packs are handled separately.
   */
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
        // For files that are not part of OTA packs, use symbolic links.
        // OTA packs are generated separately.
        if (!destPath.includes('ota_packs')) {
          if (!fs.existsSync(destPath)) {
            fs.symlinkSync(srcPath, destPath, 'file');
          }
        }
      }
    }
  }
  
  /**
   * Executes a shell command.
   */
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
