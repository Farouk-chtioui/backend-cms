import { Controller, Post, Get, Put, Body, Param } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { Repository } from './repository.schema';

@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  // Create a new repository
  @Post()
  async createRepository(@Body() body: { name: string; owner: string }): Promise<Repository> {
    const { name, owner } = body;
    return this.repositoriesService.createRepository(name, owner);
  }

  // Get a repository by ID
  @Get(':repoId')
  async getRepositoryById(@Param('repoId') repoId: string): Promise<Repository> {
    return this.repositoriesService.getRepositoryById(repoId);
  }

  // Update the repository name
  @Put(':repoId')
  async updateRepositoryName(
    @Param('repoId') repoId: string,
    @Body('name') newName: string,
  ): Promise<Repository> {
    return this.repositoriesService.updateRepositoryName(repoId, newName);
  }

  // Get default repository for a user
  @Get('default/:userId')
  async getDefaultRepository(@Param('userId') userId: string): Promise<Repository> {
    return this.repositoriesService.getDefaultRepository(userId);
  }

  // Get all repositories for a specific user
  @Get('user/:userId') // Fetch repositories based on user ID
  async getRepositoriesForUser(@Param('userId') userId: string): Promise<Repository[]> {
    return this.repositoriesService.findByUserId(userId);
  }
}
