import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Screen } from './screen.schema';
import { CreateScreenDto, UpdateScreenDto } from './dtos/screen.dto';
import { ScreenElement } from './types/screen-element.types';

@Injectable()
export class ScreenService {
  constructor(
    @InjectModel(Screen.name) private screenModel: Model<Screen>
  ) {}

  async create(createScreenDto: CreateScreenDto): Promise<Screen> {
    this.validateScreenElements(createScreenDto.elements);
    const existingScreen = await this.screenModel.findOne({
      route: createScreenDto.route,
      appId: createScreenDto.appId
    });

    if (existingScreen) {
      throw new BadRequestException('Screen with this route already exists for this app');
    }

    const screen = new this.screenModel({
      ...createScreenDto,
      appId: new Types.ObjectId(createScreenDto.appId)
    });
    
    return screen.save();
  }

  private validateScreenElements(elements: ScreenElement[]) {
    if (!Array.isArray(elements)) {
      throw new BadRequestException('Screen elements must be an array');
    }

    elements.forEach(element => {
      if (!element.type) {
        throw new BadRequestException('Each element must have a type');
      }

      switch (element.type) {
        case 'text':
          if (!element.content || typeof element.content !== 'string') {
            throw new BadRequestException('Text element must have string content');
          }
          break;
        case 'image':
          if (!element.url || typeof element.url !== 'string') {
            throw new BadRequestException('Image element must have valid URL');
          }
          break;
        case 'container':
          if (!Array.isArray(element.children)) {
            throw new BadRequestException('Container element must have children array');
          }
          this.validateScreenElements(element.children);
          break;
      }
    });
  }

  async findAll(): Promise<Screen[]> {
    return this.screenModel.find().exec();
  }

  async findById(id: string): Promise<Screen> {
    const screen = await this.screenModel.findById(id).exec();
    if (!screen) {
      throw new NotFoundException(`Screen with ID ${id} not found`);
    }
    return screen;
  }

  async findByAppId(appId: string): Promise<Screen[]> {
    return this.screenModel.find({ appId: new Types.ObjectId(appId) }).exec();
  }

  async update(id: string, updateScreenDto: UpdateScreenDto): Promise<Screen> {
    return this.screenModel
      .findByIdAndUpdate(id, updateScreenDto, { new: true })
      .exec();
  }

  async updateElements(id: string, elements: any[]): Promise<Screen> {
    const screen = await this.findById(id);
    screen.elements = elements;
    return screen.save();
  }

  async delete(id: string): Promise<void> {
    await this.screenModel.findByIdAndDelete(id).exec();
  }

  async createDefaultScreens(appId: string): Promise<Screen[]> {
    const defaultScreens = [
      {
        name: 'Home',
        route: '/home',
        elements: [],
        description: 'Default home screen',
        tags: ['default', 'home'],
      },
      {
        name: 'Settings',
        route: '/settings',
        elements: [],
        description: 'App settings screen',
        tags: ['default', 'settings'],
      },
      {
        name: 'Cart',
        route: '/cart',
        elements: [],
        description: 'Shopping cart screen',
        tags: ['default', 'cart'],
      },
      {
        name: 'Offers',
        route: '/offers',
        elements: [],
        description: 'Special offers screen',
        tags: ['default', 'offers'],
      },
      {
        name: 'Account',
        route: '/account',
        elements: [],
        description: 'User account screen',
        tags: ['default', 'account'],
      },
    ];

    const createdScreens = await Promise.all(
      defaultScreens.map(screen => this.create({
        ...screen,
        appId,
        settings: {
          backgroundColor: '#ffffff',
          padding: 16,
          layoutType: 'flex' as 'flex'
        }
      }))
    );

    return createdScreens;
  }

  async ensureDefaultScreenExists(appId: string, screenRoute: string): Promise<Screen> {
    const existingScreen = await this.screenModel.findOne({
      appId: new Types.ObjectId(appId),
      route: screenRoute
    });

    if (existingScreen) {
      return existingScreen;
    }

    const defaultScreen = {
      name: screenRoute.substring(1).charAt(0).toUpperCase() + screenRoute.slice(2),
      route: screenRoute,
      appId,
      elements: [],
      description: `Default ${screenRoute.substring(1)} screen`,
      tags: ['default'],
      settings: {
        backgroundColor: '#ffffff',
        padding: 16,
        layoutType: 'flex'
      }
    };

    return this.create({
      ...defaultScreen,
      settings: {
        ...defaultScreen.settings,
        layoutType: 'flex' as 'flex'
      }
    });
  }
}
