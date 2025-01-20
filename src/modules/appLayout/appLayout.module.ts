import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppLayoutController } from './appLayout.controller';
import { AppLayoutService } from './appLayout.service';
import { AppLayout, AppLayoutSchema } from './appLayout.schema';
import { ScreenModule } from '../screen/screen.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AppLayout.name, schema: AppLayoutSchema }]),
    ScreenModule, // Import the ScreenModule to make ScreenService available
  ],
  controllers: [AppLayoutController],
  providers: [AppLayoutService],
  exports: [AppLayoutService],
})
export class AppLayoutModule {}
