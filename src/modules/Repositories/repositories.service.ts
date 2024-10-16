import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repository } from './repository.schema';
import { CreateRepositoryDto } from './CreateRepositoryDto';
import { MobileAppService } from '../mobile-app/mobile-app.service';
import { AppDesignService } from '../appDesign/appDesign.service';

@Injectable()
export class RepositoriesService {
  constructor(
    @InjectModel(Repository.name) private repositoryModel: Model<Repository>,
    private readonly mobileAppService: MobileAppService,
    private readonly appDesignService: AppDesignService,
  ) {}

  async create(createRepositoryDto: CreateRepositoryDto): Promise<Repository> {
    const { ownerId, repositoryName } = createRepositoryDto;

    if (!repositoryName) {
      throw new Error('Repository name cannot be null or empty');
    }

    const newRepository = new this.repositoryModel({ repositoryName, ownerId });
    await newRepository.save();

    const defaultAppDesign = await this.appDesignService.createAppDesign();

    await this.mobileAppService.create({
      appName: repositoryName,
      appDesignId: defaultAppDesign._id.toString(),
      repositoryId: newRepository._id.toString(),
      version: '',
    });

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
  async findByOwnerId(ownerId: string): Promise<Repository[]> {
    return this.repositoryModel
      .find({ ownerId })
      .populate('mobileAppId')
      .populate('ownerId')
      .exec();
  }
}
