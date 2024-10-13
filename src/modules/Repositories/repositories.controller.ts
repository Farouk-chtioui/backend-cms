import { Controller, Post, Get, Put, Delete, Body, Param } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { Repository } from './repository.schema';
import { MobileApp } from '../mobile-app/mobile-app.schema';

@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  // Create Repository
  
  @Post()
  async createRepository(@Body() body: { name: string; owner: string }): Promise<Repository> {
    const { name, owner } = body;
    return this.repositoriesService.createRepository(name, owner);
  }

  @Get(':repoId')
  async getRepositoryById(@Param('repoId') repoId: string): Promise<Repository> {
    return this.repositoriesService.getRepositoryById(repoId);
  }
  @Post(':repoId/mobile-apps')
  async createMobileApp(@Param('repoId') repoId: string, @Body('name') appName: string): Promise<Repository> {
    return this.repositoriesService.createMobileApp(repoId, appName);
  }

  // Update Mobile App Theme and Colors
  @Put(':repoId/mobile-apps/:appId/theme')
  async updateThemeColors(
    @Param('repoId') repoId: string,
    @Param('appId') appId: string,
    @Body() themeData: any,
  ): Promise<Repository> {
    return this.repositoriesService.updateThemeColors(repoId, appId, themeData);
  }

  // Get All Mobile Apps in a Repository
  @Get(':repoId/mobile-apps')
  async getAllMobileApps(@Param('repoId') repoId: string): Promise<MobileApp[]> {
    return this.repositoriesService.getAllMobileApps(repoId);
  }

  // Get a Single Mobile App
  @Get(':repoId/mobile-apps/:appId')
  async getMobileAppById(
    @Param('repoId') repoId: string,
    @Param('appId') appId: string,
  ): Promise<MobileApp> {
    return this.repositoriesService.getMobileAppById(repoId, appId);
  }

  // Delete a Mobile App
  @Delete(':repoId/mobile-apps/:appId')
  async deleteMobileApp(@Param('repoId') repoId: string, @Param('appId') appId: string): Promise<Repository> {
    return this.repositoriesService.deleteMobileApp(repoId, appId);
  }
  @Get('default/:userId')
  async getDefaultRepository(@Param('userId') userId: string) {
    // Fetch the default repository based on the user ID
    return this.repositoriesService.getDefaultRepository(userId);
  }
}
