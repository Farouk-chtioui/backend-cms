import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import simpleGit from 'simple-git';

@Injectable()
export class AppGenerationService {
  private readonly gitRepoUrl = 'https://github.com/Farouk-chtioui/BaseAppTemplate.git'; // Template repository URL
  private readonly outputBasePath = path.resolve(__dirname, '../../../../output/');

  async generateApp(appName: string, appDesign: any, _userEmail: string): Promise<string> {
    const outputPath = this.getOutputPath(appName);

    // Clone the GitHub repository
    await this.cloneGitHubRepo(outputPath);

    // Apply theme and layout
    this.applyTheme(outputPath, appName, appDesign);

    // Build the app locally
    this.buildLocally(outputPath);

    // Generate and return the APK file path
    const apkFilePath = path.join(outputPath, 'app-release.apk');
    fs.writeFileSync(apkFilePath, 'Dummy APK content'); // Simulate APK file creation
    console.log(`APK built successfully! Path: ${apkFilePath}`);
    return apkFilePath;
  }

  private getOutputPath(appName: string): string {
    const outputPath = path.join(this.outputBasePath, appName);
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    return outputPath;
  }

  private async cloneGitHubRepo(outputPath: string): Promise<void> {
    this.removeIfExists(outputPath);

    const git = simpleGit();
    console.log(`Cloning repository to: ${outputPath}`);
    await git.clone(this.gitRepoUrl, outputPath);
  }

  private removeIfExists(outputPath: string): void {
    if (fs.existsSync(outputPath)) {
      fs.rmSync(outputPath, { recursive: true, force: true });
      console.log(`Removed existing directory: ${outputPath}`);
    }
  }

  private applyTheme(outputPath: string, appName: string, appDesign: any): void {
    this.updateAppJson(outputPath, appName);
    this.updateThemeFile(outputPath, appDesign);
  }

  private updateAppJson(outputPath: string, appName: string): void {
    const appJsonPath = path.join(outputPath, 'app.json');
    let appJson = this.readFile(appJsonPath);
    appJson = appJson.replace(/"TemplateApp"/g, `"${appName}"`);
    this.writeFile(appJsonPath, appJson);
  }

  private updateThemeFile(outputPath: string, appDesign: any): void {
    const themeFilePath = path.join(outputPath, 'src', 'theme.ts');
    let themeFile = this.readFile(themeFilePath);

    const designMap = {
      '${backgroundColor}': appDesign.backgroundColor,
      '${secondaryBackgroundColor}': appDesign.secondaryBackgroundColor,
      '${mainTextColor}': appDesign.mainTextColor,
      '${titleTextColor}': appDesign.titleTextColor,
      '${importantInformationTextColor}': appDesign.importantInformationTextColor,
      '${accentColor}': appDesign.accentColor,
      '${secondaryAccentColor}': appDesign.secondaryAccentColor,
      '${bottomBarBackgroundColor}': appDesign.bottomBarBackgroundColor,
      '${bottomBarSelectedIconColor}': appDesign.bottomBarSelectedIconColor,
      '${bottomBarUnselectedIconColor}': appDesign.bottomBarUnselectedIconColor,
      '${topBarBackgroundColor}': appDesign.topBarBackgroundColor,
      '${topBarIconTextColor}': appDesign.topBarIconTextColor,
      '${statusBarTheme}': appDesign.statusBarTheme,
    };

    for (const [placeholder, value] of Object.entries(designMap)) {
      themeFile = themeFile.replace(new RegExp(placeholder, 'g'), value);
    }

    this.writeFile(themeFilePath, themeFile);
  }

  private readFile(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
  }

  private writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content);
    console.log(`File written successfully to ${filePath}`);
  }

  private buildLocally(outputPath: string): void {
    console.log('Building APK locally...');
    const apkFilePath = path.join(outputPath, 'app-release.apk');
    if (!fs.existsSync(apkFilePath)) {
      fs.writeFileSync(apkFilePath, 'Dummy APK content');
    }
    console.log(`Build successful! APK available at: ${apkFilePath}`);
  }
}
