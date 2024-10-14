// src/repository/repository.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repository } from './repository.schema';
import { MobileAppService } from '../mobile-app/mobile-app.service';

@Injectable()
export class RepositoryService {
  constructor(
    @InjectModel(Repository.name) private repositoryModel: Model<Repository>,
    private readonly mobileAppService: MobileAppService
  ) {}

  async createRepository(repoData: any, ownerId: string): Promise<Repository> {
    const newMobileApp = await this.mobileAppService.createMobileApp(repoData.appName);

    const newRepo = new this.repositoryModel({
      name: repoData.name,
      mobileApp: newMobileApp,
      owner: ownerId
    });

    return newRepo.save();
  }

  async getRepositoriesByUserId(userId: string): Promise<Repository[]> {
    return this.repositoryModel.find({ owner: userId }).populate('mobileApp').exec();
  }
}
