/**
 * App Version Manager - Production Ready
 * Handles app version updates with automatic logout when version changes
 */

import { getAppVersion } from './version';
import { logout } from './auth';

// Storage key for app version
const APP_VERSION_KEY = 'tm-app-version';
const USER_SESSION_KEY = 'currentUser';

export interface VersionCheckResult {
  versionChanged: boolean;
  currentVersion: string;
  storedVersion: string | null;
  userLoggedIn: boolean;
}

/**
 * Check if app version has changed and user is logged in
 */
export const checkAppVersionUpdate = (): VersionCheckResult => {
  try {
    const currentVersion = getAppVersion();
    const storedVersion = localStorage.getItem(APP_VERSION_KEY);
    const userSession = localStorage.getItem(USER_SESSION_KEY) || sessionStorage.getItem(USER_SESSION_KEY);
    const userLoggedIn = !!userSession;

    return {
      versionChanged: storedVersion !== null && storedVersion !== currentVersion,
      currentVersion,
      storedVersion,
      userLoggedIn
    };
  } catch (error) {
    console.error('Error checking app version:', error);
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
export const updateStoredAppVersion = (): void => {
  try {
    const currentVersion = getAppVersion();
    localStorage.setItem(APP_VERSION_KEY, currentVersion);
  } catch (error) {
    console.error('Error updating stored app version:', error);
  }
};

/**
 * Handle version update - log out user and clear session data
 */
export const handleVersionUpdate = async (): Promise<void> => {
  try {
    console.log('🔄 App version updated - logging out user');
    
    // Clear all session data
    localStorage.removeItem(USER_SESSION_KEY);
    sessionStorage.removeItem(USER_SESSION_KEY);
    
    // Clear other session-related data
    localStorage.removeItem('tm-cache-versions');
    localStorage.removeItem('tm-last-version-check');
    sessionStorage.removeItem('session-token');
    sessionStorage.removeItem('logging-session-id');
    sessionStorage.removeItem('error-tracker-session-id');
    
    // Update the stored version
    updateStoredAppVersion();
    
    // Perform logout through auth service
    await logout();
    
    // Force page reload to ensure clean state
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('Error handling version update:', error);
    // Force reload even if logout fails
    window.location.reload();
  }
};

/**
 * Initialize version management - call this on app startup
 */
export const initializeVersionManager = (): VersionCheckResult => {
  const versionCheck = checkAppVersionUpdate();
  
  // If this is the first time or no stored version, just update it
  if (versionCheck.storedVersion === null) {
    updateStoredAppVersion();
    return { ...versionCheck, versionChanged: false };
  }
  
  return versionCheck;
};

/**
 * Clear version data (for logout/reset)
 */
export const clearVersionData = (): void => {
  try {
    localStorage.removeItem(APP_VERSION_KEY);
  } catch (error) {
    console.error('Error clearing version data:', error);
  }
};

/**
 * Get version information for display
 */
export const getVersionInfo = (): {
  currentVersion: string;
  storedVersion: string | null;
  lastUpdated: string | null;
} => {
  try {
    return {
      currentVersion: getAppVersion(),
      storedVersion: localStorage.getItem(APP_VERSION_KEY),
      lastUpdated: localStorage.getItem('app-version-updated') || null
    };
  } catch (error) {
    console.error('Error getting version info:', error);
    return {
      currentVersion: getAppVersion(),
      storedVersion: null,
      lastUpdated: null
    };
  }
};