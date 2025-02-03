// src/widget/widget.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Widget } from './interfaces/widget.interface';

@Injectable()
export class WidgetService {
  constructor(
    @InjectModel('Widget') private readonly widgetModel: Model<Widget>,
  ) {}

  // Create a widget – note that the createWidgetDto should include mobileAppId
  async create(createWidgetDto: any): Promise<Widget> {
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
    return widget;
  }

  async update(id: string, updateWidgetDto: any): Promise<Widget> {
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
    return this.widgetModel.find({ mobileAppId }).exec();
  }
}
