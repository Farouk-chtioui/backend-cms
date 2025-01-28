import { IsString, IsNotEmpty, IsObject, IsOptional, IsBoolean, IsArray, ValidateNested, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ScreenWidget } from '../types/screen-widget.types';
import { ScreenType } from '../types/screen.types';

export class ScreenSettingsDto {
  @IsString()
  @IsOptional()
  backgroundColor?: string;

  @IsNumber()
  @IsOptional()
  padding?: number;

  @IsEnum(['flex', 'grid', 'custom'])
  @IsOptional()
  layoutType?: 'flex' | 'grid' | 'custom';

  @IsObject()
  @IsOptional()
  customSettings?: Record<string, any>;
}

export class ScreenMetadataDto {
  @IsNumber()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  showThumbnails?: boolean;

  @IsBoolean()
  @IsOptional()
  showSearch?: boolean;

  @IsBoolean()
  @IsOptional()
  showFilters?: boolean;

  @IsBoolean()
  @IsOptional()
  showCategories?: boolean;

  @IsBoolean()
  @IsOptional()
  enableLocation?: boolean;

  @IsBoolean()
  @IsOptional()
  showFavorites?: boolean;

  @IsBoolean()
  @IsOptional()
  showSharing?: boolean;

  @IsBoolean()
  @IsOptional()
  enableNotifications?: boolean;

  @IsEnum(['grid', 'list', 'map', 'calendar'])
  @IsOptional()
  layout?: 'grid' | 'list' | 'map' | 'calendar';

  @IsBoolean()
  @IsOptional()
  requiresTicket?: boolean;

  @IsBoolean()
  @IsOptional()
  vipOnly?: boolean;

  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsString()
  @IsOptional()
  originalScreenId?: string;

  @IsObject()
  @IsOptional()
  additionalMetadata?: Record<string, any>;
}

export class CreateScreenDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  route: string;

  @IsString()
  @IsNotEmpty()
  appId: string;

  @IsEnum(ScreenType, {
    message: 'screenType must be one of the valid screen types'
  })
  screenType: ScreenType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  widgets: ScreenWidget[];

  @ValidateNested()
  @Type(() => ScreenSettingsDto)
  @IsOptional()
  settings?: ScreenSettingsDto;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ValidateNested()
  @Type(() => ScreenMetadataDto)
  @IsOptional()
  metadata?: ScreenMetadataDto;
}

export class UpdateScreenDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  route?: string;

  @IsString()
  @IsOptional()
  appId?: string;

  @IsEnum(ScreenType, {
    message: 'screenType must be one of the valid screen types'
  })
  @IsOptional()
  screenType?: ScreenType;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Object)
  widgets?: ScreenWidget[];

  @ValidateNested()
  @Type(() => ScreenSettingsDto)
  @IsOptional()
  settings?: ScreenSettingsDto;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ValidateNested()
  @Type(() => ScreenMetadataDto)
  @IsOptional()
  metadata?: ScreenMetadataDto;
}

export class UpdateScreenOrderDto {
  @IsNumber()
  @IsNotEmpty()
  order: number;
}