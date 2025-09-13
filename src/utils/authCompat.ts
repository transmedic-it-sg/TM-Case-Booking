/**
 * Authentication Compatibility Layer
 * Provides backward compatibility for components during migration
 */

import UserService from '../services/userService';

// Re-export all auth functions for backward compatibility
export * from './auth';

// Override getCurrentUser to provide synchronous access
export const getCurrentUser = (): any => {
  try {
    return UserService.getCurrentUserSync();
  } catch (error) {
    console.warn('Failed to get current user synchronously:', error);
    return null;
  }
};

const authCompat = {
  getCurrentUser
};

export default authCompat;