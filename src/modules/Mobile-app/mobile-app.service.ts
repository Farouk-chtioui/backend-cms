import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { MobileApp } from './mobile-app.schema';
import { AppDesign } from '../appDesign/appDesign.schema';
import { AppLayout } from '../appLayout/appLayout.schema';
import { CreateMobileAppDto } from './dto/create-mobile-app.dto';
import { AppGenerationService } from '../app-generation/app-generation.service';
import { AppLayoutService } from '../appLayout/appLayout.service';
import { UpdateAppLayoutDto } from '../appLayout/dtos/appLayout.dto';
import { AppDesignService } from '../appDesign/appDesign.service';
import { BadRequestException } from '@nestjs/common';
import { ScreenService } from '../screen/screen.service';
import { OnboardingScreensService } from '../onboarding-screens/service/onboarding-screens.service';

@Injectable()
export class MobileAppService {
  private readonly logger = new Logger(MobileAppService.name);

  constructor(
    @InjectModel(MobileApp.name) private mobileAppModel: Model<MobileApp>,
    @InjectModel(AppDesign.name) private appDesignModel: Model<AppDesign>,
    @InjectModel('AppLayout') private appLayoutModel: Model<AppLayout>,
    private readonly appGenerationService: AppGenerationService,
    private readonly appLayoutService: AppLayoutService,
    private readonly appDesignService: AppDesignService,
    private readonly screenService: ScreenService,
    private readonly onboardingScreensService: OnboardingScreensService,
  ) {}

  async create(createMobileAppDto: CreateMobileAppDto): Promise<MobileApp> {
    try {
      const app = new this.mobileAppModel(createMobileAppDto);
      const savedApp = await app.save();

      // Create layout
      const layout = await this.appLayoutService.createAppLayout(savedApp._id.toString());
      savedApp.appLayoutId = layout._id as Types.ObjectId;
      const updatedApp = await savedApp.save();

      return this.mobileAppModel
        .findById(updatedApp._id)
        .populate('appLayoutId')
        .populate('appDesignId')
        .exec();
    } catch (error) {
      throw new BadRequestException(`Failed to create mobile app: ${error.message}`);
    }
  }

  async resetAppLayout(mobileAppId: string): Promise<MobileApp> {
    if (!Types.ObjectId.isValid(mobileAppId)) {
      throw new Error('Invalid mobileAppId');
    }
    const mobileApp = await this.mobileAppModel.findById(mobileAppId).exec();
    if (!mobileApp) {
      throw new Error('MobileApp not found');
    }
    const appLayoutId = mobileApp.appLayoutId;
    if (!appLayoutId || !Types.ObjectId.isValid(appLayoutId.toString())) {
      throw new Error('Invalid appLayoutId in MobileApp');
    }
    await this.appLayoutService.resetLayoutToDefault(appLayoutId.toString());
    return this.mobileAppModel.findById(mobileAppId).populate('appLayoutId').exec();
  }

  async resetAppDesign(mobileAppId: string): Promise<MobileApp> {
    this.logger.debug(`Resetting AppDesign for MobileApp ID: ${mobileAppId}`);
    if (!Types.ObjectId.isValid(mobileAppId)) {
      throw new Error('Invalid MobileApp ID');
    }
    const mobileApp = await this.mobileAppModel.findById(mobileAppId).exec();
    if (!mobileApp || !mobileApp.appDesignId) {
      throw new Error('MobileApp or AppDesign not found');
    }
    const appDesign = await this.appDesignModel.findById(mobileApp.appDesignId).exec();
    if (!appDesign) {
      throw new Error('AppDesign not found');
    }
    appDesign.themeColors = {
      light: {
        mainAppBackground: '#FFFFFF',
        secondaryBackground: '#F7F7F7',
        mainText: '#000000',
        titleText: '#333333',
        importantText: '#2E9C00',
        accent: '#0072F5',
        secondaryAccent: '#7A7AFF',
        bottomBarBackground: '#F9F9F9',
        bottomBarSelectedIcon: '#1a1a19',
        bottomBarUnselectedIcon: '#BDC3C7',
        topBarBackground: '#FF9292',
        topBarTextAndIcon: '#FFFFFF',
      },
      dark: {
        mainAppBackground: '#121212',
        secondaryBackground: '#1E1E1E',
        mainText: '#E0E0E0',
        titleText: '#AAAAAA',
        importantText: '#00BC78',
        accent: '#17C964',
        secondaryAccent: '#5E35B1',
        bottomBarBackground: '#000000',
        bottomBarSelectedIcon: '#F39C12',
        bottomBarUnselectedIcon: '#7F8C8D',
        topBarBackground: '#2E4053',
        topBarTextAndIcon: '#ECF0F1',
      },
    };
    appDesign.statusBarTheme = 'light';
    await appDesign.save();
    return this.mobileAppModel.findById(mobileAppId).populate('appDesignId').exec();
  }

  async updateAppLayout(id: string, layoutData: Partial<AppLayout>): Promise<MobileApp> {
    const mobileApp = await this.mobileAppModel.findById(id).populate('appLayoutId').exec();
    if (!mobileApp) {
      throw new Error('Mobile app not found');
    }
    const appLayoutId = mobileApp.appLayoutId?._id;
    if (!appLayoutId || !mongoose.isValidObjectId(appLayoutId)) {
      throw new Error('Invalid or missing App layout ID for this mobile app');
    }
    const updateAppLayoutDto: UpdateAppLayoutDto = {
      ...layoutData,
      appId: appLayoutId.toString(),
      bottomBarTabs: layoutData.bottomBarTabs || [],
    };
    await this.appLayoutService.updateLayoutById(appLayoutId.toString(), updateAppLayoutDto);
    return this.mobileAppModel.findById(id).populate('appLayoutId').exec();
  }

  async getAppLayout(appLayoutId: string): Promise<AppLayout> {
    this.logger.debug(`Fetching app layout with id: ${appLayoutId}`);
    const appLayout = await this.appLayoutModel.findById(appLayoutId).exec();
    if (!appLayout) {
      this.logger.error(`App layout not found for id: ${appLayoutId}`);
      throw new Error('App layout not found');
    }
    return appLayout;
  }

  async createAppLayoutForMobileApp(appId: string): Promise<AppLayout> {
    const layoutTemplate = this.getDefaultLayoutTemplate();
    const newLayout = new this.appLayoutModel({
      ...layoutTemplate,
      appId,
    });
    return await newLayout.save();
  }

  private getDefaultLayoutTemplate() {
    return {
      layoutName: 'Default Layout',
      layoutConfig: {},
    };
  }

  private async createDefaultAppLayout(): Promise<AppLayout> {
    const defaultLayout = new this.appLayoutModel({
      layoutName: 'Default Layout',
      layoutConfig: {},
    });
    await defaultLayout.save();
    return defaultLayout;
  }

  async getAppDesign(appDesignId: string): Promise<AppDesign> {
    this.logger.debug(`Fetching app design with id: ${appDesignId}`);
    const appDesign = await this.appDesignModel.findById(appDesignId).exec();
    if (!appDesign) {
      this.logger.error(`App design not found for id: ${appDesignId}`);
      throw new Error('App design not found');
    }
    return appDesign;
  }

  private async createDefaultAppDesign(): Promise<AppDesign> {
    const defaultDesign = new this.appDesignModel({
      themeColors: {
        light: {
          mainAppBackground: '#FFFFFF',
          secondaryBackground: '#F7F7F7',
          mainText: '#000000',
          titleText: '#333333',
          importantText: '#2E9C00',
          accent: '#0072F5',
          secondaryAccent: '#7A7AFF',
          bottomBarBackground: '#F9F9F9',
          bottomBarSelectedIcon: '#1a1a19',
          bottomBarUnselectedIcon: '#BDC3C7',
          topBarBackground: '#FF9292',
          topBarTextAndIcon: '#FFFFFF',
        },
        dark: {
          mainAppBackground: '#121212',
          secondaryBackground: '#1E1E1E',
          mainText: '#E0E0E0',
          titleText: '#AAAAAA',
          importantText: '#00BC78',
          accent: '#17C964',
          secondaryAccent: '#5E35B1',
          bottomBarBackground: '#000000',
          bottomBarSelectedIcon: '#1a1a19',
          bottomBarUnselectedIcon: '#7F8C8D',
          topBarBackground: '#2E4053',
          topBarTextAndIcon: '#ECF0F1',
        },
      },
      statusBarTheme: 'light',
    });
    return await defaultDesign.save();
  }

  async getDefaultAppDesign(mobileAppId: string): Promise<AppDesign> {
    if (!Types.ObjectId.isValid(mobileAppId)) {
      console.error("Invalid mobileAppId");
      throw new Error("Invalid mobileAppId");
    }
    const mobileApp = await this.mobileAppModel.findById(mobileAppId).exec();
    if (!mobileApp) {
      console.error("MobileApp not found");
      throw new Error("MobileApp not found");
    }
    const appDesignId = mobileApp.appDesignId;
    if (!appDesignId || !Types.ObjectId.isValid(appDesignId.toString())) {
      console.error("Invalid appDesignId in MobileApp");
      throw new Error("Invalid appDesignId in MobileApp");
    }
    const appDesign = await this.appDesignModel.findById(appDesignId).exec();
    if (!appDesign) {
      console.error("AppDesign not found");
      throw new Error("AppDesign not found");
    }
    return appDesign;
  }

  async updateAppDesign(
    mobileAppId: string,
    updatedDesign: Partial<AppDesign>
  ): Promise<MobileApp> {
    if (!mobileAppId) {
      throw new BadRequestException('MobileApp ID cannot be null');
    }
    this.logger.debug(`Updating AppDesign for MobileApp ID: ${mobileAppId}`);
    const mobileApp = await this.mobileAppModel.findById(mobileAppId).populate('appDesignId').exec();
    if (!mobileApp) {
      throw new Error('MobileApp not found');
    }
    if (!mobileApp.appDesignId) {
      throw new Error('AppDesign not associated with the given MobileApp');
    }
    const updatedAppDesign = await this.appDesignModel.findByIdAndUpdate(
      mobileApp.appDesignId._id,
      { $set: updatedDesign },
      { new: true }
    );
    if (!updatedAppDesign) {
      throw new Error(`Failed to update AppDesign for MobileApp ID: ${mobileAppId}`);
    }
    return this.mobileAppModel.findById(mobileAppId).populate('appDesignId').exec();
  }

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
    return this.mobileAppModel.findOne({ repositoryId }).populate('appLayoutId').exec();
  }

  async findMobileAppByRepositoryId(repositoryId: string): Promise<MobileApp> {
    const mobileApp = await this.mobileAppModel
      .findOne({ repositoryId })
      .populate('appDesignId')
      .populate('appLayoutId')
      .exec();
    if (!mobileApp) {
      throw new Error(`No mobile app found for repositoryId: ${repositoryId}`);
    }
    return mobileApp;
  }

  async getAppConfiguration(appId: string): Promise<MobileApp> {
    return this.mobileAppModel.findById(appId).populate('appDesignId').populate('appLayoutId').exec();
  }

  async getFullMobileAppData(mobileAppId: string): Promise<any> {
    try {
      const mobileApp = await this.mobileAppModel.findById(mobileAppId).exec();
      if (!mobileApp) {
        throw new BadRequestException(`Mobile app with ID ${mobileAppId} not found`);
      }
      this.logger.debug(`Finding screens for mobileAppId: ${mobileAppId}`);

      const [appDesign, appLayout, screens, onboardingScreens] = await Promise.all([
        this.appDesignModel.findById(mobileApp.appDesignId).exec(),
        this.appLayoutModel.findById(mobileApp.appLayoutId).exec(),
        this.screenService.findByAppId(mobileAppId),
        this.onboardingScreensService.findAllByAppId(mobileAppId),
      ]);

      this.logger.debug(`Found ${screens.length} screens and ${onboardingScreens.length} onboarding screens`);

      const screensWithWidgets = await Promise.all(
        screens.map(async (screen) => {
          try {
            return await this.screenService.getScreenWithWidgets(screen._id.toString());
          } catch (error) {
            this.logger.error(`Error populating widgets for screen ${screen._id}: ${error.message}`);
            return screen;
          }
        })
      );

      const mobileAppData = {
        ...mobileApp.toObject(),
        appDesignId: undefined,
        appLayoutId: undefined,
        onboardingScreens,
      };

      return {
        mobileApp: mobileAppData,
        appDesign,
        appLayout,
        screens: screensWithWidgets,
        onboardingScreens,
      };
    } catch (error) {
      this.logger.error(`Error fetching full mobile app data: ${error.message}`);
      throw new BadRequestException(`Failed to fetch full mobile app data: ${error.message}`);
    }
  }

  // -----------------------------------------------------------------
  // NEW METHOD: orchestrates generation by calling AppGenerationService
  // -----------------------------------------------------------------
  async generateMobileApp(fullAppData: any): Promise<any> {
    try {
      // The 'fullAppData' argument is the object returned by getFullMobileAppData
      // We pass it directly to the AppGenerationService.
      const result = await this.appGenerationService.generateOrUpdateFlutterApp(fullAppData);
      return result;
    } catch (error) {
      this.logger.error(`Failed to generate mobile app: ${error.message}`);
      throw error;
    }
  }
}
