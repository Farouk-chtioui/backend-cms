import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScreenController } from './screen.controller';
import { ScreenService } from './screen.service';
import { Screen, ScreenSchema } from './screen.schema';
import { WidgetModule } from '../widget/widget.module'; // Import the Widget module

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Screen.name, schema: ScreenSchema }]),
    WidgetModule // Ensures WidgetService is available in ScreenModule
  ],
  controllers: [ScreenController],
  providers: [ScreenService],
  exports: [ScreenService], // Export ScreenService to make it available to other modules
})
export class ScreenModule {}
