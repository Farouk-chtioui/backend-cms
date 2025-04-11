import { Document, Types } from 'mongoose';
import { HeaderConfig } from '../../header/header.interface';

export interface WidgetScreen extends Document {
  readonly name: string;
  readonly mobileAppId: Types.ObjectId;
  readonly widgets: Types.ObjectId[];
  header: HeaderConfig | null;
  readonly createdAt?: Date;
}