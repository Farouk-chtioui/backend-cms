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
    }    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new this.userModel({
      email,
      username,
      password: hashedPassword,
      role: role, // Add the role parameter
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

  /**
   * Find teams for user - helper method for repository syncing
   */
  async findTeamsForUser(userId: string): Promise<any[]> {
    try {
      // This is a simplified version to avoid circular dependencies
      // Normally would be handled by teams.service.ts
      const teams = await this.userModel.db.collection('teams').find({
        $or: [
          { ownerId: new Types.ObjectId(userId) },
          { members: { $in: [userId, new Types.ObjectId(userId)] } }
        ]
      }).toArray();
      
      return teams || [];
    } catch (error) {
      console.error(`Error finding teams for user ${userId}:`, error);
      return [];
    }
  }

  // ----- updateRepositoryIds -----
  async updateRepositoryIds(userId: string, repositoryIds: Types.ObjectId[]): Promise<User> {
    try {
      console.log(`Directly updating repositoryIds for user ${userId} with ${repositoryIds.length} repositories`);
      
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Make sure all IDs are ObjectIds
      const validRepoIds = repositoryIds
        .filter(id => id) // Filter out null/undefined
        .map(id => {
          if (typeof id === 'string') {
            return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
          } 
          return id;
        })
        .filter(id => id); // Filter out any that couldn't be converted
      
      // Add all repositories, avoiding duplicates
      const existingIds = user.repositoryIds?.map(id => id.toString()) || [];
      const uniqueIds = validRepoIds.filter(id => !existingIds.includes(id.toString()));
      
      if (uniqueIds.length > 0) {
        if (!user.repositoryIds) {
          user.repositoryIds = [];
        }
        
        user.repositoryIds.push(...uniqueIds);
        await user.save();
        console.log(`Added ${uniqueIds.length} new repositories to user ${userId}`);
      } else {
        console.log(`No new repositories to add for user ${userId}`);
      }
      
      return user;
    } catch (error) {
      console.error(`Error updating repositoryIds: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update repository IDs: ${error.message}`);
    }
  }

  // ----- syncUserRepositories -----
  async syncUserRepositories(userId: string): Promise<User> {
    try {
      console.log(`Syncing repositories for user ${userId}`);
      
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Get repositories where user is explicitly listed
      const repositories = await this.repositoriesService.findByUserAccess(userId);
      console.log(`Found ${repositories.length} accessible repositories for user ${userId}`);
      
      // Initialize repositoryIds array if it doesn't exist
      if (!user.repositoryIds) {
        user.repositoryIds = [];
      }
      
      // Keep track of all repository IDs to ensure persistence
      const persistentRepoIds = new Set<string>();
      
      // Process repositories where user has direct access
      for (const repo of repositories) {
        if (!repo._id) {
          console.warn('Repository without ID found, skipping');
          continue;
        }
        
        persistentRepoIds.add(repo._id.toString());
      }
      
      // Also find repositories from teams
      try {
        const teams = await this.findTeamsForUser(userId);
        console.log(`Found ${teams.length} teams for user ${userId}`);
        
        for (const team of teams) {
          if (team.repositoryId) {
            const repoIdStr = typeof team.repositoryId === 'object' 
              ? team.repositoryId.toString() 
              : team.repositoryId;
              
            if (Types.ObjectId.isValid(repoIdStr)) {
              persistentRepoIds.add(repoIdStr);
            }
          }
        }
      } catch (error) {
        console.error(`Error finding teams for repository sync: ${error.message}`);
      }
      
      // Now update user's repositoryIds from the collected set
      let repoAdded = false;
      
      for (const repoIdStr of persistentRepoIds) {
        const repoId = new Types.ObjectId(repoIdStr);
        
        // Check if repository already exists in the array
        const exists = user.repositoryIds.some(id => id.equals(repoId));
        
        if (!exists) {
          console.log(`Adding repository ${repoIdStr} to user ${userId}`);
          user.repositoryIds.push(repoId);
          repoAdded = true;
        }
      }
      
      // Save changes if any repositories were added
      if (repoAdded) {
        console.log(`Saving updated repositoryIds for user ${userId}, total repos: ${user.repositoryIds.length}`);
        await user.save();
      } else {
        console.log(`No new repositories to add for user ${userId}, current count: ${user.repositoryIds.length}`);
      }
      
      return user;
    } catch (error) {
      console.error(`Error syncing repositories for user ${userId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to sync user repositories: ${error.message}`);
    }
  }
  // ----- findAdminUsers -----
  async findAdminUsers(): Promise<User[]> {
    return this.userModel.find({ role: 'admin' }).exec();
  }

  // ----- deleteUser -----
  async deleteUser(userId: string): Promise<void> {
    try {
      const userObjectId = this.ensureObjectId(userId);
      const user = await this.userModel.findById(userObjectId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Delete the user
      await this.userModel.findByIdAndDelete(userObjectId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete user');
    }
  }
}
