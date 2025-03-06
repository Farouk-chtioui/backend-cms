import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppGenerationService {
  private readonly logger = new Logger(AppGenerationService.name);

  async generateFlutterApp(fullAppData: any): Promise<any> {
    try {
      // 1) Create a unique folder for the build
      const timestamp = Date.now().toString();
      const workingDir = path.join('/tmp/flutter_builds', timestamp);
      fs.mkdirSync(workingDir, { recursive: true });

      // 2) Copy your base flutter_template into workingDir
      const templateDir = path.join(__dirname, '../../../../flutter_template');
      this.copyFolder(templateDir, workingDir);

      // -----------------------------------------------
      // Generate OTA packs from full app data
      // -----------------------------------------------
      const otaPacks = this.splitIntoOTAPacks(fullAppData);
      const appName = fullAppData.mobileApp?.name || 'My Generated App';

      // 3) Write these packs as separate JSON files
      const packsDir = path.join(workingDir, 'ota_packs');
      fs.mkdirSync(packsDir, { recursive: true });

      // Write each OTA pack to a JSON file
      Object.entries(otaPacks).forEach(([packName, packData]) => {
        fs.writeFileSync(
          path.join(packsDir, `${packName}_pack.json`),
          JSON.stringify(packData, null, 2),
          'utf8'
        );
      });

      // 4) If you still want to generate "app_config.dart" or "screens_config.dart"
      // for the static build, you can do so as well.
      const configDir = path.join(workingDir, 'lib', 'config');
      fs.mkdirSync(configDir, { recursive: true });

      const appConfigDart = `
        // Auto-generated config file
        class AppConfig {
          static const String appName = "${appName}";
        }
      `;
      fs.writeFileSync(path.join(configDir, 'app_config.dart'), appConfigDart, 'utf8');

      // 5) Optionally, run flutter build
      await this.runCommand('flutter pub get', { cwd: workingDir });
      await this.runCommand('flutter build apk --release', { cwd: workingDir });

      const apkPath = path.join(
        workingDir,
        'build',
        'app',
        'outputs',
        'apk',
        'release',
        'app-release.apk'
      );

      // 6) Return info, including where the packs are stored
      return {
        success: true,
        message: 'Flutter app generated successfully',
        appName,
        apkPath,
        otaPacks: Object.fromEntries(
          Object.keys(otaPacks).map(packName => [
            packName,
            path.join(packsDir, `${packName}_pack.json`)
          ])
        ),
      };
    } catch (error) {
      this.logger.error(`Error generating Flutter app: ${error.message}`);
      throw error;
    }
  }

  // Helper method to split fullAppData into separate OTA packs
  private splitIntoOTAPacks(fullAppData: any): Record<string, any> {
    const packs: Record<string, any> = {};
    
    // App design pack
    packs.design = fullAppData.zz || {};
    
    // App layout pack
    packs.layout = fullAppData.appLayout || {};
    
    // Screens pack
    packs.screens = fullAppData.screens || [];
    
    // Onboarding screens pack
    packs.onboarding = fullAppData.onboardingScreens || [];
    
    // App config pack (basic app information)
    packs.config = {
      appName: fullAppData.mobileApp?.name || 'My Generated App',
      appId: fullAppData.mobileApp?._id || null,
      packageName: fullAppData.mobileApp?.packageName || 'com.generated.app',
      version: fullAppData.mobileApp?.version || '1.0.0',
    };
    
    // Additional packs can be added as needed
    
    return packs;
  }

  // Helper to copy entire folder
  private copyFolder(src: string, dest: string) {
    if (!fs.existsSync(src)) {
      throw new Error(`Source folder does not exist: ${src}`);
    }
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
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

  // Helper to run commands
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
