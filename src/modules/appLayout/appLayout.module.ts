import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppLayout, AppLayoutSchema } from './appLayout.schema';
import { AppLayoutController } from './appLayout.controller';
import { AppLayoutService } from './appLayout.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AppLayout.name, schema: AppLayoutSchema }]),
  ],
  controllers: [AppLayoutController],
  providers: [AppLayoutService],
  exports: [AppLayoutService], // Export the service for other modules
})
export class AppLayoutModule {}
