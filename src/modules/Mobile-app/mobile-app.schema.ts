// src/mobile-app/mobile-app.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AppDesign, AppDesignSchema } from '../appDesign/AppDesign.schema';

@Schema()
export class MobileApp extends Document {
  @Prop({ required: false })
  name: string;

  @Prop({ type: AppDesignSchema, required: true }) 
  design: AppDesign;
}

export const MobileAppSchema = SchemaFactory.createForClass(MobileApp);
