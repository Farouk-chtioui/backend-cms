import { Injectable } from '@nestjs/common';

export interface UserContext {
  userId?: string;
  username?: string;
  email?: string;
}

@Injectable()
export class CurrentUserService {
  private userContext: UserContext = {};

  setUser(user: UserContext): void {
    this.userContext = user || {};
  }

  getUser(): UserContext {
    return this.userContext;
  }

  clear(): void {
    this.userContext = {};
  }
}
