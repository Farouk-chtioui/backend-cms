import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Repository } from './repository.schema';
import { CreateRepositoryDto } from './CreateRepositoryDto';
import { MobileAppService } from '../mobile-app/mobile-app.service';
import { AppDesignService } from '../appDesign/appDesign.service';
import { AppLayoutService } from '../appLayout/appLayout.service';
import { UsersService } from '../users/users.service';
import { ImageKitService } from '../../shared/imagekit.service';

@Injectable()
export class RepositoriesService {
  constructor(
    @InjectModel(Repository.name) private repositoryModel: Model<Repository>,
    private readonly mobileAppService: MobileAppService,
    private readonly appDesignService: AppDesignService,
    private readonly appLayoutService: AppLayoutService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly imageKitService: ImageKitService,
  ) {}

  async create(createRepositoryDto: CreateRepositoryDto): Promise<Repository> {
    const { ownerId, repositoryName, description, isPrivate, image, coverImage, team } = createRepositoryDto;

    if (!repositoryName) {
      throw new Error('Repository name cannot be null or empty');
    }

    // Process images using ImageKit if they are base64
    const processedImage = image ? await this.imageKitService.processImage(image, `repo_${repositoryName}`) : null;
    const processedCoverImage = coverImage ? await this.imageKitService.processImage(coverImage, `repo_cover_${repositoryName}`) : null;

    const newRepository = new this.repositoryModel({
      repositoryName,
      ownerId,
      description,
      isPrivate,
      image: processedImage,
      coverImage: processedCoverImage,
      team: team || [],
      createdAt: new Date(),
    });
    await newRepository.save();

    try {
      const defaultAppDesign = await this.appDesignService.createAppDesign();

      await this.mobileAppService.create({
        appName: repositoryName,
        appDesignId: defaultAppDesign._id.toString(),
        repositoryId: newRepository._id.toString(),
        ownerId,
        version: '',
      });
    } catch (error) {
      await this.repositoryModel.findByIdAndDelete(newRepository._id);
      throw new Error(`Failed to create mobile app: ${error.message}`);
    }

    return newRepository;
  }

  async findAll(): Promise<Repository[]> {
    return this.repositoryModel
      .find()
      .populate('mobileAppId')
      .populate('ownerId')
      .populate('team')
      .exec();
  }

  async findById(id: string): Promise<Repository> {
    return this.repositoryModel
      .findById(id)
      .populate('mobileAppId')
      .populate('ownerId')
      .populate('team')
      .exec();
  }

  async findByUserAccess(userId: string): Promise<Repository[]> {
    try {
      // First try to get the user's email and details
      const user = await this.usersService.findById(userId);
      
      // Admin has access to all repositories
      if (user?.role === 'admin') {
        return this.repositoryModel.find()
          .populate('mobileAppId')
          .populate('ownerId')
          .populate('team')
          .exec();
      }
      
      // Create query conditions with proper typing
      const conditions: any[] = [
        { ownerId: userId }
      ];
      
      // Add email condition if user email is available
      if (user?.email) {
        conditions.push({ team: user.email });
      }
      
      // Add userId condition for team membership
      conditions.push({ team: userId });
      
      // Execute the query with combined conditions
      return this.repositoryModel
        .find({ $or: conditions })
        .populate('mobileAppId')
        .populate('ownerId')
        .populate('team')
        .exec();
    } catch (error) {
      console.error('Error in findByUserAccess:', error);
      
      // Fallback to basic query if there's an error
      return this.repositoryModel
        .find({
          $or: [
            { ownerId: userId } as any,
            { team: userId } as any
          ]
        })
        .populate('mobileAppId')
        .populate('ownerId')
        .populate('team')
        .exec();
    }
  }

  async update(id: string, updateRepositoryDto: Partial<CreateRepositoryDto>): Promise<Repository> {
    const { team, coverImage, image } = updateRepositoryDto;
    
    const updateData: any = {};
    
    // Process images if provided
    if (image) {
      updateData.image = await this.imageKitService.processImage(image, `repo_${id}`);
    }
    
    if (coverImage) {
      updateData.coverImage = await this.imageKitService.processImage(coverImage, `repo_cover_${id}`);
    }
    
    if (team) {
      updateData.team = team;
    }
    
    // Add any other fields from updateRepositoryDto that aren't specially handled
    Object.keys(updateRepositoryDto).forEach(key => {
      if (!['team', 'coverImage', 'image'].includes(key)) {
        updateData[key] = updateRepositoryDto[key];
      }
    });

    return this.repositoryModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .populate('mobileAppId')
      .populate('ownerId')
      .populate('team')
      .exec();
  }

  /**
   * Adds a user to a repository's team members
   * @param repositoryId The repository ID
   * @param userId The user ID to add
   */
  async addUserToRepository(repositoryId: string, userId: string): Promise<Repository> {
    try {
      const repository = await this.findById(repositoryId);
      if (!repository) {
        throw new Error('Repository not found');
      }
      
      // Initialize team array if it doesn't exist
      if (!repository.team) {
        repository.team = [];
      }
      
      // Check if user is already in team
      const isUserInTeam = repository.team.some(member => {
        if (typeof member === 'string') {
          return member === userId;
        } else if (member && typeof member === 'object') {
          return member.toString ? member.toString() === userId : false;
        }
        return false;
      });
      
      // Add user to team if not already present
      if (!isUserInTeam) {
        // Check if it's an email address or an ObjectId
        if (userId.includes('@')) {
          // Add as string for email
          repository.team.push(userId);
        } else if (Types.ObjectId.isValid(userId)) {
          // Add as ObjectId for user ID
          repository.team.push(new Types.ObjectId(userId));
        } else {
          // Add as plain string if it's neither
          repository.team.push(userId);
        }
        await repository.save();
      }
      
      return repository;
    } catch (error) {
      console.error(`Error adding user ${userId} to repository ${repositoryId}:`, error);
      throw error;
    }
  }

  /**
   * Sync team members with repository team
   * When a user is added to a team, ensure they're also in the repository's team array
   */
  async syncTeamMembersWithRepository(repositoryId: string, memberIds: string[]): Promise<Repository> {
    try {
      console.log(`Syncing team members with repository ${repositoryId}`);
      
      const repository = await this.findById(repositoryId);
      if (!repository) {
        throw new Error('Repository not found');
      }

      // Initialize team array if it doesn't exist
      if (!repository.team) {
        repository.team = [];
      }

      let updated = false;
      
      // Process each member ID
      for (const memberId of memberIds) {
        // Skip invalid IDs or empty strings
        if (!memberId || (typeof memberId === 'string' && memberId.trim() === '')) {
          continue;
        }

        // For email addresses, store them as-is (as strings)
        if (typeof memberId === 'string' && memberId.includes('@')) {
          const isEmailInTeam = repository.team.some(member => 
            typeof member === 'string' && member === memberId
          );

          if (!isEmailInTeam) {
            // Store email addresses as strings
            repository.team.push(memberId);
            console.log(`Added email member ${memberId} to repository ${repositoryId}`);
            updated = true;
            
            // Also try to find user by email and add their actual ID
            try {
              const user = await this.usersService.findOneByEmail(memberId);
              if (user && user._id) {
                const userIdStr = user._id.toString();
                const isUserIdInTeam = repository.team.some(member => {
                  if (typeof member === 'string') {
                    return member === userIdStr;
                  } else if (member && typeof member === 'object') {
                    return member.toString ? member.toString() === userIdStr : false;
                  }
                  return false;
                });
                
                if (!isUserIdInTeam) {
                  repository.team.push(new Types.ObjectId(userIdStr));
                  console.log(`Also added user ID ${userIdStr} for email ${memberId}`);
                  updated = true;
                  
                  // Sync repositories for this user to ensure persistence
                  await this.usersService.syncUserRepositories(userIdStr);
                }
              }
            } catch (error) {
              console.log(`Could not find user by email ${memberId}: ${error.message}`);
            }
          }
        }
        // For ObjectId strings
        else if (Types.ObjectId.isValid(memberId)) {
          const isUserInTeam = repository.team.some(member => {
            if (typeof member === 'string') {
              return member === memberId;
            } else if (member && typeof member === 'object') {
              return member.toString ? member.toString() === memberId : false;
            }
            return false;
          });

          if (!isUserInTeam) {
            repository.team.push(new Types.ObjectId(memberId));
            console.log(`Added member ${memberId} to repository ${repositoryId}`);
            updated = true;
            
            // Also try to get user's email and add it for better matching
            try {
              const user = await this.usersService.findById(memberId);
              if (user && user.email) {
                const isEmailInTeam = repository.team.some(member => 
                  typeof member === 'string' && member === user.email
                );
                
                if (!isEmailInTeam) {
                  repository.team.push(user.email);
                  console.log(`Also added email ${user.email} for user ID ${memberId}`);
                  updated = true;
                }
              }
            } catch (error) {
              console.log(`Could not find email for user ${memberId}: ${error.message}`);
            }
          }
        } else {
          // Handle other string formats (not emails or ObjectIds)
          const isStringInTeam = repository.team.some(member => 
            typeof member === 'string' && member === memberId
          );
          
          if (!isStringInTeam) {
            repository.team.push(memberId);
            console.log(`Added string member ${memberId} to repository ${repositoryId}`);
            updated = true;
          }
        }
      }

      // Only save if changes were made
      if (updated) {
        await repository.save();
        console.log(`Updated repository ${repositoryId} team with ${memberIds.length} members`);
      }

      return repository;
    } catch (error) {
      console.error(`Error syncing team members with repository ${repositoryId}:`, error);
      throw error;
    }
  }
  
  /**
   * Force refresh repositories for a user and ensure bidirectional connection
   */
  async refreshRepositoriesForUser(userId: string): Promise<void> {
    try {
      console.log(`Force refreshing repositories for user ${userId}`);
      
      // Get the user to access their email
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }
      
      // Find all repositories where user is:
      // 1. The owner
      // 2. Explicitly in the team by ID
      // 3. In the team by email
      const repositories = await this.repositoryModel
        .find({
          $or: [
            { ownerId: userId },
            { team: userId },
            { team: user.email }
          ]
        })
        .exec();
      
      console.log(`Found ${repositories.length} repositories for user ${userId}`);
      
      // Try to find additional repositories via team membership
      const teams = await this.usersService.findTeamsForUser(userId);
      console.log(`Found ${teams.length} teams for user ${userId}`);
      
      // Extract valid repository IDs from teams
      const teamRepoIds: string[] = [];
      
      for (const team of teams) {
        if (team.repositoryId) {
          // Handle different types correctly
          if (typeof team.repositoryId === 'string') {
            teamRepoIds.push(team.repositoryId);
          } else if (team.repositoryId instanceof Types.ObjectId) {
            teamRepoIds.push(team.repositoryId.toString());
          } else if (team.repositoryId._id || team.repositoryId.id) {
            // Handle populated document reference
            const idStr = (team.repositoryId._id || team.repositoryId.id).toString();
            teamRepoIds.push(idStr);
          }
        }
      }
      
      console.log(`Found ${teamRepoIds.length} repository IDs from teams`);
      
      // Only get additional repositories that aren't already found
      const existingRepoIds = new Set(repositories.map(repo => repo._id.toString()));
      const newRepoIds = teamRepoIds.filter(id => id && !existingRepoIds.has(id));
      
      // Add any repositories from teams that weren't found directly
      let additionalRepos: Repository[] = [];
      if (newRepoIds.length > 0) {
        console.log(`Found ${newRepoIds.length} additional repositories from teams`);
        
        // Convert string IDs to ObjectIds for MongoDB query
        const objectIds = newRepoIds
          .filter(id => Types.ObjectId.isValid(id))
          .map(id => new Types.ObjectId(id));
          
        additionalRepos = await this.repositoryModel
          .find({ _id: { $in: objectIds } })
          .exec();
          
        console.log(`Successfully retrieved ${additionalRepos.length} additional repositories`);
        repositories.push(...(await this.repositoryModel.find({ _id: { $in: newRepoIds } }).exec()));
        
        // Ensure we also add the user to these repository teams
        for (const repo of additionalRepos) {
          // Add user ID to repo team if not already present
          let needsUpdate = false;
          
          // Check if user ID is already in team
          const isUserInTeam = repo.team?.some(member => {
            if (typeof member === 'string') {
              return member === userId || member === user.email;
            } else if (member && typeof member === 'object') {
              return member.toString ? member.toString() === userId : false;
            }
            return false;
          });
          
          // If not in team, add the user ID
          if (!isUserInTeam) {
            if (!repo.team) repo.team = [];
            
            if (Types.ObjectId.isValid(userId)) {
              repo.team.push(new Types.ObjectId(userId));
            } else {
              repo.team.push(userId);
            }
            needsUpdate = true;
          }
          
          // Check if user email is already in team
          const isEmailInTeam = repo.team?.some(member => 
            typeof member === 'string' && member === user.email
          );
          
          // If email not in team, add it
          if (!isEmailInTeam && user.email) {
            if (!repo.team) repo.team = [];
            repo.team.push(user.email);
            needsUpdate = true;
          }
          
          // Save the repository if we made changes
          if (needsUpdate) {
            console.log(`Adding user ${userId} to repository ${repo._id} team`);
            await repo.save();
          }
        }
      }
      
      // Now update user's repositoryIds
      if (repositories.length > 0) {
        // Convert to array of ObjectIds
        const repoObjectIds: Types.ObjectId[] = [];
        
        for (const repo of repositories) {
          if (!repo._id) continue;
          
          let objectId: Types.ObjectId | null = null;
          
          if (repo._id instanceof Types.ObjectId) {
            objectId = repo._id;
          } else if (typeof repo._id === 'string' && Types.ObjectId.isValid(repo._id)) {
            objectId = new Types.ObjectId(repo._id);
          } else if (typeof repo._id === 'object' && repo._id.toString && Types.ObjectId.isValid(repo._id.toString())) {
            objectId = new Types.ObjectId(repo._id.toString());
          }
          
          if (objectId) {
            repoObjectIds.push(objectId);
          }
        }
        
        console.log(`Updating user ${userId} with ${repoObjectIds.length} repository IDs`);
        
        if (repoObjectIds.length > 0) {
          await this.usersService.updateRepositoryIds(userId, repoObjectIds);
        }
      }
    } catch (error) {
      console.error(`Error refreshing repositories for user ${userId}:`, error);
    }
  }
}