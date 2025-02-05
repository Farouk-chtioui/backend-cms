import { ArrayNotEmpty, IsArray, ValidateNested, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class ScreenOrderDto {
  @IsString()
  id: string;

  @IsNumber()
  order: number;  
}

export class ReorderScreensDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ScreenOrderDto)
  screens: ScreenOrderDto[];
}
