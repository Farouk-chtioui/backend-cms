import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ImageDocument = Image & Document;

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
export class Image {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  base64: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'App' })
  appId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;
}

export const ImageSchema = SchemaFactory.createForClass(Image);