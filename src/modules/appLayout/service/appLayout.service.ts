import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTabDto } from '../dto/createTab.dto';
import { Tab } from '../interface/tab.interface';

@Injectable()
export class AppLayoutService {
  constructor(
    @InjectModel('Tab') private readonly tabModel: Model<Tab>,  // Inject Mongoose Model
  ) {}

  async findAll(): Promise<Tab[]> {
    return this.tabModel.find().exec();
  }

  async create(createTabDto: CreateTabDto): Promise<Tab> {
    const createdTab = new this.tabModel(createTabDto);
    return createdTab.save();
  }

  async update(id: string, updateTabDto: CreateTabDto): Promise<Tab> {
    return this.tabModel.findByIdAndUpdate(id, updateTabDto, { new: true }).exec();
  }

  async delete(id: string): Promise<void> {
    await this.tabModel.findByIdAndDelete(id).exec();
  }
}
