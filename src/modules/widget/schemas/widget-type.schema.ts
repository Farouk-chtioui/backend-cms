// src/widget/schemas/widget-type.schema.ts
import * as mongoose from 'mongoose';

export const WidgetTypeSchema = new mongoose.Schema({
  value: { type: String, required: true },
  label: { type: String, required: true },
  description: { type: String },
  icon: { type: String }, // Storing the icon name as string
  category: { type: String, required: true },
  defaultContent: { type: mongoose.Schema.Types.Mixed, default: {} },
  mobileRecommendations: { type: mongoose.Schema.Types.Mixed, default: {} },
  interactionDefaults: { type: mongoose.Schema.Types.Mixed, default: {} },
  styleDefaults: { type: mongoose.Schema.Types.Mixed, default: {} },
  performanceRecommendations: { type: mongoose.Schema.Types.Mixed, default: {} },
  restrictions: { type: mongoose.Schema.Types.Mixed, default: {} },
});
