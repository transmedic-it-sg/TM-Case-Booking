/**
 * Real-time Permissions Hook - Always Fresh Permission Data
 * Replaces PermissionMatrixPage's direct Supabase calls with real-time queries
 * Designed for live permission management across multiple admin users
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { 
  getSupabasePermissions, 
  saveSupabasePermissions, 
  updateSupabasePermission, 
  resetSupabasePermissions 
} from '../utils/supabasePermissionService';
import { getAllMatrixRoles, permissionActions } from '../data/permissionMatrixData';
import { clearPermissionsCache } from '../utils/permissions';
import { useNotifications } from '../contexts/NotificationContext';
import { useTestingValidation } from './useTestingValidation';
import { Permission } from '../components/PermissionMatrix'; // Keep Permission type for reducer

interface UseRealtimePermissionsOptions {
  enableRealTime?: boolean;
  enableTesting?: boolean;
}

// Real-time permissions query - optimized caching to prevent loops
const useRealtimePermissionsQuery = () => {
  return useQuery({
    queryKey: ['realtime-permissions'],
    queryFn: async () => {
      console.log('🔄 Fetching fresh permissions from database...');
      const permissions = await getSupabasePermissions();
      console.log(`✅ Fresh permissions loaded: ${permissions.length} permissions from database`);
      return permissions;
    },
    staleTime: 1000 * 30, // Consider data fresh for 30 seconds to reduce loops
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnMount: false, // FIXED: Don't refetch on every mount
    refetchOnWindowFocus: false, // FIXED: Don't refetch on focus to prevent loops
    refetchOnReconnect: true
  });
};

// Real-time roles query - optimized caching to prevent loops
const useRealtimeRolesQuery = () => {
  return useQuery({
    queryKey: ['realtime-roles'],
    queryFn: async () => {
      console.log('🔄 Fetching fresh roles...');
      const roles = getAllMatrixRoles(); // This includes both static and custom roles
      console.log(`✅ Fresh roles loaded: ${roles.length} roles`);
      return roles;
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes (roles don't change often)
    gcTime: 1000 * 60 * 10, // Cache for 10 minutes
    refetchOnMount: false, // FIXED: Don't refetch on every mount
    refetchOnWindowFocus: false, // FIXED: Don't refetch on focus to prevent loops
    refetchOnReconnect: true
  });
};

// Real-time permission actions query - static data with aggressive caching
const useRealtimePermissionActionsQuery = () => {
  return useQuery({
    queryKey: ['realtime-permission-actions'],
    queryFn: async () => {
      console.log('🔄 Fetching permission actions...');
      const actions = permissionActions;
      console.log(`✅ Permission actions loaded: ${actions.length} actions`);
      return actions;
    },
    staleTime: 1000 * 60 * 10, // Consider data fresh for 10 minutes (static data)
    gcTime: 1000 * 60 * 30, // Cache for 30 minutes (static data)
    refetchOnMount: false, // FIXED: Don't refetch on every mount
    refetchOnWindowFocus: false, // FIXED: Don't refetch on focus to prevent loops
    refetchOnReconnect: false // No need to refetch static data on reconnect
  });
};

// Optimistic permission mutations
const useOptimisticPermissionMutation = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  
  return useMutation({
    mutationFn: async (action: {
      type: 'update' | 'save' | 'reset';
      actionId?: string;
      roleId?: string;
      allowed?: boolean;
      permissions?: Permission[];
    }) => {
      switch (action.type) {
        case 'update':
          return await updateSupabasePermission(
            action.actionId!,
            action.roleId!,
            action.allowed!
          );
        case 'save':
          return await saveSupabasePermissions(action.permissions!);
        case 'reset':
          return await resetSupabasePermissions();
        default:
          throw new Error('Invalid permission action');
      }
    },
    onSuccess: (result, action) => {
      // Invalidate and refetch permission data
      queryClient.invalidateQueries({ queryKey: ['realtime-permissions'] });
      
      // Clear the old permissions cache to ensure fresh data
      clearPermissionsCache();
      
      // Show success notification
      const actionText = {
        update: 'Permission updated successfully',
        save: 'Permissions saved successfully',
        reset: 'Permissions reset to defaults successfully'
      }[action.type];
      
      addNotification({
        title: 'Permission Management',
        message: actionText,
        type: 'success'
      });
    },
    onError: (error, action) => {
      console.error(`❌ Failed to ${action.type} permission:`, error);
      
      addNotification({
        title: 'Permission Management Error',
        message: `Failed to ${action.type} permission: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  });
};

export const useRealtimePermissions = (options: UseRealtimePermissionsOptions = {}) => {
  const { 
    enableRealTime = true, // eslint-disable-line @typescript-eslint/no-unused-vars
    enableTesting = false 
  } = options;
  
  const [localError, setLocalError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Real-time queries
  const { 
    data: permissions = [], 
    isLoading: permissionsLoading, 
    error: permissionsError, 
    refetch: refetchPermissions 
  } = useRealtimePermissionsQuery();
  
  const { 
    data: roles = [], 
    isLoading: rolesLoading, 
    error: rolesError, 
    refetch: refetchRoles 
  } = useRealtimeRolesQuery();
  
  const { 
    data: actions = [], 
    isLoading: actionsLoading, 
    error: actionsError, 
    refetch: refetchActions 
  } = useRealtimePermissionActionsQuery();
  
  // Permission mutations
  const permissionMutation = useOptimisticPermissionMutation();
  
  // Testing validation
  const testing = useTestingValidation({
    componentName: 'useRealtimePermissions',
    enableTesting
  });
  
  // Combined loading state
  const isLoading = permissionsLoading || rolesLoading || actionsLoading;
  const error = permissionsError || rolesError || actionsError || localError;
  
  // Refresh permissions - forces fresh data fetch
  const refreshPermissions = useCallback(async () => {
    console.log('🔄 Manually refreshing permissions...');
    setLocalError(null);
    
    if (enableTesting) {
      testing.recordUpdate();
    }
    
    await Promise.all([
      refetchPermissions(),
      refetchRoles(),
      refetchActions()
    ]);
  }, [refetchPermissions, refetchRoles, refetchActions, enableTesting, testing]);
  
  // Update single permission
  const updatePermission = useCallback(async (actionId: string, roleId: string, allowed: boolean) => {
    console.log(`🔐 Updating permission ${actionId} for role ${roleId} to ${allowed}...`);
    setLocalError(null);
    
    try {
      const result = await permissionMutation.mutateAsync({ 
        type: 'update', 
        actionId,
        roleId,
        allowed
      });
      
      if (enableTesting) {
        testing.recordUpdate();
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update permission';
      setLocalError(errorMessage);
      console.error(`❌ Failed to update permission ${actionId}:`, error);
      throw error;
    }
  }, [permissionMutation, enableTesting, testing]);
  
  // Save all permissions
  const savePermissions = useCallback(async (updatedPermissions: Permission[]) => {
    console.log(`🔐 Saving ${updatedPermissions.length} permissions...`);
    setLocalError(null);
    
    try {
      const result = await permissionMutation.mutateAsync({ 
        type: 'save', 
        permissions: updatedPermissions
      });
      
      if (enableTesting) {
        testing.recordUpdate();
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save permissions';
      setLocalError(errorMessage);
      console.error('❌ Failed to save permissions:', error);
      throw error;
    }
  }, [permissionMutation, enableTesting, testing]);
  
  // Reset permissions to defaults
  const resetPermissions = useCallback(async () => {
    console.log('🔄 Resetting permissions to defaults...');
    setLocalError(null);
    
    try {
      const result = await permissionMutation.mutateAsync({ 
        type: 'reset'
      });
      
      if (enableTesting) {
        testing.recordUpdate();
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset permissions';
      setLocalError(errorMessage);
      console.error('❌ Failed to reset permissions:', error);
      throw error;
    }
  }, [permissionMutation, enableTesting, testing]);
  
  // Toggle editing mode
  const toggleEditing = useCallback(() => {
    console.log(`🎛️ Toggling editing mode: ${!isEditing}`);
    setIsEditing(!isEditing);
    setLocalError(null);
  }, [isEditing]);
  
  // Check if a permission exists
  const hasPermission = useCallback((actionId: string, roleId: string): boolean => {
    const permission = permissions.find(p => p.actionId === actionId && p.roleId === roleId);
    return permission ? permission.allowed : false;
  }, [permissions]);
  
  // Component validation for testing
  const validateComponent = useCallback(async (): Promise<boolean> => {
    if (!enableTesting) return true;
    
    console.log('🧪 Validating useRealtimePermissions component...');
    
    try {
      // Test permissions fetching
      const testPermissions = await refetchPermissions();
      if (!Array.isArray(testPermissions.data)) {
        throw new Error('Permissions data is not an array');
      }
      
      // Test roles fetching
      const testRoles = await refetchRoles();
      if (!Array.isArray(testRoles.data)) {
        throw new Error('Roles data is not an array');
      }
      
      // Test actions fetching
      const testActions = await refetchActions();
      if (!Array.isArray(testActions.data)) {
        throw new Error('Actions data is not an array');
      }
      
      // Test functionality
      testing.recordValidation(true);
      console.log('✅ useRealtimePermissions validation passed');
      return true;
    } catch (error) {
      testing.recordValidation(false, error instanceof Error ? error.message : 'Validation failed');
      console.error('❌ useRealtimePermissions validation failed:', error);
      return false;
    }
  }, [refetchPermissions, refetchRoles, refetchActions, enableTesting, testing]);
  
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
    permissions,
    roles,
    actions,
    isLoading,
    error,
    isEditing,
    
    // Actions
    refreshPermissions,
    updatePermission,
    savePermissions,
    resetPermissions,
    toggleEditing,
    hasPermission,
    
    // Testing
    validateComponent,
    getTestingReport,
    
    // Status
    isMutating: permissionMutation.isPending,
    lastUpdated: new Date()
  };
};