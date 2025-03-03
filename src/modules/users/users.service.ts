import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './user.schema';
import * as bcrypt from 'bcrypt';
import { RepositoriesService } from '../repositories/repositories.service';

// ✅ ImageKit dependencies
import axios from 'axios';
import * as FormData from 'form-data';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private repositoriesService: RepositoriesService,
  ) {}

  // ----- findAll -----
  async findAll(excludeFields: string[] = ['password']): Promise<User[]> {
    try {
      const projection = excludeFields.reduce((acc, field) => {
        acc[field] = 0;
        return acc;
      }, {});

      return this.userModel
        .find({}, projection)
        .sort({ username: 1 })
        .exec();
    } catch (error) {
      throw new BadRequestException('Failed to fetch users');
    }
  }

  // ----- searchUsers -----
  async searchUsers(searchTerm: string): Promise<User[]> {
    try {
      const regex = new RegExp(searchTerm, 'i');
      return this.userModel
        .find(
          {
            $or: [
              { username: { $regex: regex } },
              { email: { $regex: regex } },
            ],
          },
          { password: 0 },
        )
        .limit(10)
        .exec();
    } catch (error) {
      throw new BadRequestException('Failed to search users');
    }
  }

  // ----- create -----
  async create(
    email: string,
    username: string,
    password: string,
    role:string,
    profileImage?: string,
  ): Promise<User> {
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new BadRequestException('User with email or username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new this.userModel({
      email,
      username,
      password: hashedPassword,
      profileImage: profileImage || null,
      joinDate: new Date(),
      lastActive: new Date(),
    });

    await newUser.save();

    // Create a default repository
    const newRepository = await this.repositoriesService.create({
      repositoryName: 'my_project',
      ownerId: newUser._id.toString(),
      isPrivate: false,
    });

    // Link the repository to the user
    newUser.repositoryIds = [this.ensureObjectId(newRepository._id)];
    await newUser.save();

    return newUser;
  }

  // Utility for validating ObjectIds
  private ensureObjectId(id: any): Types.ObjectId {
    if (Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    throw new BadRequestException('Invalid ObjectId');
  }

  // ----- findOneByEmail -----
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

  // ----- findOneById -----
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

  // ----- findById -----
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

  // ----- updateUser -----
  async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
    try {
      const userObjectId = this.ensureObjectId(userId);
      const user = await this.userModel.findById(userObjectId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check for unique email/username
      if (updateData.email || updateData.username) {
        const existingUser = await this.userModel.findOne({
          _id: { $ne: userObjectId },
          $or: [
            { email: updateData.email || '' },
            { username: updateData.username || '' },
          ],
        });

        if (existingUser) {
          throw new BadRequestException('Email or username already taken');
        }
      }

      // Update lastActive
      updateData.lastActive = new Date();

      const updatedUser = await this.userModel.findByIdAndUpdate(
        userObjectId,
        { $set: updateData },
        { new: true },
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

  // ----- updateProfileImage (ImageKit) -----
  async updateProfileImage(userId: string, file: Express.Multer.File): Promise<string> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Convert buffer to base64
      const base64Image = file.buffer.toString('base64');

      // Create form data
      const formData = new FormData();
      formData.append('file', base64Image);
      formData.append('fileName', `${Date.now()}_${file.originalname}`);
      formData.append('folder', '/profile-images');

      // Upload to ImageKit
      const response = await axios({
        method: 'post',
        url: process.env.IMAGEKIT_UPLOAD_URL,
        data: formData,
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Basic ${Buffer.from(
            process.env.IMAGEKIT_PRIVATE_KEY + ':',
          ).toString('base64')}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data || !response.data.url) {
        throw new BadRequestException('Failed to upload image to ImageKit');
      }

      // Update user profile with new image URL
      const imageUrl = response.data.url;
      user.profileImage = imageUrl;
      await user.save();

      return imageUrl;
    } catch (error) {
      console.error('Error uploading to ImageKit:', error.response?.data || error.message);
      throw new BadRequestException('Failed to update profile image: ' + (error.response?.data?.message || error.message));
    }
  }

  // ----- addRepositoryToUser -----
  async addRepositoryToUser(userId: string, repositoryId: string): Promise<User> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const repositoryObjectId = this.ensureObjectId(repositoryId);

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
