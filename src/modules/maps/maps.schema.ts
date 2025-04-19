import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

// Location schema
@Schema({ _id: false })
export class Location {
  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lng: number;

  @Prop()
  address?: string;
}

// Map pin schema
@Schema({ _id: false })
export class Pin {
  @Prop({ required: true })
  id: string; // Generated unique ID for frontend compatibility

  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lng: number;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  iconId: string;

  @Prop()
  iconName: string;

  @Prop()
  iconCategory: string;

  @Prop()
  color: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

// Map overlay schema
@Schema({ _id: false })
export class Overlay {
  @Prop({ required: true })
  id: string; // Generated unique ID for frontend compatibility

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true })
  fileId: string; // ImageKit fileId for deletion

  @Prop({ required: true, type: Object })
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };

  @Prop({ required: true, default: 0.8 })
  opacity: number;

  @Prop({ default: false })
  isPositioning: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

// Unified Map schema
@Schema({
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
})
export class Map {
  @Prop({ type: Location })
  location?: Location;

  @Prop({ type: Location })
  center?: Location;

  @Prop({ default: 15 })
  zoom?: number;

  @Prop({ type: [Pin], default: [] })
  pins: Pin[];

  @Prop({ type: [Overlay], default: [] })
  overlays: Overlay[];

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'MobileApp' })
  appId: MongooseSchema.Types.ObjectId;
}

export type MapDocument = Map & Document;
export const MapSchema = SchemaFactory.createForClass(Map);

// Add index for better performance
MapSchema.index({ appId: 1 }, { unique: true });