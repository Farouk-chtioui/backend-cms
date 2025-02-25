import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Screen } from './screen.schema';
import { CreateScreenDto, UpdateScreenDto } from './dtos/screen.dto';
import { ScreenType } from './types/screen.types';
import { WidgetService } from '../widget/widget.service'; // New import

@Injectable()
export class ScreenService {
  constructor(
    @InjectModel(Screen.name) private screenModel: Model<Screen>,
    private readonly widgetService: WidgetService // New dependency
  ) {}

  async create(createScreenDto: CreateScreenDto): Promise<Screen> {
    try {
      const existingScreen = await this.screenModel.findOne({
        route: createScreenDto.route,
        appId: new Types.ObjectId(createScreenDto.appId)
      });

      if (existingScreen) {
        throw new BadRequestException('Screen with this route already exists for this app');
      }

      // Get max order for the app
      const maxOrderScreen = await this.screenModel
        .findOne({ appId: new Types.ObjectId(createScreenDto.appId) })
        .sort({ 'metadata.order': -1 });

      const nextOrder = maxOrderScreen ? (maxOrderScreen.metadata?.order || 0) + 1 : 0;

      // Ensure default values for settings and metadata
      const screen = new this.screenModel({
        ...createScreenDto,
        appId: new Types.ObjectId(createScreenDto.appId),
        // ✅ Fix: Ensure widgetScreenId is saved
        widgetScreenId: createScreenDto.widgetScreenId || null,

        settings: {
          backgroundColor: '#ffffff',
          padding: 16,
          layoutType: 'flex',
          ...createScreenDto.settings
        },
        metadata: {
          order: nextOrder,
          showThumbnails: true,
          showSearch: true,
          showFilters: false,
          showCategories: false,
          enableLocation: false,
          showFavorites: false,
          showSharing: false,
          enableNotifications: false,
          layout: 'grid',
          requiresTicket: false,
          vipOnly: false,
          primaryColor: '#000000',
          ...createScreenDto.metadata
        }
      });
      
      return await screen.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('Screen with this route already exists for this app');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Screen> {
    try {
      const screen = await this.screenModel.findById(new Types.ObjectId(id)).exec();
      if (!screen) {
        throw new NotFoundException(`Screen with ID ${id} not found`);
      }
      return screen;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Invalid screen ID');
    }
  }

  async findAll(): Promise<Screen[]> {
    return this.screenModel.find().sort({ 'metadata.order': 1 }).exec();
  }

  async findByAppId(appId: string): Promise<Screen[]> {
    try {
      return await this.screenModel
        .find({ appId: new Types.ObjectId(appId) })
        .sort({ 'metadata.order': 1 })
        .exec();
    } catch (error) {
      throw new BadRequestException('Invalid app ID');
    }
  }

  async findByType(appId: string, screenType: ScreenType): Promise<Screen[]> {
    try {
      return await this.screenModel
        .find({ 
          appId: new Types.ObjectId(appId),
          screenType 
        })
        .sort({ 'metadata.order': 1 })
        .exec();
    } catch (error) {
      throw new BadRequestException('Invalid app ID or screen type');
    }
  }

  async update(id: string, updateScreenDto: UpdateScreenDto): Promise<Screen> {
    try {
      // If updating route, check for uniqueness
      if (updateScreenDto.route && updateScreenDto.appId) {
        const existingScreen = await this.screenModel.findOne({
          route: updateScreenDto.route,
          appId: new Types.ObjectId(updateScreenDto.appId),
          _id: { $ne: new Types.ObjectId(id) }
        });

        if (existingScreen) {
          throw new BadRequestException('Screen with this route already exists for this app');
        }
      }

      // Create update object
      const updateData: any = { ...updateScreenDto };
      if (updateScreenDto.appId) {
        updateData.appId = new Types.ObjectId(updateScreenDto.appId);
      }

      // ✅ Fix: If widgetScreenId was provided, ensure it's updated
      if (updateScreenDto.widgetScreenId) {
        updateData.widgetScreenId = updateScreenDto.widgetScreenId;
      }

      const updatedScreen = await this.screenModel
        .findByIdAndUpdate(
          new Types.ObjectId(id), 
          { $set: updateData },
          { new: true, runValidators: true }
        )
        .exec();

      if (!updatedScreen) {
        throw new NotFoundException(`Screen with ID ${id} not found`);
      }

      return updatedScreen;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      if (error.code === 11000) {
        throw new BadRequestException('Screen with this route already exists for this app');
      }
      throw new BadRequestException('Failed to update screen');
    }
  }

  async updateOrder(id: string, order: number): Promise<Screen> {
    try {
      const screen = await this.findById(id);
      const oldOrder = screen.metadata?.order || 0;

      // Update the order of the current screen
      const updatedScreen = await this.screenModel
        .findByIdAndUpdate(
          new Types.ObjectId(id),
          { $set: { 'metadata.order': order } },
          { new: true }
        )
        .exec();

      // Update the order of other screens
      if (oldOrder !== order) {
        if (order > oldOrder) {
          // Moving down - decrease order of screens in between
          await this.screenModel.updateMany(
            {
              appId: screen.appId,
              _id: { $ne: new Types.ObjectId(id) },
              'metadata.order': { $gt: oldOrder, $lte: order }
            },
            { $inc: { 'metadata.order': -1 } }
          );
        } else {
          // Moving up - increase order of screens in between
          await this.screenModel.updateMany(
            {
              appId: screen.appId,
              _id: { $ne: new Types.ObjectId(id) },
              'metadata.order': { $gte: order, $lt: oldOrder }
            },
            { $inc: { 'metadata.order': 1 } }
          );
        }
      }

      return updatedScreen;
    } catch (error) {
      throw new BadRequestException('Failed to update screen order');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const screen = await this.findById(id);
      const deletedScreen = await this.screenModel
        .findByIdAndDelete(new Types.ObjectId(id))
        .exec();

      if (!deletedScreen) {
        throw new NotFoundException(`Screen with ID ${id} not found`);
      }

      // Update order of remaining screens
      await this.screenModel.updateMany(
        {
          appId: screen.appId,
          'metadata.order': { $gt: screen.metadata?.order || 0 }
        },
        { $inc: { 'metadata.order': -1 } }
      );
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to delete screen');
    }
  }

  async ensureDefaultScreenExists(appId: string, route: string): Promise<Screen> {
    try {
      const existingScreen = await this.screenModel.findOne({
        appId: new Types.ObjectId(appId),
        route
      });

      if (existingScreen) {
        return existingScreen;
      }

      // Determine screen type and settings based on route
      const screenType = this.getScreenTypeFromRoute(route);
      const screenName = this.getScreenNameFromRoute(route);

      const createScreenDto: CreateScreenDto = {
        name: screenName,
        route,
        appId,
        screenType,
        settings: {
          backgroundColor: '#ffffff',
          padding: 16,
          layoutType: 'flex'
        },
        description: `Default ${screenName} screen`,
        tags: ['default'],
        metadata: {
          showThumbnails: true,
          showSearch: true,
          showFilters: false,
          showCategories: false,
          enableLocation: false,
          showFavorites: false,
          showSharing: false,
          enableNotifications: false,
          layout: 'grid',
          requiresTicket: false,
          vipOnly: false,
          primaryColor: '#000000'
        }
      };

      return await this.create(createScreenDto);
    } catch (error) {
      throw new BadRequestException(`Failed to ensure default screen exists: ${error.message}`);
    }
  }

  private getScreenTypeFromRoute(route: string): ScreenType {
    const routePath = route.substring(1); // Remove leading slash
    switch (routePath) {
      case 'home':
        return ScreenType.CONTENT_LIST;
      case 'schedule':
        return ScreenType.SCHEDULE;
      case 'map':
        return ScreenType.MAP;
      case 'artists':
        return ScreenType.ARTISTS;
      case 'stages':
        return ScreenType.STAGES;
      case 'food-drinks':
        return ScreenType.FOOD_DRINKS;
      case 'emergency':
        return ScreenType.EMERGENCY;
      case 'transportation':
        return ScreenType.TRANSPORTATION;
      case 'social':
        return ScreenType.SOCIAL_FEED;
      default:
        return ScreenType.CUSTOM;
    }
  }

  private getScreenNameFromRoute(route: string): string {
    const name = route
      .substring(1) // Remove leading slash
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return name || 'Default Screen';
  }

  async createDefaultScreens(appId: string): Promise<Screen[]> {
    const defaultScreens = [
      {
        name: 'Home',
        route: '/home',
        screenType: ScreenType.CONTENT_LIST,
        description: 'Festival home screen with latest updates',
        tags: ['default', 'home'],
      },
      {
        name: 'Schedule',
        route: '/schedule',
        screenType: ScreenType.SCHEDULE,
        description: 'Festival schedule and timeline',
        tags: ['default', 'schedule'],
      },
      {
        name: 'Map',
        route: '/map',
        screenType: ScreenType.MAP,
        description: 'Interactive festival map',
        tags: ['default', 'map'],
      },
      // Add other default screens...
    ];

    try {
      const createdScreens = await Promise.all(
        defaultScreens.map((screen, index) =>
          this.create({
            ...screen,
            appId,
            settings: {
              backgroundColor: '#ffffff',
              padding: 16,
              layoutType: 'flex'
            },
            metadata: {
              order: index
            }
          })
        )
      );

      return createdScreens;
    } catch (error) {
      throw new BadRequestException('Failed to create default screens');
    }
  }

  async duplicateScreen(id: string, newRoute: string): Promise<Screen> {
    try {
      const sourceScreen = await this.findById(id);
      const { settings, screenType, description, tags, metadata } = sourceScreen;

      const newMetadata = {
        ...metadata,
        additionalMetadata: {
          ...metadata.additionalMetadata,
          originalScreenId: id,
        },
        order: metadata.order ? metadata.order + 1 : 0,
      };

      const createDto: CreateScreenDto = {
        name: `Copy of ${sourceScreen.name}`,
        route: newRoute,
        appId: sourceScreen.appId.toString(),
        screenType,
        settings,
        description,
        tags: [...tags, 'duplicated'],
        metadata: newMetadata
      };

      return await this.create(createDto);
    } catch (error) {
      throw new BadRequestException('Failed to duplicate screen');
    }
  }
}
