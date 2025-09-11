/**
 * App Version Manager - Production Ready
 * Handles app version updates with automatic logout when version changes
 */

import { getAppVersion, getCacheVersion } from './version';
import { logout } from './auth';

// Storage keys for versions
const APP_VERSION_KEY = 'tm-app-version';
const CACHE_VERSION_KEY = 'tm-cache-version';
const USER_SESSION_KEY = 'currentUser';

export interface VersionCheckResult {
  versionChanged: boolean;
  cacheVersionChanged: boolean;
  currentVersion: string;
  currentCacheVersion: string;
  storedVersion: string | null;
  storedCacheVersion: string | null;
  userLoggedIn: boolean;
}

/**
 * Check if app version or cache version has changed and user is logged in
 */
export const checkAppVersionUpdate = (): VersionCheckResult => {
  try {
    const currentVersion = getAppVersion();
    const currentCacheVersion = getCacheVersion();
    const storedVersion = localStorage.getItem(APP_VERSION_KEY);
    const storedCacheVersion = localStorage.getItem(CACHE_VERSION_KEY);
    const userSession = localStorage.getItem(USER_SESSION_KEY) || sessionStorage.getItem(USER_SESSION_KEY);
    const userLoggedIn = !!userSession;

    const versionChanged = storedVersion !== null && storedVersion !== currentVersion;
    const cacheVersionChanged = storedCacheVersion !== null && storedCacheVersion !== currentCacheVersion;

    return {
      versionChanged,
      cacheVersionChanged,
      currentVersion,
      currentCacheVersion,
      storedVersion,
      storedCacheVersion,
      userLoggedIn
    };
  } catch (error) {
    console.error('Error checking app version:', error);
    return {
      versionChanged: false,
      cacheVersionChanged: false,
      currentVersion: getAppVersion(),
      currentCacheVersion: getCacheVersion(),
      storedVersion: null,
      storedCacheVersion: null,
      userLoggedIn: false
    };
  }
};

/**
 * Update stored app version and cache version
 */
export const updateStoredAppVersion = (): void => {
  try {
    const currentVersion = getAppVersion();
    const currentCacheVersion = getCacheVersion();
    localStorage.setItem(APP_VERSION_KEY, currentVersion);
    localStorage.setItem(CACHE_VERSION_KEY, currentCacheVersion);
  } catch (error) {
    console.error('Error updating stored app version:', error);
  }
};

/**
 * Handle version update - log out user and clear session data
 */
export const handleVersionUpdate = async (reason: string = 'App version updated'): Promise<void> => {
  try {
    console.log(`🔄 ${reason} - logging out user`);
    
    // Clear all session data
    localStorage.removeItem(USER_SESSION_KEY);
    sessionStorage.removeItem(USER_SESSION_KEY);
    
    // Clear other session-related data
    localStorage.removeItem('tm-cache-versions');
    localStorage.removeItem('tm-last-version-check');
    sessionStorage.removeItem('session-token');
    sessionStorage.removeItem('logging-session-id');
    sessionStorage.removeItem('error-tracker-session-id');
    
    // Clear browser cache programmatically
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('🧹 Browser cache cleared');
      } catch (cacheError) {
        console.error('Error clearing browser cache:', cacheError);
      }
    }
    
    // Update the stored versions
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
  if (versionCheck.storedVersion === null && versionCheck.storedCacheVersion === null) {
    updateStoredAppVersion();
    return { ...versionCheck, versionChanged: false, cacheVersionChanged: false };
  }
  
  return versionCheck;
};

/**
 * Clear version data (for logout/reset)
 */
export const clearVersionData = (): void => {
  try {
    localStorage.removeItem(APP_VERSION_KEY);
    localStorage.removeItem(CACHE_VERSION_KEY);
  } catch (error) {
    console.error('Error clearing version data:', error);
  }
};

/**
 * Get version information for display
 */
export const getVersionInfo = (): {
  currentVersion: string;
  currentCacheVersion: string;
  storedVersion: string | null;
  storedCacheVersion: string | null;
  lastUpdated: string | null;
} => {
  try {
    return {
      currentVersion: getAppVersion(),
      currentCacheVersion: getCacheVersion(),
      storedVersion: localStorage.getItem(APP_VERSION_KEY),
      storedCacheVersion: localStorage.getItem(CACHE_VERSION_KEY),
      lastUpdated: localStorage.getItem('app-version-updated') || null
    };
  } catch (error) {
    console.error('Error getting version info:', error);
    return {
      currentVersion: getAppVersion(),
      currentCacheVersion: getCacheVersion(),
      storedVersion: null,
      storedCacheVersion: null,
      lastUpdated: null
    };
  }
};