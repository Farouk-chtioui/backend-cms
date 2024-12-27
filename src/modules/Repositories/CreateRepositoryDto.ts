import { IsNotEmpty, IsString, IsOptional, IsArray, ArrayNotEmpty, IsBoolean } from 'class-validator';

export class CreateRepositoryDto {
  @IsString()
  @IsNotEmpty()
  repositoryName: string;

  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @IsString()
  @IsOptional()
  appDesignId?: string;

  @IsString()
  @IsOptional()
  appLayoutId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsNotEmpty()
  isPrivate: boolean;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  coverImage?: string; // New optional field for cover image

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  team?: string[]; // Optional array of userIds
}
