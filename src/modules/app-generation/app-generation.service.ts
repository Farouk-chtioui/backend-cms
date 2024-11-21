import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import simpleGit from 'simple-git';

@Injectable()
export class AppGenerationService {
  private readonly gitRepoUrl = 'https://github.com/Farouk-chtioui/BaseAppTemplate.git'; // The template repo URL
  private readonly outputBasePath = path.resolve(__dirname, '../../../../output/');

  async generateApp(appName: string, appDesign: any, _userEmail: string): Promise<void> {
    const outputPath = this.getOutputPath(appName);

    await this.cloneGitHubRepo(outputPath);

    this.applyTheme(outputPath, appName, appDesign);

    // testing only locally to be changed later to the real app layout
    this.buildLocally(outputPath);
    //for now log the path of the generated app
    const apkFilePath = path.join(outputPath, 'app-release.apk');
    fs.writeFileSync(apkFilePath, 'Dummy APK content'); // Simulate APK file creation
    console.log(`APK built successfully! Path: ${apkFilePath}`);
  }

  private getOutputPath(appName: string): string {
    return path.join(this.outputBasePath, appName);
  }

  //add this later in the Generation app 
  private applyLayout(outputPath: string, appLayout: any): void {
    const layoutFilePath = path.join(outputPath, 'src', 'layout.ts');
    let layoutFile = this.readFile(layoutFilePath);

    const layoutMap = {
        '${tabs}': JSON.stringify(appLayout.tabs),
        '${layoutType}': appLayout.layoutType,
    };

    for (const [placeholder, value] of Object.entries(layoutMap)) {
        layoutFile = layoutFile.replace(new RegExp(placeholder, 'g'), value);
    }

    this.writeFile(layoutFilePath, layoutFile);
}

  private async cloneGitHubRepo(outputPath: string): Promise<void> {
    this.removeIfExists(outputPath);

    const git = simpleGit();
    await git.clone(this.gitRepoUrl, outputPath);
  }

  private removeIfExists(outputPath: string): void {
    if (fs.existsSync(outputPath)) {
      fs.rmSync(outputPath, { recursive: true, force: true });
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

    themeFile = this.applyDesignToTheme(themeFile, appDesign);
    this.writeFile(themeFilePath, themeFile);
  }

  private applyDesignToTheme(themeFile: string, appDesign: any): string {
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

    return themeFile;
  }

  private readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
  }

  private writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content);
  }

  private buildLocally(outputPath: string): void {
    console.log('Building APK locally...');
    console.log(`Build successful! APK is available at ${outputPath}/app-release.apk`);
  }
}
