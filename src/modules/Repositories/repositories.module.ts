import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RepositoryService } from './repositories.service';
import { RepositoryController } from './repositories.controller';
import { Repository, RepositorySchema } from './repository.schema';
import { MobileAppModule } from '../mobile-app/mobile-app.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Repository.name, schema: RepositorySchema }]),
    MobileAppModule,
  ],
  controllers: [RepositoryController],
  providers: [RepositoryService],
  exports: [RepositoryService],
})
export class RepositoriesModule {}