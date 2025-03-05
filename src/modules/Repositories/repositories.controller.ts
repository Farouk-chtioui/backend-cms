import { Controller, Get, Post, Put, Body, Param, Delete, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.repositoriesService.delete(id);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file', {
    storage: undefined
  }))
  async updateRepositoryImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const repository = await this.repositoriesService.updateRepositoryImage(id, file, 'image');
    return { url: repository.image };
  }

  @Post(':id/cover-image')
  @UseInterceptors(FileInterceptor('file', {
    storage: undefined
  }))
  async updateRepositoryCoverImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const repository = await this.repositoriesService.updateRepositoryImage(id, file, 'coverImage');
    return { url: repository.coverImage };
  }
}