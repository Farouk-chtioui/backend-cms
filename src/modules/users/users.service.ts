import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserRole } from './user.schema';
import * as bcrypt from 'bcrypt';
import { RepositoriesService } from '../repositories/repositories.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private repositoriesService: RepositoriesService,
  ) {
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'profile-images');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }

  async findAll(excludeFields: string[] = ['password']): Promise<User[]> {
    try {
      const projection = excludeFields.reduce((acc, field) => {
        acc[field] = 0;
        return acc;
      }, {});

      return await this.userModel
        .find({}, projection)
        .sort({ username: 1 })
        .exec();
    } catch (error) {
      throw new BadRequestException('Failed to fetch users');
    }
  }

  async searchUsers(searchTerm: string): Promise<User[]> {
    try {
      const regex = new RegExp(searchTerm, 'i');
      return await this.userModel
        .find({
          $or: [
            { username: { $regex: regex } },
            { email: { $regex: regex } }
          ]
        }, { password: 0 })
        .limit(10)
        .exec();
    } catch (error) {
      throw new BadRequestException('Failed to search users');
    }
  }

  async create(
    email: string, 
    username: string, 
    password: string, 
    profileImage?: string,
    role: UserRole = UserRole.USER
  ): Promise<User> {
    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestException('Invalid role specified');
    }

    const existingUser = await this.userModel.findOne({ 
      $or: [{ email }, { username }] 
    }).exec();
    
    if (existingUser) {
      throw new BadRequestException('User with email or username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new this.userModel({ 
      email, 
      username, 
      password: hashedPassword, 
      profileImage,
      role,
      joinDate: new Date(),
      lastActive: new Date()
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

  private ensureObjectId(id: any): Types.ObjectId {
    if (Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    } else {
      throw new BadRequestException('Invalid ObjectId');
    }
  }

  async findOneByEmail(email: string): Promise<User> {
    try {
      const user = await this.userModel.findOne({ email }).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to find user');
    }
  }

  async findOneById(userId: string): Promise<User> {
    try {
      const userObjectId = this.ensureObjectId(userId);
      const user = await this.userModel.findById(userObjectId).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to find user');
    }
  }

  async findById(id: string): Promise<User> {
    try {
      const userObjectId = this.ensureObjectId(id);
      const user = await this.userModel.findById(userObjectId).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to find user');
    }
  }

  async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
    try {
      const userObjectId = this.ensureObjectId(userId);
      const user = await this.userModel.findById(userObjectId);
      
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Validate role if it's being updated
      if (updateData.role && !Object.values(UserRole).includes(updateData.role)) {
        throw new BadRequestException('Invalid role specified');
      }

      // Check if email or username is being changed and ensure they're unique
      if (updateData.email || updateData.username) {
        const existingUser = await this.userModel.findOne({
          _id: { $ne: userObjectId },
          $or: [
            { email: updateData.email || '' },
            { username: updateData.username || '' }
          ]
        });

        if (existingUser) {
          throw new BadRequestException('Email or username already taken');
        }
      }

      // Update lastActive timestamp
      updateData.lastActive = new Date();

      const updatedUser = await this.userModel.findByIdAndUpdate(
        userObjectId,
        { $set: updateData },
        { new: true }
      );

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update user');
    }
  }

  async updateProfileImage(userId: string, file: Express.Multer.File): Promise<string> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Delete old profile image if it exists
      if (user.profileImage) {
        const oldImagePath = path.join(process.cwd(), user.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Update user with new image path
      const imageUrl = `/uploads/profile-images/${file.filename}`;
      user.profileImage = imageUrl;
      await user.save();

      return imageUrl;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update profile image');
    }
  }

  async addRepositoryToUser(userId: string, repositoryId: string): Promise<User> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const repositoryObjectId = this.ensureObjectId(repositoryId);
      
      // Check if repository is already added
      if (user.repositoryIds.includes(repositoryObjectId)) {
        throw new BadRequestException('Repository already added to user');
      }

      user.repositoryIds.push(repositoryObjectId);
      await user.save();

      return user;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to add repository to user');
    }
  }
}