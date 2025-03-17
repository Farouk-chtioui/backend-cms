import * as mongoose from 'mongoose';
import { HeaderConfigSchema } from '../../header/header.schema';

export const WidgetScreenSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobileAppId: { type: mongoose.Schema.Types.ObjectId, ref: 'MobileApp', required: true },
  widgets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Widget', default: [] }],
  header: { type: HeaderConfigSchema, default: null },
  createdAt: { type: Date, default: Date.now },
});