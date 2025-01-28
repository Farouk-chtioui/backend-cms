// screen.types.ts
export enum ScreenType {
    CONTENT_LIST = 'content-list',
    LOCATIONS_LIST = 'locations-list',
    MAP = 'map',
    SCHEDULE = 'schedule',
    ARTISTS = 'artists',
    STAGES = 'stages',
    MERCHANDISE = 'merchandise',
    FOOD_DRINKS = 'food-drinks',
    TICKETS = 'tickets',
    EMERGENCY = 'emergency',
    SOCIAL_FEED = 'social-feed',
    GALLERY = 'gallery',
    FAQ = 'faq',
    TRANSPORTATION = 'transportation',
    CUSTOM = 'custom'
  }
  
  export type ScreenLayoutType = 'flex' | 'grid' | 'custom';
  
  export interface ScreenSettings {
    backgroundColor: string;
    padding: number;
    layoutType: ScreenLayoutType;
    customSettings?: Record<string, unknown>;
  }