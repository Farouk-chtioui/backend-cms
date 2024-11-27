import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // Validate the user's credentials
  async validateUser(email: string, pass: string): Promise<any> {
    // Find the user by email
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Remove sensitive data from the result
    const { password, ...result } = user.toObject();
    return result;
  }

  // Generate JWT token for a logged-in user
  async login(user: any) {
    const payload = { email: user.email, sub: user._id }; // sub is conventionally the user ID

    return {
      access_token: this.jwtService.sign(payload),
      userId: user._id,
      email: user.email,
    };
  }
}
