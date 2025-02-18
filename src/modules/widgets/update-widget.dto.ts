import { PartialType } from '@nestjs/mapped-types';
import { CreateWidgetDto } from './create-widget.dto';
import { IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// src/widgets/dto/update-widget.dto.ts
export class UpdateWidgetPositionDto {
    @IsOptional()
    @IsNumber()
    x?: number;
  
    @IsOptional()
    @IsNumber()
    y?: number;
  
    @IsOptional()
    @IsNumber()
    width?: number;
  
    @IsOptional()
    @IsNumber()
    height?: number;
  
    @IsOptional()
    @IsNumber()
    order?: number;
  }
  
  export class UpdateWidgetDto extends PartialType(CreateWidgetDto) {
    @IsOptional()
    @ValidateNested()
    @Type(() => UpdateWidgetPositionDto)
    position?: UpdateWidgetPositionDto;
  }