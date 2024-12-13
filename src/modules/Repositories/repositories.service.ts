import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repository } from './repository.schema';
import { CreateRepositoryDto } from './CreateRepositoryDto';
import { MobileAppService } from '../mobile-app/mobile-app.service';
import { AppDesignService } from '../appDesign/appDesign.service';
import { AppLayoutService } from '../appLayout/appLayout.service';

@Injectable()
export class RepositoriesService {
  constructor(
    @InjectModel(Repository.name) private repositoryModel: Model<Repository>,
    private readonly mobileAppService: MobileAppService,
    private readonly appDesignService: AppDesignService,
    private readonly appLayoutService: AppLayoutService, // Inject AppLayoutService
  ) {}

  async create(createRepositoryDto: CreateRepositoryDto): Promise<Repository> {
    const { ownerId, repositoryName, description, isPrivate, image } = createRepositoryDto;

    if (!repositoryName) {
      throw new Error('Repository name cannot be null or empty');
    }

    // Create the repository
    const newRepository = new this.repositoryModel({ repositoryName, ownerId, description, isPrivate, image });
    await newRepository.save();

    try {
      // Create a default app design
      const defaultAppDesign = await this.appDesignService.createAppDesign();

      // Create the mobile app associated with the repository
      // Let the MobileAppService handle the AppLayout creation to ensure no duplication
      await this.mobileAppService.create({
        appName: repositoryName,
        appDesignId: defaultAppDesign._id.toString(),
        repositoryId: newRepository._id.toString(),
        ownerId,
        version: '', // Add any other required fields for mobile app creation
      });
    } catch (error) {
      // Rollback repository creation if mobile app creation fails
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
      .exec();
  }

  async findById(id: string): Promise<Repository> {
    return this.repositoryModel
      .findById(id)
      .populate('mobileAppId')
      .populate('ownerId')
      .exec();
  }

  async findone(id: string): Promise<Repository> {
    return this.repositoryModel
      .findById(id)
      .populate('mobileAppId')
      .populate('ownerId')
      .exec();
  }

  async findByOwnerId(ownerId: string): Promise<Repository[]> {
    return this.repositoryModel
      .find({ ownerId })
      .populate('mobileAppId')
      .populate('ownerId')
      .exec();
  }
}
