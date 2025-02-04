// src/widget/interfaces/widget-type.interface.ts
import { Document } from 'mongoose';

export interface WidgetType extends Document {
  readonly value: string;      // e.g. "text-content"
  readonly label: string;      // e.g. "Text Content"
  readonly description: string;
  readonly icon: string;       // Icon name (the frontend uses a React icon, but here we store its string name)
  readonly category: string;   // e.g. "Basic Components"
  readonly defaultContent: any;  // Default content (any valid JSON)
  readonly mobileRecommendations?: any;
  readonly interactionDefaults?: any;
  readonly styleDefaults?: any;
  readonly performanceRecommendations?: any;
  readonly restrictions?: any;
}
