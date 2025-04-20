import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsArray, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

// Base team DTO
export class CreateTeamDto {
  @IsMongoId()
  @IsNotEmpty()
  repositoryId: string;

  @IsMongoId()
  @IsNotEmpty()
  ownerId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  members?: string[];
}

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  members?: string[];
}

// Message DTOs
export class CreateTeamMessageDto {
  @IsMongoId()
  @IsNotEmpty()
  teamId: string;

  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsBoolean()
  @IsOptional()
  isSystemMessage?: boolean;
}

export class SystemMessageDto {
  @IsMongoId()
  @IsNotEmpty()
  teamId: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

// Note DTOs
export class CreateTeamNoteDto {
  @IsMongoId()
  @IsNotEmpty()
  teamId: string;

  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  color: string;
}

export class UpdateTeamNoteDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  color?: string;
}