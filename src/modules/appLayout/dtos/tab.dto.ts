import { IsString, IsBoolean } from 'class-validator';

export class TabDto {
  @IsString()
  name: string;

  @IsString()
  iconName: string;

  @IsBoolean()
  visible: boolean;

  @IsBoolean()
  isHome: boolean;
}
