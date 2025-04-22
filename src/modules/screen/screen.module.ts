import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScreenController } from './screen.controller';
import { ScreenService } from './screen.service';
import { Screen, ScreenSchema } from './screen.schema';
import { WidgetModule } from '../widget/widget.module';
import { TagModule } from '../tag/tag.module'; // Import the Tag module

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Screen.name, schema: ScreenSchema }]),
    WidgetModule,
    TagModule // Add TagModule to access TagService
  ],
  controllers: [ScreenController],
  providers: [ScreenService],
  exports: [ScreenService],
})
export class ScreenModule {}
