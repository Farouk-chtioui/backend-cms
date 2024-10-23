import { IsString, IsBoolean } from 'class-validator';

export class CreateTabDto {
  @IsString()
  readonly name: string;

  @IsString()
  readonly icon: string;

  @IsBoolean()
  readonly visible: boolean;

  @IsBoolean()
  readonly isHome: boolean;
}