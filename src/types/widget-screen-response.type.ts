// src/widget-screens/types/widget-screen-response.type.ts
import { WidgetScreen } from '../modules/widget-screens/widget-screen.schema';
import { Widget } from '../modules/widgets/widget.schema';

export type WidgetScreenResponse = WidgetScreen & {
  widgets: Widget[];
};