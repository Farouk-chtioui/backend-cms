import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WidgetScreen, WidgetScreenDocument } from './widget-screen.schema';
import { CreateWidgetScreenDto } from './create-widget-screen.dto';
import { UpdateWidgetScreenDto } from './update-widget-screen.dto';
import { WidgetsService } from '../widgets/widgets.service';
import { WidgetScreenResponse } from '../../types/widget-screen-response.type';
import { Widget, WidgetDocument } from '../widgets/widget.schema';

@Injectable()
export class WidgetScreensService {
  constructor(
    @InjectModel(WidgetScreen.name) private widgetScreenModel: Model<WidgetScreenDocument>,
    private readonly widgetsService: WidgetsService,
  ) {}

  async create(createWidgetScreenDto: CreateWidgetScreenDto): Promise<WidgetScreen> {
    const createdScreen = new this.widgetScreenModel(createWidgetScreenDto);
    return createdScreen.save();
  }

  async findAll(): Promise<WidgetScreen[]> {
    return this.widgetScreenModel.find().exec();
  }

  async findAllByAppId(appId: string): Promise<WidgetScreenResponse[]> {
    const screens = await this.widgetScreenModel.find({ appId }).exec();
    const screensWithWidgets = await Promise.all(
      screens.map(async (screen) => {
        const widgets = await this.widgetsService.findAllByScreenId(screen._id.toString());
        return {
          ...screen.toObject(),
          widgets,
        } as WidgetScreenResponse;
      })
    );
    return screensWithWidgets;
  }

  async findOne(id: string): Promise<WidgetScreenResponse> {
    const screen = await this.widgetScreenModel.findById(id).exec();
    if (!screen) {
      throw new NotFoundException(`Widget screen with ID ${id} not found`);
    }
    const widgets = await this.widgetsService.findAllByScreenId(id);
    return {
      ...screen.toObject(),
      widgets,
    } as WidgetScreenResponse;
  }

  async update(id: string, updateWidgetScreenDto: UpdateWidgetScreenDto): Promise<WidgetScreen> {
    const updatedScreen = await this.widgetScreenModel
      .findByIdAndUpdate(id, updateWidgetScreenDto, { new: true })
      .exec();
    if (!updatedScreen) {
      throw new NotFoundException(`Widget screen with ID ${id} not found`);
    }
    return updatedScreen;
  }

  async remove(id: string): Promise<void> {
    const result = await this.widgetScreenModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Widget screen with ID ${id} not found`);
    }
  }

  async reorderWidgets(screenId: string, widgetIds: string[]): Promise<void> {
    const screen = await this.widgetScreenModel.findById(screenId).exec();
    if (!screen) {
      throw new NotFoundException(`Widget screen with ID ${screenId} not found`);
    }

    // Verify all widgets exist and belong to this screen
    const widgets = await this.widgetsService.findAllByScreenId(screenId) as WidgetDocument[];
    const existingWidgetIds = widgets.map(w => w._id.toString());
    
    // Check if all provided widget IDs are valid and belong to this screen
    const areAllWidgetsValid = widgetIds.every(id => 
      existingWidgetIds.includes(id)
    );

    if (!areAllWidgetsValid) {
      throw new NotFoundException('One or more widget IDs are invalid or do not belong to this screen');
    }

    // Update widget positions based on new order
    await Promise.all(
      widgetIds.map(async (widgetId, index) => {
        await this.widgetsService.update(widgetId, {
          position: { order: index }
        });
      })
    );
  }
}