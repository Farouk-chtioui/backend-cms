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

<<<<<<< HEAD
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

=======
  /**
   * Update a WidgetScreen by ID
   * Validates the 'header' field if present
   */
>>>>>>> 8f8dad58a824b47aa65497cdf5367b309a42588f
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
<<<<<<< HEAD
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
=======
    // This populates the 'widgets' array in each WidgetScreen
    return this.widgetScreenModel
      .find({ mobileAppId })
      .populate('widgets')
      .exec();
>>>>>>> 8f8dad58a824b47aa65497cdf5367b309a42588f
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
