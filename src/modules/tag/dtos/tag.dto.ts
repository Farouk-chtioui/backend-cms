import { IsString, IsNotEmpty, IsOptional, IsArray, IsMongoId, IsHexColor } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsMongoId()
  @IsNotEmpty()
  appId: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateTagDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class LinkEntityToTagDto {
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  entityIds: string[];
}
