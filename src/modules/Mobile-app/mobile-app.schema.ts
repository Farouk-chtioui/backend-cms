import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AppDesign } from '../appDesign/appDesign.schema';
import { Repository } from '../repositories/repository.schema';
@Schema()
export class MobileApp extends Document {
  @Prop({ required: false })
  appName: string;

  @Prop({ type: Types.ObjectId, ref: 'Repository' })
  repositoryId: string;

  @Prop({ type: Types.ObjectId, ref: 'AppDesign' })
  appDesignId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'AppLayout' })
  appLayoutId: Types.ObjectId;
}

export const MobileAppSchema = SchemaFactory.createForClass(MobileApp);