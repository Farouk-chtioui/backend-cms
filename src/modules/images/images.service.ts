import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Image, ImageDocument } from './images.schema';
import { CreateImageDto } from './create-image.dto';

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
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      throw new BadRequestException('File too large');
    }

    // Convert the buffer to base64
    const base64 = file.buffer.toString('base64');
    
    const image = new this.imageModel({
      name: createImageDto.name,
      base64: `data:${file.mimetype};base64,${base64}`,
      appId: createImageDto.appId,
      mimeType: file.mimetype,
      size: file.size,
    });

    return image.save();
  }

  async findAll(appId: string): Promise<Image[]> {
    try {
      const images = await this.imageModel
        .find({ appId })
        .sort({ createdAt: -1 })
        .exec();
      
      return images;
    } catch (error) {
      console.error('Error finding images:', error);
      return []; // Return empty array on error
    }
  }

  async findOne(id: string): Promise<Image> {
    try {
      const image = await this.imageModel.findById(id).exec();
      if (!image) {
        return null;
      }
      return image;
    } catch (error) {
      console.error('Error finding image:', error);
      return null;
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      const result = await this.imageModel.findByIdAndDelete(id).exec();
      return result !== null;
    } catch (error) {
      console.error('Error removing image:', error);
      return false;
    }
  }
}