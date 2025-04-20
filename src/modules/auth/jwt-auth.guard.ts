// auth/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header not found');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    try {
      const payload = this.jwtService.verify(token);
      
      // Ensure the payload has the required fields
      if (!payload.id && !payload._id && !payload.userId && !payload.sub) {
        throw new UnauthorizedException('Invalid token payload: no user ID found');
      }

      // Attach the user payload to the request object
      request.user = payload;
      
      // Normalize the user ID field
      request.user.id = payload.id || payload._id || payload.userId || payload.sub;
      
      return true;
    } catch (error) {
      console.error('JWT validation error:', error.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}