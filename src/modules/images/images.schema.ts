// src/images/schemas/image.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ImageDocument = Image & Document;

@Schema({ timestamps: true })
export class Image {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  base64: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'App' })
  appId: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;
}

export const ImageSchema = SchemaFactory.createForClass(Image);


