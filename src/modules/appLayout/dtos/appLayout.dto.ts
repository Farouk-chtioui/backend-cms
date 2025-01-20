import { IsString, IsNotEmpty, IsArray, IsOptional, IsEnum, IsBoolean, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { TabDto } from './tab.dto';
import { Types } from 'mongoose';

class BottomBarTabDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  iconName: string;

  @IsBoolean()
  visible: boolean;

  @IsBoolean()
  isHome: boolean;

  @IsEnum(['outline', 'solid', 'mini'])
  iconCategory: 'outline' | 'solid' | 'mini';

  @IsEnum(['screen', 'external'])
  routeType: 'screen' | 'external';

  @IsString()
  route: string;

  @IsOptional()
  screenId?: Types.ObjectId; // Changed from string to Types.ObjectId
}

export class CreateAppLayoutDto {
  @IsMongoId()
  appId: string;

  @IsString()
  layoutType: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BottomBarTabDto)
  bottomBarTabs: BottomBarTabDto[];
}

export class UpdateAppLayoutDto {
  @IsOptional()
  @IsMongoId()
  appId?: string;

  @IsString()
  @IsOptional()
  layoutType?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BottomBarTabDto)
  @IsOptional()
  bottomBarTabs?: BottomBarTabDto[];
}

// Add a type for use in services
export type BottomBarTab = {
  name: string;
  iconName: string;
  visible: boolean;
  isHome: boolean;
  iconCategory: 'outline' | 'solid' | 'mini';
  routeType: 'screen' | 'external';
  route: string;
  screenId?: Types.ObjectId;
};
