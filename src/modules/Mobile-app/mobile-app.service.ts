import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MobileApp } from './mobile-app.schema';
import { AppDesign } from '../appDesign/appDesign.schema';
import { CreateMobileAppDto } from './dto/create-mobile-app.dto';
import * as mongoose from 'mongoose';

@Injectable()
export class MobileAppService {
  private readonly logger = new Logger(MobileAppService.name);

  constructor(
    @InjectModel(MobileApp.name) private mobileAppModel: Model<MobileApp>,
    @InjectModel(AppDesign.name) private appDesignModel: Model<AppDesign>
  ) {}

  // Create a MobileApp and link it to a Repository and AppDesign
  async create(createMobileAppDto: CreateMobileAppDto): Promise<MobileApp> {
    const { appName, appDesignId, repositoryId, version } = createMobileAppDto;

    const newMobileApp = new this.mobileAppModel({
      appName,
      appDesignId, // Reference to AppDesign
      repositoryId,
      version,
    });

    return newMobileApp.save();
  }

  async updateDesign(id: string, designData: Partial<AppDesign>): Promise<MobileApp> {
    const mobileApp = await this.mobileAppModel.findById(id).populate('appDesignId').exec();

    if (!mobileApp || !mobileApp.appDesignId) {
      throw new Error('Mobile app or design not found');
    }

    await this.appDesignModel.findByIdAndUpdate(
      mobileApp.appDesignId,
      { $set: designData },
      { new: true }
    ).exec();

    return this.mobileAppModel.findById(id).populate('appDesignId').exec();
  }
  
  async findOne(id: string): Promise<MobileApp> {
    return this.mobileAppModel.findById(id).populate('appDesignId').exec();
  }


  async updateDesignByRepositoryId(repositoryId: string, designData: Partial<AppDesign>): Promise<MobileApp> {
    const mobileApp = await this.mobileAppModel.findOne({ repositoryId }).populate('appDesignId').exec();

    if (!mobileApp || !mobileApp.appDesignId) {
      throw new Error('Mobile app or design not found');
    }

    await this.appDesignModel.findByIdAndUpdate(
      mobileApp.appDesignId,
      { $set: designData },
      { new: true }
    ).exec();

    return this.mobileAppModel.findOne({ repositoryId }).populate('appDesignId').exec();
  }
  


}

