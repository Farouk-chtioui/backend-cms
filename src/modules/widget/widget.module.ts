// src/widget/widget.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WidgetSchema } from './schemas/widget.schema';
import { WidgetTypeSchema } from './schemas/widget-type.schema';
import { WidgetService } from './widget.service';
import { WidgetController } from './widget.controller';
import { WidgetTypeService } from './widget-type/widget-type.service';
import { WidgetTypeController } from './widget-type/widget-type.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Widget', schema: WidgetSchema },
      { name: 'WidgetType', schema: WidgetTypeSchema },
    ]),
  ],
  controllers: [WidgetController, WidgetTypeController],
  providers: [WidgetService, WidgetTypeService],
})
export class WidgetModule {}
