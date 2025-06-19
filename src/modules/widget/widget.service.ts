// src/widget/widget.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Widget } from './interfaces/widget.interface';
import { ImagesService } from '../images/images.service';

@Injectable()
export class WidgetService {
  constructor(
    @InjectModel('Widget') private readonly widgetModel: Model<Widget>,
    @InjectModel('WidgetScreen') private readonly widgetScreenModel: Model<any>,
    @InjectModel('Tag') private readonly tagModel: Model<any>,
    private readonly imagesService: ImagesService,
  ) {}

  private async validateImageReferences(content: any): Promise<void> {
    const findImageRefs = (obj: any): string[] => {
      const refs: string[] = [];
      JSON.stringify(obj, (_, value) => {
        if (value && typeof value === 'object' && 'imageId' in value) {
          refs.push(value.imageId);
        }
        return value;
      });
      return refs;
    };

    const imageRefs = findImageRefs(content);
    for (const imageId of imageRefs) {
      try {
        await this.imagesService.findOne(imageId);
      } catch (error) {
        throw new BadRequestException(`Invalid image reference: ${imageId}`);
      }
    }
  }

  private async populateImageData(content: any): Promise<any> {
    const processObject = async (obj: any): Promise<any> => {
      if (!obj || typeof obj !== 'object') return obj;

      if (Array.isArray(obj)) {
        return Promise.all(obj.map(item => processObject(item)));
      }

      const result = { ...obj };
      for (const key in result) {
        if (result[key] && typeof result[key] === 'object') {
          if ('imageId' in result[key]) {
            try {
              // Fetch the actual image data
              const image = await this.imagesService.findOne(result[key].imageId);
              result[key] = {
                ...result[key],
                imageData: image
              };
            } catch (error) {
              console.warn(`Failed to fetch image ${result[key].imageId}:`, error);
              // Keep the imageId but mark as not found
              result[key].imageError = 'Image not found';
            }
          } else {
            result[key] = await processObject(result[key]);
          }
        }
      }
      return result;
    };

    return processObject(content);
  }

  // Create a widget – note that the createWidgetDto should include mobileAppId
  async create(createWidgetDto: any): Promise<Widget> {
    await this.validateImageReferences(createWidgetDto.content);
    const createdWidget = new this.widgetModel(createWidgetDto);
    return createdWidget.save();
  }

  async findAll(): Promise<Widget[]> {
    return this.widgetModel.find().exec();
  }
 

  async findOne(id: string): Promise<Widget> {
    const widget = await this.widgetModel.findById(id).exec();
    if (!widget) {
      throw new NotFoundException(`Widget with id ${id} not found`);
    }
    
    // Populate the image data in the content
    const widgetObj = widget.toObject();
    const newWidget = { ...widgetObj, content: await this.populateImageData(widgetObj.content) };
    return newWidget as unknown as Widget;
  }

  async update(id: string, updateWidgetDto: any): Promise<Widget> {
    await this.validateImageReferences(updateWidgetDto.content);
    const updatedWidget = await this.widgetModel.findByIdAndUpdate(
      id,
      updateWidgetDto,
      { new: true },
    );
    if (!updatedWidget) {
      throw new NotFoundException(`Widget with id ${id} not found`);
    }
    return updatedWidget;
  }  async delete(id: string): Promise<Widget> {
    console.log(`=== WIDGET DELETE OPERATION STARTED ===`);
    console.log(`WidgetService.delete called with id: ${id}`);
    
    // Validate that the id is a valid ObjectId
    if (!Types.ObjectId.isValid(id)) {
      console.error(`Invalid widget id format: ${id}`);
      throw new BadRequestException(`Invalid widget id format: ${id}`);
    }

    const widgetObjectId = new Types.ObjectId(id);

    try {
      // Step 1: Verify the widget exists BEFORE deletion
      console.log(`Step 1: Checking if widget exists...`);
      const existingWidget = await this.widgetModel.findById(widgetObjectId).lean();
      if (!existingWidget) {
        console.error(`Widget with id ${id} not found in database`);
        throw new NotFoundException(`Widget with id ${id} not found`);
      }

      console.log(`Step 1 SUCCESS: Found widget to delete:`, {
        id: existingWidget._id,
        name: existingWidget.name,
        type: existingWidget.type
      });

      // Step 2: Count references before cleanup
      console.log(`Step 2: Counting references...`);
      const widgetScreenCount = await this.widgetScreenModel.countDocuments({ widgets: widgetObjectId });
      const tagCount = await this.tagModel.countDocuments({ widgets: widgetObjectId });
      console.log(`Step 2 SUCCESS: Found ${widgetScreenCount} widget screen refs, ${tagCount} tag refs`);

      // Step 3: Remove widget references from WidgetScreens
      console.log(`Step 3: Removing widget screen references...`);
      const widgetScreenUpdateResult = await this.widgetScreenModel.updateMany(
        { widgets: widgetObjectId },
        { $pull: { widgets: widgetObjectId } }
      );
      console.log(`Step 3 SUCCESS: Removed widget from ${widgetScreenUpdateResult.modifiedCount} widget screens`);

      // Step 4: Remove widget references from Tags
      console.log(`Step 4: Removing tag references...`);
      const tagUpdateResult = await this.tagModel.updateMany(
        { widgets: widgetObjectId },
        { $pull: { widgets: widgetObjectId } }
      );
      console.log(`Step 4 SUCCESS: Removed widget from ${tagUpdateResult.modifiedCount} tags`);

      // Step 5: CRITICAL - Delete the actual widget document
      console.log(`Step 5: DELETING THE ACTUAL WIDGET DOCUMENT...`);
      const deletedWidget = await this.widgetModel.findByIdAndDelete(widgetObjectId, { lean: false });
      
      if (!deletedWidget) {
        console.error(`CRITICAL ERROR: Widget deletion failed - document not found during deletion`);
        throw new NotFoundException(`CRITICAL ERROR: Failed to delete widget document with id ${id}`);
      }
      
      console.log(`Step 5 SUCCESS: Widget document deleted from database:`, {
        id: deletedWidget._id,
        name: deletedWidget.name
      });

      // Step 6: Verify the widget is actually gone from the database
      console.log(`Step 6: Verifying widget deletion...`);
      const verifyDeleted = await this.widgetModel.findById(widgetObjectId).lean();
      if (verifyDeleted) {
        console.error(`CRITICAL ERROR: Widget still exists in database after deletion!`);
        throw new Error(`CRITICAL ERROR: Widget ${id} still exists in database after deletion`);
      }
      
      console.log(`Step 6 SUCCESS: Confirmed widget no longer exists in database`);
      console.log(`=== WIDGET DELETE OPERATION COMPLETED SUCCESSFULLY ===`);
      
      return deletedWidget;
    } catch (error) {
      console.error(`=== WIDGET DELETE OPERATION FAILED ===`);
      console.error(`Error deleting widget with id ${id}:`, error);
      console.error(`Error stack:`, error.stack);
      throw error;
    }
  }
  
  // (Optional) A method to fetch all widgets for a given mobile app:
  async findByMobileApp(mobileAppId: string): Promise<Widget[]> {
    const widgets = await this.widgetModel.find({ mobileAppId }).exec();
    
    // Populate image data for all widgets
    const populatedWidgets = await Promise.all(
      widgets.map(async (widget) => {
        const widgetObj = widget.toObject();
        const newWidget = { ...widgetObj, content: await this.populateImageData(widgetObj.content) };
        return newWidget;
      })
    );
    
    return populatedWidgets as unknown as Widget[];
  }

  async updateWidgetTags(id: string, tagIds: string[]): Promise<Widget> {
    try {
      const validTagIds = tagIds.map(tagId => new Types.ObjectId(tagId));
      
      const updatedWidget = await this.widgetModel.findByIdAndUpdate(
        id,
        { $set: { tags: validTagIds } },
        { new: true }
      );
      
      if (!updatedWidget) {
        throw new NotFoundException(`Widget with id ${id} not found`);
      }
      
      return updatedWidget;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to update widget tags: ${error.message}`);
    }
  }
  
  async getWidgetWithTags(id: string): Promise<Widget> {
    try {
      const widget = await this.widgetModel
        .findById(id)
        .populate('tags', 'name color')
        .exec();
        
      if (!widget) {
        throw new NotFoundException(`Widget with id ${id} not found`);
      }
      
      return widget;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to get widget with tags: ${error.message}`);
    }
  }
  
  async findWidgetsByTag(tagId: string): Promise<Widget[]> {
    try {
      return await this.widgetModel
        .find({ tags: new Types.ObjectId(tagId) })
        .exec();
    } catch (error) {
      throw new BadRequestException(`Failed to find widgets by tag: ${error.message}`);
    }
  }

  // Helper methods for debugging and finding references
  async findWidgetScreenReferences(widgetId: string): Promise<any[]> {
    const widgetObjectId = new Types.ObjectId(widgetId);
    return await this.widgetScreenModel.find({ widgets: widgetObjectId }).exec();
  }

  async findTagReferences(widgetId: string): Promise<any[]> {
    const widgetObjectId = new Types.ObjectId(widgetId);
    return await this.tagModel.find({ widgets: widgetObjectId }).exec();
  }

  // Force delete method that removes all references first
  async forceDelete(id: string): Promise<{ success: boolean; message: string; deletedWidget?: Widget }> {
    console.log(`WidgetService.forceDelete called with id: ${id}`);
    
    try {
      // First, let's see what references exist
      const references = await this.findAllReferences(id);
      console.log(`Found references:`, references);

      // Clean up all references
      await this.cleanupReferences(id);
      
      // Now delete the widget
      const result = await this.delete(id);
      
      return {
        success: true,
        message: `Widget deleted successfully. Cleaned up ${references.widgetScreenCount + references.tagCount} references.`,
        deletedWidget: result
      };
    } catch (error) {
      console.error(`Force delete failed for widget ${id}:`, error);
      return {
        success: false,
        message: `Failed to delete widget: ${error.message}`
      };
    }
  }

  private async findAllReferences(widgetId: string): Promise<{ widgetScreenCount: number; tagCount: number }> {
    const widgetObjectId = new Types.ObjectId(widgetId);
    
    const widgetScreenCount = await this.widgetScreenModel.countDocuments({ widgets: widgetObjectId });
    const tagCount = await this.tagModel.countDocuments({ widgets: widgetObjectId });
    
    return { widgetScreenCount, tagCount };
  }

  private async cleanupReferences(widgetId: string): Promise<void> {
    const widgetObjectId = new Types.ObjectId(widgetId);
    
    // Remove from widget screens
    await this.widgetScreenModel.updateMany(
      { widgets: widgetObjectId },
      { $pull: { widgets: widgetObjectId } }
    );
    
    // Remove from tags
    await this.tagModel.updateMany(
      { widgets: widgetObjectId },
      { $pull: { widgets: widgetObjectId } }
    );
  }

  // Diagnostic method to check widget model health
  async diagnoseWidgetModel(): Promise<any> {
    try {
      console.log('Running widget model diagnostics...');
      
      // Check if model is properly connected
      const modelName = this.widgetModel.modelName;
      const collectionName = this.widgetModel.collection.name;
      
      // Count total widgets
      const totalCount = await this.widgetModel.countDocuments();
      
      // Test a simple find operation
      const sampleWidgets = await this.widgetModel.find().limit(3).lean();
      
      const diagnostics = {
        modelName,
        collectionName,
        totalWidgets: totalCount,
        sampleWidgets: sampleWidgets.map(w => ({ id: w._id, name: w.name, type: w.type })),
        connectionState: this.widgetModel.db.readyState,
        connectionStates: {
          0: 'disconnected',
          1: 'connected',
          2: 'connecting',
          3: 'disconnecting'
        }
      };
      
      console.log('Widget model diagnostics:', diagnostics);
      return diagnostics;
    } catch (error) {
      console.error('Widget model diagnostics failed:', error);
      throw error;
    }
  }
}
