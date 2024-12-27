import {
  Body,
  Controller,
  Post,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from '../Auth.service';
import { LocalAuthGuard } from '../local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const user = await this.authService.validateUser(
        loginDto.email,
        loginDto.password,
      );

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const loginResult = await this.authService.login(user);

      // Set HTTP-only cookie with the JWT token
      res.cookie('authToken', loginResult.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/', // Ensure cookie is available for all paths
      });

      // Return user info without the token
      return {
        userId: loginResult.userId,
        email: loginResult.email,
        username: user.username,
      };
    } catch (error) {
      throw new UnauthorizedException(
        error.message || 'Invalid email or password'
      );
    }
  }

  @Post('refresh-token')
  @UseGuards(LocalAuthGuard)
  async refreshToken(@Request() req, @Res({ passthrough: true }) res: Response) {
    try {
      const user = req.user;
      const loginResult = await this.authService.login(user);

      res.cookie('authToken', loginResult.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });

      return { message: 'Token refreshed successfully' };
    } catch (error) {
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    try {
      res.clearCookie('authToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      return { message: 'Logged out successfully' };
    } catch (error) {
      return { message: 'Logout successful' }; // Still return success even if cookie clear fails
    }
  }

  @Post('check-auth')
  @UseGuards(LocalAuthGuard)
  async checkAuth(@Request() req) {
    try {
      const user = req.user;
      return {
        isAuthenticated: true,
        user: {
          userId: user._id,
          email: user.email,
          username: user.username,
        },
      };
    } catch (error) {
      return {
        isAuthenticated: false,
      };
    }
  }
}