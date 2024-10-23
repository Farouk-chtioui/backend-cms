import { Module } from '@nestjs/common';
import { AppGenerationService } from './app-generation.service';

@Module({
  providers: [AppGenerationService],
  exports: [AppGenerationService],
})
export class AppGenerationModule {}