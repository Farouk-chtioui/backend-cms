// src/widget/widget-type.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WidgetType } from '../interfaces/widget-type.interface';

@Injectable()
export class WidgetTypeService {
  constructor(
    @InjectModel('WidgetType') private readonly widgetTypeModel: Model<WidgetType>,
  ) {}

  async create(createWidgetTypeDto: any): Promise<WidgetType> {
    const createdWidgetType = new this.widgetTypeModel(createWidgetTypeDto);
    return createdWidgetType.save();
  }

  async findAll(): Promise<WidgetType[]> {
    return this.widgetTypeModel.find().exec();
  }

  async findOne(id: string): Promise<WidgetType> {
    const widgetType = await this.widgetTypeModel.findById(id).exec();
    if (!widgetType) {
      throw new NotFoundException(`WidgetType with id ${id} not found`);
    }
    return widgetType;
  }

  async update(id: string, updateWidgetTypeDto: any): Promise<WidgetType> {
    const updatedWidgetType = await this.widgetTypeModel.findByIdAndUpdate(
      id,
      updateWidgetTypeDto,
      { new: true },
    );
    if (!updatedWidgetType) {
      throw new NotFoundException(`WidgetType with id ${id} not found`);
    }
    return updatedWidgetType;
  }

  async delete(id: string): Promise<WidgetType> {
    const deletedWidgetType = await this.widgetTypeModel.findByIdAndDelete(id);
    if (!deletedWidgetType) {
      throw new NotFoundException(`WidgetType with id ${id} not found`);
    }
    return deletedWidgetType;
  }
}
