import { Injectable, forwardRef, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Repository } from './repository.schema';
import { CreateRepositoryDto } from './CreateRepositoryDto';
import { MobileAppService } from '../mobile-app/mobile-app.service';
import { AppDesignService } from '../appDesign/appDesign.service';
import { AppLayoutService } from '../appLayout/appLayout.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class RepositoriesService {
  constructor(
    @InjectModel(Repository.name) private repositoryModel: Model<Repository>,
    private readonly mobileAppService: MobileAppService,
    private readonly appDesignService: AppDesignService,
    private readonly appLayoutService: AppLayoutService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async create(createRepositoryDto: CreateRepositoryDto): Promise<Repository> {
    const { ownerId, repositoryName, description, isPrivate, image, coverImage, team } = createRepositoryDto;

    if (!repositoryName) {
      throw new BadRequestException('Repository name cannot be null or empty');
    }

    // Validate owner exists
    const owner = await this.usersService.findById(ownerId);
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }

    // Validate all team members exist if team is provided
    if (team && team.length > 0) {
      await Promise.all(team.map(async (userId) => {
        const user = await this.usersService.findById(userId);
        if (!user) {
          throw new NotFoundException(`Team member with ID ${userId} not found`);
        }
      }));
    }

    const newRepository = new this.repositoryModel({
      repositoryName,
      ownerId,
      description,
      isPrivate,
      image,
      coverImage,
      team: team || [],
      createdAt: new Date(),
    });

    await newRepository.save();

    try {
      // Create default app design
      const defaultAppDesign = await this.appDesignService.createAppDesign();

      // Create mobile app
      await this.mobileAppService.create({
        appName: repositoryName,
        appDesignId: defaultAppDesign._id.toString(),
        repositoryId: newRepository._id.toString(),
        ownerId,
        version: '1.0.0',
      });

      // Update repository with mobile app reference
      return this.findById(newRepository._id.toString());
    } catch (error) {
      // Cleanup if mobile app creation fails
      await this.repositoryModel.findByIdAndDelete(newRepository._id);
      throw new BadRequestException(`Failed to create repository: ${error.message}`);
    }
  }

  async findAll(): Promise<Repository[]> {
    try {
      return await this.repositoryModel
        .find()
        .populate('mobileAppId')
        .populate('ownerId', '-password') // Exclude password
        .populate('team', '-password') // Exclude password from team members
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new BadRequestException('Failed to fetch repositories');
    }
  }

  async findById(id: string): Promise<Repository> {
    try {
      const repository = await this.repositoryModel
        .findById(this.ensureObjectId(id))
        .populate('mobileAppId')
        .populate('ownerId', '-password')
        .populate('team', '-password')
        .exec();

      if (!repository) {
        throw new NotFoundException('Repository not found');
      }

      return repository;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch repository');
    }
  }

  async findByUserAccess(userId: string): Promise<Repository[]> {
    try {
      // First verify the user exists
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Search for repositories where user is owner or team member
      return await this.repositoryModel
        .find({
          $or: [
            { ownerId: userId },
            { team: user._id }
          ]
        })
        .populate('mobileAppId')
        .populate('ownerId', '-password')
        .populate('team', '-password')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch user repositories');
    }
  }

  async update(id: string, updateRepositoryDto: Partial<CreateRepositoryDto>): Promise<Repository> {
    try {
      const repository = await this.findById(id);
      if (!repository) {
        throw new NotFoundException('Repository not found');
      }

      // Validate team members if updating team
      if (updateRepositoryDto.team) {
        await Promise.all(updateRepositoryDto.team.map(async (userId) => {
          const user = await this.usersService.findById(userId);
          if (!user) {
            throw new NotFoundException(`Team member with ID ${userId} not found`);
          }
        }));
      }

      const updatedRepository = await this.repositoryModel
        .findByIdAndUpdate(
          id,
          { $set: updateRepositoryDto },
          { new: true }
        )
        .populate('mobileAppId')
        .populate('ownerId', '-password')
        .populate('team', '-password')
        .exec();

      if (!updatedRepository) {
        throw new NotFoundException('Repository not found');
      }

      return updatedRepository;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update repository');
    }
  }

  async addTeamMember(repositoryId: string, userId: string): Promise<Repository> {
    try {
      const repository = await this.findById(repositoryId);
      if (!repository) {
        throw new NotFoundException('Repository not found');
      }

      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user is already in team
      if (repository.team.some(teamMemberId => teamMemberId.toString() === userId)) {
        throw new BadRequestException('User is already a team member');
      }

      // Add user to team
      repository.team.push(new Types.ObjectId(userId));
      
      return await this.repositoryModel
        .findByIdAndUpdate(
          repositoryId,
          { team: repository.team },
          { new: true }
        )
        .populate('mobileAppId')
        .populate('ownerId', '-password')
        .populate('team', '-password')
        .exec();
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to add team member');
    }
  }

  async addTeamMembers(repositoryId: string, userIds: string[]): Promise<Repository> {
    try {
      const repository = await this.findById(repositoryId);
      if (!repository) {
        throw new NotFoundException('Repository not found');
      }

      // Validate all users exist and create ObjectIds
      const validatedUserIds = await Promise.all(userIds.map(async (userId) => {
        const user = await this.usersService.findById(userId);
        if (!user) {
          throw new NotFoundException(`User with ID ${userId} not found`);
        }
        return new Types.ObjectId(userId);
      }));

      // Filter out users who are already team members
      const existingTeamIds = repository.team.map(id => id.toString());
      const newUserIds = validatedUserIds.filter(id => 
        !existingTeamIds.includes(id.toString())
      );

      if (newUserIds.length === 0) {
        throw new BadRequestException('All users are already team members');
      }

      // Add new users to team
      repository.team = [...repository.team, ...newUserIds];

      return await this.repositoryModel
        .findByIdAndUpdate(
          repositoryId,
          { team: repository.team },
          { new: true }
        )
        .populate('mobileAppId')
        .populate('ownerId', '-password')
        .populate('team', '-password')
        .exec();
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to add team members');
    }
  }

  async removeTeamMember(repositoryId: string, userId: string): Promise<Repository> {
    try {
      const repository = await this.findById(repositoryId);
      if (!repository) {
        throw new NotFoundException('Repository not found');
      }

      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user is in team
      if (!repository.team.some(teamMemberId => teamMemberId.toString() === userId)) {
        throw new BadRequestException('User is not a team member');
      }

      // Remove user from team
      repository.team = repository.team.filter(
        teamMemberId => teamMemberId.toString() !== userId
      );

      return await this.repositoryModel
        .findByIdAndUpdate(
          repositoryId,
          { team: repository.team },
          { new: true }
        )
        .populate('mobileAppId')
        .populate('ownerId', '-password')
        .populate('team', '-password')
        .exec();
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to remove team member');
    }
  }

  private ensureObjectId(id: any): Types.ObjectId {
    if (Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    throw new BadRequestException('Invalid ObjectId');
  }
}