/**
 * User Service - Centralized user management and authentication
 * Reduces 35+ getCurrentUser() calls across components
 */

import { User } from '../types';
import { supabase } from '../lib/supabase';

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
   * Get current authenticated user from Supabase session (no local storage)
   */
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return null;
      }

      // Fetch user details from profiles table
      const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !user) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      this.currentUser = user;
      return this.currentUser;
    } catch (error) {
      console.error('Error loading current user:', error);
      return null;
    }
  }

  /**
   * Get current authenticated user synchronously (backward compatibility)
   * PRODUCTION SAFE: Returns only cached user, no localStorage fallbacks
   */
  getCurrentUserSync(): User | null {
    // ONLY return cached user - no localStorage fallbacks to prevent stale data
    return this.currentUser;
  }

  /**
   * Set current user and update cache (no storage - using Supabase session)
   */
  async setCurrentUser(user: User | null): Promise<void> {
    this.currentUser = user;
    if (user) {
      this.userCache.set(user.id, user);
    }
    // No storage needed - Supabase handles session management
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
  async getUserById(id: string): Promise<User | null> {
    if (this.userCache.has(id)) {
      return this.userCache.get(id)!;
    }

    try {
      const users = await this.getAllUsers();
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
      // Delete user from Supabase database directly instead of local storage
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        throw error;
      }

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
    const user = this.getCurrentUserSync();
    if (!user) return false;

    const updatedUser = { ...user, selectedCountry: country };
    this.setCurrentUser(updatedUser);
    return true;
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
   * Logout user (Supabase handles session clearing)
   */
  async logout(): Promise<void> {
    this.clearCache();
    // Supabase auth handles session management
    await supabase.auth.signOut();
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