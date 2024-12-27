import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Repository } from '../repositories/repository.schema';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: [Types.ObjectId], ref: 'Repository' })
  repositoryIds: Types.ObjectId[];

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ type: String, default: null })
  profileImage: string;

  @Prop({ type: String, default: null })
  bio: string;

  @Prop({ type: String, default: null })
  location: string;

  @Prop({ type: String, default: null })
  website: string;

  @Prop({ type: String, default: null })
  githubUrl: string;

  @Prop({ type: String, default: null })
  twitterUrl: string;

  @Prop({ type: String, default: 'user' })
  role: string;

  @Prop({ type: Date, default: Date.now })
  joinDate: Date;

  @Prop({ type: Date, default: Date.now })
  lastActive: Date;

  async comparePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password);
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.methods.comparePassword = async function (plainPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, this.password);
};