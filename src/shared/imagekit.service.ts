import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class ImageKitService {
  private readonly logger = new Logger(ImageKitService.name);
  
  /**
   * Uploads an image to ImageKit
   * @param base64Image Base64 encoded image data
   * @param fileName Optional filename
   * @returns URL of the uploaded image
   */
  async uploadImage(base64Image: string, fileName?: string): Promise<string> {
    try {
      // Check if the image is already a URL (not base64)
      if (base64Image.startsWith('http')) {
        this.logger.log('Image is already a URL, skipping upload');
        return base64Image;
      }
      
      // Remove prefix if exists (data:image/jpeg;base64,)
      const base64Data = base64Image.includes('base64,') 
        ? base64Image.split('base64,')[1]
        : base64Image;
      
      // Create form data
      const formData = new FormData();
      formData.append('file', base64Data);
      formData.append('fileName', fileName || `image_${Date.now()}`);
      
      if (process.env.IMAGEKIT_FOLDER_PATH) {
        formData.append('folder', process.env.IMAGEKIT_FOLDER_PATH);
      }
      
      // Upload to ImageKit
      const response = await axios.post(
        process.env.IMAGEKIT_UPLOAD_URL,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data',
          },
          auth: {
            username: process.env.IMAGEKIT_PRIVATE_KEY,
            password: '',
          },
        }
      );
      
      if (response.data && response.data.url) {
        this.logger.log(`Successfully uploaded image to ImageKit: ${response.data.url}`);
        return response.data.url;
      } else {
        throw new Error('ImageKit response missing URL');
      }
    } catch (error) {
      this.logger.error(`Error uploading image to ImageKit: ${error.message}`);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }
  
  /**
   * Converts image if it's a base64 string, or returns original URL
   * @param imageData Base64 string or URL
   * @param fileName Optional filename
   */
  async processImage(imageData: string, fileName?: string): Promise<string> {
    if (!imageData) return null;
    
    // Skip if it's already a URL
    if (imageData.startsWith('http')) {
      return imageData;
    }
    
    // Upload if it's base64
    if (imageData.includes('base64') || imageData.length > 200) {
      return this.uploadImage(imageData, fileName);
    }
    
    // Not base64 or URL, return as is
    return imageData;
  }
}
