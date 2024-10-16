// create-mobile-app.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';

export class CreateMobileAppDto {
  @IsString()
  @IsOptional()
  appName: string;

  @IsString()
  @IsOptional()
  version: string;

  @IsOptional()
  @IsMongoId()
  repositoryId?: string; 

  @IsOptional()
  @IsMongoId()
  appDesignId?: string; 
}
