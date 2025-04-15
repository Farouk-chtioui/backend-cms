import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WidgetScreenController } from './widgetscreen.controller';
import { WidgetScreenService } from './widgetscreen.service';
import { WidgetScreenSchema } from './schemas/widgetscreen.schema';
import { WidgetModule } from '../widget/widget.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'WidgetScreen', schema: WidgetScreenSchema }
    ]),
    WidgetModule // Import WidgetModule to access WidgetService
  ],
  controllers: [WidgetScreenController],
  providers: [WidgetScreenService],
  exports: [WidgetScreenService],
})
export class WidgetScreenModule {}