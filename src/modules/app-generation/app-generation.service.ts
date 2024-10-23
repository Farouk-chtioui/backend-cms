import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppGenerationService {
  // Method to generate the app and inject dynamic theme values
  async generateApp(appName: string, appDesign: any): Promise<string> {
    const templatePath = path.resolve(__dirname, '../../../../BaseAppTemplate');  // Adjust path to your actual template folder
    const outputPath = path.resolve(__dirname, '../../../../output/', appName);

    // Step 1: Copy template to the output folder
    await this.copyTemplate(templatePath, outputPath);

    // Step 2: Inject dynamic values into app.json and theme.js
    this.applyTheme(outputPath, appName, appDesign);

    // Step 3: Build the app or return the source code folder
    return outputPath;  // Path to the generated app
  }

  // Helper method to copy the template
  private async copyTemplate(templatePath: string, outputPath: string): Promise<void> {
    if (fs.existsSync(outputPath)) {
      fs.rmSync(outputPath, { recursive: true, force: true }); // Remove existing folder if any
    }
    fs.cpSync(templatePath, outputPath, { recursive: true });
  }

  // Helper method to inject values into app.json and theme.js
  private applyTheme(outputPath: string, appName: string, appDesign: any): void {
    // Update app.json with the actual app name
    const appJsonPath = path.join(outputPath, 'app.json');
    let appJson = fs.readFileSync(appJsonPath, 'utf8');
    appJson = appJson.replace(/"TemplateApp"/g, `"${appName}"`);
    fs.writeFileSync(appJsonPath, appJson);

    // Update theme.js with the actual design settings
    const themeFilePath = path.join(outputPath, 'src', 'theme.ts');
    let themeFile = fs.readFileSync(themeFilePath, 'utf8');
    themeFile = themeFile
      .replace(/\$\{backgroundColor\}/g, appDesign.backgroundColor)
      .replace(/\$\{secondaryBackgroundColor\}/g, appDesign.secondaryBackgroundColor)
      .replace(/\$\{mainTextColor\}/g, appDesign.mainTextColor)
      .replace(/\$\{titleTextColor\}/g, appDesign.titleTextColor)
      .replace(/\$\{importantInformationTextColor\}/g, appDesign.importantInformationTextColor)
      .replace(/\$\{accentColor\}/g, appDesign.accentColor)
      .replace(/\$\{secondaryAccentColor\}/g, appDesign.secondaryAccentColor)
      .replace(/\$\{bottomBarBackgroundColor\}/g, appDesign.bottomBarBackgroundColor)
      .replace(/\$\{bottomBarSelectedIconColor\}/g, appDesign.bottomBarSelectedIconColor)
      .replace(/\$\{bottomBarUnselectedIconColor\}/g, appDesign.bottomBarUnselectedIconColor)
      .replace(/\$\{topBarBackgroundColor\}/g, appDesign.topBarBackgroundColor)
      .replace(/\$\{topBarIconTextColor\}/g, appDesign.topBarIconTextColor)
      .replace(/\$\{statusBarTheme\}/g, appDesign.statusBarTheme);

    fs.writeFileSync(themeFilePath, themeFile);
  }
}
