import { 
    Controller, 
    Get, 
    Post, 
    Put, 
    Delete, 
    Body, 
    Param, 
    Query, 
    HttpException, 
    HttpStatus
  } from '@nestjs/common';
  import { TeamsService } from './teams.service';
  import { 
    CreateTeamDto, 
    UpdateTeamDto,
    CreateTeamMessageDto, 
    SystemMessageDto,
    CreateTeamNoteDto, 
    UpdateTeamNoteDto
  } from './dto/team-dto';
  
  @Controller('teams')
  export class TeamsController {
    constructor(private readonly teamsService: TeamsService) {}
  
    // TEAM ENDPOINTS
  
    @Post()
async createTeam(@Body() createTeamDto: CreateTeamDto) {
  try {
    console.log('Create team request:', createTeamDto);
    
    // Validate the required fields
    if (!createTeamDto.repositoryId || !createTeamDto.ownerId || !createTeamDto.name) {
      throw new HttpException(
        'Missing required fields: repositoryId, ownerId, or name',
        HttpStatus.BAD_REQUEST
      );
    }
    
    const team = await this.teamsService.createTeam(createTeamDto);
    console.log('Team created successfully:', team._id);
    return team;
  } catch (error) {
    console.error('Error in createTeam controller:', error);
    throw new HttpException(
      error.message || 'Failed to create team',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
  
    @Get('repository/:repositoryId')
    async getTeamsByRepository(
      @Param('repositoryId') repositoryId: string,
      @Query('userId') userId: string
    ) {
      try {
        if (!userId) {
          throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
        }
        return await this.teamsService.getTeamsByRepository(repositoryId, userId);
      } catch (error) {
        throw new HttpException(
          error.message || 'Failed to fetch teams',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  
    @Get(':id')
    async getTeamById(
      @Param('id') id: string,
      @Query('userId') userId: string
    ) {
      try {
        if (!userId) {
          throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
        }
        const team = await this.teamsService.findTeamById(id);
        // Verify user has access to this team
        await this.teamsService.checkTeamMembership(team, userId);
        return team;
      } catch (error) {
        throw new HttpException(
          error.message || 'Failed to fetch team',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  
    @Put(':id')
    async updateTeam(
      @Param('id') id: string,
      @Query('userId') userId: string,
      @Body() updateTeamDto: UpdateTeamDto
    ) {
      try {
        if (!userId) {
          throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
        }
        return await this.teamsService.updateTeam(id, userId, updateTeamDto);
      } catch (error) {
        throw new HttpException(
          error.message || 'Failed to update team',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  
    @Delete(':id')
    async deleteTeam(
      @Param('id') id: string,
      @Query('userId') userId: string
    ) {
      try {
        if (!userId) {
          throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
        }
        const result = await this.teamsService.deleteTeam(id, userId);
        return { success: result };
      } catch (error) {
        throw new HttpException(
          error.message || 'Failed to delete team',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  
    // MESSAGES ENDPOINTS
  
    @Post(':teamId/messages')
    async createMessage(
      @Param('teamId') teamId: string,
      @Body() messageData: Omit<CreateTeamMessageDto, 'teamId'>
    ) {
      try {
        const createTeamMessageDto: CreateTeamMessageDto = {
          ...messageData,
          teamId
        };
        return await this.teamsService.createMessage(createTeamMessageDto);
      } catch (error) {
        throw new HttpException(
          error.message || 'Failed to create message',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  
    @Get(':teamId/messages')
    async getTeamMessages(
      @Param('teamId') teamId: string,
      @Query('userId') userId: string
    ) {
      try {
        if (!userId) {
          throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
        }
        return await this.teamsService.getTeamMessages(teamId, userId);
      } catch (error) {
        throw new HttpException(
          error.message || 'Failed to fetch messages',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  
    @Post(':teamId/messages/system')
    async createSystemMessage(
      @Param('teamId') teamId: string,
      @Body() body: { content: string }
    ) {
      try {
        const systemMessageDto: SystemMessageDto = {
          teamId,
          content: body.content
        };
        return await this.teamsService.createSystemMessage(systemMessageDto);
      } catch (error) {
        throw new HttpException(
          error.message || 'Failed to create system message',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  
    @Delete(':teamId/messages/:messageIndex')
    async deleteMessage(
      @Param('teamId') teamId: string,
      @Param('messageIndex') messageIndex: string,
      @Query('userId') userId: string
    ) {
      try {
        if (!userId) {
          throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
        }
        const index = parseInt(messageIndex, 10);
        if (isNaN(index)) {
          throw new HttpException('Invalid message index', HttpStatus.BAD_REQUEST);
        }
        
        const result = await this.teamsService.deleteMessage(teamId, index, userId);
        return { success: result };
      } catch (error) {
        throw new HttpException(
          error.message || 'Failed to delete message',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  
    // NOTES ENDPOINTS
  
    @Post(':teamId/notes')
    async createNote(
      @Param('teamId') teamId: string,
      @Body() noteData: Omit<CreateTeamNoteDto, 'teamId'>
    ) {
      try {
        const createTeamNoteDto: CreateTeamNoteDto = {
          ...noteData,
          teamId
        };
        return await this.teamsService.createNote(createTeamNoteDto);
      } catch (error) {
        throw new HttpException(
          error.message || 'Failed to create note',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  
    @Get(':teamId/notes')
    async getTeamNotes(
      @Param('teamId') teamId: string,
      @Query('userId') userId: string
    ) {
      try {
        if (!userId) {
          throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
        }
        return await this.teamsService.getTeamNotes(teamId, userId);
      } catch (error) {
        throw new HttpException(
          error.message || 'Failed to fetch notes',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  
    @Put(':teamId/notes/:noteIndex')
    async updateNote(
      @Param('teamId') teamId: string,
      @Param('noteIndex') noteIndex: string,
      @Query('userId') userId: string,
      @Body() updateData: Omit<UpdateTeamNoteDto, 'teamId' | 'noteIndex'>
    ) {
      try {
        if (!userId) {
          throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
        }
        
        const index = parseInt(noteIndex, 10);
        if (isNaN(index)) {
          throw new HttpException('Invalid note index', HttpStatus.BAD_REQUEST);
        }
        
        return await this.teamsService.updateNote(teamId, index, userId, updateData);
      } catch (error) {
        throw new HttpException(
          error.message || 'Failed to update note',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  
    @Delete(':teamId/notes/:noteIndex')
    async deleteNote(
      @Param('teamId') teamId: string,
      @Param('noteIndex') noteIndex: string,
      @Query('userId') userId: string
    ) {
      try {
        if (!userId) {
          throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
        }
        
        const index = parseInt(noteIndex, 10);
        if (isNaN(index)) {
          throw new HttpException('Invalid note index', HttpStatus.BAD_REQUEST);
        }
        
        const result = await this.teamsService.deleteNote(teamId, index, userId);
        return { success: result };
      } catch (error) {
        throw new HttpException(
          error.message || 'Failed to delete note',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }