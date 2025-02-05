import * as mongoose from 'mongoose';

export const WidgetScreenSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobileAppId: { type: mongoose.Schema.Types.ObjectId, ref: 'MobileApp', required: true },
  widgets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Widget', default: [] }],
  createdAt: { type: Date, default: Date.now },
});
