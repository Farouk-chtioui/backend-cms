import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
}