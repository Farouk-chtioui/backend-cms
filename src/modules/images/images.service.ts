import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Image, ImageDocument } from './images.schema';
import { CreateImageDto } from './create-image.dto';
import { Types } from 'mongoose';
import axios from 'axios';
import * as FormData from 'form-data';
import * as dotenv from 'dotenv';

dotenv.config();

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

      if (!isValidObjectId(createImageDto.appId)) {
        throw new BadRequestException('Invalid app ID format');
      }

      // 🔥 Encode ImageKit Private Key for Authorization
      const encodedAuth = Buffer.from(`${process.env.IMAGEKIT_PRIVATE_KEY}:`).toString('base64');

      // Prepare FormData for ImageKit
      const formData = new FormData();
      formData.append('file', file.buffer, { filename: file.originalname }); // Send as Buffer
      formData.append('fileName', file.originalname);
      formData.append('folder', process.env.IMAGEKIT_FOLDER_PATH || '/');

      // Upload to ImageKit
      const response = await axios.post(process.env.IMAGEKIT_UPLOAD_URL!, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Basic ${encodedAuth}`, // 🔥 Fix missing authentication
        },
      });

      if (!response.data || !response.data.fileId || !response.data.url) {
        throw new BadRequestException('Failed to upload image to ImageKit');
      }

      // 🔥 Get public URL & fileId from ImageKit response
      const fileUrl = response.data.url;
      const fileId = response.data.fileId; // Store the correct file ID

      const image = new this.imageModel({
        name: createImageDto.name,
        url: fileUrl, // 🔥 Store ImageKit URL
        fileId: fileId, // 🔥 Store ImageKit File ID for deletion
        appId: new Types.ObjectId(createImageDto.appId),
        mimeType: file.mimetype,
        size: file.size,
      });

      return (await image.save()).toJSON();
    } catch (error) {
      console.error('Error uploading image:', error.response?.data || error.message);
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

      return image.toObject(); // 🔥 Ensure it is returned as an object
    } catch (error) {
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
  
      const image = await this.imageModel.findById(id);
      if (!image) {
        throw new NotFoundException(`Image with ID ${id} not found`);
      }
  
      const imageData = image.toObject(); // Convert document to plain object
  
      if (!imageData.fileId) {
        throw new BadRequestException('Image fileId not found');
      }
  
      // 🔥 Use correct ImageKit fileId
      const fileId = imageData.fileId;
  
      // 🔥 Delete from ImageKit using fileId
      await axios.delete(`https://api.imagekit.io/v1/files/${fileId}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ':').toString('base64')}`,
        },
      });
  
      await this.imageModel.findByIdAndDelete(id);
      console.log('Successfully deleted image with ID:', id);
      return true;
    } catch (error) {
      console.error('Error deleting image:', error.response?.data || error.message);
      throw new BadRequestException('Failed to delete image');
    }
  }
}
