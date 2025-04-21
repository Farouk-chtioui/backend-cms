// team-notifications.schema.ts
import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class TeamNotification extends Document {
  @Prop({ 
    required: true, 
    index: true,
    type: MongooseSchema.Types.Mixed,
    validate: {
      validator: function(v) {
        return Types.ObjectId.isValid(v) || typeof v === 'string';
      },
      message: 'userId must be a valid ObjectId or string'
    }
  })
  userId: Types.ObjectId | string;

  @Prop({ 
    required: true, 
    index: true,
    type: MongooseSchema.Types.Mixed,
    validate: {
      validator: function(v) {
        return Types.ObjectId.isValid(v) || typeof v === 'string';
      },
      message: 'teamId must be a valid ObjectId or string'
    }
  })
  teamId: Types.ObjectId | string;

  @Prop({ required: true })
  message: string;

  @Prop({ 
    required: true, 
    enum: ['message', 'note'],
    default: 'message'
  })
  type: string;

  @Prop({ 
    type: MongooseSchema.Types.Mixed,
    validate: {
      validator: function(v) {
        return v === undefined || v === null || Types.ObjectId.isValid(v) || typeof v === 'string';
      },
      message: 'sourceId must be a valid ObjectId, string, or undefined'
    }
  })
  sourceId?: Types.ObjectId | string;

  @Prop({ default: false })
  read: boolean;
  
  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const TeamNotificationSchema = SchemaFactory.createForClass(TeamNotification);

// Add compound index for userId and read status only (avoid duplicate single field indexes)
TeamNotificationSchema.index({ userId: 1, read: 1 });
// Add index for createdAt for sorting notifications
TeamNotificationSchema.index({ createdAt: -1 });