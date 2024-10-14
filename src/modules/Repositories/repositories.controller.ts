import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { RepositoryService } from './repositories.service';

@Controller('repositories')
export class RepositoryController {
  constructor(private readonly repositoryService: RepositoryService) {}

  @Post()
  async createRepository(@Body() repoData: any): Promise<any> {
    console.log('Received repoData:', repoData);  // Log the request body to check if owner is included
    const owner = repoData.owner;  // Ensure owner is received in repoData
    return this.repositoryService.createRepository(repoData, owner);
  }
  
  
  

  @Get()
async getRepositoriesByUserId(@Query('userId') userId: string): Promise<any> {
  return this.repositoryService.getRepositoriesByUserId(userId);
}

}
