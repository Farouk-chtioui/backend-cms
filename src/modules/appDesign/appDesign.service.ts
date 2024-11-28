// src/app-design/app-design.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppDesign } from './appdesign.schema';

@Injectable()
export class AppDesignService {
  constructor(@InjectModel(AppDesign.name) private appDesignModel: Model<AppDesign>) {}

  async createAppDesign(): Promise<AppDesign> {
    const newDesign = new this.appDesignModel();
    return newDesign.save(); 
  }

  async updateAppDesign(designId: string, designData: Partial<AppDesign>): Promise<AppDesign> {
    return this.appDesignModel.findByIdAndUpdate(designId, designData, { new: true }).exec();
  }
}
