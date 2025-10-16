/**
 * Real-time Users Hook - Always Fresh User Data
 * Replaces UserManagement's direct Supabase calls with real-time queries
 * Designed for 50-100 concurrent admin users
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { User } from '../types';
import {
  getSupabaseUsers,
  addSupabaseUser,
  updateSupabaseUser,
  deleteSupabaseUser,
  toggleUserEnabled,
  resetSupabaseUserPassword
} from '../utils/supabaseUserService';
import { useNotifications } from '../contexts/NotificationContext';
import { useTestingValidation } from './useTestingValidation';

interface UseRealtimeUsersOptions {
  enableRealTime?: boolean;
  enableTesting?: boolean;
  filters?: {
    country?: string;
    role?: string;
    status?: 'enabled' | 'disabled' | 'all';
    search?: string;
  };
}

// Real-time users query - always fresh, no cache
const useRealtimeUsersQuery = (filters?: UseRealtimeUsersOptions['filters']) => {
  return useQuery({
    queryKey: ['realtime-users', filters],
    queryFn: async () => {
      const users = await getSupabaseUsers();

      // Apply filters on fresh data
      let filteredUsers = users;

      if (filters?.country) {
        filteredUsers = filteredUsers.filter(user =>
          user.countries?.includes(filters.country!) ||
          user.selectedCountry === filters.country
        );
      }

      if (filters?.role) {
        filteredUsers = filteredUsers.filter(user => user.role === filters.role);
      }

      if (filters?.status !== 'all') {
        const isEnabled = filters?.status === 'enabled';
        filteredUsers = filteredUsers.filter(user => user.enabled === isEnabled);
      }

      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredUsers = filteredUsers.filter(user =>
          user.name.toLowerCase().includes(searchTerm) ||
          user.username.toLowerCase().includes(searchTerm) ||
          user.email?.toLowerCase().includes(searchTerm)
        );
      }return filteredUsers;
    },
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });
};

// Optimistic user mutations
const useOptimisticUserMutation = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();

  return useMutation({
    mutationFn: async (action: {
      type: 'add' | 'update' | 'delete' | 'toggle' | 'resetPassword';
      user?: Partial<User>;
      userId?: string;
      newPassword?: string;
    }) => {
      switch (action.type) {
        case 'add':
          return await addSupabaseUser(action.user! as Omit<User, 'id'>);
        case 'update':
          return await updateSupabaseUser(action.userId!, action.user! as Partial<User>);
        case 'delete':
          return await deleteSupabaseUser(action.userId!);
        case 'toggle':
          // For toggle, we need the current enabled state - get it from the action data
          const currentEnabled = action.user?.enabled ?? true;
          return await toggleUserEnabled(action.userId!, !currentEnabled);
        case 'resetPassword':
          return await resetSupabaseUserPassword(action.userId!, action.newPassword!);
        default:
          throw new Error('Invalid user action');
      }
    },
    onSuccess: async (result, action) => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['realtime-users'] });

      // CRITICAL FIX: Don't show automatic notifications for 'add' operations
      // Let the calling component handle success messages to avoid duplicate notifications
      if (action.type !== 'add') {
        const actionText = {
          update: 'User updated successfully',
          delete: 'User deleted successfully',
          toggle: 'User status updated successfully',
          resetPassword: 'Password reset successfully'
        }[action.type];

        if (actionText) {
          await addNotification({
            title: 'User Management',
            message: actionText,
            type: 'success'
          });
        }
      }
    },
    onError: async (error, action) => {
      // CRITICAL FIX: Don't show automatic notifications for 'add' operations
      // Let the calling component handle error messages to avoid duplicate notifications
      if (action.type !== 'add') {
        await addNotification({
          title: 'User Management Error',
          message: `Failed to ${action.type} user: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error'
        });
      }
    }
  });
};

export const useRealtimeUsers = (options: UseRealtimeUsersOptions = {}) => {
  const {
    enableRealTime = true, // eslint-disable-line @typescript-eslint/no-unused-vars
    enableTesting = false,
    filters
  } = options;

  const [localError, setLocalError] = useState<string | null>(null);

  // Real-time users query
  const {
    data: users = [],
    isLoading,
    error,
    isError,
    isSuccess,
    refetch
  } = useRealtimeUsersQuery(filters);

  // User mutations
  const userMutation = useOptimisticUserMutation();

  // Testing validation
  const testing = useTestingValidation({
    componentName: 'useRealtimeUsers',
    enableTesting
  });

  // Refresh users - forces fresh data fetch
  const refreshUsers = useCallback(async () => {setLocalError(null);

    if (enableTesting) {
      testing.recordUpdate();
    }

    return refetch();
  }, [refetch, enableTesting, testing]);

  // Add user
  const addUser = useCallback(async (userData: Partial<User>) => {setLocalError(null);

    try {
      const result = await userMutation.mutateAsync({
        type: 'add',
        user: userData
      });

      if (enableTesting) {
        testing.recordUpdate();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add user';
      setLocalError(errorMessage);
      throw error;
    }
  }, [userMutation, enableTesting, testing]);

  // Update user
  const updateUser = useCallback(async (userId: string, userData: Partial<User>) => {setLocalError(null);

    try {
      const result = await userMutation.mutateAsync({
        type: 'update',
        userId,
        user: userData
      });

      if (enableTesting) {
        testing.recordUpdate();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      setLocalError(errorMessage);
      throw error;
    }
  }, [userMutation, enableTesting, testing]);

  // Delete user
  const deleteUser = useCallback(async (userId: string) => {setLocalError(null);

    try {
      const result = await userMutation.mutateAsync({
        type: 'delete',
        userId
      });

      if (enableTesting) {
        testing.recordUpdate();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      setLocalError(errorMessage);
      throw error;
    }
  }, [userMutation, enableTesting, testing]);

  // Toggle user enabled/disabled
  const toggleUser = useCallback(async (userId: string) => {setLocalError(null);

    try {
      const result = await userMutation.mutateAsync({
        type: 'toggle',
        userId
      });

      if (enableTesting) {
        testing.recordUpdate();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle user';
      setLocalError(errorMessage);
      throw error;
    }
  }, [userMutation, enableTesting, testing]);

  // Reset user password
  const resetUserPassword = useCallback(async (userId: string, newPassword: string) => {// Password details not logged for security
    setLocalError(null);

    try {
      const result = await userMutation.mutateAsync({
        type: 'resetPassword',
        userId,
        newPassword
      });

      if (enableTesting) {
        testing.recordUpdate();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      setLocalError(errorMessage);
      throw error;
    }
  }, [userMutation, enableTesting, testing]);

  // Component validation for testing
  const validateComponent = useCallback(async (): Promise<boolean> => {
    if (!enableTesting) return true;try {
      // Test data fetching
      const testUsers = await refetch();
      if (!Array.isArray(testUsers.data)) {
        throw new Error('Users data is not an array');
      }

      // Test functionality
      testing.recordValidation(true);return true;
    } catch (error) {
      testing.recordValidation(false, error instanceof Error ? error.message : 'Validation failed');
      return false;
    }
  }, [refetch, enableTesting, testing]);

  // Get testing report
  const getTestingReport = useCallback(() => {
    if (!enableTesting) return 'Testing disabled';

    if (testing) {
      return testing.generateReport();
    }
    return 'Testing not available';
  }, [enableTesting, testing]);

  // Return hook interface
  return {
    // Data
    users,
    isLoading,
    error: error || localError,
    isError,
    isSuccess,

    // Actions
    refreshUsers,
    addUser,
    updateUser,
    deleteUser,
    toggleUser,
    resetUserPassword,

    // Testing
    validateComponent,
    getTestingReport,

    // Status
    isMutating: userMutation.isPending,
    lastUpdated: new Date()
  };
};