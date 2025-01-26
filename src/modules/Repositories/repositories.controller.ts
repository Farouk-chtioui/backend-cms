import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  UseGuards,
  UnauthorizedException
} from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { CreateRepositoryDto } from './CreateRepositoryDto';
import { AddTeamMemberDto, AddTeamMembersDto, RemoveTeamMemberDto } from './team.dto';
import { AdminGuard } from '../auth/admin.guard';

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

  @Post(':id/team/member')
  @UseGuards(AdminGuard)
  async addTeamMember(
    @Param('id') repositoryId: string,
    @Body() addTeamMemberDto: AddTeamMemberDto
  ) {
    return this.repositoriesService.addTeamMember(repositoryId, addTeamMemberDto.userId);
  }

  @Post(':id/team/members')
  @UseGuards(AdminGuard)
  async addTeamMembers(
    @Param('id') repositoryId: string,
    @Body() addTeamMembersDto: AddTeamMembersDto
  ) {
    return this.repositoriesService.addTeamMembers(repositoryId, addTeamMembersDto.userIds);
  }

  @Post(':id/team/member/remove')
  @UseGuards(AdminGuard)
  async removeTeamMember(
    @Param('id') repositoryId: string,
    @Body() removeTeamMemberDto: RemoveTeamMemberDto
  ) {
    return this.repositoriesService.removeTeamMember(repositoryId, removeTeamMemberDto.userId);
  }
}
