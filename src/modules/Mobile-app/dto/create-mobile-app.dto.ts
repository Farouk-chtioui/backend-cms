import { IsString, IsOptional, IsMongoId } from 'class-validator';

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

  @IsOptional()
  @IsMongoId()
  ownerId?: string;  

  @IsOptional()
  @IsString()
  userEmail?: string; 

  @IsOptional()
  @IsMongoId()
  appLayoutId?: string;  
}
