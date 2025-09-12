/**
 * User Service - Centralized user management and authentication
 * Reduces 35+ getCurrentUser() calls across components
 */

import { User } from '../types';
import { SafeStorage } from '../utils/secureDataManager';

class UserService {
  private static instance: UserService;
  private currentUser: User | null = null;
  private userCache: Map<string, User> = new Map();

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Get current authenticated user with caching (async version)
   */
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const userData = await SafeStorage.getItem('currentUser');
      if (userData) {
        this.currentUser = typeof userData === 'string' ? JSON.parse(userData) : userData;
        return this.currentUser;
      }
    } catch (error) {
      console.error('Error loading current user:', error);
      await SafeStorage.removeItem('currentUser');
    }
    
    return null;
  }

  /**
   * Get current authenticated user synchronously (backward compatibility)
   * Returns cached user or attempts to load from localStorage fallback
   */
  getCurrentUserSync(): User | null {
    if (this.currentUser) {
      return this.currentUser;
    }

    // Fallback to localStorage for immediate sync access during transition
    try {
      const userData = localStorage.getItem('currentUser');
      if (userData) {
        const user = JSON.parse(userData);
        this.currentUser = user; // Cache it
        return user;
      }
      
      // Also check session storage
      const sessionData = sessionStorage.getItem('currentUser');
      if (sessionData) {
        const user = JSON.parse(sessionData);
        this.currentUser = user; // Cache it
        return user;
      }
    } catch (error) {
      console.warn('Error loading user from sync storage:', error);
    }

    return null;
  }

  /**
   * Set current user and update cache
   */
  async setCurrentUser(user: User | null): Promise<void> {
    this.currentUser = user;
    if (user) {
      await SafeStorage.setItem('currentUser', user, {
        tags: ['user-data', 'session'],
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      });
      this.userCache.set(user.id, user);
    } else {
      await SafeStorage.removeItem('currentUser');
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Get user by ID with caching
   */
  getUserById(id: string): User | null {
    if (this.userCache.has(id)) {
      return this.userCache.get(id)!;
    }

    try {
      const users = this.getAllUsers();
      const user = users.find(u => u.id === id) || null;
      if (user) {
        this.userCache.set(id, user);
      }
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    // This method is deprecated - use supabaseUserService.getAllUsers() instead
    console.warn('getAllUsers() is deprecated - use Supabase service instead');
    return [];
  }

  /**
   * Save user
   */
  async saveUser(user: User): Promise<boolean> {
    try {
      const users = await this.getAllUsers();
      const existingIndex = users.findIndex(u => u.id === user.id);
      
      if (existingIndex >= 0) {
        users[existingIndex] = user;
      } else {
        users.push(user);
      }
      
      // localStorage usage removed - use Supabase instead
      this.userCache.set(user.id, user);
      
      // Update current user if it's the same user
      if (this.currentUser?.id === user.id) {
        await this.setCurrentUser(user);
      }
      
      return true;
    } catch (error) {
      console.error('Error saving user:', error);
      return false;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      const users = await this.getAllUsers();
      const filteredUsers = users.filter(u => u.id !== userId);
      
      await SafeStorage.setItem('users', filteredUsers, {
        tags: ['user-data'],
        ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      this.userCache.delete(userId);
      
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  /**
   * Update user's selected country
   */
  updateUserCountry(country: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    const updatedUser = { ...user, selectedCountry: country };
    return this.saveUser(updatedUser);
  }

  /**
   * Check if user has access to country
   */
  async hasCountryAccess(country: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) return false;
    
    return user.role === 'admin' || user.countries.includes(country);
  }

  /**
   * Clear all cached data (for logout)
   */
  clearCache(): void {
    this.currentUser = null;
    this.userCache.clear();
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    this.clearCache();
    await SafeStorage.removeItem('currentUser');
  }
}

// Create singleton instance
const userServiceInstance = UserService.getInstance();

// Export both the class and instance for different usage patterns
export { UserService };
export default userServiceInstance;

// Export compatibility functions for components still using auth.ts patterns
export const getCurrentUserSync = () => userServiceInstance.getCurrentUserSync();
export const isAuthenticatedSync = () => userServiceInstance.getCurrentUserSync() !== null;
export const hasCountryAccessSync = (country: string) => {
  const user = userServiceInstance.getCurrentUserSync();
  if (!user) return false;
  return user.role === 'admin' || user.countries.includes(country);
};