import { Injectable } from '@nestjs/common';

/**
 * Helper function to set user information in the ActivityModule
 * without creating circular dependencies
 * 
 * This function should be called whenever you want to create an activity record
 * with the current user information.
 * 
 * @param req - Express request object which may contain user information
 * @param activityService - The ActivityService instance from your module
 */
export function setActivityUser(req: any, activityService: any): void {
  try {
    if (req?.user) {
      // If we have user info in the request
      const currentUserService = activityService['currentUserService'];
      
      if (currentUserService && typeof currentUserService.setUser === 'function') {
        currentUserService.setUser({
          userId: req.user.id || req.user._id || req.user.sub,
          username: req.user.username,
          email: req.user.email
        });
      }
    }
  } catch (error) {
    console.error('Error setting activity user:', error.message);
  }
}
