import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  handleRequest(err: any, user: any, info: any) {
    // You can throw an error if you need to override the default error handling
    if (err || !user) {
      throw err || new UnauthorizedException(info?.message || 'Invalid credentials');
    }
    return user;
  }
}
