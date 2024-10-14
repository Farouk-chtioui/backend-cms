import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MobileApp, MobileAppSchema } from '../mobile-app/mobile-app.schema';

@Schema()
export class Repository extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  owner?: string;  

  @Prop({ type: MobileAppSchema })
  mobileApp: MobileApp;
}

export const RepositorySchema = SchemaFactory.createForClass(Repository);