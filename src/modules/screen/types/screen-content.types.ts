import { Types } from 'mongoose';

// Interface for widget tags in a screen
export interface ScreenTag {
  id: Types.ObjectId | string;
  name: string;
  color?: string;
}

// Interface for screen content with tag filtering options
export interface ScreenContentFilter {
  tags?: ScreenTag[];
  enableTagFiltering: boolean;
}

// Interface for screen content with tag filtering options
export interface ScreenContent {
  widgets?: Types.ObjectId[] | string[];
  filters?: ScreenContentFilter;
  tags?: ScreenTag[];
}
