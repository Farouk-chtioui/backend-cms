import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppLayout } from './appLayout.schema';
import { CreateAppLayoutDto, UpdateAppLayoutDto } from './dtos/appLayout.dto';

@Injectable()
export class AppLayoutService {
  constructor(@InjectModel(AppLayout.name) private appLayoutModel: Model<AppLayout>) {}

  /**
   * Fetch or create a default layout.
   */
  async getOrCreateDefaultLayout(): Promise<AppLayout> {
    let defaultLayout = await this.appLayoutModel.findOne({ layoutType: 'default' });
    if (!defaultLayout) {
      defaultLayout = await this.createDefaultLayout();
    }
    return defaultLayout;
  }

  /**
   * Create a default layout.
   */
  async createDefaultLayout(): Promise<AppLayout> {
    const defaultLayout = new this.appLayoutModel({
      layoutType: 'tabs',
      bottomBarTabs: [
        { name: 'Home', iconName: 'Home', visible: true, isHome: true },
        { name: 'Settings', iconName: 'Settings', visible: true, isHome: false },
        { name: 'Cart', iconName: 'ShoppingCart', visible: true, isHome: false },
        { name: 'Offers', iconName: 'LocalOffer', visible: true, isHome: false },
        { name: 'Account', iconName: 'AccountCircle', visible: true, isHome: false },
      ],
    });
    return defaultLayout.save();
  }

  /**
   * Update an existing layout.
   */
  async updateLayout(layoutId: string, layoutData: UpdateAppLayoutDto): Promise<AppLayout> {
    const updatedLayout = await this.appLayoutModel.findByIdAndUpdate(layoutId, layoutData, { new: true }).exec();
    if (!updatedLayout) throw new NotFoundException('Layout not found');
    return updatedLayout;
  }

  /**
   * Reset layout to default.
   */
  async resetLayoutToDefault(layoutId: string): Promise<AppLayout> {
    const layout = await this.appLayoutModel.findById(layoutId).exec();
    if (!layout) throw new NotFoundException(`Layout with ID ${layoutId} not found`);

    const defaultLayout = await this.getOrCreateDefaultLayout();
    layout.bottomBarTabs = defaultLayout.bottomBarTabs;
    return layout.save();
  }
  async getLayoutById(layoutId: string): Promise<AppLayout> {
    return this.appLayoutModel.findById(layoutId).exec();
  }
  
}
