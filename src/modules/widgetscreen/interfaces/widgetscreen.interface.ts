import { Document, Types } from 'mongoose';

export interface WidgetScreen extends Document {
  readonly name: string;
  readonly mobileAppId: Types.ObjectId;
  readonly widgets: Types.ObjectId[];
  readonly createdAt?: Date;
}
