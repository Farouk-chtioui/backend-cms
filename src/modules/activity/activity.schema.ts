import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MobileApp } from '../Mobile-app/mobile-app.schema';

export enum ActivityType {
  PUBLISH = 'publish',
  UPDATE = 'update',
  BUILD = 'build',
}

@Schema({ timestamps: true })
export class Activity extends Document {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  userEmail: string;

  @Prop({ required: true, enum: ActivityType, type: String })
  activityType: ActivityType;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'MobileApp', required: true })
  mobileAppId: Types.ObjectId | MobileApp;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
