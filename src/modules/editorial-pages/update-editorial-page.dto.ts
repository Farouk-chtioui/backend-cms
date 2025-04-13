// src/editorial-pages/dto/update-editorial-page.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class UpdateEditorialPageDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  code?: string;
}