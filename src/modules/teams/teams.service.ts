// teams.service.ts
import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
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
import { TeamNotificationsService } from '../team-notifications/team-notifications.service';
import { TeamNotificationsGateway } from '../team-notifications/team-notifications.gateway';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name) private teamModel: Model<Team>,
    private readonly usersService: UsersService,
    private readonly repositoriesService: RepositoriesService,
    @Inject(forwardRef(() => TeamNotificationsService))
    private readonly teamNotificationsService: TeamNotificationsService,
    @Inject(forwardRef(() => TeamNotificationsGateway))
    private readonly teamNotificationsGateway: TeamNotificationsGateway,
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
      
      const savedTeam = await newTeam.save();
      
      // Update team membership in socket gateway for all members
      if (members && members.length > 0) {
        for (const memberId of members) {
          let memberIdStr: string;
          if (typeof memberId === 'string') {
            memberIdStr = memberId;
          } else if (memberId && typeof memberId === 'object' && 'toString' in memberId) {
            memberIdStr = (memberId as Types.ObjectId).toString();
          } else {
            console.error('Invalid member ID format:', memberId);
            continue; // Skip this invalid member
          }
          
          // Update socket gateway team membership
          await this.teamNotificationsGateway.refreshUserTeamMemberships(memberIdStr);
          
          // Sync the user's repositories to include the team's repository
          try {
            await this.usersService.syncUserRepositories(memberIdStr);
          } catch (error) {
            console.error(`Failed to sync repositories for user ${memberIdStr}:`, error);
          }
        }

        // Send notifications to members that they've been added to the team
        await this.sendTeamAdditionNotifications(savedTeam, members, ownerId);
      }
      
      // Also refresh for the owner
      await this.teamNotificationsGateway.refreshUserTeamMemberships(ownerId);
      
      return savedTeam;
    } catch (error) {
      console.error('Error creating team:', error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new Error(`Failed to create team: ${error.message}`);
    }
  }
  
  async getTeamsForUser(userId: string): Promise<Team[]> {
    try {
      console.log(`Fetching all teams for user: ${userId}`);
      
      // Convert userId to ObjectId if it's a valid format
      let userIdCondition: { $in: any[] };
      
      if (Types.ObjectId.isValid(userId)) {
        const userIdObj = new Types.ObjectId(userId);
        userIdCondition = { $in: [userId, userIdObj] };
      } else {
        userIdCondition = { $in: [userId] };
      }
      
      // Get teams where user is either the owner or a member
      const teams = await this.teamModel.find({
        $or: [
          { ownerId: userIdCondition.$in },
          { members: userIdCondition.$in }
        ]
      }).exec();
      
      console.log(`Found ${teams.length} teams where user ${userId} is an owner or member`);
      
      // Also get repositories where user is a member
      try {
        // Get the user to check for email
        const user = await this.usersService.findById(userId);
        if (!user) {
          console.log(`User ${userId} not found`);
          return teams;
        }

        // Find all repositories the user has access to
        const repos = await this.repositoriesService.findByUserAccess(userId);
        if (repos && repos.length > 0) {
          console.log(`Found ${repos.length} repositories for user ${userId}`);
          
          // Get teams from these repositories
          const repoIds = repos.map(repo => repo._id);
          const repoTeams = await this.teamModel.find({
            repositoryId: { $in: repoIds }
          }).exec();
          
          console.log(`Found ${repoTeams.length} teams from user's repositories`);
          
          // Combine teams, avoiding duplicates by checking IDs
          const allTeamIds = new Set(teams.map(team => team._id.toString()));
          repoTeams.forEach(team => {
            if (!allTeamIds.has(team._id.toString())) {
              teams.push(team);
              allTeamIds.add(team._id.toString());
            }
          });
          
          console.log(`Total teams after merging repo teams: ${teams.length}`);
        }
      } catch (error) {
        console.error(`Error fetching repositories for user ${userId}:`, error);
      }
      
      return teams;
    } catch (error) {
      console.error(`Error getting teams for user ${userId}:`, error);
      return [];
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
    const hasAccess = await this.checkRepositoryAccess(repositoryId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this repository');
    }
    
    return this.teamModel
      .find({ repositoryId: new Types.ObjectId(repositoryId) })
      .exec();
  }

  async getTeamMessages(teamId: string, userId: string): Promise<any[]> {
    try {
      const team = await this.findTeamById(teamId);
      await this.checkTeamMembership(team, userId);
      
      const enrichedMessages = await Promise.all(
        team.messages.map(async (message, index) => {
          const messageObj = {
            userId: message.userId ? message.userId.toString() : '',
            content: message.content || '',
            isSystemMessage: message.isSystemMessage || false,
            createdAt: message.createdAt ? message.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: message.updatedAt ? message.updatedAt.toISOString() : new Date().toISOString(),
            index
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
            return {
              ...messageObj,
              userName: 'Unknown User',
              userImage: null,
            };
          }
        })
      );
      
      return enrichedMessages;
    } catch (error) {
      throw error;
    }
  }

  async getTeamNotes(teamId: string, userId: string): Promise<any[]> {
    try {
      const team = await this.findTeamById(teamId);
      await this.checkTeamMembership(team, userId);
      
      const enrichedNotes = await Promise.all(
        team.notes.map(async (note, index) => {
          const noteObj = {
            userId: note.userId ? note.userId.toString() : '',
            title: note.title || '',
            content: note.content || '',
            color: note.color || 'bg-yellow-100 border-yellow-300',
            createdAt: note.createdAt ? note.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: note.updatedAt ? note.updatedAt.toISOString() : new Date().toISOString(),
            index,
            userName: 'Unknown User',
            userImage: null
          };
          
          try {
            const user = await this.usersService.findById(noteObj.userId);
            if (user) {
              noteObj.userName = user.username || user.email || 'Unknown User';
              noteObj.userImage = user.profileImage || null;
            }
          } catch (error) {}
          
          return noteObj;
        })
      );
      
      return enrichedNotes;
    } catch (error) {
      throw error;
    }
  }

  async updateTeam(teamId: string, userId: string, updateTeamDto: UpdateTeamDto): Promise<Team> {
    try {
      const team = await this.findTeamById(teamId);
      await this.checkTeamEditPermission(team, userId);
      
      const originalMembers = team.members ? team.members.map(m => m.toString()) : [];
      
      if (updateTeamDto.name) team.name = updateTeamDto.name;
      if (updateTeamDto.description !== undefined) team.description = updateTeamDto.description;
      
      const addedMembers = new Set<string>();
      const removedMembers = new Set<string>(originalMembers);
      
      if (updateTeamDto.members !== undefined) {
        // Fix: Create properly transformed member array and track changes
        const newMembers = updateTeamDto.members.map(member => {
          let memberIdStr = '';
          
          if (Types.ObjectId.isValid(member) && member.match(/^[0-9a-fA-F]{24}$/)) {
            memberIdStr = member;
            return new Types.ObjectId(member);
          } else {
            memberIdStr = member;
            return member;
          }
        });
        
        // Track newly added members
        updateTeamDto.members.forEach(member => {
          const memberIdStr = typeof member === 'string' ? member : (member as Types.ObjectId).toString();
          if (!originalMembers.includes(memberIdStr)) {
            addedMembers.add(memberIdStr);
          }
          removedMembers.delete(memberIdStr);
        });
        
        // Assign the properly transformed members array
        team.members = newMembers;
      }
      
      const updatedTeam = await team.save();
      
      if (addedMembers.size > 0) {
        // Send notifications to newly added members
        const newMembersArray = Array.from(addedMembers);
        await this.sendTeamAdditionNotifications(updatedTeam, newMembersArray, userId);
        
        for (const memberId of addedMembers) {
          await this.teamNotificationsGateway.refreshUserTeamMemberships(memberId);
          
          // Sync repositories for newly added members
          try {
            await this.usersService.syncUserRepositories(memberId);
          } catch (error) {
            console.error(`Failed to sync repositories for user ${memberId}:`, error);
          }
        }
      }
      
      if (removedMembers.size > 0) {
        for (const memberId of removedMembers) {
          await this.teamNotificationsGateway.refreshUserTeamMemberships(memberId);
        }
      }
      
      return updatedTeam;
    } catch (error) {
      throw error;
    }
  }

  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    const team = await this.findTeamById(teamId);
    
    const isTeamOwner = team.ownerId.toString() === userId;
    if (!isTeamOwner) {
      const repository = await this.repositoriesService.findById(team.repositoryId.toString());
      const isRepoOwner = repository.ownerId.toString() === userId;
      if (!isRepoOwner) {
        throw new ForbiddenException('Only repository owner or team owner can delete teams');
      }
    }
    
    const allMembers = await this.getTeamMemberIds(team);
    
    try {
      await this.teamNotificationsService.deleteAllForTeam(teamId);
    } catch (error) {}
    
    const result = await this.teamModel.deleteOne({ _id: teamId }).exec();
    
    for (const memberId of allMembers) {
      try {
        await this.teamNotificationsGateway.refreshUserTeamMemberships(memberId);
      } catch (error) {}
    }
    
    return result.deletedCount > 0;
  }

  // TEAM MESSAGES FUNCTIONALITY

  async createMessage(createTeamMessageDto: CreateTeamMessageDto): Promise<any> {
    const { teamId, userId, content, isSystemMessage } = createTeamMessageDto;
    
    try {
      const team = await this.findTeamById(teamId);
      
      if (!isSystemMessage) {
        try {
          const hasAccess = await this.checkTeamMembership(team, userId);
          if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this team');
          }
        } catch (error) {
          const user = await this.usersService.findById(userId);
          if (!(user && user.role === 'admin')) {
            throw error;
          }
        }
      }
      
      const newMessage = {
        userId: new Types.ObjectId(userId),
        content,
        isSystemMessage: isSystemMessage || false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      team.messages.push(newMessage);
      await team.save();
      
      const addedMessage = team.messages[team.messages.length - 1];
      
      const messageResponse = {
        userId: addedMessage.userId.toString(),
        content: addedMessage.content,
        isSystemMessage: addedMessage.isSystemMessage,
        createdAt: addedMessage.createdAt.toISOString(),
        updatedAt: addedMessage.updatedAt.toISOString(),
        index: team.messages.length - 1
      };
      
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
      
      if (!isSystemMessage) {
        await this.notifyTeamMembers(
          team,
          userId,
          `New message from ${enrichedMessage.userName}`,
          'message',
          team._id.toString()
        );
      }
      
      return enrichedMessage;
    } catch (error) {
      throw error;
    }
  }

  async createSystemMessage(systemMessageDto: SystemMessageDto): Promise<any> {
    const { teamId, content } = systemMessageDto;
    
    const team = await this.findTeamById(teamId);
    
    const newMessage = {
      userId: new Types.ObjectId('000000000000000000000000'),
      content,
      isSystemMessage: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    team.messages.push(newMessage);
    await team.save();
    
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
    
    if (messageIndex < 0 || messageIndex >= team.messages.length) {
      throw new NotFoundException('Message not found');
    }
    
    const message = team.messages[messageIndex];
    
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
    
    team.messages.splice(messageIndex, 1);
    await team.save();
    
    return true;
  }

  // TEAM NOTES FUNCTIONALITY

  async createNote(createTeamNoteDto: CreateTeamNoteDto): Promise<any> {
    const { teamId, userId, title, content, color } = createTeamNoteDto;
    
    try {
      const team = await this.findTeamById(teamId);
      await this.checkTeamMembership(team, userId);
      
      const newNote = {
        userId: new Types.ObjectId(userId),
        title,
        content,
        color,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      team.notes.push(newNote);
      await team.save();
      
      const addedNote = team.notes[team.notes.length - 1];
      
      const noteResponse = {
        userId: addedNote.userId.toString(),
        title: addedNote.title,
        content: addedNote.content,
        color: addedNote.color,
        createdAt: addedNote.createdAt.toISOString(),
        updatedAt: addedNote.updatedAt.toISOString(),
        index: team.notes.length - 1
      };
      
      const enrichedNote: any = {
        ...noteResponse,
        userName: 'Unknown User',
        userImage: null
      };
      
      try {
        const user = await this.usersService.findById(userId);
        enrichedNote.userName = user?.username || user?.email || 'Unknown User';
        enrichedNote.userImage = user?.profileImage || null;
      } catch (error) {}
      
      await this.notifyTeamMembers(
        team,
        userId,
        `New note "${enrichedNote.title}" from ${enrichedNote.userName}`,
        'note',
        team._id.toString()
      );
      
      return enrichedNote;
    } catch (error) {
      throw error;
    }
  }

  async updateNote(teamId: string, noteIndex: number, userId: string, updateTeamNoteDto: UpdateTeamNoteDto): Promise<any> {
    const team = await this.findTeamById(teamId);
    
    if (noteIndex < 0 || noteIndex >= team.notes.length) {
      throw new NotFoundException('Note not found');
    }
    
    const note = team.notes[noteIndex];
    
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
    
    const { title, content, color } = updateTeamNoteDto;
    
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (color !== undefined) note.color = color;
    
    note.updatedAt = new Date();
    
    await team.save();
    
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
    } catch (error) {}
    
    return enrichedNote;
  }

  async deleteNote(teamId: string, noteIndex: number, userId: string): Promise<boolean> {
    const team = await this.findTeamById(teamId);
    
    if (noteIndex < 0 || noteIndex >= team.notes.length) {
      throw new NotFoundException('Note not found');
    }
    
    const note = team.notes[noteIndex];
    
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
    
    team.notes.splice(noteIndex, 1);
    await team.save();
    
    return true;
  }

  // HELPER METHODS FOR NOTIFICATIONS

  private async notifyTeamMembers(
    team: Team,
    senderId: string,
    message: string,
    type: 'message' | 'note',
    sourceId: string
  ): Promise<void> {
    try {
      const memberIds = new Set<string>();
      let isAdmin = false;
      
      // Check if sender is admin
      try {
        const user = await this.usersService.findById(senderId);
        isAdmin = user && user.role === 'admin';
      } catch (error) {}
      
      if (team.ownerId && team.ownerId.toString() !== senderId) {
        memberIds.add(team.ownerId.toString());
      }
      
      if (team.members && team.members.length > 0) {
        team.members.forEach(memberId => {
          if (typeof memberId === 'string') {
            if (memberId.includes('@')) {
              try {
                this.usersService.findOneByEmail(memberId)
                  .then(user => {
                    if (user && user._id.toString() !== senderId) {
                      memberIds.add(user._id.toString());
                    }
                  })
                  .catch(err => console.error(`Error finding user by email: ${memberId}`, err));
              } catch (error) {}
            } else if (memberId !== senderId) {
              memberIds.add(memberId);
            }
          } else if (memberId && typeof memberId === 'object') {
            const memberIdStr = memberId.toString();
            if (memberIdStr !== senderId) {
              memberIds.add(memberIdStr);
            }
          }
        });
      }
      
      try {
        const repository = await this.repositoriesService.findById(team.repositoryId.toString());
        if (repository && repository.team && repository.team.length > 0) {
          const repoMembers = await this.getRepositoryMemberIds(repository);
          repoMembers.forEach(memberId => {
            if (memberId !== senderId) {
              memberIds.add(memberId);
            }
          });
        }
      } catch (error) {}
      
      const notifications = [];
      for (const memberId of memberIds) {
        try {
          const notification = await this.teamNotificationsService.createNotification({
            userId: memberId,
            teamId: team._id.toString(),
            message,
            type,
            sourceId,
            teamName: team.name,
            isAdmin: isAdmin, 
            senderId: senderId // Pass the sender ID to prevent self-notifications
          });
          notifications.push(notification);
        } catch (error) {}
      }
    } catch (error) {}
  }

  private async getRepositoryMemberIds(repository: any): Promise<string[]> {
    const memberIds: string[] = [];
    
    if (!repository.team || !Array.isArray(repository.team)) {
      return memberIds;
    }
    
    for (const member of repository.team) {
      if (typeof member === 'string') {
        if (Types.ObjectId.isValid(member)) {
          memberIds.push(member);
        } else if (member.includes('@')) {
          try {
            const user = await this.usersService.findOneByEmail(member);
            if (user) {
              memberIds.push(user._id.toString());
            }
          } catch (error) {}
        }
      } else if (member && typeof member === 'object') {
        memberIds.push(member.toString());
      }
    }
    
    return memberIds;
  }

  async getTeamMemberIds(team: Team): Promise<string[]> {
    const memberIds: Set<string> = new Set();
    
    if (team.ownerId) {
      memberIds.add(team.ownerId.toString());
    }
    
    if (team.members && team.members.length > 0) {
      for (const memberId of team.members) {
        if (typeof memberId === 'string') {
          if (memberId.includes('@')) {
            try {
              const user = await this.usersService.findOneByEmail(memberId);
              if (user) {
                memberIds.add(user._id.toString());
              }
            } catch (error) {}
          } else {
            memberIds.add(memberId);
          }
        } else if (memberId && typeof memberId === 'object') {
          memberIds.add(memberId.toString());
        }
      }
    }
    
    try {
      const repository = await this.repositoriesService.findById(team.repositoryId.toString());
      if (repository && repository.team && repository.team.length > 0) {
        const repoMembers = await this.getRepositoryMemberIds(repository);
        repoMembers.forEach(id => memberIds.add(id));
      }
    } catch (error) {}
    
    return Array.from(memberIds);
  }

  async checkRepositoryAccess(repositoryId: string, userId: string): Promise<boolean> {
    try {
      const repository = await this.repositoriesService.findById(repositoryId);
      if (!repository) {
        throw new NotFoundException('Repository not found');
      }

      let user;
      try {
        user = await this.usersService.findById(userId);
        if (!user) {
          throw new NotFoundException('User not found');
        }
        
        if (user.role === 'admin') {
          return true;
        }
      } catch (error) {}

      const repoOwnerIdStr = repository.ownerId.toString();
      const userIdStr = userId.toString();
      
      // Repository owner always has access
      if (repoOwnerIdStr === userIdStr) {
        return true;
      }

      // Check if user is directly in the repository team
      if (repository.team && Array.isArray(repository.team)) {
        for (const member of repository.team) {
          if (typeof member === 'string') {
            // Check against user ID or email
            if (member === userIdStr || (user && member === user.email)) {
              return true;
            }
          } else if (member && typeof member === 'object' && member.toString) {
            if (member.toString() === userIdStr) {
              return true;
            }
          }
        }
      }
      
      // Check if user is a member of any team associated with this repository
      if (user) {
        const teamsForUser = await this.getTeamsForUser(userIdStr);
        for (const team of teamsForUser) {
          if (team.repositoryId.toString() === repositoryId) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking repository access:', error);
      return false;
    }
  }

  async checkTeamMembership(team: Team, userId: string): Promise<boolean> {
    try {
      try {
        const user = await this.usersService.findById(userId);
        if (user && user.role === 'admin') {
          return true;
        }
      } catch (error) {}
      
      if (team.ownerId && team.ownerId.toString() === userId) {
        return true;
      }
      
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
          return true;
        }
      }
      
      if (team.members && team.members.length > 0) {
        for (const memberId of team.members) {
          if (typeof memberId === 'string' && memberId === userId) {
            return true;
          } else if (typeof memberId === 'object' && memberId && memberId.toString() === userId) {
            return true;
          }
        }
      }
      
      try {
        const repository = await this.repositoriesService.findById(team.repositoryId.toString());
        
        if (repository.ownerId && repository.ownerId.toString() === userId) {
          return true;
        }
        
        const user = await this.usersService.findById(userId);
        if (!user) {
          return false;
        }
        
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
            await this.teamNotificationsGateway.refreshUserTeamMemberships(userId);
            return true;
          }
        }
      } catch (error) {}
      
      return false;
    } catch (error) {
      return false;
    }
  }

  async checkTeamEditPermission(team: Team, userId: string): Promise<boolean> {
    try {
      if (team.ownerId.toString() === userId) {
        return true;
      }
      
      try {
        const repository = await this.repositoriesService.findById(team.repositoryId.toString());
        if (repository && repository.ownerId.toString() === userId) {
          return true;
        }
      } catch (error) {}
      
      throw new ForbiddenException('Only team owner or repository owner can edit team details');
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Failed to verify team edit permissions');
    }
  }

  // Helper method to send notifications to users when they are added to a team
  private async sendTeamAdditionNotifications(
    team: Team,
    members: Array<string | Types.ObjectId>,
    addedByUserId: string
  ): Promise<void> {
    try {
      const addedBy = await this.usersService.findById(addedByUserId);
      const addedByName = addedBy ? addedBy.username || addedBy.email || 'A team admin' : 'A team admin';
      
      // Get the repository for this team to ensure it's shared with all members
      const repository = await this.repositoriesService.findById(team.repositoryId.toString());
      
      // Do an explicit repository team sync to ensure members have access to the repository
      try {
        const memberStrings = members.map(m => typeof m === 'object' ? m.toString() : m);
        await this.repositoriesService.syncTeamMembersWithRepository(
          team.repositoryId.toString(),
          memberStrings
        );
      } catch (error) {
        console.error(`Error syncing team members with repository during notification: ${error.message}`);
      }
      
      for (const memberId of members) {
        let memberIdStr: string;
        
        if (typeof memberId === 'string') {
          // For strings, check if it's an email or an ID
          if (memberId.includes('@')) {
            try {
              const user = await this.usersService.findOneByEmail(memberId);
              if (!user) continue;
              memberIdStr = user._id.toString();
              
              // Sync repositories for the user - IMPORTANT, this helps persistence
              await this.usersService.syncUserRepositories(memberIdStr);
              
              // Also explicitly add the repository to the user
              try {
                await this.usersService.addRepositoryToUser(memberIdStr, team.repositoryId.toString());
              } catch (error) {
                // Might fail if repository is already added, which is fine
                console.log(`Repository might already be added to user: ${error.message}`);
              }
            } catch (e) {
              continue; // Skip if user not found by email
            }
          } else {
            memberIdStr = memberId;
            
            // Sync repositories for the user
            try {
              await this.usersService.syncUserRepositories(memberIdStr);
              
              // Also explicitly add the repository to the user
              try {
                await this.usersService.addRepositoryToUser(memberIdStr, team.repositoryId.toString());
              } catch (error) {
                // Might fail if repository is already added, which is fine
                console.log(`Repository might already be added to user: ${error.message}`);
              }
            } catch (error) {
              console.error(`Failed to sync repositories for user ${memberIdStr}:`, error);
            }
          }
        } else if (memberId && typeof memberId === 'object' && 'toString' in memberId) {
          memberIdStr = (memberId as Types.ObjectId).toString();
          
          // Sync repositories for the user
          try {
            await this.usersService.syncUserRepositories(memberIdStr);
            
            // Also explicitly add the repository to the user
            try {
              await this.usersService.addRepositoryToUser(memberIdStr, team.repositoryId.toString());
            } catch (error) {
              // Might fail if repository is already added, which is fine
              console.log(`Repository might already be added to user: ${error.message}`);
            }
          } catch (error) {
            console.error(`Failed to sync repositories for user ${memberIdStr}:`, error);
          }
        } else {
          console.error('Invalid member ID format:', memberId);
          continue; // Skip this invalid member
        }
        
        // Don't notify the user who is adding members
        if (memberIdStr === addedByUserId) continue;
        
        // Send notification
        await this.teamNotificationsService.createNotification({
          userId: memberIdStr,
          teamId: team._id.toString(),
          message: `You have been added to team "${team.name}" by ${addedByName}`,
          type: 'message',
          sourceId: team._id.toString(),
          teamName: team.name,
          isAdmin: false,
          senderId: addedByUserId
        });
      }
      
      // Extra step: Force a refresh of repositories for all team members
      setTimeout(async () => {
        try {
          for (const memberId of members) {
            let memberIdStr: string;
            if (typeof memberId === 'string') {
              if (memberId.includes('@')) {
                const user = await this.usersService.findOneByEmail(memberId).catch(() => null);
                if (!user) continue;
                memberIdStr = user._id.toString();
              } else {
                memberIdStr = memberId;
              }
            } else {
              memberIdStr = (memberId as Types.ObjectId).toString();
            }
            
            await this.repositoriesService.refreshRepositoriesForUser(memberIdStr).catch(e => 
              console.error(`Error in delayed repository refresh for ${memberIdStr}: ${e.message}`)
            );
          }
        } catch (error) {
          console.error('Error in delayed repository refresh:', error);
        }
      }, 2000); // 2 second delay to ensure DB operations have completed
    } catch (error) {
      console.error('Error sending team addition notifications:', error);
    }
  }
}