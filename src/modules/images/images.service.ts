import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Image, ImageDocument } from './images.schema';
import { CreateImageDto } from './create-image.dto';
import { Types } from 'mongoose';

@Injectable()
export class ImagesService {
  constructor(
    @InjectModel(Image.name)
    private readonly imageModel: Model<ImageDocument>,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
    createImageDto: CreateImageDto,
  ): Promise<Image> {
    try {
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Invalid file type. Only JPG, PNG, and GIF files are allowed.');
      }

      // Different size limits for GIFs vs other images
      if (file.mimetype === 'image/gif') {
        const maxGifSize = 30 * 1024 * 1024; // 30MB for GIFs
        if (file.size > maxGifSize) {
          throw new BadRequestException('GIF size must be less than 30MB');
        }
      } else {
        const maxSize = 20 * 1024 * 1024; // 20MB for other images
        if (file.size > maxSize) {
          throw new BadRequestException('Image size must be less than 20MB');
        }
      }

      // Validate appId format
      if (!isValidObjectId(createImageDto.appId)) {
        throw new BadRequestException('Invalid app ID format');
      }

      // Convert the buffer to base64
      const base64 = file.buffer.toString('base64');
      
      const image = new this.imageModel({
        name: createImageDto.name,
        base64: `data:${file.mimetype};base64,${base64}`,
        appId: new Types.ObjectId(createImageDto.appId),
        mimeType: file.mimetype,
        size: file.size,
      });

      const savedImage = await image.save();
      return savedImage.toJSON();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error uploading image:', error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  async findAll(appId: string): Promise<Image[]> {
    try {
      if (!isValidObjectId(appId)) {
        throw new BadRequestException('Invalid app ID format');
      }

      const images = await this.imageModel
        .find({ appId: new Types.ObjectId(appId) })
        .sort({ createdAt: -1 })
        .exec();
      
      return images.map(image => image.toJSON());
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error finding images:', error);
      throw new BadRequestException('Failed to fetch images');
    }
  }

  async findOne(id: string): Promise<Image> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException(`Invalid image ID format: ${id}`);
      }

      const image = await this.imageModel.findById(new Types.ObjectId(id)).exec();
      
      if (!image) {
        throw new NotFoundException(`Image with ID ${id} not found`);
      }

      return image.toJSON();
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error finding image:', error);
      throw new BadRequestException('Failed to fetch image');
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      console.log('Attempting to delete image with ID:', id);
      
      if (!isValidObjectId(id)) {
        throw new BadRequestException(`Invalid image ID format: ${id}`);
      }

      const result = await this.imageModel
        .findByIdAndDelete(new Types.ObjectId(id))
        .exec();
      
      if (!result) {
        throw new NotFoundException(`Image with ID ${id} not found`);
      }
      
      console.log('Successfully deleted image with ID:', id);
      return true;
    } catch (error) {
      console.error('Error in remove method:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete image');
    }
  }
}