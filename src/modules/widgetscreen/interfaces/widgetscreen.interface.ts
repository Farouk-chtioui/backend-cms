import { Document, Types } from 'mongoose';
import { HeaderConfig } from '../../header/header.interface';

export interface WidgetScreen extends Document {
  readonly name: string;
  readonly mobileAppId: Types.ObjectId;
  readonly widgets: Types.ObjectId[];
  readonly tags?: Types.ObjectId[];  // Added tags array
  header: HeaderConfig | null;
  readonly createdAt?: Date;
}