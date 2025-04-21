import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class AppBuildNotification extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true, ref: 'User' })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true, ref: 'MobileApp' })
  mobileAppId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: false, ref: 'Repository' })
  repositoryId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, default: false })
  read: boolean;

  @Prop({ required: true, enum: ['success', 'error', 'progress', 'info'] })
  status: string;

  @Prop({ required: false })
  appName: string;

  @Prop({ required: false })
  appLogo: string;

  @Prop({ required: false })
  apkUrl: string;

  @Prop({ required: false })
  qrCodeDataUrl: string;

  // Even though these fields are automatically added by timestamps: true,
  // we explicitly define them here for better TypeScript compatibility
  @Prop({ required: false })
  createdAt: Date;

  @Prop({ required: false })
  updatedAt: Date;
}

export const AppBuildNotificationSchema = SchemaFactory.createForClass(AppBuildNotification);
