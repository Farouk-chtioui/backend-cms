import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WidgetScreenController } from './widgetscreen.controller';
import { WidgetScreenService } from './widgetscreen.service';
import { WidgetScreenSchema } from './schemas/widgetscreen.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'WidgetScreen', schema: WidgetScreenSchema }
    ]),
  ],
  controllers: [WidgetScreenController],
  providers: [WidgetScreenService],
  exports: [WidgetScreenService],
})
export class WidgetScreenModule {}