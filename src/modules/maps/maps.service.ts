import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId, Types } from 'mongoose';
import { Map, MapDocument } from './maps.schema';
import { CreateMapPinDto, UpdateMapPinDto, CreateMapOverlayDto, UpdateMapOverlayDto, UpdateEventLocationDto, BoundsDto } from './maps.dto';
import { MobileApp } from '../mobile-app/mobile-app.schema';
import axios from 'axios';
import * as FormData from 'form-data';
import * as dotenv from 'dotenv';

dotenv.config();

// Define a type for the overlay response
type OverlayResponse = {
  id: string;
  imageUrl: string;
  fileId: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  opacity: number;
  isPositioning: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class MapsService {
  constructor(
    @InjectModel(Map.name) private readonly mapModel: Model<MapDocument>,
    @InjectModel(MobileApp.name) private readonly mobileAppModel: Model<MobileApp>,
  ) {}

  // Helper to get or create a map for an app
  private async getOrCreateMap(appId: string): Promise<MapDocument> {
    if (!isValidObjectId(appId)) {
      throw new BadRequestException('Invalid app ID format');
    }

    // Check if app exists
    const appExists = await this.mobileAppModel.exists({ _id: appId });
    if (!appExists) {
      throw new NotFoundException(`App with ID ${appId} not found`);
    }

    // Find or create map
    let map = await this.mapModel.findOne({ appId: new Types.ObjectId(appId) }).exec();
    
    if (!map) {
      // If no map exists, create one with default values
      map = new this.mapModel({
        appId: new Types.ObjectId(appId),
        location: null,
        center: { lat: 51.505, lng: -0.09 },
        zoom: 15,
        pins: [],
        overlays: []
      });
      await map.save();
    }

    return map;
  }

  // Event Location methods
  async getEventLocation(appId: string) {
    try {
      const map = await this.getOrCreateMap(appId);
      
      return {
        location: map.location || null,
        center: map.center || { lat: 51.505, lng: -0.09 },
        zoom: map.zoom || 15
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error getting event location:', error);
      throw new BadRequestException('Failed to get event location');
    }
  }

  async updateEventLocation(appId: string, updateDto: UpdateEventLocationDto) {
    try {
      const map = await this.getOrCreateMap(appId);
      
      // Update map location
      map.location = updateDto.location;
      if (updateDto.center) {
        map.center = updateDto.center;
      }
      if (updateDto.zoom) {
        map.zoom = updateDto.zoom;
      }

      await map.save();

      return {
        location: map.location,
        center: map.center || map.location,
        zoom: map.zoom || 15
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error updating event location:', error);
      throw new BadRequestException('Failed to update event location');
    }
  }

  // Map Pins methods
  async getAllPins(appId: string) {
    try {
      const map = await this.getOrCreateMap(appId);
      // Return pins with all properties
      return map.pins || [];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error getting map pins:', error);
      throw new BadRequestException('Failed to get map pins');
    }
  }

  async createPin(createDto: CreateMapPinDto) {
    try {
      const map = await this.getOrCreateMap(createDto.appId);
      
      // Generate a unique ID for the pin
      const pinId = new Types.ObjectId().toString();
      
      // Create the new pin with all required fields
      const newPin = {
        id: pinId,
        lat: createDto.lat,
        lng: createDto.lng,
        title: createDto.title,
        description: createDto.description || '',
        iconId: createDto.iconId,
        iconName: createDto.iconName || '',
        iconCategory: createDto.iconCategory || '',
        color: createDto.color || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add new pin to the map's pins array
      if (!map.pins) {
        map.pins = [];
      }
      
      map.pins.push(newPin);
      await map.save();
      
      // Format dates for frontend
      return {
        ...newPin,
        createdAt: newPin.createdAt.toISOString(),
        updatedAt: newPin.updatedAt.toISOString()
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error creating map pin:', error);
      throw new BadRequestException('Failed to create map pin');
    }
  }

  async updatePin(appId: string, pinId: string, updateDto: UpdateMapPinDto) {
    try {
      const map = await this.getOrCreateMap(appId);
      
      if (!pinId) {
        throw new BadRequestException('Pin ID is required');
      }

      // Find pin by ID
      const pinIndex = map.pins.findIndex(pin => pin.id === pinId);
      if (pinIndex === -1) {
        throw new NotFoundException(`Map pin with ID ${pinId} not found`);
      }

      // Update pin fields
      if (updateDto.lat !== undefined) map.pins[pinIndex].lat = updateDto.lat;
      if (updateDto.lng !== undefined) map.pins[pinIndex].lng = updateDto.lng;
      if (updateDto.title !== undefined) map.pins[pinIndex].title = updateDto.title;
      if (updateDto.description !== undefined) map.pins[pinIndex].description = updateDto.description;
      if (updateDto.iconId !== undefined) map.pins[pinIndex].iconId = updateDto.iconId;
      if (updateDto.iconName !== undefined) map.pins[pinIndex].iconName = updateDto.iconName;
      if (updateDto.iconCategory !== undefined) map.pins[pinIndex].iconCategory = updateDto.iconCategory;
      if (updateDto.color !== undefined) map.pins[pinIndex].color = updateDto.color;
      
      // Update the updatedAt timestamp
      map.pins[pinIndex].updatedAt = new Date();

      await map.save();
      
      // Return the updated pin with formatted dates
      const updatedPin = map.pins[pinIndex];
      return {
        ...updatedPin,
        id: pinId,
        createdAt: updatedPin.createdAt.toISOString(),
        updatedAt: updatedPin.updatedAt.toISOString()
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error updating map pin:', error);
      throw new BadRequestException('Failed to update map pin');
    }
  }

  async deletePin(appId: string, pinId: string) {
    try {
      const map = await this.getOrCreateMap(appId);
      
      if (!pinId) {
        throw new BadRequestException('Pin ID is required');
      }

      // Check if pin exists
      const pinExists = map.pins.some(pin => pin.id === pinId);
      if (!pinExists) {
        throw new NotFoundException(`Map pin with ID ${pinId} not found`);
      }

      // Remove pin from array
      map.pins = map.pins.filter(pin => pin.id !== pinId);
      await map.save();
      
      return { id: pinId };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting map pin:', error);
      throw new BadRequestException('Failed to delete map pin');
    }
  }

  // Map Overlays methods
  async getAllOverlays(appId: string): Promise<OverlayResponse[]> {
    try {
      const map = await this.getOrCreateMap(appId);
      
      // Return overlays with properly formatted dates and types
      return (map.overlays || []).map(overlay => ({
        id: overlay.id,
        imageUrl: overlay.imageUrl,
        fileId: overlay.fileId,
        bounds: {
          north: overlay.bounds.north,
          south: overlay.bounds.south,
          east: overlay.bounds.east,
          west: overlay.bounds.west
        },
        opacity: overlay.opacity,
        isPositioning: overlay.isPositioning,
        createdAt: overlay.createdAt.toISOString(),
        updatedAt: overlay.updatedAt.toISOString()
      }));
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error getting map overlays:', error);
      throw new BadRequestException('Failed to get map overlays');
    }
  }

  async createOverlay(file: Express.Multer.File, createDto: CreateMapOverlayDto): Promise<OverlayResponse> {
    try {
      const map = await this.getOrCreateMap(createDto.appId);
      
      // Parse bounds if it's a string
      let bounds = {
        north: 0,
        south: 0,
        east: 0,
        west: 0
      };
      
      if (typeof createDto.bounds === 'string') {
        try {
          const parsedBounds = JSON.parse(createDto.bounds);
          bounds = {
            north: Number(parsedBounds.north),
            south: Number(parsedBounds.south),
            east: Number(parsedBounds.east),
            west: Number(parsedBounds.west)
          };
        } catch (e) {
          throw new BadRequestException('Invalid bounds format');
        }
      } else if (createDto.bounds) {
        bounds = {
          north: Number(createDto.bounds.north),
          south: Number(createDto.bounds.south),
          east: Number(createDto.bounds.east),
          west: Number(createDto.bounds.west)
        };
      }

      // Parse opacity if it's a string
      let opacity: number = 0.8;
      if (typeof createDto.opacity === 'string') {
        const parsedOpacity = parseFloat(createDto.opacity);
        if (!isNaN(parsedOpacity)) {
          opacity = parsedOpacity;
        }
      } else if (typeof createDto.opacity === 'number') {
        opacity = createDto.opacity;
      }

      // Parse isPositioning if it's a string
      let isPositioning: boolean = true;
      if (typeof createDto.isPositioning === 'string') {
        isPositioning = createDto.isPositioning === 'true';
      } else if (typeof createDto.isPositioning === 'boolean') {
        isPositioning = createDto.isPositioning;
      }

      // Upload image to ImageKit
      const imageKitResponse = await this.uploadToImageKit(file, 'map-overlays');

      // Generate a unique ID for the overlay
      const overlayId = new Types.ObjectId().toString();
      
      // Create the new overlay with all required fields
      const newOverlay = {
        id: overlayId,
        imageUrl: imageKitResponse.url,
        fileId: imageKitResponse.fileId,
        bounds,
        opacity,
        isPositioning,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add new overlay to the map's overlays array
      if (!map.overlays) {
        map.overlays = [];
      }
      
      map.overlays.push(newOverlay);
      await map.save();
      
      // Format dates and return with proper type
      return {
        id: overlayId,
        imageUrl: imageKitResponse.url,
        fileId: imageKitResponse.fileId,
        bounds: {
          north: bounds.north,
          south: bounds.south,
          east: bounds.east,
          west: bounds.west
        },
        opacity,
        isPositioning,
        createdAt: newOverlay.createdAt.toISOString(),
        updatedAt: newOverlay.updatedAt.toISOString()
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error creating map overlay:', error);
      throw new BadRequestException('Failed to create map overlay: ' + error.message);
    }
  }

  async updateOverlay(appId: string, overlayId: string, updateDto: UpdateMapOverlayDto): Promise<OverlayResponse> {
    try {
      const map = await this.getOrCreateMap(appId);
      
      if (!overlayId) {
        throw new BadRequestException('Overlay ID is required');
      }

      // Find overlay by ID
      const overlayIndex = map.overlays.findIndex(overlay => overlay.id === overlayId);
      if (overlayIndex === -1) {
        throw new NotFoundException(`Map overlay with ID ${overlayId} not found`);
      }

      // Parse bounds if it's a string
      if (typeof updateDto.bounds === 'string') {
        try {
          const parsedBounds = JSON.parse(updateDto.bounds);
          map.overlays[overlayIndex].bounds = {
            north: Number(parsedBounds.north),
            south: Number(parsedBounds.south),
            east: Number(parsedBounds.east),
            west: Number(parsedBounds.west)
          };
        } catch (e) {
          throw new BadRequestException('Invalid bounds format');
        }
      } else if (updateDto.bounds) {
        map.overlays[overlayIndex].bounds = {
          north: Number(updateDto.bounds.north),
          south: Number(updateDto.bounds.south),
          east: Number(updateDto.bounds.east),
          west: Number(updateDto.bounds.west)
        };
      }

      // Parse opacity if it's a string
      if (typeof updateDto.opacity === 'string') {
        const parsedOpacity = parseFloat(updateDto.opacity);
        if (!isNaN(parsedOpacity)) {
          map.overlays[overlayIndex].opacity = parsedOpacity;
        }
      } else if (typeof updateDto.opacity === 'number') {
        map.overlays[overlayIndex].opacity = updateDto.opacity;
      }

      // Parse isPositioning if it's a string
      if (typeof updateDto.isPositioning === 'string') {
        map.overlays[overlayIndex].isPositioning = updateDto.isPositioning === 'true';
      } else if (typeof updateDto.isPositioning === 'boolean') {
        map.overlays[overlayIndex].isPositioning = updateDto.isPositioning;
      }
      
      // Update the updatedAt timestamp
      map.overlays[overlayIndex].updatedAt = new Date();

      await map.save();
      
      // Return properly formatted overlay
      const updatedOverlay = map.overlays[overlayIndex];
      return {
        id: overlayId,
        imageUrl: updatedOverlay.imageUrl,
        fileId: updatedOverlay.fileId,
        bounds: {
          north: updatedOverlay.bounds.north,
          south: updatedOverlay.bounds.south,
          east: updatedOverlay.bounds.east,
          west: updatedOverlay.bounds.west
        },
        opacity: updatedOverlay.opacity,
        isPositioning: updatedOverlay.isPositioning,
        createdAt: updatedOverlay.createdAt.toISOString(),
        updatedAt: updatedOverlay.updatedAt.toISOString()
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error updating map overlay:', error);
      throw new BadRequestException('Failed to update map overlay');
    }
  }

  async updateOverlayWithFile(appId: string, overlayId: string, file: Express.Multer.File, updateDto: UpdateMapOverlayDto): Promise<OverlayResponse> {
    try {
      const map = await this.getOrCreateMap(appId);
      
      if (!overlayId) {
        throw new BadRequestException('Overlay ID is required');
      }

      // Find overlay by ID
      const overlayIndex = map.overlays.findIndex(overlay => overlay.id === overlayId);
      if (overlayIndex === -1) {
        throw new NotFoundException(`Map overlay with ID ${overlayId} not found`);
      }

      // Delete old file from ImageKit
      if (map.overlays[overlayIndex].fileId) {
        try {
          await this.deleteFromImageKit(map.overlays[overlayIndex].fileId);
        } catch (error) {
          console.error('Error deleting old image from ImageKit:', error);
          // Continue with the update even if the deletion fails
        }
      }

      // Upload new image to ImageKit
      const imageKitResponse = await this.uploadToImageKit(file, 'map-overlays');
      map.overlays[overlayIndex].imageUrl = imageKitResponse.url;
      map.overlays[overlayIndex].fileId = imageKitResponse.fileId;
      
      // Parse bounds if it's a string
      if (typeof updateDto.bounds === 'string') {
        try {
          const parsedBounds = JSON.parse(updateDto.bounds);
          map.overlays[overlayIndex].bounds = {
            north: Number(parsedBounds.north),
            south: Number(parsedBounds.south),
            east: Number(parsedBounds.east),
            west: Number(parsedBounds.west)
          };
        } catch (e) {
          throw new BadRequestException('Invalid bounds format');
        }
      } else if (updateDto.bounds) {
        map.overlays[overlayIndex].bounds = {
          north: Number(updateDto.bounds.north),
          south: Number(updateDto.bounds.south),
          east: Number(updateDto.bounds.east),
          west: Number(updateDto.bounds.west)
        };
      }

      // Parse opacity if it's a string
      if (typeof updateDto.opacity === 'string') {
        const parsedOpacity = parseFloat(updateDto.opacity);
        if (!isNaN(parsedOpacity)) {
          map.overlays[overlayIndex].opacity = parsedOpacity;
        }
      } else if (typeof updateDto.opacity === 'number') {
        map.overlays[overlayIndex].opacity = updateDto.opacity;
      }

      // Parse isPositioning if it's a string
      if (typeof updateDto.isPositioning === 'string') {
        map.overlays[overlayIndex].isPositioning = updateDto.isPositioning === 'true';
      } else if (typeof updateDto.isPositioning === 'boolean') {
        map.overlays[overlayIndex].isPositioning = updateDto.isPositioning;
      }
      
      // Update the updatedAt timestamp
      map.overlays[overlayIndex].updatedAt = new Date();

      await map.save();
      
      // Return properly formatted overlay
      const updatedOverlay = map.overlays[overlayIndex];
      return {
        id: overlayId,
        imageUrl: updatedOverlay.imageUrl,
        fileId: updatedOverlay.fileId,
        bounds: {
          north: updatedOverlay.bounds.north,
          south: updatedOverlay.bounds.south,
          east: updatedOverlay.bounds.east,
          west: updatedOverlay.bounds.west
        },
        opacity: updatedOverlay.opacity,
        isPositioning: updatedOverlay.isPositioning,
        createdAt: updatedOverlay.createdAt.toISOString(),
        updatedAt: updatedOverlay.updatedAt.toISOString()
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error updating map overlay with file:', error);
      throw new BadRequestException('Failed to update map overlay with file: ' + error.message);
    }
  }

  async deleteOverlay(appId: string, overlayId: string) {
    try {
      const map = await this.getOrCreateMap(appId);
      
      if (!overlayId) {
        throw new BadRequestException('Overlay ID is required');
      }

      // Find overlay by ID
      const overlayIndex = map.overlays.findIndex(overlay => overlay.id === overlayId);
      if (overlayIndex === -1) {
        throw new NotFoundException(`Map overlay with ID ${overlayId} not found`);
      }

      // Delete file from ImageKit
      if (map.overlays[overlayIndex].fileId) {
        try {
          await this.deleteFromImageKit(map.overlays[overlayIndex].fileId);
        } catch (error) {
          console.error('Error deleting image from ImageKit:', error);
          // Continue with the deletion even if ImageKit deletion fails
        }
      }

      // Remove overlay from array
      map.overlays = map.overlays.filter(overlay => overlay.id !== overlayId);
      await map.save();
      
      return { id: overlayId };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting map overlay:', error);
      throw new BadRequestException('Failed to delete map overlay');
    }
  }

  // Helper method to upload files to ImageKit
  private async uploadToImageKit(file: Express.Multer.File, folder: string) {
    try {
      // Encode ImageKit Private Key for Authorization
      const encodedAuth = Buffer.from(`${process.env.IMAGEKIT_PRIVATE_KEY}:`).toString('base64');

      // Prepare FormData for ImageKit
      const formData = new FormData();
      formData.append('file', file.buffer, { filename: file.originalname });
      formData.append('fileName', `${Date.now()}-${file.originalname}`);
      formData.append('folder', `${process.env.IMAGEKIT_FOLDER_PATH || '/'}/${folder}`);

      // Upload to ImageKit
      const response = await axios.post(process.env.IMAGEKIT_UPLOAD_URL!, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Basic ${encodedAuth}`,
        },
      });

      if (!response.data || !response.data.fileId || !response.data.url) {
        throw new Error('Invalid response from ImageKit');
      }

      return {
        url: response.data.url,
        fileId: response.data.fileId
      };
    } catch (error) {
      console.error('ImageKit upload error:', error.response?.data || error.message);
      throw new Error('Failed to upload file to ImageKit: ' + (error.response?.data?.message || error.message));
    }
  }

  // Helper method to delete files from ImageKit
  private async deleteFromImageKit(fileId: string) {
    try {
      await axios.delete(`https://api.imagekit.io/v1/files/${fileId}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ':').toString('base64')}`,
        },
      });
      return true;
    } catch (error) {
      console.error('ImageKit delete error:', error.response?.data || error.message);
      throw new Error('Failed to delete file from ImageKit: ' + (error.response?.data?.message || error.message));
    }
  }
}