import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';

export class CreateWidgetScreenDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  appId: string;

  @IsOptional()
  @IsObject()
  header?: Record<string, any>;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
