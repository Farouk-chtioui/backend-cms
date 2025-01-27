import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ScreenElement } from './types/screen-element.types';

@Schema()
export class Screen extends Document {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  route: string;

  @Prop({ type: Types.ObjectId, ref: 'MobileApp', required: true })
  appId: Types.ObjectId;

  @Prop({ type: [Object], required: true, default: [] })
  elements: ScreenElement[];

  @Prop({ type: Object, default: {} })
  settings: {
    backgroundColor?: string;
    padding?: number;
    layoutType?: 'flex' | 'grid';
  };

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const ScreenSchema = SchemaFactory.createForClass(Screen);
