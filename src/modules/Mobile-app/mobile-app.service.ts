import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MobileApp } from './mobile-app.schema';
import { CreateMobileAppDto } from './dto/create-mobile-app.dto';

@Injectable()
export class MobileAppService {
  constructor(
    @InjectModel(MobileApp.name) private mobileAppModel: Model<MobileApp>,
  ) {}

  // Create a MobileApp and link it to a Repository and AppDesign
  async create(createMobileAppDto: CreateMobileAppDto): Promise<MobileApp> {
    const { appName, appDesignId, repositoryId, version } = createMobileAppDto;

    const newMobileApp = new this.mobileAppModel({
      appName,
      appDesignId, // Use the ObjectId of AppDesign here
      repositoryId,
      version,
    });

    return newMobileApp.save();
  }

  async findAll(): Promise<MobileApp[]> {
    return this.mobileAppModel
      .find()
      .populate('repositoryId')
      .populate('design') // Populate the AppDesign reference
      .exec();
  }

  async findById(id: string): Promise<MobileApp> {
    return this.mobileAppModel
      .findById(id)
      .populate('repositoryId')
      .populate('design') // Populate the AppDesign reference
      .exec();
  }
}
