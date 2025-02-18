// src/widget/schemas/widget.schema.ts
import * as mongoose from 'mongoose';

export const WidgetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }, // e.g. "text-content", "carousel", etc.
  category: { type: String, required: true },
  // The widget’s data gathered from the various forms:
  content: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {}, 
    validate: {
      validator(v: any) {
        return JSON.stringify(v).length <= 6000000; 
      },
      message: "Widget content is too large. Please reduce content."
    }
  },
  style: { type: mongoose.Schema.Types.Mixed, default: {} },
  mobileOptions: { type: mongoose.Schema.Types.Mixed, default: {} },
  interactions: { type: mongoose.Schema.Types.Mixed, default: {} },
  performance: { type: mongoose.Schema.Types.Mixed, default: {} },
  accessibility: { type: mongoose.Schema.Types.Mixed, default: {} },
  // NEW: mobileAppId – which ties this widget to a specific MobileApp document.
  mobileAppId: { type: mongoose.Schema.Types.ObjectId, ref: 'MobileApp', required: true },
  createdAt: { type: Date, default: Date.now },
});
