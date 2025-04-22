import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Tag extends Document {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: '#6B7280' })
  color: string;

  @Prop({ type: Types.ObjectId, ref: 'MobileApp', required: true })
  appId: Types.ObjectId;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Widget' }], default: [] })
  widgets: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'WidgetScreen' }], default: [] })
  widgetScreens: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Screen' }], default: [] })
  screens: Types.ObjectId[];
}

export const TagSchema = SchemaFactory.createForClass(Tag);
// Create index for uniqueness of tag name per app
TagSchema.index({ name: 1, appId: 1 }, { unique: true });
