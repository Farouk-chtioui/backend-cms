import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import simpleGit from 'simple-git';
import axios from 'axios';
import * as formData from 'form-data';

@Injectable()
export class AppGenerationService {
  private readonly gitRepoUrl = 'https://github.com/Farouk-chtioui/BaseAppTemplate.git'; // The template repo URL
  private readonly outputBasePath = path.resolve(__dirname, '../../../../output/');
  private readonly mailgunApiKey = process.env.MAILGUN_API_KEY;
  private readonly mailgunDomain = process.env.MAILGUN_DOMAIN;
  private readonly gitToken = process.env.GITHUB_TOKEN; // For accessing private repos if needed

  async generateApp(appName: string, appDesign: any, userEmail: string): Promise<void> {
    const outputPath = this.getOutputPath(appName);

    // Step 1: Clone the GitHub repository (template repo)
    await this.cloneGitHubRepo(outputPath);

    // Step 2: Apply the user-specific design to the cloned repo
    this.applyTheme(outputPath, appName, appDesign);

    // Step 3: Trigger GitHub Action to build APK
    const apkUrl = await this.triggerGitHubActionAndCreateRelease(appName);

    // Step 4: Download APK from GitHub release and send it via Mailgun
    const apkFilePath = await this.downloadAPKFromRelease(apkUrl);
    await this.sendMailWithAPK(apkFilePath, userEmail);
  }

  private getOutputPath(appName: string): string {
    return path.join(this.outputBasePath, appName);
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
    // Apply the user design to the theme file
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

  // Step 3: Trigger GitHub Action for building the APK
  private async triggerGitHubActionAndCreateRelease(appName: string): Promise<string> {
    const url = `https://api.github.com/repos/Farouk-chtioui/backend-cms/actions/workflows/build-apk.yml/dispatches`;

    // Trigger GitHub Action
    const response = await axios.post(
      url,
      {
        ref: 'main', // Branch where the workflow runs
        inputs: { appName }
      },
      {
        headers: {
          Authorization: `token ${this.gitToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (response.status !== 204) {
      throw new Error('Failed to trigger GitHub Action.');
    }

    // Simulate waiting for the APK build process and get the URL (use GitHub's status API)
    return 'https://github.com/downloads/path-to-apk/app-release.apk'; // Replace with actual logic to get the APK URL
  }

  // Step 4: Download the APK file from the generated URL
  private async downloadAPKFromRelease(apkUrl: string): Promise<string> {
    const apkFilePath = path.join(this.outputBasePath, 'app-release.apk');
    const response = await axios.get(apkUrl, { responseType: 'stream' });
    
    const writer = fs.createWriteStream(apkFilePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(apkFilePath));
      writer.on('error', reject);
    });
  }

  // Step 5: Send the APK via Mailgun
  private async sendMailWithAPK(apkFilePath: string, userEmail: string): Promise<void> {
    const form = new formData();
    form.append('from', `App Service <noreply@${this.mailgunDomain}>`);
    form.append('to', userEmail);
    form.append('subject', 'Your APK is ready!');
    form.append('text', 'Your app APK is ready for download.');
    form.append('attachment', fs.createReadStream(apkFilePath));

    const response = await axios.post(
      `https://api.mailgun.net/v3/${this.mailgunDomain}/messages`,
      form,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${this.mailgunApiKey}`).toString('base64')}`,
          ...form.getHeaders()
        }
      }
    );

    if (response.status !== 200) {
      throw new Error('Failed to send email via Mailgun.');
    }
  }
}
