import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
      throw new Error('Repository name cannot be null or empty');
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
      // First try to get the user's email
      const user = await this.usersService.findById(userId);
      
      // If we successfully got the user's email, search by both ID and email
      if (user?.email) {
        return this.repositoryModel
          .find({
            $or: [
              { ownerId: userId },
              { team: user.email }
            ]
          })
          .populate('mobileAppId')
          .populate('ownerId')
          .populate('team')
          .exec();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      // If there's any error, fall through to the default behavior
    }

    // Default behavior: search by userId in both fields
    return this.repositoryModel
      .find({
        $or: [
          { ownerId: userId },
          { team: userId }
        ]
      })
      .populate('mobileAppId')
      .populate('ownerId')
      .populate('team')
      .exec();
  }

  async update(id: string, updateRepositoryDto: Partial<CreateRepositoryDto>): Promise<Repository> {
    const { team, coverImage } = updateRepositoryDto;

    if (team || coverImage) {
      return this.repositoryModel
        .findByIdAndUpdate(id, { $set: { team, coverImage } }, { new: true })
        .populate('mobileAppId')
        .populate('ownerId')
        .populate('team')
        .exec();
    }

    return this.repositoryModel
      .findByIdAndUpdate(id, updateRepositoryDto, { new: true })
      .populate('mobileAppId')
      .populate('ownerId')
      .populate('team')
      .exec();
  }
}