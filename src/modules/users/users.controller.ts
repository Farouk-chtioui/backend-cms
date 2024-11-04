import { Controller, Post, Get, Body, BadRequestException, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('register')
  async register(@Body() body) {
    const { password, email } = body;
    if (!password || !email) {
      throw new BadRequestException('Password and email are required');
    }
    try {
      const newUser = await this.usersService.create(email, password);
      return { message: 'User registered successfully', userId: newUser._id };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get(':userId')
  async getUserById(@Param('userId') userId: string) {
    return this.usersService.findOneById(userId);
  }
}
