import { IsNotEmpty, IsString, IsOptional, IsArray, ArrayNotEmpty } from 'class-validator';

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
  appLayoutId?: string; // Ensure this is marked as required if needed

  @IsString()
  @IsOptional()
  description?: string;

  @IsNotEmpty()
  isPrivate: boolean;

  @IsString()
  @IsOptional()
  image?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  team?: string[]; // Optional array of userIds
}
