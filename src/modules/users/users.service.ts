import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './user.schema';
import * as bcrypt from 'bcrypt';
import { RepositoriesService } from '../repositories/repositories.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private repositoriesService: RepositoriesService,
  ) {}

  // Create a new user and assign a default repository to them
  async create(email: string, username: string, password: string, profileImage?: string): Promise<User> {
    // Check if email or username already exists
    const existingUser = await this.userModel.findOne({ $or: [{ email }, { username }] }).exec();
    if (existingUser) {
      throw new BadRequestException(`User with email or username already exists`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new this.userModel({ 
      email, 
      username, 
      password: hashedPassword, 
      profileImage 
    });
    await newUser.save();

    const newRepository = await this.repositoriesService.create({
      repositoryName: 'my_project',
      ownerId: newUser._id.toString(),
      isPrivate: false,
    });

    newUser.repositoryIds = [this.ensureObjectId(newRepository._id)];
    await newUser.save();

    return newUser;
  }

  // Utility function to ensure valid ObjectId
  private ensureObjectId(id: any): Types.ObjectId {
    if (Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    } else {
      throw new BadRequestException('Invalid ObjectId');
    }
  }

  // Find a user by email
  async findOneByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email }).exec();
  }

  // Find a user by ID
  async findOneById(userId: string): Promise<User> {
    const userObjectId = this.ensureObjectId(userId);
    const user = await this.userModel.findById(userObjectId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findById(id: string): Promise<User> {
    const userObjectId = this.ensureObjectId(id);
    return this.userModel.findById(userObjectId).exec();
  }

  // Add repository to user when a new one is created
  async addRepositoryToUser(userId: string, repositoryId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const repositoryObjectId = this.ensureObjectId(repositoryId);
    user.repositoryIds.push(repositoryObjectId);
    await user.save();

    return user;
  }
}