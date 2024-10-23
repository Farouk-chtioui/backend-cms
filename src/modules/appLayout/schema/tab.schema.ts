import { Schema, Document, model } from 'mongoose';

export interface Tab extends Document {
  name: string;
  icon: string;
  visible: boolean;
  isHome: boolean;
}

export const TabSchema = new Schema({
  name: { type: String, required: true },
  icon: { type: String, required: true },
  visible: { type: Boolean, default: true },
  isHome: { type: Boolean, default: false },
});

export const TabModel = model<Tab>('Tab', TabSchema);