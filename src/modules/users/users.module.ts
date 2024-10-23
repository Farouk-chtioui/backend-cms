import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './user.schema';
import { RepositoriesModule } from '../repositories/repositories.module'; // Import the RepositoriesModule

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RepositoriesModule,
     // Make sure this is imported here
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Export if needed by other modules
})
export class UsersModule {}
