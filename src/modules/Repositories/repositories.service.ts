import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repository } from './repository.schema';
import { MobileApp } from '../mobile-app/mobile-app.schema';
import { LiveUpdatesGateway } from '../../live-updates/live-updates.gateway';
import { Types } from 'mongoose';  // Import Types to work with ObjectId

@Injectable()
export class RepositoriesService {
  constructor(
    @InjectModel(Repository.name) private repoModel: Model<Repository>,
    private gateway: LiveUpdatesGateway,  // Inject the WebSocket gateway
  ) {}

  // Create Mobile App
  async createMobileApp(repoId: string, appName: string): Promise<Repository> {
    const repository = await this.repoModel.findById(repoId);
    if (!repository) throw new NotFoundException('Repository not found');

    // Create a new mobile app using MobileApp class constructor
    const newMobileApp = new MobileApp({
      _id: new Types.ObjectId(),
      name: appName,
      backgroundColor: '#FFFFFF',
      secondaryBackgroundColor: '#000000',
      mainTextColor: '#FFFFFF',
      titleTextColor: '#000000',
      importantInformationTextColor: '#00BC7B',
      accentColor: '#7A7AFF',
      secondaryAccentColor: '#B400F6',
      bottomBarBackgroundColor: '#000000',
      bottomBarSelectedIconColor: '#F9FFC3',
      bottomBarUnselectedIconColor: '#FFFFFF',
      topBarBackgroundColor: '#FF2929',
      topBarIconTextColor: '#FFFFFF',
      statusBarTheme: 'light',
    });

    // Push the new mobile app into the mobileApps array
    repository.mobileApps.push(newMobileApp);

    // Save the repository with the new mobile app
    return repository.save();
  }

  // Update Mobile App Theme and Colors
  async updateThemeColors(
    repoId: string,
    appId: string,
    themeData: any,
  ): Promise<Repository> {
    const repository = await this.repoModel.findById(repoId);
    if (!repository) throw new NotFoundException('Repository not found');

    const app = repository.mobileApps.find(app => app._id.toString() === appId);
    if (!app) throw new NotFoundException('Mobile app not found');

    // Update theme colors and other settings
    app.backgroundColor = themeData.backgroundColor || app.backgroundColor;
    app.secondaryBackgroundColor = themeData.secondaryBackgroundColor || app.secondaryBackgroundColor;
    app.mainTextColor = themeData.mainTextColor || app.mainTextColor;
    app.titleTextColor = themeData.titleTextColor || app.titleTextColor;
    app.importantInformationTextColor = themeData.importantInformationTextColor || app.importantInformationTextColor;
    app.accentColor = themeData.accentColor || app.accentColor;
    app.secondaryAccentColor = themeData.secondaryAccentColor || app.secondaryAccentColor;
    app.bottomBarBackgroundColor = themeData.bottomBarBackgroundColor || app.bottomBarBackgroundColor;
    app.bottomBarSelectedIconColor = themeData.bottomBarSelectedIconColor || app.bottomBarSelectedIconColor;
    app.bottomBarUnselectedIconColor = themeData.bottomBarUnselectedIconColor || app.bottomBarUnselectedIconColor;
    app.topBarBackgroundColor = themeData.topBarBackgroundColor || app.topBarBackgroundColor;
    app.topBarIconTextColor = themeData.topBarIconTextColor || app.topBarIconTextColor;
    app.statusBarTheme = themeData.statusBarTheme || app.statusBarTheme;

    await repository.save();

    // Emit live update via WebSocket
    this.gateway.handleThemeChange({ repoId, appId, themeData });

    return repository;
  }

  // Get All Mobile Apps in a Repository
  async getAllMobileApps(repoId: string): Promise<MobileApp[]> {
    const repository = await this.repoModel.findById(repoId);
    if (!repository) throw new NotFoundException('Repository not found');

    return repository.mobileApps;
  }

  // Get a Single Mobile App by ID
  async getMobileAppById(repoId: string, appId: string): Promise<MobileApp> {
    const repository = await this.repoModel.findById(repoId);
    if (!repository) throw new NotFoundException('Repository not found');

    const app = repository.mobileApps.find(app => app._id.toString() === appId);
    if (!app) throw new NotFoundException('Mobile app not found');

    return app;
  }

  // Delete a Mobile App
  async deleteMobileApp(repoId: string, appId: string): Promise<Repository> {
    const repository = await this.repoModel.findById(repoId);
    if (!repository) throw new NotFoundException('Repository not found');

    const appIndex = repository.mobileApps.findIndex(app => app._id.toString() === appId);
    if (appIndex === -1) throw new NotFoundException('Mobile app not found');

    repository.mobileApps.splice(appIndex, 1);
    return repository.save();
  }
}