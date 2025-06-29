import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CurrentUserService } from './current-user.service';

// Add interface for Request with user property
interface RequestWithUser extends Request {
  user?: any;
}

@Injectable()
export class CurrentUserMiddleware implements NestMiddleware {
  constructor(private readonly currentUserService: CurrentUserService) {}

  use(req: RequestWithUser, res: Response, next: NextFunction) {
    // Try to extract user from request if it exists (from JWT token)
    try {
      if (req.user) {
        const user = {
          userId: req.user['id'] || req.user['_id'] || req.user['sub'],
          username: req.user['username'],
          email: req.user['email'],
        };
        
        this.currentUserService.setUser(user);
      }
    } catch (error) {
      console.log('Error in CurrentUserMiddleware:', error.message);
    }
    
    next();
  }
}
