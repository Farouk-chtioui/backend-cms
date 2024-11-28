import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MobileApp } from './mobile-app.schema';
import { CreateMobileAppDto } from './dto/create-mobile-app.dto';
import { AppDesignService } from '../appDesign/appDesign.service';
import { AppLayoutService } from '../appLayout/appLayout.service';
import { AppGenerationService } from '../app-generation/app-generation.service';
import { UpdateAppLayoutDto } from '../appLayout/dtos/appLayout.dto';
import { AppLayout } from '../appLayout/appLayout.schema';
@Injectable()
export class MobileAppService {
  private readonly logger = new Logger(MobileAppService.name);

  constructor(
    @InjectModel(MobileApp.name) private readonly mobileAppModel: Model<MobileApp>,
    private readonly appDesignService: AppDesignService,
    private readonly appLayoutService: AppLayoutService,
    private readonly appGenerationService: AppGenerationService,
  ) {}

  /**
   * Create a new Mobile App.
   */
  async create(createMobileAppDto: CreateMobileAppDto): Promise<MobileApp> {
    const { appName, appDesignId, appLayoutId, repositoryId, ownerId } = createMobileAppDto;
  
    // Fetch or create the default layout
    const layout = appLayoutId
      ? await this.appLayoutService.getLayoutById(appLayoutId)
      : await this.appLayoutService.getOrCreateDefaultLayout();
  
    // Fetch or create the app design
    const design = appDesignId
      ? await this.appDesignService.getDesignById(appDesignId)
      : await this.appDesignService.createDefaultDesign();
  
    // Create the MobileApp instance
    const newMobileApp = new this.mobileAppModel({
      appName,
      appDesignId: design._id,
      appLayoutId: layout._id,
      repositoryId,
      ownerId,
    });
  
    return newMobileApp.save();
  }
  

  /**
   * Reset the layout of a Mobile App to the default layout.
   */
  async resetAppLayout(appId: string): Promise<MobileApp> {
    const mobileApp = await this.getMobileAppById(appId);

    // Reset the layout
    await this.appLayoutService.resetLayoutToDefault(mobileApp.appLayoutId.toString());

    this.logger.log(`Reset layout for app: ${appId}`);
    return this.mobileAppModel.findById(appId).populate('appLayoutId').exec();
  }

  /**
   * Update the layout of a Mobile App.
   */
  async updateAppLayout(appId: string, layoutData: Partial<AppLayout>): Promise<MobileApp> {
    const mobileApp = await this.getMobileAppById(appId);
  
    // Validate and transform `layoutData` into `UpdateAppLayoutDto`
    const updateData: UpdateAppLayoutDto = {
      bottomBarTabs: layoutData.bottomBarTabs || [], // Ensure `bottomBarTabs` exists
    };
  
    // Update the layout
    await this.appLayoutService.updateLayout(mobileApp.appLayoutId.toString(), updateData);
  
    this.logger.log(`Updated layout for app: ${appId}`);
    return this.mobileAppModel.findById(appId).populate('appLayoutId').exec();
  }
  /**
   * Update the design of a Mobile App.
   */
  async updateAppDesign(appId: string, designData: Partial<any>): Promise<MobileApp> {
    const mobileApp = await this.getMobileAppById(appId);

    // Update the design
    await this.appDesignService.updateAppDesign(mobileApp.appDesignId.toString(), designData);

    this.logger.log(`Updated design for app: ${appId}`);
    return this.mobileAppModel.findById(appId).populate('appDesignId').exec();
  }

  /**
   * Generate a Mobile App with theme and design.
   */
  async generateAppWithTheme(createMobileAppDto: CreateMobileAppDto): Promise<any> {
    const { appName, appDesignId, repositoryId, ownerId, userEmail } = createMobileAppDto;

    // Fetch or create design and layout
    const design = await this.appDesignService.getOrCreateDesign(appDesignId);
    const layout = await this.appLayoutService.getOrCreateDefaultLayout();

    // Generate the app
    const downloadUrl = await this.appGenerationService.generateApp(appName, design, userEmail);

    // Save the generated app
    const newMobileApp = new this.mobileAppModel({
      appName,
      appDesignId: design._id,
      appLayoutId: layout._id,
      repositoryId,
      ownerId,
      userEmail,
    });

    await newMobileApp.save();
    this.logger.log(`Generated app: ${appName}`);
    return { downloadUrl };
  }

  /**
   * Fetch the configuration of a Mobile App.
   */
  async getAppConfiguration(appId: string): Promise<any> {
    const mobileApp = await this.mobileAppModel
      .findById(appId)
      .populate('appDesignId')
      .populate('appLayoutId')
      .exec();

    if (!mobileApp) {
      this.logger.error(`Mobile app not found: ${appId}`);
      throw new NotFoundException('Mobile app not found');
    }

    return {
      appName: mobileApp.appName,
      appDesign: mobileApp.appDesignId,
      appLayout: mobileApp.appLayoutId,
    };
  }

  /**
   * Helper method to fetch Mobile App by ID with error handling.
   */
  private async getMobileAppById(appId: string): Promise<MobileApp> {
    const mobileApp = await this.mobileAppModel.findById(appId).exec();
    if (!mobileApp) {
      this.logger.error(`Mobile app not found: ${appId}`);
      throw new NotFoundException('Mobile app not found');
    }
    return mobileApp;
  }
}
