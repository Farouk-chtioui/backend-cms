import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RepositoriesModule } from '../repositories/repositories.module';
import { AppBuildNotificationsModule } from '../app-build-notifications/app-build-notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => RepositoriesModule),
    forwardRef(() => AppBuildNotificationsModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}