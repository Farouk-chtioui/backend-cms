import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { MobileApp } from '../mobile-app/mobile-app.schema'; 
import { User } from '../users/user.schema'; 

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

  @Prop({ type: String })
  coverImage: string;

  // Update team property to accept both ObjectIds and email strings
  @Prop({
    type: [MongooseSchema.Types.Mixed],
    validate: {
      validator: function(v) {
        // Allow array items to be either ObjectId or email string
        return Array.isArray(v) && v.every(item => 
          Types.ObjectId.isValid(item) || 
          (typeof item === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))
        );
      },
      message: props => `${props.value} contains invalid team members!`
    },
    default: []
  })
  team: any[]; // Using any[] to allow for both ObjectIds and strings
}

export const RepositorySchema = SchemaFactory.createForClass(Repository);
