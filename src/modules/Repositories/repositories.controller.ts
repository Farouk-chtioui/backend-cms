import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { CreateRepositoryDto } from './CreateRepositoryDto';

@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Post()
  async create(@Body() createRepositoryDto: CreateRepositoryDto) {
    return this.repositoriesService.create(createRepositoryDto);
  }

  @Get('user/:userId')
  async findByUserAccess(@Param('userId') userId: string) {
    return this.repositoriesService.findByUserAccess(userId);
  }

  @Get()
  async findAll() {
    return this.repositoriesService.findAll();
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRepositoryDto: Partial<CreateRepositoryDto>
  ) {
    return this.repositoriesService.update(id, updateRepositoryDto);
  }
}