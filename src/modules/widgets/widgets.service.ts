import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Widget, WidgetDocument } from './widget.schema';
import { CreateWidgetDto } from './create-widget.dto';
import { UpdateWidgetDto } from './update-widget.dto';

@Injectable()
export class WidgetsService {
  constructor(
    @InjectModel(Widget.name) private widgetModel: Model<WidgetDocument>,
  ) {}

  async create(createWidgetDto: CreateWidgetDto): Promise<Widget> {
    const createdWidget = new this.widgetModel(createWidgetDto);
    return createdWidget.save();
  }

  async findAll(): Promise<Widget[]> {
    return this.widgetModel.find().exec();
  }

  async findAllByScreenId(screenId: string): Promise<Widget[]> {
    return this.widgetModel.find({ screenId }).exec();
  }

  async findOne(id: string): Promise<Widget> {
    const widget = await this.widgetModel.findById(id).exec();
    if (!widget) {
      throw new NotFoundException(`Widget with ID ${id} not found`);
    }
    return widget;
  }

  async update(id: string, updateWidgetDto: UpdateWidgetDto): Promise<Widget> {
    const updatedWidget = await this.widgetModel
      .findByIdAndUpdate(id, updateWidgetDto, { new: true })
      .exec();
    if (!updatedWidget) {
      throw new NotFoundException(`Widget with ID ${id} not found`);
    }
    return updatedWidget;
  }

  async remove(id: string): Promise<void> {
    const result = await this.widgetModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Widget with ID ${id} not found`);
    }
  }
}