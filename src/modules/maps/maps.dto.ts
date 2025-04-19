import { IsNumber, IsString, IsOptional, IsObject, IsBoolean, Min, Max, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

// Location DTO
export class LocationDto {
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @IsNumber()
  @IsNotEmpty()
  lng: number;

  @IsString()
  @IsOptional()
  address?: string;
}

// Update event location DTO
export class UpdateEventLocationDto {
  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  location: LocationDto;

  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  center?: LocationDto;

  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  zoom?: number;
}

// Bounds DTO
export class BoundsDto {
  @IsNumber()
  @IsNotEmpty()
  north: number;

  @IsNumber()
  @IsNotEmpty()
  south: number;

  @IsNumber()
  @IsNotEmpty()
  east: number;

  @IsNumber()
  @IsNotEmpty()
  west: number;
}

// Create map pin DTO
export class CreateMapPinDto {
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @IsNumber()
  @IsNotEmpty()
  lng: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  iconId: string;

  @IsString()
  @IsOptional()
  iconName?: string;

  @IsString()
  @IsOptional()
  iconCategory?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsNotEmpty()
  appId: string;
}

// Update map pin DTO
export class UpdateMapPinDto {
  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  iconId?: string;

  @IsString()
  @IsOptional()
  iconName?: string;

  @IsString()
  @IsOptional()
  iconCategory?: string;

  @IsString()
  @IsOptional()
  color?: string;
}

// Create map overlay DTO for form data
export class CreateMapOverlayDto {
  @IsString()
  @IsNotEmpty()
  appId: string;

  @IsOptional()
  bounds?: string | BoundsDto; // Accept string or object

  @IsOptional()
  opacity?: string | number; // Accept string or number

  @IsOptional()
  isPositioning?: string | boolean; // Accept string or boolean
}

// Update map overlay DTO
export class UpdateMapOverlayDto {
  @IsOptional()
  bounds?: string | BoundsDto; // Accept string or object

  @IsOptional()
  opacity?: string | number; // Accept string or number

  @IsOptional()
  isPositioning?: string | boolean; // Accept string or boolean
}