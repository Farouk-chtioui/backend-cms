// src/widget/widget.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WidgetSchema } from './schemas/widget.schema';
import { WidgetService } from './widget.service';
import { WidgetController } from './widget.controller';
import { ImagesModule } from '../images/images.module'; // Import ImagesModule

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Widget', schema: WidgetSchema },
    ]),
    ImagesModule // Makes ImagesService available in WidgetModule
  ],
  controllers: [WidgetController ],
  providers: [WidgetService],
  exports: [WidgetService] // Export WidgetService for use in other modules
})
export class WidgetModule {}
