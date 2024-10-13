import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RepositoriesService } from './repositories.service';
import { RepositoriesController } from './repositories.controller';
import { Repository, RepositorySchema } from './repository.schema';
import { LiveUpdatesGateway } from '../../live-updates/live-updates.gateway';

@Module({
  imports: [MongooseModule.forFeature([{ name: Repository.name, schema: RepositorySchema }])],
  controllers: [RepositoriesController],
  providers: [RepositoriesService, LiveUpdatesGateway],  // Add only necessary services and providers
})
export class RepositoriesModule {}
