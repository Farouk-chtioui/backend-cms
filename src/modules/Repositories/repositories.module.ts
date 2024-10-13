import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RepositoriesService } from './repositories.service';
import { RepositoriesController } from './repositories.controller';
import { Repository, RepositorySchema } from './repository.schema';
import { LiveUpdatesGateway } from '../../live-updates/live-updates.gateway'; // Import the gateway

@Module({
  imports: [MongooseModule.forFeature([{ name: Repository.name, schema: RepositorySchema }])],
  controllers: [RepositoriesController],
  providers: [RepositoriesService, LiveUpdatesGateway],  // Add the gateway as a provider
})
export class RepositoriesModule {}
