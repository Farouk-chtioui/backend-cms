import { IsString, IsNotEmpty, IsArray, ArrayNotEmpty } from 'class-validator';

export class AddTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class AddTeamMembersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userIds: string[];
}

export class RemoveTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}