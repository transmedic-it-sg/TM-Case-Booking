import { useState, useCallback } from 'react';
import {
  isCacheOutdated,
  updateStoredCacheVersions,
  clearCacheVersions,
  shouldCheckVersions,
  CacheVersion
} from '../utils/cacheVersionService';
import { getCurrentUser } from '../utils/authCompat';

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

  // Track if popup has been shown to prevent repeated popups for same version
  const [popupShownForVersion, setPopupShownForVersion] = useState<string>('');

  /**
   * Check cache versions for current user's country
   */
  const checkCacheVersions = useCallback(async (): Promise<boolean> => {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.selectedCountry) {
      return false; // No user or country, skip check
    }

    // Don't check if popup is already showing
    if (state.showMismatchPopup) {
      return false;
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
        // Check if popup was recently dismissed
        const recentlyDismissed = sessionStorage.getItem('cache-popup-dismissed');
        if (recentlyDismissed) {
          // Clear the flag and skip showing popup this time
          sessionStorage.removeItem('cache-popup-dismissed');
          return false;
        }

        // Create a stable version signature based on actual changed versions
        const stableVersionSignature = `${currentUser.selectedCountry}_${changedVersions.map(v => `${v.version_type}:${v.version_number}`).join('_')}`;

        if (popupShownForVersion === stableVersionSignature) {
          return false; // Already shown popup for this exact version set
        }

        setState(prev => ({
          ...prev,
          showMismatchPopup: true,
          outdatedTypes,
          changedVersions,
          isCheckingVersions: false
        }));

        // Mark this specific version set as shown
        setPopupShownForVersion(stableVersionSignature);

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
  }, [popupShownForVersion, state.showMismatchPopup]);

  /**
   * Force logout and clear cache
   */
  const forceLogout = useCallback(async () => {
    try {
      // Clear cache versions
      clearCacheVersions();

      // Clear all localStorage data
      // Cache cleared via Supabase

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
   * Removed automatic cache checking - now only triggered manually when user accesses specific features
   */
  // useEffect(() => {
  //   if (process.env.NODE_ENV === 'production') {
  //     const initialCheckTimer = setTimeout(() => {
  //       checkCacheVersions();
  //     }, 60000); // Wait 1 minute after mount in production only
  //     return () => clearTimeout(initialCheckTimer);
  //   }
  // }, [checkCacheVersions]);

  /**
   * Removed focus check to prevent aggressive popups
   * Version checks now only happen on initial load and hourly
   */

  /**
   * Manual version check (call this after user makes changes)
   */
  const manualVersionCheck = useCallback(async () => {
    return await checkCacheVersions();
  }, [checkCacheVersions]);

  /**
   * Selective cache check - only for specific data types when user tries to access them
   * This should be called when user opens Edit Sets or Code Tables pages
   */
  const checkCacheForDataType = useCallback(async (dataType: string): Promise<boolean> => {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.selectedCountry) {
      return false;
    }

    // Don't check if popup is already showing
    if (state.showMismatchPopup) {
      return false;
    }

    setState(prev => ({ ...prev, isCheckingVersions: true }));

    try {
      const { isCacheOutdated } = await import('../utils/cacheVersionService');
      const { outdatedTypes, changedVersions } = await isCacheOutdated(
        currentUser.selectedCountry
      );

      // Filter to only show popup for the specific data type being accessed
      const relevantOutdatedTypes = outdatedTypes.filter(type => type.includes(dataType));
      const relevantChangedVersions = changedVersions.filter(v => v.version_type === dataType);

      if (relevantOutdatedTypes.length > 0) {
        console.log('Cache is outdated for specific data types:', relevantOutdatedTypes);

        setState(prev => ({
          ...prev,
          showMismatchPopup: true,
          outdatedTypes: relevantOutdatedTypes,
          changedVersions: relevantChangedVersions,
          isCheckingVersions: false
        }));

        return true; // Cache is outdated for this data type
      } else {
        setState(prev => ({
          ...prev,
          isCheckingVersions: false
        }));
        return false; // Cache is up to date for this data type
      }
    } catch (error) {
      console.error('Error checking cache for data type:', error);
      setState(prev => ({ ...prev, isCheckingVersions: false }));
      return false;
    }
  }, [state.showMismatchPopup]);

  return {
    ...state,
    forceLogout,
    manualVersionCheck,
    checkCacheForDataType
  };
};