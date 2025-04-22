import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';
import { TagSchema } from './schemas/tag.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Tag', schema: TagSchema }]),
  ],
  controllers: [TagController],
  providers: [TagService],
  exports: [TagService], // Export TagService for use in other modules
})
export class TagModule {}
