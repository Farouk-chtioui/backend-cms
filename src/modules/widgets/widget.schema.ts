import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type WidgetDocument = Widget & Document;

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
export class Widget extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  type: string;

  @Prop()
  category?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  content: Record<string, any>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  position?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    order?: number;
  };

  @Prop({ type: MongooseSchema.Types.Mixed })
  style?: {
    theme?: 'light' | 'dark' | 'custom';
    customColors?: {
      background?: string;
      text?: string;
      accent?: string;
      border?: string;
      hover?: string;
    };
    padding?: 'none' | 'small' | 'medium' | 'large';
    animation?: 'none' | 'fade' | 'slide' | 'bounce';
    borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'full';
    shadow?: 'none' | 'small' | 'medium' | 'large';
    glassmorphism?: boolean;
  };

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'WidgetScreen', required: true })
  screenId: MongooseSchema.Types.ObjectId;
}

export const WidgetSchema = SchemaFactory.createForClass(Widget);