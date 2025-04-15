import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WidgetScreen } from './interfaces/widgetscreen.interface';
import { HeaderConfig } from '../header/header.interface';
import { validateHeader } from '../header/header.utils';
import { WidgetService } from '../widget/widget.service';

@Injectable()
export class WidgetScreenService {
  constructor(
    @InjectModel('WidgetScreen') private readonly widgetScreenModel: Model<WidgetScreen>,
    private readonly widgetService: WidgetService, // Inject WidgetService to get widget details
  ) {}

  async create(createWidgetScreenDto: any): Promise<WidgetScreen> {
    const createdScreen = new this.widgetScreenModel(createWidgetScreenDto);
    return createdScreen.save();
  }

  async findAll(): Promise<WidgetScreen[]> {
    return this.widgetScreenModel.find().exec();
  }

  async findOne(id: string): Promise<WidgetScreen> {
    const screen = await this.widgetScreenModel.findById(id).exec();
    if (!screen)
      throw new NotFoundException(`WidgetScreen with id ${id} not found`);
    return screen;
  }

  // Get full widget screen data with populated widgets
  // Only used by admin UI, not for OTA packs
  async findOneWithWidgets(id: string): Promise<WidgetScreen> {
    const screen = await this.widgetScreenModel.findById(id)
      .populate({
        path: 'widgets',
        model: 'Widget'
      })
      .exec();
    
    if (!screen)
      throw new NotFoundException(`WidgetScreen with id ${id} not found`);
    
    return screen;
  }

  async update(id: string, updateWidgetScreenDto: any): Promise<WidgetScreen> {
    // If header is being updated, validate it
    if (updateWidgetScreenDto.header) {
      const validationError = validateHeader(updateWidgetScreenDto.header);
      if (validationError) {
        throw new Error(validationError);
      }
    }

    const updatedScreen = await this.widgetScreenModel.findByIdAndUpdate(
      id,
      updateWidgetScreenDto,
      { new: true },
    );
    if (!updatedScreen)
      throw new NotFoundException(`WidgetScreen with id ${id} not found`);
    return updatedScreen;
  }

  async delete(id: string): Promise<WidgetScreen> {
    const deletedScreen = await this.widgetScreenModel.findByIdAndDelete(id);
    if (!deletedScreen)
      throw new NotFoundException(`WidgetScreen with id ${id} not found`);
    return deletedScreen;
  }

  // Find all WidgetScreens for a given mobileAppId
  async findByMobileApp(mobileAppId: string): Promise<WidgetScreen[]> {
    // Only get the basic widget screen data, not populating the widgets array at all
    return this.widgetScreenModel.find({ mobileAppId }).select('_id name mobileAppId header createdAt').exec();
  }

  // Add a widget to the screen
  async addWidget(screenId: string, widgetId: string): Promise<WidgetScreen> {
    // Ensure the widget exists
    const widget = await this.widgetService.findOne(widgetId);
    
    // Update the widget screen by adding the widget to the widgets array
    const updatedScreen = await this.widgetScreenModel.findByIdAndUpdate(
      screenId,
      { $addToSet: { widgets: new Types.ObjectId(widgetId) } },
      { new: true }
    );
    
    if (!updatedScreen) {
      throw new NotFoundException(`WidgetScreen with id ${screenId} not found`);
    }
    
    return updatedScreen;
  }

  // Remove a widget from the screen
  async removeWidget(screenId: string, widgetId: string): Promise<WidgetScreen> {
    const updatedScreen = await this.widgetScreenModel.findByIdAndUpdate(
      screenId,
      { $pull: { widgets: new Types.ObjectId(widgetId) } },
      { new: true }
    );
    
    if (!updatedScreen) {
      throw new NotFoundException(`WidgetScreen with id ${screenId} not found`);
    }
    
    return updatedScreen;
  }

  // Update widgets order (replace entire array)
  async updateWidgetsOrder(screenId: string, widgetIds: string[]): Promise<WidgetScreen> {
    // Convert string IDs to ObjectIds
    const widgetObjectIds = widgetIds.map(id => new Types.ObjectId(id));
    
    const updatedScreen = await this.widgetScreenModel.findByIdAndUpdate(
      screenId,
      { widgets: widgetObjectIds },
      { new: true }
    );
    
    if (!updatedScreen) {
      throw new NotFoundException(`WidgetScreen with id ${screenId} not found`);
    }
    
    return updatedScreen;
  }

  // Header-specific methods
  async updateHeader(id: string, header: HeaderConfig | null): Promise<WidgetScreen> {
    // Validate header if it's not null
    if (header) {
      const validationError = validateHeader(header);
      if (validationError) {
        throw new Error(validationError);
      }
    }

    // Use findByIdAndUpdate instead of directly modifying the document
    const updatedScreen = await this.widgetScreenModel.findByIdAndUpdate(
      id,
      { $set: { header: header } },
      { new: true }
    );
    
    if (!updatedScreen) {
      throw new NotFoundException(`WidgetScreen with id ${id} not found`);
    }
    
    return updatedScreen;
  }

  async deleteHeader(id: string): Promise<WidgetScreen> {
    // Use findByIdAndUpdate to set header to null
    const updatedScreen = await this.widgetScreenModel.findByIdAndUpdate(
      id,
      { $set: { header: null } },
      { new: true }
    );
    
    if (!updatedScreen) {
      throw new NotFoundException(`WidgetScreen with id ${id} not found`);
    }
    
    return updatedScreen;
  }
}