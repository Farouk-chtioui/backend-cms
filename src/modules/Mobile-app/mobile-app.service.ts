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
    const { appName, appDesignId, repositoryId, version, ownerId,userEmail } = createMobileAppDto;

    let appDesign;
    if (appDesignId) {
      appDesign = await this.getAppDesign(appDesignId);
      if (!appDesign) {
        throw new Error(`App design with ID ${appDesignId} not found.`);
      }
    } else {
      appDesign = await this.createDefaultAppDesign();
    }

    const newMobileApp = new this.mobileAppModel({
      appName,
      appDesignId: appDesign._id,
      repositoryId,
      version,
      ownerId,
      userEmail,
    });

    await newMobileApp.save();
    return newMobileApp;
  }
  

  // Generate a Mobile App with the provided theme and return download URL
  async generateAppWithTheme(createMobileAppDto: CreateMobileAppDto): Promise<any> {
    const { appName, appDesignId, repositoryId, ownerId, userEmail } = createMobileAppDto;
  
    // Log the received appDesignId to ensure it's being passed correctly
    this.logger.debug(`Received appDesignId: ${appDesignId}`);
  
    let appDesign;
  
    // Ensure appDesignId is handled as an ObjectId (if using MongoDB)
    if (appDesignId) {
      this.logger.debug(`Attempting to fetch app design with id: ${appDesignId}`);
  
      try {
        // Ensure appDesignId is properly cast as an ObjectId if necessary
        appDesign = await this.appDesignModel.findById(appDesignId).exec();
  
        if (!appDesign) {
          this.logger.warn(`Custom app design with id ${appDesignId} not found. Using default design.`);
          appDesign = await this.createDefaultAppDesign();  // Fallback to default if the custom design is not found
        } else {
          this.logger.debug(`Custom app design found: ${JSON.stringify(appDesign)}`);
        }
      } catch (error) {
        this.logger.error(`Error fetching custom app design: ${error.message}`);
        appDesign = await this.createDefaultAppDesign();
      }
    } else {
      // Fallback to default design if no appDesignId is provided
      this.logger.warn('No appDesignId provided. Using default app design.');
      appDesign = await this.createDefaultAppDesign();
    }
  
    // Proceed with app generation
    const downloadUrl = await this.appGenerationService.generateApp(appName, appDesign, userEmail);
  
    // Save the mobile app with the generated app design
    const newMobileApp = new this.mobileAppModel({
      appName,
      appDesignId: appDesign._id,
      repositoryId,
      ownerId,
      userEmail,
      
    });
    await newMobileApp.save();
  
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
    await defaultDesign.save(); 
    this.logger.debug(`Default app design created: ${defaultDesign._id}`);
    return defaultDesign; 
  }

  async updateDesign(id: string, designData: Partial<AppDesign>): Promise<MobileApp> {
    this.logger.debug(`Updating design for appId: ${id}`);
    
    const mobileApp = await this.mobileAppModel.findById(id).populate('appDesignId').exec();
    if (!mobileApp) {
      throw new Error('Mobile app not found');
    }
    if (!mobileApp.appDesignId) {
      throw new Error('App design not found for this mobile app');
    }

    await this.appDesignModel.findByIdAndUpdate(mobileApp.appDesignId, { $set: designData }, { new: true }).exec();

    return this.mobileAppModel.findById(id).populate('appDesignId').exec();
  }

  async findOne(id: string): Promise<MobileApp> {
    this.logger.debug(`Fetching mobile app with id: ${id}`);
    const mobileApp = await this.mobileAppModel.findById(id).populate('appDesignId').exec();
    if (!mobileApp) {
      throw new Error('Mobile app not found');
    }
    return mobileApp;
  }

  async updateDesignByRepositoryId(repositoryId: string, designData: Partial<AppDesign>): Promise<MobileApp> {
    this.logger.debug(`Updating design for repositoryId: ${repositoryId}`);
  
    // Fetch the mobile app with the current appDesignId
    const mobileApp = await this.mobileAppModel.findOne({ repositoryId }).populate('appDesignId').exec();
    if (!mobileApp) {
      this.logger.error(`Mobile app not found for repositoryId: ${repositoryId}`);
      throw new Error('Mobile app not found for this repository');
    }
  
    if (!mobileApp.appDesignId) {
      this.logger.error(`App design not found for mobile app with repositoryId: ${repositoryId}`);
      throw new Error('App design not found for this mobile app');
    }
  
    this.logger.debug(`Current appDesignId for update: ${mobileApp.appDesignId}`);
  
    const updatedDesign = await this.appDesignModel.findByIdAndUpdate(
      mobileApp.appDesignId,
      { $set: designData },
      { new: true }
    ).exec();
  
    if (!updatedDesign) {
      this.logger.error(`Failed to update design for appDesignId: ${mobileApp.appDesignId}`);
      throw new Error('Failed to update app design');
    }
  
    this.logger.debug(`Updated App Design: ${JSON.stringify(updatedDesign)}`);
  
    const updatedMobileApp = await this.mobileAppModel.findOne({ repositoryId }).populate('appDesignId').exec();
  
    return updatedMobileApp;
  }
  

  async findMobileAppByRepositoryId(repositoryId: string): Promise<MobileApp> {
    const mobileApp = await this.mobileAppModel.findOne({ repositoryId }).populate('appDesignId').exec();
    if (!mobileApp) {
      throw new Error(`No mobile app found for repositoryId: ${repositoryId}`);
    }
    return mobileApp;
  }
  
}
