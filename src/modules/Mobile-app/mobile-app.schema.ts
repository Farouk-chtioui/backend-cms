import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AppDesign } from '../appDesign/appDesign.schema';
import { AppLayout } from '../appLayout/appLayout.schema';

// Define a nested schema for the last publish info
@Schema({ _id: false })
export class LastPublishInfo {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true, default: Date.now })
  timestamp: Date;
}

@Schema()
export class MobileApp extends Document {
  @Prop({ required: true })
  appName: string;

  @Prop({ type: Types.ObjectId, ref: 'AppDesign' })
  appDesignId: Types.ObjectId | AppDesign;

  @Prop({ type: Types.ObjectId, ref: 'AppLayout' })
  appLayoutId: Types.ObjectId | AppLayout;

  @Prop({ required: true })
  repositoryId: string;

  @Prop({ required: true })
  ownerId: string;

  @Prop()
  userEmail?: string;

  // New properties for build result tracking:
  @Prop({ default: null })
  apkUrl: string;

  @Prop({ default: null })
  qrCodeDataUrl: string;

  // New property for last publish information
  @Prop({ type: LastPublishInfo, default: null })
  lastPublish: LastPublishInfo;
}

export const MobileAppSchema = SchemaFactory.createForClass(MobileApp);