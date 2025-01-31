import { IsString, IsEnum, IsNumber, IsObject, IsOptional } from 'class-validator';
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

  @IsNumber()
  order: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}