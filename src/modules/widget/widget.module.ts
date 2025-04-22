// src/widget/widget.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WidgetSchema } from './schemas/widget.schema';
import { WidgetService } from './widget.service';
import { WidgetController } from './widget.controller';
import { ImagesModule } from '../images/images.module';
import { TagModule } from '../tag/tag.module'; // Import TagModule

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Widget', schema: WidgetSchema },
    ]),
    ImagesModule,
    TagModule // Add TagModule to access TagService
  ],
  controllers: [WidgetController],
  providers: [WidgetService],
  exports: [WidgetService]
})
export class WidgetModule {}
