import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppDesign } from './appDesign.schema';

@Injectable()
export class AppDesignService {
  constructor(@InjectModel(AppDesign.name) private appDesignModel: Model<AppDesign>) {}

  /**
   * Fetch or create a default design.
   */
  async getOrCreateDesign(designId?: string): Promise<AppDesign> {
    if (designId) {
      const design = await this.appDesignModel.findById(designId).exec();
      if (design) return design;
    }
    return this.createDefaultDesign();
  }

  async createAppDesign(designData?: Partial<AppDesign>): Promise<AppDesign> {
    const defaultData = {
      backgroundColor: '#FFFFFF',
      secondaryBackgroundColor: '#000000',
      mainTextColor: '#000000',
      titleTextColor: '#333333',
      importantInformationTextColor: '#FF0000',
      accentColor: '#00BC7B',
      secondaryAccentColor: '#B400F6',
      bottomBarBackgroundColor: '#000000',
      bottomBarSelectedIconColor: '#FFFFFF',
      bottomBarUnselectedIconColor: '#AAAAAA',
      topBarBackgroundColor: '#FF2929',
      topBarIconTextColor: '#FFFFFF',
      statusBarTheme: 'light',
    };
  
    const newDesign = new this.appDesignModel({ ...defaultData, ...designData });
    return newDesign.save();
  }
  
  async createDefaultDesign(): Promise<AppDesign> {
    const defaultDesign = new this.appDesignModel({
      backgroundColor: '#FFFFFF',
      secondaryBackgroundColor: '#000000',
      mainTextColor: '#000000',
      titleTextColor: '#333333',
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
    return defaultDesign.save();
  }

  /**
   * Update an existing design.
   */
  async updateAppDesign(designId: string, designData: Partial<AppDesign>): Promise<AppDesign> {
    const updatedDesign = await this.appDesignModel.findByIdAndUpdate(designId, designData, { new: true }).exec();
    if (!updatedDesign) throw new NotFoundException('Design not found');
    return updatedDesign;
  }
  async getDesignById(designId: string): Promise<AppDesign> {
    return this.appDesignModel.findById(designId).exec();
  }
  
}
