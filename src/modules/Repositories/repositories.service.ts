import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  /**
   * Create a new repository and associated mobile app.
   */
  async create(createRepositoryDto: CreateRepositoryDto): Promise<Repository> {
    const { ownerId, repositoryName } = createRepositoryDto;
  
    if (!repositoryName) {
      throw new BadRequestException('Repository name cannot be null or empty');
    }
  
    // Create a new repository
    const newRepository = new this.repositoryModel({ repositoryName, ownerId });
    await newRepository.save();
  
    try {
      // Create a mobile app associated with the repository
      await this.mobileAppService.create({
        appName: repositoryName,
        repositoryId: newRepository._id.toString(),
        ownerId,
        userEmail: '', // Ensure userEmail is passed if required
        version: '',
      });
    } catch (error) {
      // Rollback repository creation if mobile app creation fails
      await this.repositoryModel.findByIdAndDelete(newRepository._id);
      throw new Error(`Failed to create mobile app: ${error.message}`);
    }
  
    return newRepository;
  }
  
  /**
   * Fetch all repositories.
   */
  async findAll(): Promise<Repository[]> {
    return this.repositoryModel
      .find()
      .populate('mobileAppId')
      .populate('ownerId')
      .exec();
  }

  /**
   * Fetch a repository by ID.
   */
  async findById(id: string): Promise<Repository> {
    const repository = await this.repositoryModel
      .findById(id)
      .populate('mobileAppId')
      .populate('ownerId')
      .exec();

    if (!repository) {
      throw new NotFoundException(`Repository with ID ${id} not found`);
    }

    return repository;
  }

  /**
   * Fetch a repository by owner ID.
   */
  async findByOwnerId(ownerId: string): Promise<Repository[]> {
    return this.repositoryModel
      .find({ ownerId })
      .populate('mobileAppId')
      .populate('ownerId')
      .exec();
  }

  /**
   * Helper to fetch a single repository.
   */
  async findOne(id: string): Promise<Repository> {
    const repository = await this.repositoryModel
      .findById(id)
      .populate('mobileAppId')
      .populate('ownerId')
      .exec();

    if (!repository) {
      throw new NotFoundException(`Repository with ID ${id} not found`);
    }

    return repository;
  }
}
