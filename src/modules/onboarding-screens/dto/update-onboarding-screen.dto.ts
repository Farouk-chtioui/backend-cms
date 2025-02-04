import { PartialType } from '@nestjs/mapped-types';
import { CreateOnboardingScreenDto } from './create-onboarding-screen.dto';

export class UpdateOnboardingScreenDto extends PartialType(CreateOnboardingScreenDto) {}
