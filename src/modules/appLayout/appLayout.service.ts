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

  // Retrieve or create the default layout
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

  // Clone an existing layout for a new app
  async cloneLayout(templateLayoutId: string): Promise<AppLayout> {
    const templateLayout = await this.appLayoutModel.findById(templateLayoutId).exec();
    if (!templateLayout) throw new Error('Template layout not found');

    const clonedLayout = new this.appLayoutModel({
      layoutType: templateLayout.layoutType,
      bottomBarTabs: templateLayout.bottomBarTabs,
    });

    return await clonedLayout.save();
  }

  // Reset layout to default by replacing with a fresh copy of the default template
  async resetLayoutToDefault(layoutId: string): Promise<AppLayout> {
    const layout = await this.appLayoutModel.findById(layoutId).exec();
    if (!layout) throw new Error(`Layout with ID ${layoutId} not found`);

    const defaultLayout = await this.getDefaultLayout();
    layout.bottomBarTabs = defaultLayout.bottomBarTabs;
    return await layout.save();
  }

  // Create a new layout
  async createLayout(createAppLayoutDto: CreateAppLayoutDto): Promise<AppLayout> {
    const newLayout = new this.appLayoutModel(createAppLayoutDto);
    return await newLayout.save();
  }

  // Update an existing layout
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
}
