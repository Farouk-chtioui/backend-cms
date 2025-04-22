// src/widget/interfaces/widget.interface.ts
import { Document, Types } from 'mongoose';

export interface Widget extends Document {
  readonly name: string;
  readonly type: string;        // e.g. "text-content", "carousel", etc.
  readonly category: string;
  readonly content: any;        // The widget’s JSON form data
  readonly style?: any;
  readonly mobileOptions?: any;
  readonly interactions?: any;
  readonly performance?: any;
  readonly accessibility?: any;
  readonly mobileAppId: Types.ObjectId;
  readonly tags?: Types.ObjectId[];  // Added tags array
  readonly createdAt?: Date;
}
