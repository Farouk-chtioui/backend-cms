import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RepositoriesService } from './repositories.service';
import { RepositoriesController } from './repositories.controller';
import { Repository, RepositorySchema } from './repository.schema';
import { MobileAppModule } from '../mobile-app/mobile-app.module'; // Import MobileAppModule
import { AppDesignModule } from '../appDesign/appDesign.module'; // Import AppDesignModule
import { UsersModule } from '../users/users.module';
import { AppLayoutModule } from '../appLayout/appLayout.module';
import { ImageKitService } from '../../shared/imagekit.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Repository.name, schema: RepositorySchema }]),
    MobileAppModule, // Import MobileAppModule for MobileApp-related services
    AppDesignModule,
    AppLayoutModule,
    forwardRef(()=>UsersModule)
  ],
  controllers: [RepositoriesController],
  providers: [
    RepositoriesService,
    ImageKitService,
  ],
  exports: [RepositoriesService],
})
export class RepositoriesModule {}
