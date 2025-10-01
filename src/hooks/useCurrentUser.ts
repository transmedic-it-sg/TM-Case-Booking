/**
 * useCurrentUser Hook - Replaces 35+ getCurrentUser() calls
 * Provides reactive user state with automatic updates
 */

import { useState, useEffect } from 'react';
import { User } from '../types';
import { userService } from '../services';

export const useCurrentUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await userService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const updateUser = (updatedUser: User | null) => {
    userService.setCurrentUser(updatedUser);
    setUser(updatedUser);
  };

  const logout = () => {
    userService.logout();
    setUser(null);
  };

  const updateUserCountry = async (country: string) => {
    const success = userService.updateUserCountry(country);
    if (success) {
      const updatedUser = await userService.getCurrentUser();
      setUser(updatedUser);
    }
    return success;
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    updateUser,
    logout,
    updateUserCountry,
    hasCountryAccess: (country: string) => userService.hasCountryAccess(country)
  };
};