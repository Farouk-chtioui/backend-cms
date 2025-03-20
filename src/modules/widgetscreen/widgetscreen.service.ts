import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WidgetScreen } from './interfaces/widgetscreen.interface';
import { HeaderConfig } from '../header/header.interface';
import { validateHeader } from '../header/header.utils';

@Injectable()
export class WidgetScreenService {
  constructor(
    @InjectModel('WidgetScreen') private readonly widgetScreenModel: Model<WidgetScreen>,
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
    return this.widgetScreenModel.find({ mobileAppId }).populate('widgets').exec();
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