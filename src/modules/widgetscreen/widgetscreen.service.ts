import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WidgetScreen } from './interfaces/widgetscreen.interface';

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

  // Optional: find all WidgetScreens for a given mobileAppId
async findByMobileApp(mobileAppId: string): Promise<WidgetScreen[]> {
    return this.widgetScreenModel.find({ mobileAppId }).populate('widgets').exec();
}
}
