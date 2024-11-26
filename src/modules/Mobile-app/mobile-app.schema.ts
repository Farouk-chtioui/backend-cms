import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class MobileApp extends Document {
  @Prop({ required: false })
  appName: string;

  @Prop({ type: Types.ObjectId, ref: 'AppDesign' })
  appDesignId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AppLayout' })
  appLayoutId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Repository' })
  repositoryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerId: Types.ObjectId;
}

export const MobileAppSchema = SchemaFactory.createForClass(MobileApp);
