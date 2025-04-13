// src/editorial-pages/dto/create-editorial-page.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateEditorialPageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsNotEmpty()
  appId: string;
}