import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';
import { Schema as MongooseSchema } from 'mongoose';

export class CreateWidgetDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsNotEmpty()
  @IsObject()
  content: Record<string, any>;

  @IsOptional()
  @IsObject()
  style?: Record<string, any>;

  @IsNotEmpty()
  screenId: MongooseSchema.Types.ObjectId;
}
