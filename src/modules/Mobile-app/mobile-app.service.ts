import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MobileApp } from './mobile-app.schema';
import { AppDesign } from '../appDesign/appDesign.schema';
import { CreateMobileAppDto } from './dto/create-mobile-app.dto';
import { AppGenerationService } from '../app-generation/app-generation.service';

@Injectable()
export class MobileAppService {
  private readonly logger = new Logger(MobileAppService.name);

  constructor(
    @InjectModel(MobileApp.name) private mobileAppModel: Model<MobileApp>,
    @InjectModel(AppDesign.name) private appDesignModel: Model<AppDesign>,
    private readonly appGenerationService: AppGenerationService, // Inject app generation service
  ) {}

  // Method to create a Mobile App, linking it to a Repository and AppDesign
  async create(createMobileAppDto: CreateMobileAppDto): Promise<MobileApp> {
    const { appName, appDesignId, repositoryId, version, ownerId } = createMobileAppDto;

    // Check if a valid appDesignId is provided
    let appDesign;
    if (appDesignId) {
      // Fetch the app design
      appDesign = await this.getAppDesign(appDesignId);
    } else {
      // Create a default app design if no design is provided
      this.logger.warn('No appDesignId provided, creating a default app design.');
      appDesign = await this.createDefaultAppDesign();
    }

    // Create the mobile app with the fetched or default app design
    const newMobileApp = new this.mobileAppModel({
      appName,
      appDesignId: appDesign._id, // Link the app design ID
      repositoryId,
      version,
      ownerId,
    });

    return newMobileApp.save(); // Save the mobile app to the database
  }

  // Generate a Mobile App with the provided theme and return download URL
  async generateAppWithTheme(createMobileAppDto: CreateMobileAppDto): Promise<any> {
    const { appName, appDesignId, repositoryId, ownerId } = createMobileAppDto;

    // Fetch or create the app design
    let appDesign;
    if (appDesignId) {
      appDesign = await this.getAppDesign(appDesignId); // Get existing design
    } else {
      this.logger.warn('No appDesignId provided, creating a default app design.');
      appDesign = await this.createDefaultAppDesign(); // Create a default design if none is provided
    }

    // Generate the app with the provided design using AppGenerationService
    const downloadUrl = await this.appGenerationService.generateApp(appName, appDesign);

    // Save the mobile app with the generated app design
    const newMobileApp = new this.mobileAppModel({
      appName,
      appDesignId: appDesign._id,
      repositoryId,
      ownerId,
    });
    await newMobileApp.save();

    // Return the download URL for the generated app
    return { downloadUrl };
  }

  // Fetch an app design by its ID
  async getAppDesign(appDesignId: string): Promise<AppDesign> {
    this.logger.debug(`Fetching app design with id: ${appDesignId}`);
    const appDesign = await this.appDesignModel.findById(appDesignId).exec();
    if (!appDesign) {
      this.logger.error(`App design not found for id: ${appDesignId}`);
      throw new Error('App design not found');
    }
    return appDesign;
  }

  // Create a default app design in case no design is provided
  private async createDefaultAppDesign(): Promise<AppDesign> {
    const defaultDesign = new this.appDesignModel({
      backgroundColor: '#FFFFFF',
      secondaryBackgroundColor: '#F0F0F0',
      mainTextColor: '#000000',
      titleTextColor: '#000000',
      importantInformationTextColor: '#FF0000',
      accentColor: '#00BC7B',
      secondaryAccentColor: '#B400F6',
      bottomBarBackgroundColor: '#000000',
      bottomBarSelectedIconColor: '#FFFFFF',
      bottomBarUnselectedIconColor: '#AAAAAA',
      topBarBackgroundColor: '#FF2929',
      topBarIconTextColor: '#FFFFFF',
      statusBarTheme: 'light',
    });
    await defaultDesign.save(); // Save the default design
    this.logger.debug(`Default app design created: ${defaultDesign._id}`);
    return defaultDesign; // Return the created default design
  }

  // Method to update app design based on the app ID
  async updateDesign(id: string, designData: Partial<AppDesign>): Promise<MobileApp> {
    this.logger.debug(`Updating design for appId: ${id}`);
    
    const mobileApp = await this.mobileAppModel.findById(id).populate('appDesignId').exec();
    if (!mobileApp) {
      throw new Error('Mobile app not found');
    }
    if (!mobileApp.appDesignId) {
      throw new Error('App design not found for this mobile app');
    }

    // Update the design in the app design collection
    await this.appDesignModel.findByIdAndUpdate(mobileApp.appDesignId, { $set: designData }, { new: true }).exec();

    // Fetch the updated mobile app and return
    return this.mobileAppModel.findById(id).populate('appDesignId').exec();
  }

  // Method to find a mobile app by its ID
  async findOne(id: string): Promise<MobileApp> {
    this.logger.debug(`Fetching mobile app with id: ${id}`);
    const mobileApp = await this.mobileAppModel.findById(id).populate('appDesignId').exec();
    if (!mobileApp) {
      throw new Error('Mobile app not found');
    }
    return mobileApp;
  }

  // Method to update app design based on the repository ID
  async updateDesignByRepositoryId(repositoryId: string, designData: Partial<AppDesign>): Promise<MobileApp> {
    this.logger.debug(`Updating design for repositoryId: ${repositoryId}`);
    
    const mobileApp = await this.mobileAppModel.findOne({ repositoryId }).populate('appDesignId').exec();
    if (!mobileApp) {
      throw new Error('Mobile app not found for this repository');
    }
    if (!mobileApp.appDesignId) {
      throw new Error('App design not found for this mobile app');
    }

    // Update the design in the app design collection
    await this.appDesignModel.findByIdAndUpdate(mobileApp.appDesignId, { $set: designData }, { new: true }).exec();

    // Fetch the updated mobile app and return
    return this.mobileAppModel.findOne({ repositoryId }).populate('appDesignId').exec();
  }

  // Method to find a mobile app by repository ID
  async findByRepositoryId(repositoryId: string): Promise<MobileApp> {
    return this.mobileAppModel.findOne({ repositoryId }).populate('appDesignId').exec();
  }
}
