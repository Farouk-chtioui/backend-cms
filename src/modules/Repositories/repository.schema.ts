import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MobileApp } from '../mobile-app/mobile-app.schema'; // Import MobileApp schema
import { User } from '../users/user.schema'; // Import User schema for reference

@Schema()
export class Repository extends Document {
  // Property: name of the repository
  @Prop({ required: true, unique: true }) // Ensure the name is required and unique
  repositoryName: string;

  // Reference to the associated MobileApp using ObjectId
  @Prop({ type: Types.ObjectId, ref: 'MobileApp' })
  mobileAppId: string;

  // Reference to the owner (User) using ObjectId
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: string;
}

export const RepositorySchema = SchemaFactory.createForClass(Repository);
