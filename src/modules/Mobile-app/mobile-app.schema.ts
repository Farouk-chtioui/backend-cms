import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AppLayout } from '../appLayout/appLayout.schema';
import { AppDesign } from '../appDesign/appDesign.schema';

@Schema()
export class MobileApp extends Document {
  @Prop({ type: String, required: true })
  appName: string;

  @Prop({ type: Types.ObjectId, ref: 'AppDesign', required: true }) // Reference AppDesign
  appDesignId: AppDesign;

  @Prop({ type: Types.ObjectId, ref: 'AppLayout', required: true }) // Reference AppLayout
  appLayoutId: AppLayout;

  @Prop({ type: String, required: true }) // Repository reference
  repositoryId: string;

  @Prop({ type: String, required: true }) // Owner reference
  ownerId: string;
}

export const MobileAppSchema = SchemaFactory.createForClass(MobileApp);
