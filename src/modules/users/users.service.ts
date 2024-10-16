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
    private repositoriesService: RepositoriesService
  ) {}

  // Create a new user and assign a default repository to them
  async create(username: string, password: string): Promise<User> {
    try {
      // Refined user existence check
      const existingUser = await this.userModel.findOne({ username }).exec();
      
      // Handle edge case where the user already exists in the database
      if (existingUser) {
        throw new BadRequestException(`User with username '${username}' already exists`);
      }

      // Hash the password and create a new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new this.userModel({ username, password: hashedPassword });
      await newUser.save();

      // Create a default repository for the new user
      const newRepository = await this.repositoriesService.create({
        repositoryName: 'my_project',
        ownerId: newUser._id.toString(),
      });

      // Check if repository ID is valid and cast to ObjectId
      const repositoryObjectId = this.ensureObjectId(newRepository._id);
      newUser.repositoryIds = [repositoryObjectId]; // Ensure ObjectId casting
      await newUser.save();

      return newUser;
    } catch (error) {
      // Improved error handling with detailed message
      throw new BadRequestException('Error creating user: ' + error.message);
    }
  }

  // Utility function to ensure valid ObjectId
  private ensureObjectId(id: any): Types.ObjectId {
    if (Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    } else {
      throw new BadRequestException('Invalid ObjectId');
    }
  }

  async findOne(username: string): Promise<User> {
    // Find a user by their username
    return this.userModel.findOne({ username }).exec();
  }

  async findOneById(userId: string): Promise<User> {
    // Ensure valid ObjectId before fetching by ID
    const userObjectId = this.ensureObjectId(userId);
    const user = await this.userModel.findById(userObjectId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findById(id: string): Promise<User> {
    // Ensure valid ObjectId before fetching by ID
    const userObjectId = this.ensureObjectId(id);
    return this.userModel.findById(userObjectId).exec();
  }

  // Add repository to user when a new one is created
  async addRepositoryToUser(userId: string, repositoryId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Ensure repositoryId is cast as ObjectId
    const repositoryObjectId = this.ensureObjectId(repositoryId);
    user.repositoryIds.push(repositoryObjectId);
    await user.save();

    return user;
  }
}
