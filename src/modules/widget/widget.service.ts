// src/widget/widget.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Widget } from './interfaces/widget.interface';
import { ImagesService } from '../images/images.service';

@Injectable()
export class WidgetService {
  constructor(
    @InjectModel('Widget') private readonly widgetModel: Model<Widget>,
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
  }

  async delete(id: string): Promise<Widget> {
    const deletedWidget = await this.widgetModel.findByIdAndDelete(id);
    if (!deletedWidget) {
      throw new NotFoundException(`Widget with id ${id} not found`);
    }
    return deletedWidget;
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
}
