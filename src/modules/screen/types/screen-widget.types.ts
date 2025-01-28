export type BaseWidget = {
    id: string;
    type: string;
    style?: Record<string, any>;
  }
  
  export type TextWidget = BaseWidget & {
    type: 'text';
    content: string;
    style?: {
      fontSize?: number;
      color?: string;
      fontWeight?: 'normal' | 'bold' | 'light';
      textAlign?: 'left' | 'center' | 'right';
    };
  }
  
  export type ImageWidget = BaseWidget & {
    type: 'image';
    url: string;
    alt?: string;
    style?: {
      width?: string;
      height?: string;
      objectFit?: 'cover' | 'contain' | 'fill';
    };
  }
  
  export type ContainerWidget = BaseWidget & {
    type: 'container';
    children: ScreenWidget[];
    style?: {
      display?: 'flex' | 'grid';
      gap?: number;
      padding?: number | string;
      backgroundColor?: string;
    };
  }
  
  export type ScreenWidget = TextWidget | ImageWidget | ContainerWidget;