import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repository } from './repository.schema';

@Injectable()
export class RepositoriesService {
  constructor(@InjectModel(Repository.name) private repoModel: Model<Repository>) {}

  async createRepository(name: string, owner: string): Promise<Repository> {
    const newRepository = new this.repoModel({
      name,
      owner,
    });
    return newRepository.save();
  }

  async getRepositoryById(repoId: string): Promise<Repository> {
    const repository = await this.repoModel.findById(repoId).exec();
    if (!repository) {
      throw new NotFoundException('Repository not found');
    }
    return repository;
  }

  async updateRepositoryName(repoId: string, newName: string): Promise<Repository> {
    const repository = await this.repoModel.findById(repoId).exec();
    if (!repository) {
      throw new NotFoundException('Repository not found');
    }
    repository.name = newName;
    return repository.save();
  }

  // Get default repository for a user
  async getDefaultRepository(userId: string): Promise<Repository> {
    const repository = await this.repoModel.findOne({ owner: userId }).exec();
    if (!repository) {
      throw new NotFoundException('No repository found for this user');
    }
    return repository;
  }

  async findByUserId(userId: string): Promise<Repository[]> {
    return this.repoModel.find({ owner: userId }).exec();
  }
}
