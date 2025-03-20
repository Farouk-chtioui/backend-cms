import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WidgetScreen } from '../widgetscreen/interfaces/widgetscreen.interface';
import { HeaderConfig } from './header.interface';

@Injectable()
export class HeaderService {
  constructor(
    @InjectModel('WidgetScreen') private readonly widgetScreenModel: Model<WidgetScreen>,
  ) {}

  /**
   * Get header by screen ID
   */
  async getHeaderByScreenId(screenId: string): Promise<HeaderConfig | null> {
    const screen = await this.widgetScreenModel.findById(screenId).exec();
    
    if (!screen) {
      throw new NotFoundException(`WidgetScreen with ID ${screenId} not found`);
    }
    
    return screen.header;
  }

  /**
   * Update header for a screen
   */
  async updateHeaderForScreen(screenId: string, header: HeaderConfig | null): Promise<WidgetScreen> {
    // Validate header if it's not null
    if (header) {
      this.validateHeader(header);
    }
    
    // Use findByIdAndUpdate instead of directly modifying the document
    const updatedScreen = await this.widgetScreenModel.findByIdAndUpdate(
      screenId,
      { $set: { header: header } },
      { new: true }
    );
    
    if (!updatedScreen) {
      throw new NotFoundException(`WidgetScreen with ID ${screenId} not found`);
    }
    
    return updatedScreen;
  }

  /**
   * Delete header from a screen
   */
  async deleteHeaderFromScreen(screenId: string): Promise<WidgetScreen> {
    // Use findByIdAndUpdate to set header to null
    const updatedScreen = await this.widgetScreenModel.findByIdAndUpdate(
      screenId,
      { $set: { header: null } },
      { new: true }
    );
    
    if (!updatedScreen) {
      throw new NotFoundException(`WidgetScreen with ID ${screenId} not found`);
    }
    
    return updatedScreen;
  }

  /**
   * Validate header configuration
   * This is a simple validation; more complex validation should be done with class-validator
   */
  private validateHeader(header: HeaderConfig): void {
    // Basic validation
    if (!header.type) {
      throw new Error('Header type is required');
    }
    
    // Type-specific validation
    if (header.type === 'image' && header.showText && !header.imageUrl) {
      throw new Error('Image URL is required for image header type');
    }
    
    if (header.type === 'logo' && !header.logoUrl) {
      throw new Error('Logo URL is required for logo header type');
    }
    
    if (header.type === 'gradient' && 
        (!header.gradientColors?.from || !header.gradientColors?.to)) {
      throw new Error('Gradient colors are required for gradient header type');
    }
    
    // Dates validation
    if (header.showDates && header.festivalDates) {
      if (!header.festivalDates.start || !header.festivalDates.end) {
        throw new Error('Both start and end dates are required when showDates is true');
      }
      
      const startDate = new Date(header.festivalDates.start);
      const endDate = new Date(header.festivalDates.end);
      
      if (endDate < startDate) {
        throw new Error('End date must be after start date');
      }
    }
  }
}