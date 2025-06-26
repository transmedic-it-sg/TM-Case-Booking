/**
 * User Service - Centralized user management and authentication
 * Reduces 35+ getCurrentUser() calls across components
 */

import { User } from '../types';

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
   * Get current authenticated user with caching
   */
  getCurrentUser(): User | null {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const userData = localStorage.getItem('currentUser');
      if (userData) {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Error loading current user:', error);
      localStorage.removeItem('currentUser');
    }
    
    return null;
  }

  /**
   * Set current user and update cache
   */
  setCurrentUser(user: User | null): void {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.userCache.set(user.id, user);
    } else {
      localStorage.removeItem('currentUser');
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
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
  getAllUsers(): User[] {
    try {
      const usersData = localStorage.getItem('users');
      return usersData ? JSON.parse(usersData) : [];
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }

  /**
   * Save user
   */
  saveUser(user: User): boolean {
    try {
      const users = this.getAllUsers();
      const existingIndex = users.findIndex(u => u.id === user.id);
      
      if (existingIndex >= 0) {
        users[existingIndex] = user;
      } else {
        users.push(user);
      }
      
      localStorage.setItem('users', JSON.stringify(users));
      this.userCache.set(user.id, user);
      
      // Update current user if it's the same user
      if (this.currentUser?.id === user.id) {
        this.setCurrentUser(user);
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
  deleteUser(userId: string): boolean {
    try {
      const users = this.getAllUsers();
      const filteredUsers = users.filter(u => u.id !== userId);
      
      localStorage.setItem('users', JSON.stringify(filteredUsers));
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
  hasCountryAccess(country: string): boolean {
    const user = this.getCurrentUser();
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
  logout(): void {
    this.clearCache();
    localStorage.removeItem('currentUser');
  }
}

export default UserService.getInstance();