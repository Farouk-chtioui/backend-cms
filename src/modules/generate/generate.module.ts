// src/generate/generate.module.ts
import { Module } from '@nestjs/common';
import { AppGenerationModule } from '../app-generation/app-generation.module';
import { MobileAppModule } from '../mobile-app/mobile-app.module';
import { GenerateController } from './generate.contoller';
import { GenerateService } from './generate.service';


@Module({
  imports: [MobileAppModule, AppGenerationModule],
  providers: [GenerateService],
  controllers: [GenerateController],
})
export class GenerateModule {}
