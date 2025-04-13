import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EditorialPagesController } from './editorial-pages.controller';
import { EditorialPagesService } from './editorial-pages.service';
import { EditorialPage, EditorialPageSchema } from './editorial-pages.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EditorialPage.name, schema: EditorialPageSchema }
    ]),
  ],
  controllers: [EditorialPagesController],
  providers: [EditorialPagesService],
  exports: [EditorialPagesService],
})
export class EditorialPagesModule {}