// src/mobile-app/mobile-app.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MobileApp } from './mobile-app.schema';
import { AppDesignService } from '../appDesign/appDesign.service';

@Injectable()
export class MobileAppService {
  constructor(
    @InjectModel(MobileApp.name) private mobileAppModel: Model<MobileApp>,
    private readonly appDesignService: AppDesignService
  ) {}

  async createMobileApp(appName: string): Promise<MobileApp> {
    const newDesign = await this.appDesignService.createAppDesign();  // Create default design

    const newMobileApp = new this.mobileAppModel({
      name: appName,
      design: newDesign
    });

    return newMobileApp.save();
  }

  async updateAppDesign(appId: string, designData: any): Promise<MobileApp> {
    const app = await this.mobileAppModel.findById(appId).exec();
    if (!app) throw new Error('Mobile App not found');

    app.design = await this.appDesignService.updateAppDesign(app.design._id as string, designData);
    return app.save();
  }
}
