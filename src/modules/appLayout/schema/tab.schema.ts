import { Schema } from 'mongoose';

export const TabSchema = new Schema({
  name: { type: String, required: true },
  icon: { type: String, required: true },
  visible: { type: Boolean, default: true },
  isHome: { type: Boolean, default: false },
});
