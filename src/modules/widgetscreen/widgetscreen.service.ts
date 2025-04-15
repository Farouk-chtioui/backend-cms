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

  /**
   * Create a new WidgetScreen document
   */
  async create(createWidgetScreenDto: any): Promise<WidgetScreen> {
    const createdScreen = new this.widgetScreenModel(createWidgetScreenDto);
    return createdScreen.save();
  }

  /**
   * Find all WidgetScreens (no filtering by mobileAppId here)
   */
  async findAll(): Promise<WidgetScreen[]> {
    return this.widgetScreenModel.find().exec();
  }

  /**
   * Find a single WidgetScreen by its ID
   */
  async findOne(id: string): Promise<WidgetScreen> {
    const screen = await this.widgetScreenModel.findById(id).exec();
    if (!screen) {
      throw new NotFoundException(`WidgetScreen with id ${id} not found`);
    }
    return screen;
  }

  /**
   * Update a WidgetScreen by ID
   * Validates the 'header' field if present
   */
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
    if (!updatedScreen) {
      throw new NotFoundException(`WidgetScreen with id ${id} not found`);
    }
    return updatedScreen;
  }

  /**
   * Delete a WidgetScreen by ID
   */
  async delete(id: string): Promise<WidgetScreen> {
    const deletedScreen = await this.widgetScreenModel.findByIdAndDelete(id);
    if (!deletedScreen) {
      throw new NotFoundException(`WidgetScreen with id ${id} not found`);
    }
    return deletedScreen;
  }

  // --------------------------------------------------------------------------
  // METHOD #1 (Existing): Find all WidgetScreens for a given mobileAppId,
  //                       automatically populating the 'widgets' field.
  //
  // If you want to rename this for clarity, rename it to:
  //   findAllByAppIdWithWidgets(mobileAppId: string): Promise<WidgetScreen[]>
  // --------------------------------------------------------------------------
  async findByMobileApp(mobileAppId: string): Promise<WidgetScreen[]> {
    // This populates the 'widgets' array in each WidgetScreen
    return this.widgetScreenModel
      .find({ mobileAppId })
      .populate('widgets')
      .exec();
  }

  // --------------------------------------------------------------------------
  // METHOD #2 (Optional NEW): If you want a separate method with a clearer name
  //                           that does exactly the same as above, just add:
  // --------------------------------------------------------------------------
  async findAllByAppIdWithWidgets(mobileAppId: string): Promise<WidgetScreen[]> {
    return this.widgetScreenModel
      .find({ mobileAppId })
      .populate('widgets')
      .exec();
  }

  // --------------------------------------------------------------------------
  // Header-specific methods: update or delete the 'header' field
  // --------------------------------------------------------------------------
  async updateHeader(id: string, header: HeaderConfig | null): Promise<WidgetScreen> {
    // Validate header if not null
    if (header) {
      const validationError = validateHeader(header);
      if (validationError) {
        throw new Error(validationError);
      }
    }

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
