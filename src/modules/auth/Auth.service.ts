import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && await user.comparePassword(pass)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
  
    const payload = { username: user.username, sub: user._id };
  
    return {
      access_token: this.jwtService.sign(payload),
      userId:user._doc._id,
      username:user._doc.username,
    };
  }
  
  
}
