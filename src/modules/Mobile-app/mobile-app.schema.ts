import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AppDesign } from '../appDesign/appDesign.schema'; // Import AppDesign schema
import { Repository } from '../repositories/repository.schema'; // Import Repository schema

@Schema()
export class MobileApp extends Document {
  @Prop({ required: false })
  appName: string;

  @Prop({ type: Types.ObjectId, ref: 'Repository' })
  repositoryId: string;

  // Reference to the associated AppDesign using ObjectId
  @Prop({ type: Types.ObjectId, ref: 'AppDesign' })
  appDesignId: string; // Reference to AppDesign
}

export const MobileAppSchema = SchemaFactory.createForClass(MobileApp);
