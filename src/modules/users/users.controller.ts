import { 
  Controller, 
  Post, 
  Get, 
  Patch,
  Body, 
  Param, 
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { User } from './user.schema';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as path from 'path';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Add new getAllUsers endpoint
  @Get()
  async getAllUsers() {
    try {
      const users = await this.usersService.findAll();
      // Remove sensitive information from all users
      const sanitizedUsers = users.map(user => {
        const userObj = user.toObject();
        delete userObj.password;
        return userObj;
      });
      return sanitizedUsers;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('register')
  async register(@Body() body) {
    const { email, username, password, profileImage } = body;

    if (!password || !email || !username) {
      throw new BadRequestException('Email, username, and password are required');
    }

    try {
      const newUser = await this.usersService.create(email, username, password, profileImage);
      return { message: 'User registered successfully', userId: newUser._id };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('login')
  async login(@Body() body) {
    const { email, password } = body;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return { message: 'Login successful', token };
  }

  @Get(':userId')
  async getUserById(@Param('userId') userId: string) {
    try {
      const user = await this.usersService.findOneById(userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }
      
      // Remove sensitive information
      const userResponse = user.toObject();
      delete userResponse.password;
      
      return userResponse;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch(':userId')
  async updateUser(@Param('userId') userId: string, @Body() updateData: Partial<User>) {
    try {
      const updatedUser = await this.usersService.updateUser(userId, updateData);
      const userResponse = updatedUser.toObject();
      delete userResponse.password;
      return userResponse;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post(':id/profile-image')
  @UseInterceptors(FileInterceptor('file', {
    storage: undefined // This ensures memory storage is used
  }))
  async updateProfileImage(
    @Param('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB max
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const imageUrl = await this.usersService.updateProfileImage(userId, file);
    return { url: imageUrl }; // Return as JSON object
  }
}