import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MobileApp } from '../mobile-app/mobile-app.schema'; // Import MobileApp schema
import { User } from '../users/user.schema'; // Import User schema for reference

@Schema()
export class Repository extends Document {
  @Prop({ required: true })
  repositoryName: string;

  @Prop({ type: Types.ObjectId, ref: 'MobileApp' })
  mobileAppId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: string;

  @Prop({ type: String })
  description: string;

  @Prop({ type: Boolean, required: true })
  isPrivate: boolean;

  @Prop({ type: String })
  image: string;
}

export const RepositorySchema = SchemaFactory.createForClass(Repository);
