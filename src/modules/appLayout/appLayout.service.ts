import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppLayout } from './appLayout.schema';
import { CreateAppLayoutDto, UpdateAppLayoutDto } from './dtos/appLayout.dto';

@Injectable()
export class AppLayoutService {
  constructor(
    @InjectModel(AppLayout.name) private appLayoutModel: Model<AppLayout>,
  ) {}

  private defaultLayout = {
    layoutType: 'tab',
    bottomBarTabs: [
      { name: 'Home', visible: true, isHome: true, iconName: 'Home' },
      { name: 'Settings', visible: true, isHome: false, iconName: 'Settings' },
      { name: 'Cart', visible: true, isHome: false, iconName: 'ShoppingCart' },
      { name: 'Offers', visible: true, isHome: false, iconName: 'LocalOffer' },
      { name: 'Account', visible: true, isHome: false, iconName: 'AccountCircle' },
    ],
  };


  // Create a new layout
  async createLayout(createAppLayoutDto: CreateAppLayoutDto): Promise<AppLayout> {
    const newLayout = new this.appLayoutModel(createAppLayoutDto);
    return await newLayout.save();
  }

  // Update existing layout or create a new one
  async getDefaultLayout(): Promise<AppLayout> {
    let layout = await this.appLayoutModel.findOne();
    if (!layout) {
      layout = await this.resetToDefaultLayout();
    }
    return layout;
  }
  
  async updateLayout(updateAppLayoutDto: UpdateAppLayoutDto): Promise<AppLayout> {
    const layout = await this.appLayoutModel.findOne();
    if (layout) {
      layout.bottomBarTabs = updateAppLayoutDto.bottomBarTabs;
      return await layout.save();
    }
    const newLayout = new this.appLayoutModel({
      layoutType: 'tab',
      bottomBarTabs: updateAppLayoutDto.bottomBarTabs,
    });
    return await newLayout.save();
  }
  
  
  
  async resetToDefaultLayout(): Promise<AppLayout> {
    const defaultTabs = this.defaultLayout.bottomBarTabs;
    const layout = await this.appLayoutModel.findOne();
    if (layout) {
      layout.bottomBarTabs = defaultTabs;
      return await layout.save();
    }
    return await this.createLayout(this.defaultLayout);
  }
  
}
