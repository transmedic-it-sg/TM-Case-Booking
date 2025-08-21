import { useState, useEffect, useCallback } from 'react';
import { 
  isCacheOutdated, 
  updateStoredCacheVersions, 
  clearCacheVersions,
  shouldCheckVersions,
  CacheVersion
} from '../utils/cacheVersionService';
import { getCurrentUser } from '../utils/auth';

export interface CacheVersionState {
  isCheckingVersions: boolean;
  showMismatchPopup: boolean;
  outdatedTypes: string[];
  changedVersions: CacheVersion[];
}

export const useCacheVersionManager = () => {
  const [state, setState] = useState<CacheVersionState>({
    isCheckingVersions: false,
    showMismatchPopup: false,
    outdatedTypes: [],
    changedVersions: []
  });

  /**
   * Check cache versions for current user's country
   */
  const checkCacheVersions = useCallback(async (): Promise<boolean> => {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.selectedCountry) {
      return false; // No user or country, skip check
    }

    // Don't check too frequently
    if (!shouldCheckVersions()) {
      return false;
    }

    setState(prev => ({ ...prev, isCheckingVersions: true }));

    try {
      const { outdated, outdatedTypes, changedVersions } = await isCacheOutdated(
        currentUser.selectedCountry
      );

      if (outdated) {
        console.log('Cache version mismatch detected:', {
          country: currentUser.selectedCountry,
          outdatedTypes,
          changes: changedVersions.map(v => ({
            type: v.version_type,
            reason: v.reason,
            updatedBy: v.updated_by
          }))
        });

        setState(prev => ({
          ...prev,
          showMismatchPopup: true,
          outdatedTypes,
          changedVersions,
          isCheckingVersions: false
        }));

        return true; // Cache is outdated
      } else {
        // Update stored versions to current
        await updateStoredCacheVersions(currentUser.selectedCountry);
        
        setState(prev => ({
          ...prev,
          isCheckingVersions: false
        }));

        return false; // Cache is up to date
      }
    } catch (error) {
      console.error('Error checking cache versions:', error);
      setState(prev => ({ ...prev, isCheckingVersions: false }));
      return false;
    }
  }, []);

  /**
   * Force logout and clear cache
   */
  const forceLogout = useCallback(async () => {
    try {
      // Clear cache versions
      clearCacheVersions();
      
      // Clear all localStorage data
      localStorage.clear();
      
      // Clear session storage
      sessionStorage.clear();
      
      // Close popup first
      setState(prev => ({
        ...prev,
        showMismatchPopup: false,
        outdatedTypes: [],
        changedVersions: []
      }));

      // Small delay to ensure popup closes
      setTimeout(() => {
        // Redirect to login page (full page reload)
        window.location.href = '/';
      }, 100);
    } catch (error) {
      console.error('Error during force logout:', error);
      // Fallback: force reload
      window.location.reload();
    }
  }, []);

  /**
   * Periodic version checking
   */
  useEffect(() => {
    // Initial check after component mount
    const initialCheckTimer = setTimeout(() => {
      checkCacheVersions();
    }, 2000); // Wait 2 seconds after mount

    // Periodic checking every 5 minutes
    const intervalTimer = setInterval(() => {
      checkCacheVersions();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearTimeout(initialCheckTimer);
      clearInterval(intervalTimer);
    };
  }, [checkCacheVersions]);

  /**
   * Check versions when user focuses on the app
   */
  useEffect(() => {
    const handleFocus = () => {
      checkCacheVersions();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkCacheVersions]);

  /**
   * Manual version check (call this after user makes changes)
   */
  const manualVersionCheck = useCallback(async () => {
    return await checkCacheVersions();
  }, [checkCacheVersions]);

  return {
    ...state,
    forceLogout,
    manualVersionCheck
  };
};