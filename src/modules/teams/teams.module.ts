// teams.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Team, TeamSchema } from './teams.schema';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { RepositoriesModule } from '../repositories/repositories.module';
import { UsersModule } from '../users/users.module';
import { TeamNotificationsModule } from '../team-notifications/team-notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Team.name, schema: TeamSchema },
    ]),
    RepositoriesModule,
    UsersModule,
    // Use forwardRef to break circular dependency
    forwardRef(() => TeamNotificationsModule),
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}