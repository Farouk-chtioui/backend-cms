import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ScreenWidget } from './types/screen-widget.types';
import { ScreenType } from './types/screen.types';

export interface ScreenSettings {
  backgroundColor: string;
  padding: number;
  layoutType: 'flex' | 'grid' | 'custom';
  customSettings?: Record<string, any>;
}

export interface ScreenMetadata {
  order: number;
  showThumbnails?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  showCategories?: boolean;
  enableLocation?: boolean;
  showFavorites?: boolean;
  showSharing?: boolean;
  enableNotifications?: boolean;
  layout?: 'grid' | 'list' | 'map' | 'calendar';
  requiresTicket?: boolean;
  vipOnly?: boolean;
  primaryColor?: string;
  [key: string]: any;
}

@Schema({ timestamps: true })
export class Screen extends Document {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  route: string;

  @Prop({ type: Types.ObjectId, ref: 'MobileApp', required: true })
  appId: Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: Object.values(ScreenType),
    required: true 
  })
  screenType: ScreenType;

  @Prop({ type: [Object], default: [] })
  widgets: ScreenWidget[];

  @Prop({
    type: {
      backgroundColor: { type: String, default: '#ffffff' },
      padding: { type: Number, default: 16 },
      layoutType: { 
        type: String, 
        enum: ['flex', 'grid', 'custom'],
        default: 'flex'
      },
      customSettings: { type: Object, default: {} }
    },
    default: {
      backgroundColor: '#ffffff',
      padding: 16,
      layoutType: 'flex'
    }
  })
  settings: ScreenSettings;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({
    type: {
      order: { type: Number, default: 0 },
      showThumbnails: { type: Boolean, default: true },
      showSearch: { type: Boolean, default: true },
      showFilters: { type: Boolean, default: false },
      showCategories: { type: Boolean, default: false },
      enableLocation: { type: Boolean, default: false },
      showFavorites: { type: Boolean, default: false },
      showSharing: { type: Boolean, default: false },
      enableNotifications: { type: Boolean, default: false },
      layout: { 
        type: String, 
        enum: ['grid', 'list', 'map', 'calendar'],
        default: 'grid' 
      },
      requiresTicket: { type: Boolean, default: false },
      vipOnly: { type: Boolean, default: false },
      primaryColor: { type: String, default: '#000000' }
    },
    default: {
      order: 0,
      showThumbnails: true,
      showSearch: true,
      showFilters: false,
      showCategories: false,
      enableLocation: false,
      showFavorites: false,
      showSharing: false,
      enableNotifications: false,
      layout: 'grid',
      requiresTicket: false,
      vipOnly: false,
      primaryColor: '#000000'
    }
  })
  metadata: ScreenMetadata;
}

// Create compound index for route uniqueness per app
export const ScreenSchema = SchemaFactory.createForClass(Screen);
ScreenSchema.index({ route: 1, appId: 1 }, { unique: true });