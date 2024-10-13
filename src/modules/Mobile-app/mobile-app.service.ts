import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MobileApp } from './mobile-app.schema';

@Injectable()
export class MobileAppService {
  constructor(@InjectModel(MobileApp.name) private mobileAppModel: Model<MobileApp>) {}

  async createApp(appData: Partial<MobileApp>): Promise<MobileApp> {
    const newApp = new this.mobileAppModel(appData);
    return newApp.save();
  }

  async getAppById(appId: string): Promise<MobileApp> {
    const app = await this.mobileAppModel.findById(appId).exec();
    if (!app) {
      throw new NotFoundException('Mobile app not found');
    }
    return app;
  }

  async updateApp(appId: string, updateData: Partial<MobileApp>): Promise<MobileApp> {
    const updatedApp = await this.mobileAppModel.findByIdAndUpdate(appId, updateData, { new: true }).exec();
    if (!updatedApp) {
      throw new NotFoundException('Mobile app not found');
    }
    return updatedApp;
  }

  async deleteApp(appId: string): Promise<void> {
    const result = await this.mobileAppModel.findByIdAndDelete(appId).exec();
    if (!result) {
      throw new NotFoundException('Mobile app not found');
    }
  }
}
