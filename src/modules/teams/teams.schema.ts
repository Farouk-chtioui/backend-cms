import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

// Message schema as a subdocument
@Schema({ _id: false, timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Boolean, default: false })
  isSystemMessage: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

const MessageSchema = SchemaFactory.createForClass(Message);

// Note schema as a subdocument
@Schema({ _id: false, timestamps: true })
export class Note {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  color: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

const NoteSchema = SchemaFactory.createForClass(Note);

// Main Team schema that contains messages and notes
@Schema({ timestamps: true })
export class Team extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Repository', required: true })
  repositoryId: Types.ObjectId;

  // Update members to support both ObjectIds and strings (emails)
  @Prop({ 
    type: [{ 
      type: MongooseSchema.Types.Mixed, 
      // Use a validator to allow both ObjectId and email strings
      validate: {
        validator: function(value: any) {
          // Check if it's an ObjectId or a string
          return Types.ObjectId.isValid(value) || 
                 (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
        },
        message: props => `${props.value} is not a valid ObjectId or email!`
      }
    }],
    default: []
  })
  members: any[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: '' })
  description: string;

  @Prop({ type: [MessageSchema], default: [] })
  messages: Message[];

  @Prop({ type: [NoteSchema], default: [] })
  notes: Note[];
}

export const TeamSchema = SchemaFactory.createForClass(Team);