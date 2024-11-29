import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { TabDto } from './tab.dto';

export class CreateAppLayoutDto {
  @IsString()
  layoutType: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TabDto)
  bottomBarTabs: TabDto[];
}


export class UpdateAppLayoutDto {
  @IsOptional()
  @IsArray()
  bottomBarTabs?: {
    name: string;
    iconName: string;
    visible: boolean;
    isHome: boolean;
  }[];

  @IsOptional()
  @IsString()
  layoutType?: string;
}


