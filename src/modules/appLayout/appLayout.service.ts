import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppLayout } from './appLayout.schema';
import { UpdateAppLayoutDto } from './dtos/appLayout.dto';

@Injectable()
export class AppLayoutService {
  constructor(@InjectModel(AppLayout.name) private appLayoutModel: Model<AppLayout>) {}

  async getDefaultLayout(): Promise<AppLayout> {
    let defaultLayout = await this.appLayoutModel.findOne({ layoutType: 'default' });
    if (!defaultLayout) {
      defaultLayout = new this.appLayoutModel({
        layoutType: 'default',
        bottomBarTabs: [
          { name: 'Home', iconName: 'Home', visible: true, isHome: true },
          { name: 'Settings', iconName: 'Settings', visible: true, isHome: false },
          { name: 'Cart', iconName: 'ShoppingCart', visible: true, isHome: false },
          { name: 'Offers', iconName: 'LocalOffer', visible: true, isHome: false },
          { name: 'Account', iconName: 'AccountCircle', visible: true, isHome: false },
        ],
      });
      await defaultLayout.save();
    }
    return defaultLayout;
  }

  async findById(layoutId: string): Promise<AppLayout> {
    const layout = await this.appLayoutModel.findById(layoutId).exec();
    if (!layout) {
      throw new NotFoundException(`AppLayout with ID ${layoutId} not found`);
    }
    return layout;
  }

  async updateLayoutById(layoutId: string, updateAppLayoutDto: UpdateAppLayoutDto): Promise<AppLayout> {
    const layout = await this.findById(layoutId);

    if (!layout) {
      throw new NotFoundException(`AppLayout with ID ${layoutId} not found`);
    }

    Object.assign(layout, updateAppLayoutDto);
    await layout.save();
    return layout;
  }

  async resetLayoutToDefault(layoutId: string): Promise<AppLayout> {
    const layout = await this.findById(layoutId);

    if (!layout) {
      throw new NotFoundException(`AppLayout with ID ${layoutId} not found`);
    }

    layout.bottomBarTabs = [
      { name: 'Home', iconName: 'Home', visible: true, isHome: true },
      { name: 'Settings', iconName: 'Settings', visible: true, isHome: false },
      { name: 'Cart', iconName: 'ShoppingCart', visible: true, isHome: false },
      { name: 'Offers', iconName: 'LocalOffer', visible: true, isHome: false },
      { name: 'Account', iconName: 'AccountCircle', visible: true, isHome: false },
    ];
    await layout.save();
    return layout;
  }
}
