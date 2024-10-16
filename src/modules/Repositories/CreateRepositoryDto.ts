import { IsNotEmpty } from 'class-validator';

export class CreateRepositoryDto {
  @IsNotEmpty() // Ensures that repositoryName cannot be empty or null
  readonly repositoryName: string;

  readonly ownerId: string;
}
