/**
 * Real-time Settings Hook - Always Fresh User Settings
 * Replaces Settings component's localStorage with real-time Supabase storage
 * Designed for settings sync across devices and sessions for 50-100 users
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUserSync } from '../utils/authCompat';
import { useNotifications } from '../contexts/NotificationContext';
import { useTestingValidation } from './useTestingValidation';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';

interface UserSettings {
  userId: string;
  soundEnabled: boolean;
  soundVolume: number;
  notificationsEnabled: boolean;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
  compactMode?: boolean;
  showAdvancedFeatures?: boolean;
  lastUpdated: string;
}

interface UseRealtimeSettingsOptions {
  enableRealTime?: boolean;
  enableTesting?: boolean;
}

// Default settings for new users
const DEFAULT_SETTINGS: Omit<UserSettings, 'userId' | 'lastUpdated'> = {
  soundEnabled: true,
  soundVolume: 0.5,
  notificationsEnabled: false,
  theme: 'light',
  language: 'en',
  timezone: 'auto',
  emailNotifications: true,
  pushNotifications: false,
  autoRefresh: true,
  refreshInterval: 30,
  compactMode: false,
  showAdvancedFeatures: false
};

// Real-time settings query - always fresh, no cache
const useRealtimeSettingsQuery = (userId?: string) => {
  return useQuery({
    queryKey: ['realtime-settings', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required for settings');
      
      // Define defaults first
      const defaultSettings: UserSettings = {
        userId,
        ...DEFAULT_SETTINGS,
        lastUpdated: new Date().toISOString()
      };
      
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .eq('user_id', userId); // ⚠️ user_id (userId) FK - NOT userid

        if (error) {
          console.warn('Unable to load app_settings, using defaults:', error.message);
          return defaultSettings;
        }
        
        if (data && data.length > 0) {
          const settings = data[0]; // Get first settings record
          return {
            userId,
            ...DEFAULT_SETTINGS,
            ...(settings.setting_value || {}),
            lastUpdated: settings.updated_at || new Date().toISOString()
          } as UserSettings;
        }
      } catch (err) {
        console.warn('Error querying app_settings:', err);
      }

      // If no settings found, return defaults
      return defaultSettings;
    },
    enabled: !!userId,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });
};

// Optimistic settings mutations
const useOptimisticSettingsMutation = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();

  return useMutation({
    mutationFn: async (action: {
      type: 'update' | 'reset';
      userId: string;
      settings?: Partial<UserSettings>;
    }) => {
      const { userId, settings } = action;

      switch (action.type) {
        case 'update':
          // Upsert settings (insert or update)
          const { data, error } = await supabase
            .from('app_settings')
            .upsert({
              user_id: userId, // ⚠️ user_id (userId) FK - NOT userid
              setting_key: 'user_preferences', // ⚠️ setting_key (settingKey) - NOT settingkey
              setting_value: settings // ⚠️ setting_value (settingValue) - NOT settingvalue
            })
            .select()
            .single();

          if (error) throw error;
          return data;

        case 'reset':
          // Reset to defaults
          const defaultSettings: UserSettings = {
            userId,
            ...DEFAULT_SETTINGS,
            lastUpdated: new Date().toISOString()
          };

          const { data: resetData, error: resetError } = await supabase
            .from('app_settings')
            .upsert({
              user_id: userId,
              setting_key: 'user_preferences',
              setting_value: defaultSettings
            })
            .select()
            .single();

          if (resetError) throw resetError;
          return resetData;

        default:
          throw new Error('Invalid settings action');
      }
    },
    onSuccess: (result, action) => {
      // Invalidate and refetch settings data
      queryClient.invalidateQueries({ queryKey: ['realtime-settings', action.userId] });

      // Show success notification for certain actions
      if (action.type === 'reset') {
        addNotification({
          title: 'Settings Reset',
          message: 'Settings have been reset to defaults',
          type: 'success',
          });
      }
    },
    onError: (error, action) => {

      addNotification({
        title: 'Settings Error',
        message: `Failed to ${action.type} settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
      });
    }
  });
};

export const useRealtimeSettings = (options: UseRealtimeSettingsOptions = {}) => {
  const {
    enableRealTime = true, // eslint-disable-line @typescript-eslint/no-unused-vars
    enableTesting = false
  } = options;

  const currentUser = getCurrentUserSync();
  const userId = currentUser?.id;

  const [localError, setLocalError] = useState<string | null>(null);

  // Real-time settings query
  const {
    data: settings,
    isLoading,
    error,
    isError,
    isSuccess,
    refetch
  } = useRealtimeSettingsQuery(userId);

  // Settings mutations
  const settingsMutation = useOptimisticSettingsMutation();

  // Testing validation
  const testing = useTestingValidation({
    componentName: 'useRealtimeSettings',
    enableTesting
  });

  // Refresh settings - forces fresh data fetch
  const refreshSettings = useCallback(async () => {
    if (!userId) return;
    setLocalError(null);

    if (enableTesting) {
      testing.recordUpdate();
    }

    return refetch();
  }, [userId, refetch, enableTesting, testing]);

  // Update specific setting
  const updateSetting = useCallback(async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    if (!userId) throw new Error('User ID required to update settings');
    setLocalError(null);

    try {
      const result = await settingsMutation.mutateAsync({
        type: 'update',
        userId,
        settings: { [key]: value }
      });

      if (enableTesting) {
        testing.recordUpdate();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update setting';
      setLocalError(errorMessage);
      throw error;
    }
  }, [userId, settingsMutation, enableTesting, testing]);

  // Update multiple settings at once
  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    if (!userId) throw new Error('User ID required to update settings');
    setLocalError(null);

    try {
      const result = await settingsMutation.mutateAsync({
        type: 'update',
        userId,
        settings: newSettings
      });

      if (enableTesting) {
        testing.recordUpdate();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
      setLocalError(errorMessage);
      throw error;
    }
  }, [userId, settingsMutation, enableTesting, testing]);

  // Reset settings to defaults
  const resetSettings = useCallback(async () => {
    if (!userId) throw new Error('User ID required to reset settings');
    setLocalError(null);

    try {
      const result = await settingsMutation.mutateAsync({
        type: 'reset',
        userId
      });

      if (enableTesting) {
        testing.recordUpdate();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset settings';
      setLocalError(errorMessage);
      throw error;
    }
  }, [userId, settingsMutation, enableTesting, testing]);

  // Convenience getters for common settings
  const getSetting = useCallback(<K extends keyof UserSettings>(key: K): UserSettings[K] | undefined => {
    return settings?.[key];
  }, [settings]);

  const isSoundEnabled = getSetting('soundEnabled') ?? DEFAULT_SETTINGS.soundEnabled;
  const soundVolume = getSetting('soundVolume') ?? DEFAULT_SETTINGS.soundVolume;
  const notificationsEnabled = getSetting('notificationsEnabled') ?? DEFAULT_SETTINGS.notificationsEnabled;
  const theme = getSetting('theme') ?? DEFAULT_SETTINGS.theme;
  const autoRefresh = getSetting('autoRefresh') ?? DEFAULT_SETTINGS.autoRefresh;
  const refreshInterval = getSetting('refreshInterval') ?? DEFAULT_SETTINGS.refreshInterval;

  // Component validation for testing (manual only - no automatic side effects)
  const validateComponent = useCallback(async (): Promise<boolean> => {
    if (!enableTesting || !userId) return true;
    
    try {
      // Test settings fetching (read-only validation)
      const testSettings = await refetch();
      if (!testSettings.data || typeof testSettings.data !== 'object') {
        throw new Error('Settings data is invalid');
      }

      // Validate data structure without making changes
      const requiredFields = ['userId', 'soundEnabled', 'soundVolume', 'lastUpdated'];
      for (const field of requiredFields) {
        if (!(field in testSettings.data)) {
          throw new Error(`Required field ${field} missing from settings`);
        }
      }

      // Test functionality without causing side effects
      testing.recordValidation(true);
      return true;
    } catch (error) {
      testing.recordValidation(false, error instanceof Error ? error.message : 'Validation failed');
      return false;
    }
  }, [refetch, userId, enableTesting, testing]);

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
    settings,
    isLoading,
    error: error || localError,
    isError,
    isSuccess,

    // Convenience getters
    isSoundEnabled,
    soundVolume,
    notificationsEnabled,
    theme,
    autoRefresh,
    refreshInterval,

    // Actions
    refreshSettings,
    updateSetting,
    updateSettings,
    resetSettings,
    getSetting,

    // Testing
    validateComponent,
    getTestingReport,

    // Status
    isMutating: settingsMutation.isPending,
    lastUpdated: settings?.lastUpdated ? new Date(settings.lastUpdated) : new Date()
  };
};