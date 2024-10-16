import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { CreateRepositoryDto } from './CreateRepositoryDto';

@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Post()
  async create(@Body() createRepositoryDto: CreateRepositoryDto) {
    return this.repositoriesService.create(createRepositoryDto);
  }
  @Get(':ownerId')
  async findByOwnerId(@Param('ownerId') ownerId: string) {
    return this.repositoriesService.findByOwnerId(ownerId);
  }
  @Get()
  async findAll() {
    return this.repositoriesService.findAll();
  }
 
}
