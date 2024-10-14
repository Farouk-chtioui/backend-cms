// src/repositories/repositories.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RepositoriesService } from './repositories.service';
import { RepositoriesController } from './repositories.controller';
import { Repository, RepositorySchema } from './repository.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Repository.name, schema: RepositorySchema }])],
  controllers: [RepositoriesController],
  providers: [RepositoriesService],
  exports: [RepositoriesService], // Ensure the service is exported
})
export class RepositoriesModule {}
