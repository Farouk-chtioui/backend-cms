import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WidgetScreenController } from './widgetscreen.controller';
import { WidgetScreenService } from './widgetscreen.service';
import { WidgetScreenSchema } from './schemas/widgetscreen.schema';
import { WidgetModule } from '../widget/widget.module';
import { TagModule } from '../tag/tag.module'; // Import TagModule

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'WidgetScreen', schema: WidgetScreenSchema }
    ]),
    WidgetModule,
    TagModule // Add TagModule to access TagService
  ],
  controllers: [WidgetScreenController],
  providers: [WidgetScreenService],
  exports: [WidgetScreenService],
})
export class WidgetScreenModule {}