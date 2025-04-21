// team-notifications.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class TeamNotification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Team', required: true })
  teamId: Types.ObjectId;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: String, required: true, enum: ['message', 'note'] })
  type: string;

  @Prop({ type: Types.ObjectId, required: false })
  sourceId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  read: boolean;

  // Explicitly add createdAt and updatedAt
  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const TeamNotificationSchema = SchemaFactory.createForClass(TeamNotification);