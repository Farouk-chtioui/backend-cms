import { Controller, Post, Get, Body, BadRequestException, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('register')
  async register(@Body() body) {
    const { username, password } = body;
    if (!username || !password) {
      throw new BadRequestException('Username and password are required');
    }
    try {
      const newUser = await this.usersService.create(username, password);
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
