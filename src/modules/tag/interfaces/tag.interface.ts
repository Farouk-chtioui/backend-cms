import { Document, Types } from 'mongoose';

export interface Tag extends Document {
  readonly name: string;
  readonly color: string;
  readonly appId: Types.ObjectId;
  readonly description?: string;
  readonly widgets: Types.ObjectId[];
  readonly widgetScreens: Types.ObjectId[];
  readonly screens: Types.ObjectId[];
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}
