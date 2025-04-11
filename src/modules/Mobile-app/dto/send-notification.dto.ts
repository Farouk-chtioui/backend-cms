import { IsString, IsOptional } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
