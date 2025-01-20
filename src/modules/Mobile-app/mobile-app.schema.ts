import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AppDesign } from '../appDesign/appDesign.schema';
import { AppLayout } from '../appLayout/appLayout.schema';

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

  // ...any other properties...
}

export const MobileAppSchema = SchemaFactory.createForClass(MobileApp);
