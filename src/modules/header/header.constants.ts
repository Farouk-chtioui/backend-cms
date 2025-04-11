import { HeaderConfig } from './header.interface';

/**
 * Default header configuration
 * Used when creating a new header
 */
export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  type: 'image',
  title: '',
  subtitle: '',
  overlayOpacity: 0.4,
  textColor: '#FFFFFF',
  showText: true,
  fontStyle: 'modern',
  mobileLayout: 'centered',
  borderRadius: 'none',
  frame: 'none',
  showDates: false,
  isFullWidth: true,
  imagePosition: { x: 0, y: 0, scale: 1 },
  festivalDates: { start: '', end: '' },
  showCountdown: false,
  socialLinks: {}
};

/**
 * Gradient presets for headers
 */
export const GRADIENT_PRESETS = [
  { 
    from: '#FF416C', 
    to: '#FF4B2B', 
    label: 'Sunset Vibes', 
    angle: 45 
  },
  { 
    from: '#8E2DE2', 
    to: '#4A00E0', 
    label: 'Purple Haze', 
    angle: 135 
  },
  { 
    from: '#00F5A0', 
    to: '#00D9F5', 
    label: 'Neon Glow', 
    angle: 90 
  },
  { 
    from: '#FDC830', 
    to: '#F37335', 
    label: 'Golden Hour', 
    angle: 180 
  }
];

/**
 * Font style options for headers
 */
export const FONT_STYLES = [
  { value: 'modern', label: 'Modern Sans' },
  { value: 'classic', label: 'Classic Serif' },
  { value: 'display', label: 'Festival Display' },
  { value: 'graffiti', label: 'Urban Graffiti' }
];

/**
 * Border radius options for headers
 */
export const BORDER_RADIUS_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'full', label: 'Full' }
];

/**
 * Frame options for headers
 */
export const FRAME_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'simple', label: 'Simple Border' },
  { value: 'shadow', label: 'Drop Shadow' },
  { value: 'floating', label: 'Floating Effect' }
];