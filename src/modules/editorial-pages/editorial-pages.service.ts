import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { EditorialPage, EditorialPageDocument } from './editorial-pages.schema';
import { CreateEditorialPageDto } from './create-editorial-page.dto';
import { UpdateEditorialPageDto } from './update-editorial-page.dto';
import { Types } from 'mongoose';

@Injectable()
export class EditorialPagesService {
  constructor(
    @InjectModel(EditorialPage.name)
    private readonly editorialPageModel: Model<EditorialPageDocument>,
  ) {}

  async create(createEditorialPageDto: CreateEditorialPageDto): Promise<EditorialPage> {
    try {
      if (!isValidObjectId(createEditorialPageDto.appId)) {
        throw new BadRequestException('Invalid app ID format');
      }

      const now = new Date().toISOString();
      
      const editorialPage = new this.editorialPageModel({
        name: createEditorialPageDto.name,
        description: createEditorialPageDto.description || 'New editorial page',
        code: createEditorialPageDto.code || undefined, // Will use schema default if undefined
        appId: new Types.ObjectId(createEditorialPageDto.appId),
        createdAt: now,
        updatedAt: now,
      });

      return (await editorialPage.save()).toJSON();
    } catch (error) {
      console.error('Error creating editorial page:', error.message);
      throw new BadRequestException(error.message || 'Failed to create editorial page');
    }
  }

  async findAll(appId: string): Promise<EditorialPage[]> {
    try {
      if (!isValidObjectId(appId)) {
        throw new BadRequestException('Invalid app ID format');
      }

      const pages = await this.editorialPageModel
        .find({ appId: new Types.ObjectId(appId) })
        .sort({ updatedAt: -1 })
        .exec();
      
      return pages.map(page => page.toJSON());
    } catch (error) {
      console.error('Error finding editorial pages:', error);
      throw new BadRequestException('Failed to fetch editorial pages');
    }
  }

  async findOne(id: string): Promise<EditorialPage> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException(`Invalid editorial page ID format: ${id}`);
      }

      const page = await this.editorialPageModel.findById(new Types.ObjectId(id)).exec();
      
      if (!page) {
        throw new NotFoundException(`Editorial page with ID ${id} not found`);
      }

      return page.toJSON();
    } catch (error) {
      console.error('Error finding editorial page:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch editorial page');
    }
  }

  async update(id: string, updateEditorialPageDto: UpdateEditorialPageDto): Promise<EditorialPage> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException(`Invalid editorial page ID format: ${id}`);
      }

      const now = new Date().toISOString();
      
      const updates = {
        ...updateEditorialPageDto,
        updatedAt: now,
      };

      const updated = await this.editorialPageModel
        .findByIdAndUpdate(id, updates, { new: true })
        .exec();
      
      if (!updated) {
        throw new NotFoundException(`Editorial page with ID ${id} not found`);
      }

      return updated.toJSON();
    } catch (error) {
      console.error('Error updating editorial page:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to update editorial page');
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      console.log('Attempting to delete editorial page with ID:', id);
  
      if (!isValidObjectId(id)) {
        throw new BadRequestException(`Invalid editorial page ID format: ${id}`);
      }
  
      const result = await this.editorialPageModel.findByIdAndDelete(id).exec();
      
      if (!result) {
        throw new NotFoundException(`Editorial page with ID ${id} not found`);
      }
  
      console.log('Successfully deleted editorial page with ID:', id);
      return true;
    } catch (error) {
      console.error('Error deleting editorial page:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete editorial page');
    }
  }
}