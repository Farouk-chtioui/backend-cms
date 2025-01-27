import { IsString, IsNotEmpty, IsObject, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ScreenElement } from '../types/screen-element.types';

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  elements: ScreenElement[];

  @IsObject()
  @IsOptional()
  settings?: {
    backgroundColor?: string;
    padding?: number;
    layoutType?: 'flex' | 'grid';
  };

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateScreenDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  route?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Object)
  elements?: ScreenElement[];

  @IsObject()
  @IsOptional()
  settings?: {
    backgroundColor?: string;
    padding?: number;
    layoutType?: 'flex' | 'grid';
  };

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ScreenElementDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  @IsNotEmpty()
  content: any;

  @IsObject()
  @IsOptional()
  style?: Record<string, any>;
}
