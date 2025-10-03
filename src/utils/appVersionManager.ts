/**
 * App Version Manager - Simplified
 * Handles app version updates with automatic logout when version changes
 */

import { getAppVersion } from './version';
import { logout } from './auth';

// Storage keys for versions
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
 * Initialize version manager and check for updates
 */
export const initializeVersionManager = (): VersionCheckResult => {
  const versionCheck = checkAppVersionUpdate();
  
  // If this is first time or no stored version, just store current version
  if (versionCheck.storedVersion === null) {
    updateStoredAppVersion();
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
    updateStoredAppVersion();
    
    // Check if user is logged in
    const userSession = sessionStorage.getItem(USER_SESSION_KEY);
    if (userSession) {
      // Force logout for logged-in users
      await logout();
      
      // Clear all storage to ensure clean state
      sessionStorage.clear();
      localStorage.removeItem('selectedCountry');
      
      // Reload the page to get fresh version
      window.location.reload();
    } else {
      // For non-logged users, just reload
      window.location.reload();
    }
  } catch (error) {
    console.error('Error handling version update:', error);
    // Fallback: force reload anyway
    window.location.reload();
  }
};

/**
 * Get current version info for display
 */
export interface VersionInfo {
  currentVersion: string;
  storedVersion: string | null;
}

export const getVersionInfo = (): VersionInfo => {
  return {
    currentVersion: getAppVersion(),
    storedVersion: localStorage.getItem(APP_VERSION_KEY)
  };
};