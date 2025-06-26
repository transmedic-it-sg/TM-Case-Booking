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
    const currentUser = userService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const updateUser = (updatedUser: User | null) => {
    userService.setCurrentUser(updatedUser);
    setUser(updatedUser);
  };

  const logout = () => {
    userService.logout();
    setUser(null);
  };

  const updateUserCountry = (country: string) => {
    const success = userService.updateUserCountry(country);
    if (success) {
      const updatedUser = userService.getCurrentUser();
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