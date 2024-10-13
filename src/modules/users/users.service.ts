import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(username: string, password: string): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.userModel.findOne({ username }).exec();
      if (existingUser) {
        throw new BadRequestException('User already exists');
      }

      // Hash password and create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new this.userModel({ username, password: hashedPassword });
      return newUser.save();
    } catch (error) {
      throw new BadRequestException('Error creating user: ' + error.message);
    }
  }

  async findOne(username: string): Promise<User> {
    return this.userModel.findOne({ username }).exec();
  }
  async findOneById(userId: string): Promise<User> {
    // Ensure the userId is cast to ObjectId
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }
    const user = await this.userModel.findById(new Types.ObjectId(userId)).exec();  // Use Types.ObjectId
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
