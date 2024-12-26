import { Controller, Post, Get, Body, BadRequestException, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('register')
  async register(@Body() body) {
    const { email, username, password, profileImage } = body;

    // Validate required fields
    if (!password || !email || !username) {
      throw new BadRequestException('Email, username, and password are required');
    }

    try {
      // Create a new user
      const newUser = await this.usersService.create(email, username, password, profileImage);
      return { message: 'User registered successfully', userId: newUser._id };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('login')
  async login(@Body() body) {
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    // Find the user by email
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }

    // Generate a JWT token
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
      return user;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
