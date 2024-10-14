// src/repository/repository.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MobileApp, MobileAppSchema } from '../mobile-app/mobile-app.schema';

@Schema()
export class Repository extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: MobileAppSchema, required: true })  
  mobileApp: MobileApp;

  @Prop({ required: true })
  owner: string; 
}

export const RepositorySchema = SchemaFactory.createForClass(Repository);
