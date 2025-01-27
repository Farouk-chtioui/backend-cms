export type BaseElement = {
  id: string;
  type: string;
  style?: Record<string, any>;
}

export type TextElement = BaseElement & {
  type: 'text';
  content: string;
  style?: {
    fontSize?: number;
    color?: string;
    fontWeight?: 'normal' | 'bold' | 'light';
    textAlign?: 'left' | 'center' | 'right';
  };
}

export type ImageElement = BaseElement & {
  type: 'image';
  url: string;
  alt?: string;
  style?: {
    width?: string;
    height?: string;
    objectFit?: 'cover' | 'contain' | 'fill';
  };
}

export type ContainerElement = BaseElement & {
  type: 'container';
  children: ScreenElement[];
  style?: {
    display?: 'flex' | 'grid';
    gap?: number;
    padding?: number | string;
    backgroundColor?: string;
  };
}

export type ScreenElement = TextElement | ImageElement | ContainerElement;
