import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Team, TeamSchema } from './teams.schema';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { RepositoriesModule } from '../repositories/repositories.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Team.name, schema: TeamSchema },
    ]),
    RepositoriesModule,
    UsersModule,
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}