import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

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
  profileImage: string; // ✅ We'll store the ImageKit URL here

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

  /**
   * Adds a repository ID to the user's repositoryIds array if it doesn't already exist
   * @param repositoryId The repository ID to add
   * @returns boolean - true if added, false if it was already there
   */
  addRepository(repositoryId: Types.ObjectId): boolean {
    if (!this.repositoryIds) {
      this.repositoryIds = [];
    }
    
    // Check if repository already exists in the array
    const exists = this.repositoryIds.some(id => id.equals(repositoryId));
    if (!exists) {
      this.repositoryIds.push(repositoryId);
      return true;
    }
    return false;
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.methods.comparePassword = async function (plainPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, this.password);
};

UserSchema.methods.addRepository = function(repositoryId: Types.ObjectId): boolean {
  if (!this.repositoryIds) {
    this.repositoryIds = [];
  }
  
  // Check if repository already exists in the array
  const exists = this.repositoryIds.some(id => id.equals(repositoryId));
  if (!exists) {
    this.repositoryIds.push(repositoryId);
    return true;
  }
  return false;
};