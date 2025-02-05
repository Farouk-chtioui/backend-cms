import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OnboardingScreensService } from './service/onboarding-screens.service';
import { OnboardingScreensController } from './controller/onboarding-screens.controller';
import { OnboardingScreen, OnboardingScreenSchema } from './schema/onboarding-screen.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OnboardingScreen.name, schema: OnboardingScreenSchema }
    ])
  ],
  controllers: [OnboardingScreensController],
  providers: [OnboardingScreensService],
  exports: [OnboardingScreensService],
})
export class OnboardingScreensModule {}