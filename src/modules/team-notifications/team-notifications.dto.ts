// team-notifications.dto.ts
import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsMongoId, IsEnum } from 'class-validator';

export class CreateTeamNotificationDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsMongoId()
  @IsNotEmpty()
  teamId: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(['message', 'note'])
  @IsNotEmpty()
  type: 'message' | 'note';

  @IsMongoId()
  @IsOptional()
  sourceId?: string;
}