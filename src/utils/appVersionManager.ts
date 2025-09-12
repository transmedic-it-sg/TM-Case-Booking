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
 * Handle version update - log out user and clear session data with improved timing
 */
export const handleVersionUpdate = async (reason: string = 'App version updated'): Promise<void> => {
  try {
    console.log(`🔄 ${reason} - starting cleanup sequence`);
    
    // Step 1: Update stored versions FIRST to prevent loops
    updateStoredAppVersion();
    console.log('✅ Version tracking updated');
    
    // Step 2: Perform logout through auth service with timeout protection
    try {
      await Promise.race([
        logout(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 3000))
      ]);
      console.log('✅ User logged out successfully');
    } catch (logoutError) {
      console.warn('⚠️ Logout operation timed out or failed:', logoutError);
      // Continue with cleanup even if logout fails
    }
    
    // Step 3: Clear session data after logout
    const sessionKeys = [
      USER_SESSION_KEY,
      'tm-cache-versions',
      'tm-last-version-check',
      'session-token',
      'logging-session-id', 
      'error-tracker-session-id'
    ];
    
    sessionKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    console.log('✅ Session data cleared');
    
    // Step 4: Clear browser cache with timeout protection
    if ('caches' in window) {
      try {
        const cachePromise = caches.keys().then(cacheNames => {
          return Promise.all(cacheNames.map(name => caches.delete(name)));
        });
        
        await Promise.race([
          cachePromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Cache clear timeout')), 2000))
        ]);
        
        console.log('✅ Browser cache cleared successfully');
      } catch (cacheError) {
        console.warn('⚠️ Cache clearing timed out or failed:', cacheError);
        // Continue with reload even if cache clearing fails
      }
    }
    
    // Step 5: Force page reload with user feedback
    console.log('🔄 Reloading application...');
    
    // Use immediate reload with fallback
    try {
      window.location.replace(window.location.href);
    } catch (replaceError) {
      console.warn('⚠️ location.replace failed, using reload:', replaceError);
      window.location.reload();
    }
    
  } catch (error) {
    console.error('❌ Critical error in version update handler:', error);
    
    // Emergency fallback: immediate reload
    try {
      window.location.replace(window.location.href);
    } catch {
      window.location.reload();
    }
  }
};

/**
 * Initialize version management - call this on app startup with improved stability
 */
export const initializeVersionManager = (): VersionCheckResult => {
  try {
    const versionCheck = checkAppVersionUpdate();
    
    // If this is the first time or no stored version, just update it
    if (versionCheck.storedVersion === null && versionCheck.storedCacheVersion === null) {
      updateStoredAppVersion();
      console.log('📝 First-time version tracking initialized');
      return { ...versionCheck, versionChanged: false, cacheVersionChanged: false };
    }
    
    return versionCheck;
  } catch (error) {
    console.error('❌ Error initializing version manager:', error);
    
    // Fallback: return safe defaults
    const fallbackResult: VersionCheckResult = {
      versionChanged: false,
      cacheVersionChanged: false,
      currentVersion: '1.2.9',
      currentCacheVersion: '1.0.4',
      storedVersion: null,
      storedCacheVersion: null,
      userLoggedIn: false
    };
    
    // Try to update versions for next time
    try {
      updateStoredAppVersion();
    } catch (updateError) {
      console.error('❌ Failed to update stored versions:', updateError);
    }
    
    return fallbackResult;
  }
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