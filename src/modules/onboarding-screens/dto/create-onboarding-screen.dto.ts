import { IsString, IsEnum, IsBoolean, IsNumber, IsObject, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { OnboardingScreenCategory, OnboardingScreenType } from '../../../types/onboarding-screen.types';

export class CreateOnboardingScreenDto {
  @IsString()
  appId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()  
  icon: string;

  @IsEnum(OnboardingScreenCategory)
  category: OnboardingScreenCategory;

  @IsString()
  screenType: OnboardingScreenType;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;

  @IsBoolean()
  @IsOptional()  
  isCustom?: boolean = false;

  @IsNumber()
  order: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
