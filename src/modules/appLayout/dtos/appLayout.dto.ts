import { IsArray, ValidateNested, IsString } from 'class-validator';
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TabDto)
  bottomBarTabs: TabDto[];
}
