/**
 * Country-Specific Cache Version Service
 * Manages cache versioning per country to avoid unnecessary logouts
 */

import { supabase } from '../lib/supabase';
import { SafeStorage } from './secureDataManager';

export interface CacheVersion {
  country: string;
  version_type: string;
  version_number: number;
  table_name: string;
  updated_at: string;
  updated_by: string;
  reason: string;
}

export interface StoredCacheVersions {
  [country: string]: {
    [versionType: string]: number;
  };
}

// Local storage keys
const CACHE_VERSION_KEY = 'tm-cache-versions';
const LAST_CHECK_KEY = 'tm-last-version-check';

/**
 * Get current cache versions from Supabase for specific country
 */
export const getCurrentCacheVersions = async (country: string): Promise<CacheVersion[]> => {
  try {
    const { data, error } = await supabase
      .from('cache_versions')
      .select('*')
      .in('country', [country, 'GLOBAL'])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching cache versions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCurrentCacheVersions:', error);
    return [];
  }
};

/**
 * Get stored cache versions from secure storage
 */
export const getStoredCacheVersions = async (): Promise<StoredCacheVersions> => {
  try {
    const stored = await SafeStorage.getItem(CACHE_VERSION_KEY);
    if (!stored) return {};
    return typeof stored === 'string' ? JSON.parse(stored) : stored;
  } catch (error) {
    console.error('Error parsing stored cache versions:', error);
    return {};
  }
};

/**
 * Store cache versions in secure storage
 */
export const storeCacheVersions = async (versions: StoredCacheVersions): Promise<void> => {
  try {
    await SafeStorage.setItem(CACHE_VERSION_KEY, versions, {
      tags: ['cache-versions', 'system'],
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    await SafeStorage.setItem(LAST_CHECK_KEY, Date.now().toString(), {
      tags: ['cache-check', 'system'],
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  } catch (error) {
    console.error('Error storing cache versions:', error);
  }
};

/**
 * Compare current versions with stored versions for a specific country
 * Returns true if cache is outdated and user should be logged out
 */
export const isCacheOutdated = async (userCountry: string): Promise<{
  outdated: boolean;
  outdatedTypes: string[];
  changedVersions: CacheVersion[];
}> => {
  try {
    const currentVersions = await getCurrentCacheVersions(userCountry);
    const storedVersions = await getStoredCacheVersions();
    
    const outdatedTypes: string[] = [];
    const changedVersions: CacheVersion[] = [];

    for (const version of currentVersions) {
      const { country, version_type, version_number } = version;
      
      // Check if this version is newer than what we have stored
      const storedVersion = storedVersions[country]?.[version_type];
      
      if (!storedVersion || storedVersion < version_number) {
        outdatedTypes.push(`${country}:${version_type}`);
        changedVersions.push(version);
      }
    }

    return {
      outdated: outdatedTypes.length > 0,
      outdatedTypes,
      changedVersions
    };
  } catch (error) {
    console.error('Error checking cache versions:', error);
    return {
      outdated: false,
      outdatedTypes: [],
      changedVersions: []
    };
  }
};

/**
 * Update stored cache versions after successful check
 */
export const updateStoredCacheVersions = async (userCountry: string): Promise<void> => {
  try {
    const currentVersions = await getCurrentCacheVersions(userCountry);
    const storedVersions = await getStoredCacheVersions();

    // Update versions for user's country and global
    for (const version of currentVersions) {
      const { country, version_type, version_number } = version;
      
      if (!storedVersions[country]) {
        storedVersions[country] = {};
      }
      
      storedVersions[country][version_type] = version_number;
    }

    await storeCacheVersions(storedVersions);
  } catch (error) {
    console.error('Error updating stored cache versions:', error);
  }
};

/**
 * Force cache version update (call this when user performs actions that change data)
 */
export const forceCacheVersionUpdate = async (
  country: string, 
  versionType: string,
  reason: string,
  updatedBy?: string
): Promise<void> => {
  try {
    // Update the cache version in Supabase (without using set_config)
    const { error } = await supabase
      .from('cache_versions')
      .upsert({
        country,
        version_type: versionType,
        version_number: Date.now(),
        table_name: 'manual_update',
        updated_by: updatedBy || 'user',
        reason
      }, {
        onConflict: 'country,version_type'
      });

    if (error) {
      console.error('Error force updating cache version:', error);
      return; // Don't update local storage if server update failed
    }

    console.log(`✅ Cache version updated for ${country}:${versionType}`);

    // Also update local storage immediately
    await updateStoredCacheVersions(country);
  } catch (error) {
    console.error('Error in forceCacheVersionUpdate:', error);
  }
};

/**
 * Clear all cached versions (for logout/reset)
 */
export const clearCacheVersions = async (): Promise<void> => {
  try {
    await SafeStorage.removeItem(CACHE_VERSION_KEY);
    await SafeStorage.removeItem(LAST_CHECK_KEY);
  } catch (error) {
    console.error('Error clearing cache versions:', error);
  }
};

/**
 * Get time since last version check
 */
export const getTimeSinceLastCheck = async (): Promise<number> => {
  try {
    const lastCheck = await SafeStorage.getItem(LAST_CHECK_KEY);
    if (!lastCheck) return Infinity;
    
    const checkTime = typeof lastCheck === 'string' ? parseInt(lastCheck) : lastCheck;
    return Date.now() - checkTime;
  } catch {
    return Infinity;
  }
};

/**
 * Check if we should perform a version check (avoid too frequent checks)
 */
export const shouldCheckVersions = async (): Promise<boolean> => {
  const timeSinceLastCheck = await getTimeSinceLastCheck();
  const checkInterval = 60000; // 1 minute
  
  return timeSinceLastCheck > checkInterval;
};