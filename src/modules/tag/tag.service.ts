import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tag } from './interfaces/tag.interface';
import { CreateTagDto, UpdateTagDto } from './dtos/tag.dto';

@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);

  constructor(
    @InjectModel('Tag') private readonly tagModel: Model<Tag>,
  ) {}

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    try {
      // Check if tag already exists for this app
      const existingTag = await this.tagModel.findOne({
        name: createTagDto.name,
        appId: new Types.ObjectId(createTagDto.appId)
      });

      if (existingTag) {
        throw new BadRequestException('A tag with this name already exists for this app');
      }

      const tag = new this.tagModel({
        ...createTagDto,
        appId: new Types.ObjectId(createTagDto.appId),
      });
      
      return await tag.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('A tag with this name already exists for this app');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Tag> {
    try {
      const tag = await this.tagModel.findById(new Types.ObjectId(id)).exec();
      if (!tag) {
        throw new NotFoundException(`Tag with ID ${id} not found`);
      }
      return tag;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Invalid tag ID');
    }
  }

  async findAll(): Promise<Tag[]> {
    return this.tagModel.find().exec();
  }

  async findByAppId(appId: string): Promise<Tag[]> {
    try {
      return await this.tagModel
        .find({ appId: new Types.ObjectId(appId) })
        .exec();
    } catch (error) {
      throw new BadRequestException('Invalid app ID');
    }
  }

  async update(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    try {
      const updatedTag = await this.tagModel
        .findByIdAndUpdate(
          new Types.ObjectId(id),
          { $set: updateTagDto },
          { new: true, runValidators: true }
        )
        .exec();

      if (!updatedTag) {
        throw new NotFoundException(`Tag with ID ${id} not found`);
      }

      return updatedTag;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to update tag');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const deletedTag = await this.tagModel
        .findByIdAndDelete(new Types.ObjectId(id))
        .exec();

      if (!deletedTag) {
        throw new NotFoundException(`Tag with ID ${id} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to delete tag');
    }
  }

  // Link tag to widgets
  async linkToWidgets(tagId: string, widgetIds: string[]): Promise<Tag> {
    try {
      const tag = await this.findById(tagId);
      
      const validWidgetIds = widgetIds.map(id => new Types.ObjectId(id));
      
      const updatedTag = await this.tagModel
        .findByIdAndUpdate(
          new Types.ObjectId(tagId),
          { $addToSet: { widgets: { $each: validWidgetIds } } },
          { new: true }
        )
        .exec();

      return updatedTag;
    } catch (error) {
      throw new BadRequestException(`Failed to link widgets to tag: ${error.message}`);
    }
  }

  // Unlink tag from widgets
  async unlinkFromWidgets(tagId: string, widgetIds: string[]): Promise<Tag> {
    try {
      const tag = await this.findById(tagId);
      
      const validWidgetIds = widgetIds.map(id => new Types.ObjectId(id));
      
      const updatedTag = await this.tagModel
        .findByIdAndUpdate(
          new Types.ObjectId(tagId),
          { $pullAll: { widgets: validWidgetIds } },
          { new: true }
        )
        .exec();

      return updatedTag;
    } catch (error) {
      throw new BadRequestException(`Failed to unlink widgets from tag: ${error.message}`);
    }
  }

  // Link tag to widget screens
  async linkToWidgetScreens(tagId: string, screenIds: string[]): Promise<Tag> {
    try {
      const tag = await this.findById(tagId);
      
      const validScreenIds = screenIds.map(id => new Types.ObjectId(id));
      
      const updatedTag = await this.tagModel
        .findByIdAndUpdate(
          new Types.ObjectId(tagId),
          { $addToSet: { widgetScreens: { $each: validScreenIds } } },
          { new: true }
        )
        .exec();

      return updatedTag;
    } catch (error) {
      throw new BadRequestException(`Failed to link widget screens to tag: ${error.message}`);
    }
  }

  // Unlink tag from widget screens
  async unlinkFromWidgetScreens(tagId: string, screenIds: string[]): Promise<Tag> {
    try {
      const tag = await this.findById(tagId);
      
      const validScreenIds = screenIds.map(id => new Types.ObjectId(id));
      
      const updatedTag = await this.tagModel
        .findByIdAndUpdate(
          new Types.ObjectId(tagId),
          { $pullAll: { widgetScreens: validScreenIds } },
          { new: true }
        )
        .exec();

      return updatedTag;
    } catch (error) {
      throw new BadRequestException(`Failed to unlink widget screens from tag: ${error.message}`);
    }
  }

  // Link tag to app screens
  async linkToScreens(tagId: string, screenIds: string[]): Promise<Tag> {
    try {
      const tag = await this.findById(tagId);
      
      const validScreenIds = screenIds.map(id => new Types.ObjectId(id));
      
      const updatedTag = await this.tagModel
        .findByIdAndUpdate(
          new Types.ObjectId(tagId),
          { $addToSet: { screens: { $each: validScreenIds } } },
          { new: true }
        )
        .exec();

      return updatedTag;
    } catch (error) {
      throw new BadRequestException(`Failed to link screens to tag: ${error.message}`);
    }
  }

  // Unlink tag from app screens
  async unlinkFromScreens(tagId: string, screenIds: string[]): Promise<Tag> {
    try {
      const tag = await this.findById(tagId);
      
      const validScreenIds = screenIds.map(id => new Types.ObjectId(id));
      
      const updatedTag = await this.tagModel
        .findByIdAndUpdate(
          new Types.ObjectId(tagId),
          { $pullAll: { screens: validScreenIds } },
          { new: true }
        )
        .exec();

      return updatedTag;
    } catch (error) {
      throw new BadRequestException(`Failed to unlink screens from tag: ${error.message}`);
    }
  }

  // Get tags for a specific widget
  async findTagsByWidgetId(widgetId: string): Promise<Tag[]> {
    try {
      return await this.tagModel
        .find({ widgets: new Types.ObjectId(widgetId) })
        .exec();
    } catch (error) {
      throw new BadRequestException(`Failed to find tags for widget: ${error.message}`);
    }
  }

  // Get tags for a specific widget screen
  async findTagsByWidgetScreenId(screenId: string): Promise<Tag[]> {
    try {
      return await this.tagModel
        .find({ widgetScreens: new Types.ObjectId(screenId) })
        .exec();
    } catch (error) {
      throw new BadRequestException(`Failed to find tags for widget screen: ${error.message}`);
    }
  }

  // Get tags for a specific app screen
  async findTagsByScreenId(screenId: string): Promise<Tag[]> {
    try {
      return await this.tagModel
        .find({ screens: new Types.ObjectId(screenId) })
        .exec();
    } catch (error) {
      throw new BadRequestException(`Failed to find tags for app screen: ${error.message}`);
    }
  }
}
