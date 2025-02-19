// Updated: appLayout.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppLayout } from './appLayout.schema';
import { UpdateAppLayoutDto } from './dtos/appLayout.dto';
import { ScreenService } from '../screen/screen.service';

@Injectable()
export class AppLayoutService {
  constructor(
    @InjectModel(AppLayout.name) private appLayoutModel: Model<AppLayout>,
    private screenService: ScreenService
  ) {}

  async createAppLayout(appId: string): Promise<AppLayout> {
    if (!appId) {
      throw new BadRequestException('appId is required');
    }

    // Create default screens first
    const defaultScreens = await this.screenService.createDefaultScreens(appId);
    
    const defaultLayout = new this.appLayoutModel({
      layoutType: 'default',
      appId: new Types.ObjectId(appId),  // Ensure appId is converted to ObjectId
      bottomBarTabs: [
        {
          name: 'Home',
          iconName: 'Home',
          visible: true,
          isHome: true,
          iconCategory: 'outline',
          routeType: 'screen',
          route: '/home',
          screenId: defaultScreens.find(s => s.route === '/home')?._id
        },
        {
          name: 'Settings',
          iconName: 'Settings',
          visible: true,
          isHome: false,
          iconCategory: 'outline',
          routeType: 'screen',
          route: '/settings',
          screenId: defaultScreens.find(s => s.route === '/settings')?._id
        },
        {
          name: 'Cart',
          iconName: 'ShoppingCart',
          visible: true,
          isHome: false,
          iconCategory: 'outline',
          routeType: 'screen',
          route: '/cart',
          screenId: defaultScreens.find(s => s.route === '/cart')?._id
        },
        {
          name: 'Offers',
          iconName: 'LocalOffer',
          visible: true,
          isHome: false,
          iconCategory: 'outline',
          routeType: 'screen',
          route: '/offers',
          screenId: defaultScreens.find(s => s.route === '/offers')?._id
        },
        {
          name: 'Account',
          iconName: 'AccountCircle',
          visible: true,
          isHome: false,
          iconCategory: 'outline',
          routeType: 'screen',
          route: '/account',
          screenId: defaultScreens.find(s => s.route === '/account')?._id
        }
      ]
    });

    try {
      return await defaultLayout.save();
    } catch (error) {
      throw new BadRequestException(`Failed to create app layout: ${error.message}`);
    }
  }

  async getDefaultLayout(): Promise<AppLayout> {
    let defaultLayout = await this.appLayoutModel.findOne({ layoutType: 'default' });
    if (!defaultLayout) {
      defaultLayout = new this.appLayoutModel({
        layoutType: 'default',
        bottomBarTabs: [
          { 
            name: 'Home',
            iconName: 'Home',
            visible: true,
            isHome: true,
            iconCategory: 'outline',
            routeType: 'screen',
            route: '/home'
          },
          { name: 'Settings', iconName: 'Settings', visible: true, isHome: false, iconCategory: 'outline', routeType: 'screen', route: '/settings' },
          { name: 'Cart', iconName: 'ShoppingCart', visible: true, isHome: false, iconCategory: 'outline', routeType: 'screen', route: '/cart' },
          { name: 'Offers', iconName: 'LocalOffer', visible: true, isHome: false, iconCategory: 'outline', routeType: 'screen', route: '/offers' },
          { name: 'Account', iconName: 'AccountCircle', visible: true, isHome: false, iconCategory: 'outline', routeType: 'screen', route: '/account' },
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
      { 
        name: 'Home',
        iconName: 'Home',
        visible: true,
        isHome: true,
        iconCategory: 'outline',
        routeType: 'screen',
        route: '/home'
      },
      { 
        name: 'Settings',
        iconName: 'Settings',
        visible: true,
        isHome: false,
        iconCategory: 'outline',
        routeType: 'screen',
        route: '/settings'
      },
      { 
        name: 'Cart',
        iconName: 'ShoppingCart',
        visible: true,
        isHome: false,
        iconCategory: 'outline',
        routeType: 'screen',
        route: '/cart'
      },
      { 
        name: 'Offers',
        iconName: 'LocalOffer',
        visible: true,
        isHome: false,
        iconCategory: 'outline',
        routeType: 'screen',
        route: '/offers'
      },
      { 
        name: 'Account',
        iconName: 'AccountCircle',
        visible: true,
        isHome: false,
        iconCategory: 'outline',
        routeType: 'screen',
        route: '/account'
      }
    ];
    await layout.save();
    return layout;
  }

  async updateTabRoute(
    layoutId: string, 
    tabName: string, 
    routeType: 'screen' | 'external',
    route: string,
    screenId?: string
  ): Promise<AppLayout> {
    const layout = await this.findById(layoutId);
    const tabIndex = layout.bottomBarTabs.findIndex(tab => tab.name === tabName);
    
    if (tabIndex === -1) {
      throw new NotFoundException(`Tab ${tabName} not found`);
    }

    if (routeType === 'screen' && !screenId) {
      const screen = await this.screenService.ensureDefaultScreenExists(layout.appId.toString(), route);
      screenId = screen._id.toString();
    }

    layout.bottomBarTabs[tabIndex].routeType = routeType;
    layout.bottomBarTabs[tabIndex].route = route;
    if (routeType === 'screen' && screenId) {
      layout.bottomBarTabs[tabIndex].screenId = screenId as any;
    }

    return layout.save();
  }


  async updateTabsOrder(layoutId: string, tabNames: string[]): Promise<AppLayout> {
    const layout = await this.findById(layoutId);
    const tabs = layout.bottomBarTabs;
    const newTabs = tabNames.map(tabName => tabs.find(tab => tab.name === tabName));
    layout.bottomBarTabs = newTabs;
    return layout.save();
  }
}