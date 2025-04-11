import { IsString, IsOptional, IsObject, IsNumber, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Enum for header types
enum HeaderType {
  IMAGE = 'image',
  LOGO = 'logo',
  GRADIENT = 'gradient'
}

// Enum for font styles
enum FontStyle {
  MODERN = 'modern',
  CLASSIC = 'classic',
  DISPLAY = 'display',
  GRAFFITI = 'graffiti'
}

// Enum for mobile layouts
enum MobileLayout {
  CENTERED = 'centered',
  BOTTOM = 'bottom',
  OVERLAY = 'overlay'
}

// Enum for border radius
enum BorderRadius {
  NONE = 'none',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  FULL = 'full'
}

// Enum for frame styles
enum FrameStyle {
  NONE = 'none',
  SIMPLE = 'simple',
  SHADOW = 'shadow',
  FLOATING = 'floating'
}

// Nested DTOs for complex properties
class GradientColorsDto {
  @IsString()
  from: string;

  @IsString()
  to: string;

  @IsNumber()
  @IsOptional()
  angle?: number;
}

class ImagePositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  scale: number;
}

class FestivalDatesDto {
  @IsString()
  start: string;

  @IsString()
  end: string;
}

class SocialLinksDto {
  @IsString()
  @IsOptional()
  instagram?: string;

  @IsString()
  @IsOptional()
  twitter?: string;

  @IsString()
  @IsOptional()
  facebook?: string;

  @IsString()
  @IsOptional()
  spotify?: string;
}

class CustomStylesDto {
  @IsString()
  @IsOptional()
  headerHeight?: string;

  @IsString()
  @IsOptional()
  contentPadding?: string;

  @IsBoolean()
  @IsOptional()
  textShadow?: boolean;

  @IsBoolean()
  @IsOptional()
  backgroundBlur?: boolean;
}

class InteractionsDto {
  @IsBoolean()
  @IsOptional()
  enableShare?: boolean;

  @IsBoolean()
  @IsOptional()
  enableSave?: boolean;

  @IsBoolean()
  @IsOptional()
  enableNotifications?: boolean;
}

// Main DTO for header
export class HeaderDto {
  @IsEnum(HeaderType)
  type: HeaderType;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => GradientColorsDto)
  @IsOptional()
  gradientColors?: GradientColorsDto;

  @IsNumber()
  @IsOptional()
  overlayOpacity?: number;

  @IsString()
  @IsOptional()
  textColor?: string;

  @IsBoolean()
  @IsOptional()
  showText?: boolean;

  @IsEnum(FontStyle)
  @IsOptional()
  fontStyle?: FontStyle;

  @IsEnum(MobileLayout)
  @IsOptional()
  mobileLayout?: MobileLayout;

  @IsEnum(BorderRadius)
  @IsOptional()
  borderRadius?: BorderRadius;

  @IsEnum(FrameStyle)
  @IsOptional()
  frame?: FrameStyle;

  @IsObject()
  @ValidateNested()
  @Type(() => FestivalDatesDto)
  @IsOptional()
  festivalDates?: FestivalDatesDto;

  @IsBoolean()
  @IsOptional()
  showDates?: boolean;

  @IsBoolean()
  @IsOptional()
  showCountdown?: boolean;

  @IsBoolean()
  @IsOptional()
  isFullWidth?: boolean;

  @IsObject()
  @ValidateNested()
  @Type(() => ImagePositionDto)
  @IsOptional()
  imagePosition?: ImagePositionDto;

  @IsObject()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  @IsOptional()
  socialLinks?: SocialLinksDto;

  @IsObject()
  @ValidateNested()
  @Type(() => CustomStylesDto)
  @IsOptional()
  customStyles?: CustomStylesDto;

  @IsObject()
  @ValidateNested()
  @Type(() => InteractionsDto)
  @IsOptional()
  interactions?: InteractionsDto;
}

// DTO for update header requests
export class UpdateHeaderDto {
  @IsObject()
  @ValidateNested()
  @Type(() => HeaderDto)
  header: HeaderDto | null;
}