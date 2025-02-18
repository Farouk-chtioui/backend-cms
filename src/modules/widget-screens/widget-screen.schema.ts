import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type WidgetScreenDocument = WidgetScreen & Document;

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
export class WidgetScreen {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'App' })
  appId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Object })
  header?: {
    type: 'image' | 'logo' | 'gradient';
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    logoUrl?: string;
    gradientColors?: {
      from: string;
      to: string;
    };
    overlayOpacity?: number;
    textColor?: string;
    fontStyle?: 'modern' | 'classic' | 'display' | 'graffiti';
    mobileLayout?: 'centered' | 'bottom' | 'overlay';
    festivalDates?: {
      start: string;
      end: string;
    };
    showCountdown?: boolean;
    socialLinks?: {
      instagram?: string;
      twitter?: string;
      facebook?: string;
      spotify?: string;
    };
  };

  // Virtual property for widgets
  widgets?: any[];
}

export const WidgetScreenSchema = SchemaFactory.createForClass(WidgetScreen);

// Add virtual property for widgets
WidgetScreenSchema.virtual('widgets', {
  ref: 'Widget',
  localField: '_id',
  foreignField: 'screenId',
});