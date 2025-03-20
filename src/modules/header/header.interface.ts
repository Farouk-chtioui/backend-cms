// types/header.interface.ts

export interface HeaderConfig {
    type: 'image' | 'logo' | 'gradient';
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    logoUrl?: string;
    gradientColors?: {
      from: string;
      to: string;
      angle?: number;
    };
    overlayOpacity?: number;
    textColor?: string;
    showText?: boolean;
    fontStyle?: 'modern' | 'classic' | 'display' | 'graffiti';
    mobileLayout?: 'centered' | 'bottom' | 'overlay';
    borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'full';
    frame?: 'none' | 'simple' | 'shadow' | 'floating';
    festivalDates?: {
      start: string;
      end: string;
    };
    showDates?: boolean;
    showCountdown?: boolean;
    isFullWidth?: boolean;
    imagePosition?: {
      x: number;
      y: number;
      scale: number;
    };
    socialLinks?: {
      instagram?: string;
      twitter?: string;
      facebook?: string;
      spotify?: string;
    };
    customStyles?: {
      headerHeight?: string;
      contentPadding?: string;
      textShadow?: boolean;
      backgroundBlur?: boolean;
    };
    interactions?: {
      enableShare?: boolean;
      enableSave?: boolean;
      enableNotifications?: boolean;
    };
  }