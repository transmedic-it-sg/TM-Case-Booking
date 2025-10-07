/**
 * App Version Manager - Using Supabase
 * Handles app version updates with automatic logout when version changes
 * NO localStorage - uses Supabase app_settings table
 */

import { getAppVersion } from './version';
import { logout } from './auth';
import { supabase } from '../lib/supabase';

const USER_SESSION_KEY = 'currentUser';

export interface VersionCheckResult {
  versionChanged: boolean;
  currentVersion: string;
  storedVersion: string | null;
  userLoggedIn: boolean;
}

/**
 * Get stored version from Supabase
 */
const getStoredVersion = async (): Promise<string | null> => {
  try {
    const { userService } = await import('../services');
    const user = await userService.getCurrentUser();
    
    if (!user?.id) {
      console.log('No user authenticated for version check');
      return null;
    }
    
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'client_app_version')
      .eq('user_id', user?.id || null)
      .single();
    
    if (error || !data) return null;
    return data.setting_value as string;
  } catch (error) {
    console.error('Error getting stored version:', error);
    return null;
  }
};

/**
 * Update stored version in Supabase
 */
const setStoredVersion = async (version: string): Promise<void> => {
  try {
    const { userService } = await import('../services');
    const user = await userService.getCurrentUser();
    
    if (!user?.id) {
      console.log('No user authenticated for version update');
      return;
    }
    
    // First check if setting exists for this user
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('setting_key', 'client_app_version')
      .eq('user_id', user?.id || null)
      .single();
    
    if (existing) {
      // Update existing
      await supabase
        .from('app_settings')
        .update({
          setting_value: version,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'client_app_version')
        .eq('user_id', user?.id || null);
    } else {
      // Insert new
      await supabase
        .from('app_settings')
        .insert({
          user_id: user?.id || null,
          setting_key: 'client_app_version',
          setting_value: version,
          description: 'Client application version for update detection',
          updated_at: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Failed to update stored version:', error);
  }
};

/**
 * Check if app version has changed and user is logged in
 */
export const checkAppVersionUpdate = async (): Promise<VersionCheckResult> => {
  try {
    const currentVersion = getAppVersion();
    const storedVersion = await getStoredVersion();
    const userSession = sessionStorage.getItem(USER_SESSION_KEY);
    const userLoggedIn = !!userSession;

    const versionChanged = storedVersion !== null && storedVersion !== currentVersion;

    return {
      versionChanged,
      currentVersion,
      storedVersion,
      userLoggedIn
    };
  } catch (error) {
    return {
      versionChanged: false,
      currentVersion: getAppVersion(),
      storedVersion: null,
      userLoggedIn: false
    };
  }
};

/**
 * Update stored app version
 */
export const updateStoredAppVersion = async (): Promise<void> => {
  try {
    const currentVersion = getAppVersion();
    await setStoredVersion(currentVersion);
  } catch (error) {
    // Failed to update app version
  }
};

/**
 * Initialize version manager and check for updates
 */
export const initializeVersionManager = async (): Promise<VersionCheckResult> => {
  const versionCheck = await checkAppVersionUpdate();
  
  // If this is first time or no stored version, just store current version
  if (versionCheck.storedVersion === null) {
    await updateStoredAppVersion();
    return {
      versionChanged: false,
      currentVersion: getAppVersion(),
      storedVersion: null,
      userLoggedIn: versionCheck.userLoggedIn
    };
  }

  return versionCheck;
};

/**
 * Handle version update with automatic logout for logged-in users
 */
export const handleVersionUpdate = async (): Promise<void> => {
  try {
    // Update stored version first
    await updateStoredAppVersion();
    
    // Check if user is logged in
    const userSession = sessionStorage.getItem(USER_SESSION_KEY);
    if (userSession) {
      // Force logout for logged-in users
      await logout();
      
      // Clear all storage to ensure clean state
      sessionStorage.clear();
      
      // Reload the page to get fresh version
      window.location.reload();
    } else {
      // For non-logged users, just reload
      window.location.reload();
    }
  } catch (error) {
    // Failed to handle version update
    // Fallback - reload anyway
    window.location.reload();
  }
};

/**
 * Get version info for debugging
 */
export const getVersionDebugInfo = async () => {
  const currentVersion = getAppVersion();
  const storedVersion = await getStoredVersion();
  
  return {
    currentVersion,
    storedVersion: storedVersion || 'Not set'
  };
};