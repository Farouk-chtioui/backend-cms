import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Team } from './teams.schema';
import { UsersService } from '../users/users.service';
import { RepositoriesService } from '../repositories/repositories.service';
import { 
  CreateTeamDto,
  UpdateTeamDto,
  CreateTeamMessageDto,
  SystemMessageDto,
  CreateTeamNoteDto,
  UpdateTeamNoteDto
} from './dto/team-dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name) private teamModel: Model<Team>,
    private readonly usersService: UsersService,
    private readonly repositoriesService: RepositoriesService,
  ) {}

  // TEAM CORE FUNCTIONALITY

  async createTeam(createTeamDto: CreateTeamDto): Promise<Team> {
    const { repositoryId, ownerId, name, description, members } = createTeamDto;
    
    try {
      // Validate repository exists
      const repository = await this.repositoriesService.findById(repositoryId);
      if (!repository) {
        throw new NotFoundException('Repository not found');
      }
      
      // Special check for admins - always allow them
      const user = await this.usersService.findById(ownerId);
      if (user && user.role === 'admin') {
        console.log('Admin user creating team - bypassing access check');
        // Allow admin to proceed
      } 
      // Check if user is repository owner - should always have access
      else if (repository.ownerId.toString() === ownerId) {
        console.log('Repository owner creating team - access granted');
        // Allow repo owner to proceed
      }
      // Check if user is a team member
      else {
        const hasAccess = await this.checkRepositoryAccess(repositoryId, ownerId);
        if (!hasAccess) {
          throw new ForbiddenException('You do not have access to create teams in this repository');
        }
      }
      
      const newTeam = new this.teamModel({
        repositoryId: new Types.ObjectId(repositoryId),
        ownerId: new Types.ObjectId(ownerId),
        name,
        description: description || '',
        members: members ? members.map(id => typeof id === 'string' ? new Types.ObjectId(id) : id) : [],
        messages: [],
        notes: []
      });
      
      return await newTeam.save();
    } catch (error) {
      console.error('Error creating team:', error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new Error(`Failed to create team: ${error.message}`);
    }
  }

  async findTeamById(teamId: string): Promise<Team> {
    const team = await this.teamModel.findById(teamId).exec();
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  async getTeamsByRepository(repositoryId: string, userId: string): Promise<Team[]> {
    // Check if user has access to this repository
    const hasAccess = await this.checkRepositoryAccess(repositoryId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this repository');
    }
    
    return this.teamModel
      .find({ repositoryId: new Types.ObjectId(repositoryId) })
      .exec();
  }

  // Replace the updateTeam method in teams.service.ts with this fixed version
// This handles both ObjectIds and email strings properly

// Enhanced getTeamMessages, getTeamNotes, and updateTeam methods for teams.service.ts

async getTeamMessages(teamId: string, userId: string): Promise<any[]> {
    try {
      const team = await this.findTeamById(teamId);
      
      // Check if user has access to the team
      await this.checkTeamMembership(team, userId);
      
      console.log(`Fetching messages for team ${teamId}, messages count: ${team.messages.length}`);
      
      // Convert Mongoose/MongoDB document to plain object for each message
      const enrichedMessages = await Promise.all(
        team.messages.map(async (message, index) => {
          // Explicitly create plain JS object with all required fields
          const messageObj = {
            userId: message.userId ? message.userId.toString() : '',
            content: message.content || '',
            isSystemMessage: message.isSystemMessage || false,
            createdAt: message.createdAt ? message.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: message.updatedAt ? message.updatedAt.toISOString() : new Date().toISOString(),
            index // Add index for reference
          };
          
          if (messageObj.isSystemMessage) {
            return {
              ...messageObj,
              userName: 'System',
              userImage: null,
            };
          }
          
          try {
            const user = await this.usersService.findById(messageObj.userId);
            return {
              ...messageObj,
              userName: user?.username || user?.email || 'Unknown User',
              userImage: user?.profileImage || null,
            };
          } catch (error) {
            console.error('Error fetching user for message:', error);
            return {
              ...messageObj,
              userName: 'Unknown User',
              userImage: null,
            };
          }
        })
      );
      
      console.log(`Returning ${enrichedMessages.length} messages for team ${teamId}`);
      return enrichedMessages;
    } catch (error) {
      console.error(`Error in getTeamMessages for team ${teamId}:`, error);
      throw error;
    }
  }
  
  async getTeamNotes(teamId: string, userId: string): Promise<any[]> {
    try {
      const team = await this.findTeamById(teamId);
      
      // Check if user has access to the team
      await this.checkTeamMembership(team, userId);
      
      console.log(`Fetching notes for team ${teamId}, notes count: ${team.notes.length}`);
      
      // Convert Mongoose/MongoDB document to plain object for each note
      const enrichedNotes = await Promise.all(
        team.notes.map(async (note, index) => {
          // Explicitly create plain JS object with all required fields
          const noteObj = {
            userId: note.userId ? note.userId.toString() : '',
            title: note.title || '',
            content: note.content || '',
            color: note.color || 'bg-yellow-100 border-yellow-300',
            createdAt: note.createdAt ? note.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: note.updatedAt ? note.updatedAt.toISOString() : new Date().toISOString(),
            index, // Add index for reference
            userName: 'Unknown User',
            userImage: null
          };
          
          try {
            const user = await this.usersService.findById(noteObj.userId);
            if (user) {
              noteObj.userName = user.username || user.email || 'Unknown User';
              noteObj.userImage = user.profileImage || null;
            }
          } catch (error) {
            console.error('Error fetching user for note:', error);
            // Default values already set above
          }
          
          return noteObj;
        })
      );
      
      console.log(`Returning ${enrichedNotes.length} notes for team ${teamId}`);
      return enrichedNotes;
    } catch (error) {
      console.error(`Error in getTeamNotes for team ${teamId}:`, error);
      throw error;
    }
  }
  
  async updateTeam(teamId: string, userId: string, updateTeamDto: UpdateTeamDto): Promise<Team> {
    try {
      console.log(`Updating team ${teamId} with data:`, updateTeamDto);
      
      const team = await this.findTeamById(teamId);
      
      // Check if user is allowed to update team (owner or repository owner)
      await this.checkTeamEditPermission(team, userId);
      
      // Update team data (except members which we handle separately)
      if (updateTeamDto.name) team.name = updateTeamDto.name;
      if (updateTeamDto.description !== undefined) team.description = updateTeamDto.description;
      
      // Convert members to ObjectIds or strings as appropriate
      if (updateTeamDto.members) {
        console.log('Updating team members:', updateTeamDto.members);
        
        // Process each member - could be user ID or email
        team.members = updateTeamDto.members.map(member => {
          // Check if it's a valid MongoDB ObjectId format
          if (Types.ObjectId.isValid(member) && member.match(/^[0-9a-fA-F]{24}$/)) {
            return new Types.ObjectId(member);
          } else {
            // It's likely an email, keep it as is
            return member;
          }
        });
      }
      
      console.log(`Saving team with ${team.members.length} members`);
      const updatedTeam = await team.save();
      console.log(`Team ${teamId} updated successfully`);
      
      return updatedTeam;
    } catch (error) {
      console.error(`Error updating team ${teamId}:`, error);
      throw error;
    }
  }

  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    const team = await this.findTeamById(teamId);
    
    // Check if user is allowed to delete team (must be repository owner or team owner)
    const isTeamOwner = team.ownerId.toString() === userId;
    if (!isTeamOwner) {
      const repository = await this.repositoriesService.findById(team.repositoryId.toString());
      const isRepoOwner = repository.ownerId.toString() === userId;
      if (!isRepoOwner) {
        throw new ForbiddenException('Only repository owner or team owner can delete teams');
      }
    }
    
    const result = await this.teamModel.deleteOne({ _id: teamId }).exec();
    return result.deletedCount > 0;
  }

  // TEAM MESSAGES FUNCTIONALITY

  // TEAM MESSAGES FUNCTIONALITY

  async createMessage(createTeamMessageDto: CreateTeamMessageDto): Promise<any> {
    const { teamId, userId, content, isSystemMessage } = createTeamMessageDto;
    
    try {
      const team = await this.findTeamById(teamId);
      
      // Check if user has access to the team (if not a system message)
      if (!isSystemMessage) {
        try {
          // This will check if user is team member, team owner, repo owner or repo team member
          const hasAccess = await this.checkTeamMembership(team, userId);
          if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this team');
          }
        } catch (error) {
          // Check if user is admin - grant access if so
          const user = await this.usersService.findById(userId);
          if (!(user && user.role === 'admin')) {
            throw error; // Re-throw if not admin
          }
          console.log('Admin user bypassing team access check for messages');
        }
      }
      
      // Create a new message
      const newMessage = {
        userId: new Types.ObjectId(userId),
        content,
        isSystemMessage: isSystemMessage || false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add message to team's messages array
      team.messages.push(newMessage);
      await team.save();
      
      // Get added message (the last one in the array)
      const addedMessage = team.messages[team.messages.length - 1];
      
      // Create a response object that matches what the front-end expects
      const messageResponse = {
        userId: addedMessage.userId.toString(),
        content: addedMessage.content,
        isSystemMessage: addedMessage.isSystemMessage,
        createdAt: addedMessage.createdAt.toISOString(),
        updatedAt: addedMessage.updatedAt.toISOString(),
        index: team.messages.length - 1
      };
      
      // Enrich with user information for frontend
      let enrichedMessage: any = { ...messageResponse };
      
      if (!isSystemMessage) {
        try {
          const user = await this.usersService.findById(userId);
          enrichedMessage.userName = user?.username || user?.email || 'Unknown User';
          enrichedMessage.userImage = user?.profileImage || null;
        } catch (error) {
          enrichedMessage.userName = 'Unknown User';
          enrichedMessage.userImage = null;
        }
      } else {
        enrichedMessage.userName = 'System';
        enrichedMessage.userImage = null;
      }
      
      console.log('Returning created message:', JSON.stringify(enrichedMessage));
      return enrichedMessage;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }


  async createSystemMessage(systemMessageDto: SystemMessageDto): Promise<any> {
    const { teamId, content } = systemMessageDto;
    
    const team = await this.findTeamById(teamId);
    
    // Create a new system message
    const newMessage = {
      // Use a placeholder ID for system
      userId: new Types.ObjectId('000000000000000000000000'),
      content,
      isSystemMessage: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add message to team's messages array
    team.messages.push(newMessage);
    await team.save();
    
    // Get added message (the last one in the array)
    const addedMessage = team.messages[team.messages.length - 1];
    
    return {
      ...addedMessage,
      userName: 'System',
      userImage: null,
      index: team.messages.length - 1
    };
  }

  async deleteMessage(teamId: string, messageIndex: number, userId: string): Promise<boolean> {
    const team = await this.findTeamById(teamId);
    
    // Validate message index
    if (messageIndex < 0 || messageIndex >= team.messages.length) {
      throw new NotFoundException('Message not found');
    }
    
    const message = team.messages[messageIndex];
    
    // Check if user can delete the message (message creator, team owner, or repository owner)
    const isMessageCreator = message.userId.toString() === userId;
    const isTeamOwner = team.ownerId.toString() === userId;
    
    let isRepositoryOwner = false;
    if (!isMessageCreator && !isTeamOwner) {
      const repository = await this.repositoriesService.findById(team.repositoryId.toString());
      isRepositoryOwner = repository.ownerId.toString() === userId;
    }
    
    if (!isMessageCreator && !isTeamOwner && !isRepositoryOwner) {
      throw new ForbiddenException('You do not have permission to delete this message');
    }
    
    // Remove the message from array
    team.messages.splice(messageIndex, 1);
    await team.save();
    
    return true;
  }

  // TEAM NOTES FUNCTIONALITY

  // Replace the createNote method in teams.service.ts with this fixed version:

async createNote(createTeamNoteDto: CreateTeamNoteDto): Promise<any> {
    const { teamId, userId, title, content, color } = createTeamNoteDto;
    
    try {
      const team = await this.findTeamById(teamId);
      
      // Check if user has access to the team
      // This will check if user is team member, team owner, repo owner or repo team member
      await this.checkTeamMembership(team, userId);
      
      // Create a new note
      const newNote = {
        userId: new Types.ObjectId(userId),
        title,
        content,
        color,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add note to team's notes array
      team.notes.push(newNote);
      await team.save();
      
      // Get added note (the last one in the array)
      const addedNote = team.notes[team.notes.length - 1];
      
      // Create a response object that matches what the front-end expects
      const noteResponse = {
        userId: addedNote.userId.toString(),
        title: addedNote.title,
        content: addedNote.content,
        color: addedNote.color,
        createdAt: addedNote.createdAt.toISOString(),
        updatedAt: addedNote.updatedAt.toISOString(),
        index: team.notes.length - 1
      };
      
      // Enrich with user information for frontend
      const enrichedNote: any = {
        ...noteResponse,
        userName: 'Unknown User',
        userImage: null
      };
      
      try {
        const user = await this.usersService.findById(userId);
        enrichedNote.userName = user?.username || user?.email || 'Unknown User';
        enrichedNote.userImage = user?.profileImage || null;
      } catch (error) {
        // Default values already set above
      }
      
      console.log('Returning created note:', JSON.stringify(enrichedNote));
      return enrichedNote;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }


  async updateNote(teamId: string, noteIndex: number, userId: string, updateTeamNoteDto: UpdateTeamNoteDto): Promise<any> {
    const team = await this.findTeamById(teamId);
    
    // Validate note index
    if (noteIndex < 0 || noteIndex >= team.notes.length) {
      throw new NotFoundException('Note not found');
    }
    
    const note = team.notes[noteIndex];
    
    // Check if user can update the note (note creator, team owner, or repository owner)
    const isNoteCreator = note.userId.toString() === userId;
    const isTeamOwner = team.ownerId.toString() === userId;
    
    let isRepositoryOwner = false;
    if (!isNoteCreator && !isTeamOwner) {
      const repository = await this.repositoriesService.findById(team.repositoryId.toString());
      isRepositoryOwner = repository.ownerId.toString() === userId;
    }
    
    if (!isNoteCreator && !isTeamOwner && !isRepositoryOwner) {
      throw new ForbiddenException('You do not have permission to update this note');
    }
    
    // Update note data
    const { title, content, color } = updateTeamNoteDto;
    
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (color !== undefined) note.color = color;
    
    note.updatedAt = new Date();
    
    await team.save();
    
    // Retrieve updated note and enrich
    const updatedNote = team.notes[noteIndex];
    const enrichedNote: any = {
      ...updatedNote,
      index: noteIndex,
      userName: 'Unknown User',
      userImage: null
    };
    
    try {
      const user = await this.usersService.findById(note.userId.toString());
      enrichedNote.userName = user?.username || user?.email || 'Unknown User';
      enrichedNote.userImage = user?.profileImage || null;
    } catch (error) {
      // Default values already set above
    }
    
    return enrichedNote;
  }

  async deleteNote(teamId: string, noteIndex: number, userId: string): Promise<boolean> {
    const team = await this.findTeamById(teamId);
    
    // Validate note index
    if (noteIndex < 0 || noteIndex >= team.notes.length) {
      throw new NotFoundException('Note not found');
    }
    
    const note = team.notes[noteIndex];
    
    // Check if user can delete the note (note creator, team owner, or repository owner)
    const isNoteCreator = note.userId.toString() === userId;
    const isTeamOwner = team.ownerId.toString() === userId;
    
    let isRepositoryOwner = false;
    if (!isNoteCreator && !isTeamOwner) {
      const repository = await this.repositoriesService.findById(team.repositoryId.toString());
      isRepositoryOwner = repository.ownerId.toString() === userId;
    }
    
    if (!isNoteCreator && !isTeamOwner && !isRepositoryOwner) {
      throw new ForbiddenException('You do not have permission to delete this note');
    }
    
    // Remove the note from array
    team.notes.splice(noteIndex, 1);
    await team.save();
    
    return true;
  }

  // HELPER METHODS

  // Check if a user has access to a repository
  async checkRepositoryAccess(repositoryId: string, userId: string): Promise<boolean> {
    try {
      console.log(`Checking repository access: repositoryId=${repositoryId}, userId=${userId}`);
      
      const repository = await this.repositoriesService.findById(repositoryId);
      if (!repository) {
        console.log('Repository not found');
        throw new NotFoundException('Repository not found');
      }
  
      // Get user to check if admin
      let user;
      try {
        user = await this.usersService.findById(userId);
        if (!user) {
          console.log('User not found');
          throw new NotFoundException('User not found');
        }
        
        // Admin users always have access
        if (user.role === 'admin') {
          console.log('User is admin - access granted');
          return true;
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
  
      // Check if user is the repository owner
      console.log(`Repository owner ID: ${repository.ownerId} (${typeof repository.ownerId})`);
      console.log(`User ID: ${userId} (${typeof userId})`);
      
      // Convert both to strings for comparison
      const repoOwnerIdStr = repository.ownerId.toString();
      const userIdStr = userId.toString();
      
      if (repoOwnerIdStr === userIdStr) {
        console.log('User is repository owner - access granted');
        return true;
      }
  
      // If user info available, check team membership
      if (user) {
        // Check if user is in the repository team by email or id
        const isTeamMember = Array.isArray(repository.team) && 
                           repository.team.some(member => {
                             if (typeof member === 'string') {
                               return member === userId || member === user.email;
                             } else if (member && typeof member === 'object') {
                               return member.toString && member.toString() === userId;
                             }
                             return false;
                           });
  
        if (isTeamMember) {
          console.log('User is team member - access granted');
          return true;
        }
      }
  
      console.log('Access denied - user is not owner or team member');
      return false;
    } catch (error) {
      console.error('Error checking repository access:', error);
      return false; // Return false instead of throwing - better for API
    }
  }
  // Check if a user is a member of a team or has repository access
  async checkTeamMembership(team: Team, userId: string): Promise<boolean> {
  try {
    console.log(`Checking team membership: teamId=${team._id}, userId=${userId}`);
    
    // Get user to check if admin
    try {
      const user = await this.usersService.findById(userId);
      if (user && user.role === 'admin') {
        console.log('User is admin - team access granted');
        return true;
      }
    } catch (error) {
      console.error('Error fetching user for admin check:', error);
    }
    
    // Check if user is team owner
    if (team.ownerId && team.ownerId.toString() === userId) {
      console.log('User is team owner - access granted');
      return true;
    }
    
    // Check if user is in team members array
    if (team.members && team.members.length > 0) {
      const isMember = team.members.some(memberId => {
        if (typeof memberId === 'string') {
          return memberId === userId;
        } else if (memberId && typeof memberId === 'object') {
          return memberId.toString && memberId.toString() === userId;
        }
        return false;
      });
      
      if (isMember) {
        console.log('User is team member - access granted');
        return true;
      }
    }
    
    // Check if user is repository owner or repository team member
    try {
      const repository = await this.repositoriesService.findById(team.repositoryId.toString());
      
      // If user is repo owner, they have access
      if (repository.ownerId && repository.ownerId.toString() === userId) {
        console.log('User is repository owner - team access granted');
        return true;
      }
      
      // Get user email to check repo team membership
      const user = await this.usersService.findById(userId);
      if (!user) {
        console.log('User not found');
        return false;
      }
      
      // Check if user's email is in repository team
      if (Array.isArray(repository.team) && repository.team.length > 0) {
        const isRepoTeamMember = repository.team.some(member => {
          if (typeof member === 'string') {
            return member === userId || member === user.email;
          } else if (member && typeof member === 'object') {
            return member.toString && member.toString() === userId;
          }
          return false;
        });
        
        if (isRepoTeamMember) {
          console.log('User is repository team member - team access granted');
          return true;
        }
      }
    } catch (error) {
      console.error('Error checking repository access:', error);
    }
    
    // If we reach here, user doesn't have access
    console.log('Team access denied - user is not owner or team member');
    return false;
  } catch (error) {
    console.error('Error checking team membership:', error);
    return false;
  }
}

  // Check if user can edit team details
  async checkTeamEditPermission(team: Team, userId: string): Promise<boolean> {
    try {
      // Team owner can edit team details
      if (team.ownerId.toString() === userId) {
        return true;
      }
      
      // Check if user is repository owner
      try {
        const repository = await this.repositoriesService.findById(team.repositoryId.toString());
        if (repository && repository.ownerId.toString() === userId) {
          return true;
        }
      } catch (error) {
        console.error('Error checking repository owner:', error);
      }
      
      // If we reach here, user doesn't have edit permission
      throw new ForbiddenException('Only team owner or repository owner can edit team details');
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Error checking team edit permission:', error);
      throw new ForbiddenException('Failed to verify team edit permissions');
    }
  }
}