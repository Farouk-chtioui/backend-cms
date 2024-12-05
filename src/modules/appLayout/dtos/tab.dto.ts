import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';

export class TabDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  iconName?: string;

  @IsBoolean()
  @IsOptional()
  visible?: boolean;

  @IsBoolean()
  @IsOptional()
  isHome?: boolean;

  @IsString()
  @IsEnum(['outline', 'solid', 'mini'])
  @IsOptional()
  iconCategory?: 'outline' | 'solid' | 'mini';
  
}
