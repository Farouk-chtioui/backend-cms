import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { MobileApp } from './mobile-app.schema';
import { AppDesign } from '../appDesign/appDesign.schema';
import { AppLayout } from '../appLayout/appLayout.schema'; // Import the schema
import { CreateMobileAppDto } from './dto/create-mobile-app.dto';
import { AppGenerationService } from '../app-generation/app-generation.service';
import { AppLayoutService } from '../appLayout/appLayout.service';
import { UpdateAppLayoutDto } from '../appLayout/dtos/appLayout.dto';
import { AppDesignService } from '../appDesign/appDesign.service';

@Injectable()
export class MobileAppService {
  private readonly logger = new Logger(MobileAppService.name);

  constructor(
    @InjectModel(MobileApp.name) private mobileAppModel: Model<MobileApp>,
    @InjectModel(AppDesign.name) private appDesignModel: Model<AppDesign>,
    @InjectModel('AppLayout') private appLayoutModel: Model<AppLayout>, // Inject the AppLayout schema correctly
    private readonly appGenerationService: AppGenerationService,
    private readonly appLayoutService: AppLayoutService, // Inject the AppLayoutService
    private readonly appDesignService: AppDesignService, // Inject the AppDesignService
  ) {}

  // Method to create a Mobile App, linking it to AppDesign and AppLayout
  async create(createMobileAppDto: CreateMobileAppDto): Promise<MobileApp> {
    const { appName, repositoryId, ownerId, appDesignId } = createMobileAppDto;
  
    // Create a new unique AppLayout for the MobileApp
    const newAppLayout = new this.appLayoutModel({
      layoutType: 'default', // Set default layout type
      bottomBarTabs: [
        { name: 'Home', iconName: 'Home', visible: true, isHome: true },
        { name: 'Settings', iconName: 'Settings', visible: true, isHome: false },
        { name: 'Cart', iconName: 'ShoppingCart', visible: true, isHome: false },
        { name: 'Offers', iconName: 'LocalOffer', visible: true, isHome: false },
        { name: 'Account', iconName: 'AccountCircle', visible: true, isHome: false },
      ],
    });
  
    const savedAppLayout = await newAppLayout.save(); // Save the new layout in the database
  
    // Create a new MobileApp linked to this unique AppLayout
    const newMobileApp = new this.mobileAppModel({
      appName,
      appDesignId,
      appLayoutId: savedAppLayout._id, // Reference the unique AppLayout ID
      repositoryId,
      ownerId,
    });
  
    return await newMobileApp.save(); // Save the MobileApp in the database
  }
  
  

  // Reset the app layout to default
  async resetAppLayout(mobileAppId: string): Promise<MobileApp> {
    console.log(`Resetting appLayout for mobileAppId: ${mobileAppId}`);
  
    // Validate that mobileAppId is a valid ObjectId
    if (!Types.ObjectId.isValid(mobileAppId)) {
      throw new Error('Invalid mobileAppId');
    }
  
    // Find the MobileApp document
    const mobileApp = await this.mobileAppModel.findById(mobileAppId).exec();
  
    if (!mobileApp) {
      throw new Error('MobileApp not found');
    }
  
    // Validate appLayoutId in the MobileApp document
    const appLayoutId = mobileApp.appLayoutId;
    console.log(`Found appLayoutId: ${appLayoutId}`);
  
    if (!appLayoutId || !Types.ObjectId.isValid(appLayoutId.toString())) {
      throw new Error('Invalid appLayoutId in MobileApp');
    }
  
    // Reset the app layout using the appLayout service
    await this.appLayoutService.resetLayoutToDefault(appLayoutId.toString());
  
    // Return the updated MobileApp after resetting the layout
    return this.mobileAppModel.findById(mobileAppId).populate('appLayoutId').exec();
  }

  async resetAppDesign(mobileAppId: string): Promise<MobileApp> {
    console.log(`Resetting appDesign for mobileAppId: ${mobileAppId}`);
  
    // Validate that mobileAppId is a valid ObjectId
    if (!Types.ObjectId.isValid(mobileAppId)) {
      throw new Error('Invalid mobileAppId');
    }
  
    // Find the MobileApp document
    const mobileApp = await this.mobileAppModel.findById(mobileAppId).exec();
  
    if (!mobileApp) {
      throw new Error('MobileApp not found');
    }
  
    // Validate appDesignId in the MobileApp document
    const appDesignId = mobileApp.appDesignId;
    console.log(`Found appDesignId: ${appDesignId}`);
  
    if (!appDesignId || !Types.ObjectId.isValid(appDesignId.toString())) {
      throw new Error('Invalid appDesignId in MobileApp');
    }
  
    // Reset the app design using the appDesign service
    await this.appDesignService.resetAppDesign(appDesignId.toString());
  
    // Return the updated MobileApp after resetting the design
    return this.mobileAppModel.findById(mobileAppId).populate('appDesignId').exec();
  }

  // Update the AppLayout for a MobileApp
  async updateAppLayout(id: string, layoutData: Partial<AppLayout>): Promise<MobileApp> {
    // Find the MobileApp by its ID and populate the appLayoutId
    const mobileApp = await this.mobileAppModel.findById(id).populate('appLayoutId').exec();
    if (!mobileApp) {
      throw new Error('Mobile app not found');
    }
  
    // Ensure the appLayoutId exists and is a valid ObjectId
    const appLayoutId = mobileApp.appLayoutId?._id;
    if (!appLayoutId || !mongoose.isValidObjectId(appLayoutId)) {
      throw new Error('Invalid or missing App layout ID for this mobile app');
    }
  
    // Prepare the update data for the AppLayout
    const updateAppLayoutDto: UpdateAppLayoutDto = {
      ...layoutData,
      bottomBarTabs: layoutData.bottomBarTabs || [],
    };
  
    // Update the AppLayout by its ObjectId
    await this.appLayoutService.updateLayoutById(appLayoutId.toString(), updateAppLayoutDto);
  
    // Return the updated MobileApp with the populated AppLayout
    return this.mobileAppModel.findById(id).populate('appLayoutId').exec();
  }
  
  
  // Fetch an AppLayout by its ID
  async getAppLayout(appLayoutId: string): Promise<AppLayout> {
    this.logger.debug(`Fetching app layout with id: ${appLayoutId}`);
    const appLayout = await this.appLayoutModel.findById(appLayoutId).exec();
    if (!appLayout) {
      this.logger.error(`App layout not found for id: ${appLayoutId}`);
      throw new Error('App layout not found');
    }
    return appLayout;
  }

  // Create a default AppLayout if none is provided
  async createAppLayoutForMobileApp(appId: string): Promise<AppLayout> {
    const layoutTemplate = this.getDefaultLayoutTemplate();
    const newLayout = new this.appLayoutModel({
      ...layoutTemplate,
      appId,
    });
    return await newLayout.save();
  }

  // Method to get the default layout template
  private getDefaultLayoutTemplate() {
    return {
      layoutName: 'Default Layout',
      layoutConfig: {},
    };
  }

  // Create a default AppLayout
  private async createDefaultAppLayout(): Promise<AppLayout> {
    const defaultLayout = new this.appLayoutModel({
      layoutName: 'Default Layout',
      layoutConfig: {},
    });
    await defaultLayout.save();
    return defaultLayout;
  }
  
  
  

  // Fetch an AppDesign by its ID
  async getAppDesign(appDesignId: string): Promise<AppDesign> {
    this.logger.debug(`Fetching app design with id: ${appDesignId}`);
    const appDesign = await this.appDesignModel.findById(appDesignId).exec();
    if (!appDesign) {
      this.logger.error(`App design not found for id: ${appDesignId}`);
      throw new Error('App design not found');
    }
    return appDesign;
  }

  // Create a default AppDesign if none is provided
  private async createDefaultAppDesign(): Promise<AppDesign> {
    try {
      const defaultDesign = new this.appDesignModel({
        themeColors: {
          light: {
            mainAppBackground: "#FFFFFF",
            secondaryBackground: "#F7F7F7",
            mainText: "#000000",
            titleText: "#333333",
            importantText: "#2E9C00",
            accent: "#0072F5",
            secondaryAccent: "#7A7AFF",
            bottomBarBackground: "#F9F9F9",
            bottomBarSelectedIcon: "#F1C40F",
            bottomBarUnselectedIcon: "#BDC3C7",
            topBarBackground: "#FF9292",
            topBarTextAndIcon: "#FFFFFF",
          },
          dark: {
            mainAppBackground: "#121212",
            secondaryBackground: "#1E1E1E",
            mainText: "#E0E0E0",
            titleText: "#AAAAAA",
            importantText: "#00BC78",
            accent: "#17C964",
            secondaryAccent: "#5E35B1",
            bottomBarBackground: "#000000",
            bottomBarSelectedIcon: "#F39C12",
            bottomBarUnselectedIcon: "#7F8C8D",
            topBarBackground: "#2E4053",
            topBarTextAndIcon: "#ECF0F1",
          },
        },
        statusBarTheme: "light",
      });
      await defaultDesign.save();
      this.logger.debug(`Default app design created: ${defaultDesign._id}`);
      return defaultDesign;
    } catch (error) {
      this.logger.error(`Failed to create default app design: ${error.message}`);
      throw new Error("Could not create default app design");
    }
  }

  async getDefaultAppDesign(mobileAppId: string): Promise<AppDesign> {
    console.log(`Fetching default app design for mobileAppId: ${mobileAppId}`);
  
    // Validate that mobileAppId is a valid ObjectId
    if (!Types.ObjectId.isValid(mobileAppId)) {
      throw new Error('Invalid mobileAppId');
    }
  
    // Find the MobileApp document
    const mobileApp = await this.mobileAppModel.findById(mobileAppId).exec();
  
    if (!mobileApp) {
      throw new Error('MobileApp not found');
    }
  
    // Validate appDesignId in the MobileApp document
    const appDesignId = mobileApp.appDesignId;
    console.log(`Found appDesignId: ${appDesignId}`);
  
    if (!appDesignId || !Types.ObjectId.isValid(appDesignId.toString())) {
      throw new Error('Invalid appDesignId in MobileApp');
    }
  
    // Fetch the default app design
    const defaultAppDesign = await this.appDesignModel.findById(appDesignId).exec();
  
    if (!defaultAppDesign) {
      throw new Error('Default app design not found');
    }
  
    return defaultAppDesign;
  }

  // Method to update the AppDesign for a MobileApp by ID
  async updateDesign(id: string, designData: Partial<AppDesign>): Promise<MobileApp> {
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


  // Find a MobileApp by its ID
  async findOne(id: string): Promise<MobileApp> {
    this.logger.debug(`Fetching mobile app with id: ${id}`);
    const mobileApp = await this.mobileAppModel
      .findById(id)
      .populate('appDesignId')
      .populate('appLayoutId')
      .exec();
    if (!mobileApp) {
      throw new Error('Mobile app not found');
    }
    return mobileApp;
  }

  async updateDesignByRepositoryId(repositoryId: string, designData: Partial<AppDesign>): Promise<MobileApp> {
    this.logger.debug(`Updating design for repositoryId: ${repositoryId}`);
  
    const mobileApp = await this.mobileAppModel.findOne({ repositoryId }).populate('appDesignId').exec();
    if (!mobileApp) {
      this.logger.error(`Mobile app not found for repositoryId: ${repositoryId}`);
      throw new Error('Mobile app not found for this repository');
    }
  
    if (!mobileApp.appDesignId) {
      this.logger.error(`App design not found for mobile app with repositoryId: ${repositoryId}`);
      throw new Error('App design not found for this mobile app');
    }
  
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
  
    return this.mobileAppModel.findOne({ repositoryId }).populate('appDesignId').exec();
  }

  async updateLayoutByRepositoryId(repositoryId: string, layoutData: Partial<AppLayout>): Promise<MobileApp> {
    this.logger.debug(`Updating layout for repositoryId: ${repositoryId}`);
  
    const mobileApp = await this.mobileAppModel.findOne({ repositoryId }).populate('appLayoutId').exec();
    if (!mobileApp) {
      this.logger.error(`Mobile app not found for repositoryId: ${repositoryId}`);
      throw new Error('Mobile app not found for this repository');
    }
  
    if (!mobileApp.appLayoutId) {
      this.logger.error(`App layout not found for mobile app with repositoryId: ${repositoryId}`);
      throw new Error('App layout not found for this mobile app');
    }
  
    const updatedLayout = await this.appLayoutModel.findByIdAndUpdate(
      mobileApp.appLayoutId,
      { $set: layoutData },
      { new: true }
    ).exec();
  
    if (!updatedLayout) {
      this.logger.error(`Failed to update layout for appLayoutId: ${mobileApp.appLayoutId}`);
      throw new Error('Failed to update app layout');
    }
  
    this.logger.debug(`Updated App Layout: ${JSON.stringify(updatedLayout)}`);
  
    return this.mobileAppModel.findOne({ repositoryId }).populate('appLayoutId').exec();
  }

  async findMobileAppByRepositoryId(repositoryId: string): Promise<MobileApp> {
    const mobileApp = await this.mobileAppModel.findOne({ repositoryId }).populate('appDesignId').populate('appLayoutId').exec();
    if (!mobileApp) {
      throw new Error(`No mobile app found for repositoryId: ${repositoryId}`);
    }
    return mobileApp;
  }

  // Generate a Mobile App with the provided theme and return download URL
  async generateAppWithTheme(createMobileAppDto: CreateMobileAppDto): Promise<any> {
    const { appName, appDesignId, appLayoutId, repositoryId, ownerId, userEmail } = createMobileAppDto;
  
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

    let appLayout;
  
    // Ensure appLayoutId is handled as an ObjectId (if using MongoDB)
    if (appLayoutId) {
      this.logger.debug(`Attempting to fetch app layout with id: ${appLayoutId}`);
  
      try {
        // Ensure appLayoutId is properly cast as an ObjectId if necessary
        appLayout = await this.appLayoutModel.findById(appLayoutId).exec();
  
        if (!appLayout) {
          this.logger.warn(`Custom app layout with id ${appLayoutId} not found. Using default layout.`);
          appLayout = await this.createDefaultAppLayout();  // Fallback to default if the custom layout is not found
        } else {
          this.logger.debug(`Custom app layout found: ${JSON.stringify(appLayout)}`);
        }
      } catch (error) {
        this.logger.error(`Error fetching custom app layout: ${error.message}`);
        appLayout = await this.createDefaultAppLayout();
      }
    } else {
      // Fallback to default layout if no appLayoutId is provided
      this.logger.warn('No appLayoutId provided. Using default app layout.');
      appLayout = await this.createDefaultAppLayout();
    }
  
    // Proceed with app generation
    const downloadUrl = await this.appGenerationService.generateApp(appName, appDesign, userEmail);
  
    // Save the mobile app with the generated app design and layout
    const newMobileApp = new this.mobileAppModel({
      appName,
      appDesignId: appDesign._id,
      appLayoutId: appLayout._id,
      repositoryId,
      ownerId,
      userEmail,
    });
    await newMobileApp.save();
  
    return { downloadUrl };
  }
  async getAppConfiguration(appId: string): Promise<MobileApp> {
    return this.mobileAppModel.findById(appId).populate('appDesignId').populate('appLayoutId').exec();
  }

}