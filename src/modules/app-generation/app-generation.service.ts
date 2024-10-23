import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppGenerationService {
  private readonly templateBasePath = path.resolve(__dirname, '../../../../BaseAppTemplate'); // Adjust as needed
  private readonly outputBasePath = path.resolve(__dirname, '../../../../output/');

  async generateApp(appName: string, appDesign: any): Promise<string> {
    const outputPath = this.getOutputPath(appName);

    await this.copyTemplate(this.templateBasePath, outputPath);
    this.applyTheme(outputPath, appName, appDesign);

    return outputPath;
  }

  private getOutputPath(appName: string): string {
    return path.join(this.outputBasePath, appName);
  }

  private async copyTemplate(templatePath: string, outputPath: string): Promise<void> {
    this.removeIfExists(outputPath);
    fs.cpSync(templatePath, outputPath, { recursive: true });
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
}
