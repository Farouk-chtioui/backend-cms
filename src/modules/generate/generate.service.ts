// src/generate/generate.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import { join } from 'path';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import { MobileAppService } from '../mobile-app/mobile-app.service';
import { AppGenerationService } from '../app-generation/app-generation.service';

@Injectable()
export class GenerateService {
  private readonly logger = new Logger(GenerateService.name);

  constructor(
    private readonly mobileAppService: MobileAppService,
    private readonly appGenerationService: AppGenerationService,
  ) {}

  /**
   * 1) Fetch the entire data set for a given app (appId) from the CMS (MobileAppService).
   * 2) Call AppGenerationService to produce a Flutter app in the filesystem.
   * 3) Zip it up into an OTA package in "OTA_Packages/<appId>/OTA-<timestamp>.zip"
   */
  public async generateOtaPackage(appId: string): Promise<string> {
    try {
      // 1) Pull full app data from your existing mobile-app.service
      const fullAppData = await this.mobileAppService.getFullMobileAppData(appId);
      if (!fullAppData) {
        throw new BadRequestException(`No data found for appId ${appId}`);
      }

      // 2) Use your generation service to produce a fresh Flutter app
      const buildResult = await this.appGenerationService.generateOrUpdateFlutterApp(fullAppData);
      if (!buildResult?.outputPath) {
        throw new Error('Build output path is missing. Cannot create OTA package.');
      }
      const buildOutputPath = buildResult.outputPath;

      // 3) Zip the output folder as your "OTA package"
      const otaFolder = join(process.cwd(), 'OTA_Packages', appId);
      if (!fs.existsSync(otaFolder)) {
        fs.mkdirSync(otaFolder, { recursive: true });
      }
      // Name of the OTA zip file
      const otaFilePath = join(otaFolder, `OTA-${Date.now()}.zip`);

      // On Unix-like systems, we can run:
      childProcess.execSync(`zip -r ${otaFilePath} .`, {
        cwd: buildOutputPath, // zip everything in the build output folder
      });

      this.logger.log(`OTA package created for appId ${appId}: ${otaFilePath}`);
      return otaFilePath;
    } catch (error) {
      this.logger.error(`Failed to generate OTA package for appId ${appId}`, error.stack);
      throw error;
    }
  }

  /**
   * Inject a previously-generated OTA package into an existing Flutter template.
   *
   * - Looks for the "templatePath" under e.g. "flutter_templates/<appId>".
   * - Unzips the OTA package into the template. (Merging is up to you.)
   */
  public async injectOtaIntoFlutterTemplate(appId: string, otaPackagePath: string): Promise<string> {
    try {
      const templatePath = join(process.cwd(), 'flutter_templates', appId);

      // Check that we have a template for this app
      if (!fs.existsSync(templatePath)) {
        throw new BadRequestException(`No Flutter template found for appId ${appId}`);
      }

      // Verify the OTA package file
      if (!fs.existsSync(otaPackagePath)) {
        throw new BadRequestException(`OTA package not found: ${otaPackagePath}`);
      }

      // We'll unzip into a subfolder of the template
      const injectionDir = join(templatePath, `injection-${Date.now()}`);
      fs.mkdirSync(injectionDir, { recursive: true });

      // On Linux/macOS: "unzip <file> -d <dir>"
      childProcess.execSync(`unzip ${otaPackagePath} -d ${injectionDir}`);

      // Next, you'd typically merge these new files into your template folder
      // Example: childProcess.execSync(`cp -Rf ${join(injectionDir, '*')} ${templatePath}`);

      // Optional: run flutter build
      // childProcess.execSync('flutter pub get && flutter build apk', { cwd: templatePath });

      this.logger.log(`Injected OTA from ${otaPackagePath} into template at ${templatePath}`);
      return templatePath;
    } catch (error) {
      this.logger.error(
        `Failed to inject OTA package ${otaPackagePath} for appId ${appId}`,
        error.stack,
      );
      throw error;
    }
  }
}
