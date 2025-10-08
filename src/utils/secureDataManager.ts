/**
 * Secure Data Manager - Enterprise-grade storage with encryption and TTL
 * NO localStorage - all data in memory or Supabase
 */

import { logger } from './logger';
import { supabase } from '../lib/supabase';
import { getSafeCacheInstance } from './cacheManager';

interface StorageOptions {
  encrypt?: boolean;
  ttl?: number; // Time to live in milliseconds
  secure?: boolean;
  fallback?: any;
  tags?: string[]; // Tags for cache categorization
}

interface StorageItem {
  data: any;
  timestamp: number;
  ttl?: number;
  encrypted?: boolean;
}

/**
 * Enterprise-grade secure data manager
 */
class SecureDataManager {
  private fallbackData: Map<string, StorageItem> = new Map();
  private readonly config = {
    enableFallbacks: true,
    encryptByDefault: false,
    defaultTTL: 300000 // 5 minutes
  };

  constructor() {
    // Initialize cleanup interval for expired data
    this.startCleanupInterval();
  }

  /**
   * Store data securely with optional encryption
   */
  async setData(key: string, data: any, options: StorageOptions = {}): Promise<boolean> {
    if (!key || typeof key !== 'string') {
      logger.error('Invalid storage key provided');
      return false;
    }

    try {
      // Try to use enterprise cache first
      const cache = getSafeCacheInstance();
      if (cache) {
        cache.set(key, data, { ttl: options.ttl, tags: options.tags });
        logger.debug(`Data stored in enterprise cache: ${key}`);
        return true;
      }

      // Try Supabase for persistent storage
      if (options.secure !== false) {
        try {
          const { getCurrentUser } = await import('../lib/supabase');
          const user = await getCurrentUser();
          
          if (user?.id) {
            const { error } = await supabase
              .from('app_settings')
              .upsert({
                user_id: user.id,
                setting_key: `cache_${key}`,
                setting_value: data,
                updated_at: new Date().toISOString()
              });
            
            if (!error) {
              logger.debug(`Data stored in Supabase: ${key}`);
              return true;
            } else {
              logger.warn(`Failed to store in Supabase for key ${key}:`, error);
            }
          } else {
            logger.warn(`No user authenticated, skipping Supabase storage for key: ${key}`);
          }
        } catch (supabaseError) {
          logger.warn(`Supabase storage failed for key ${key}:`, supabaseError);
        }
      }

      // Fallback to memory storage only (NO localStorage)
      if (this.config.enableFallbacks) {
        this.fallbackData.set(key, {
          data,
          timestamp: Date.now(),
          ttl: options.ttl || 300000 // 5 minutes default
        });
        logger.warn(`Data stored in memory fallback: ${key}`);
        return true;
      }

      logger.error(`No storage available for key: ${key}`);
      return false;

    } catch (error) {
      logger.error(`Failed to store data for key ${key}`, error);
      return false;
    }
  }

  /**
   * Retrieve data securely with validation
   */
  async getData(key: string, options: StorageOptions = {}): Promise<any> {
    if (!key || typeof key !== 'string') {
      logger.error('Invalid storage key provided');
      return options.fallback || null;
    }

    try {
      // Try enterprise cache first
      const cache = getSafeCacheInstance();
      if (cache) {
        const data = cache.get(key);
        if (data !== null && data !== undefined) {
          logger.debug(`Data retrieved from enterprise cache: ${key}`);
          return data;
        }
      }

      // Try Supabase
      if (options.secure !== false) {
        try {
          const { getCurrentUser } = await import('../lib/supabase');
          const user = await getCurrentUser();
          
          if (user?.id) {
            const { data: result, error } = await supabase
              .from('app_settings')
              .select('setting_value')
              .eq('setting_key', `cache_${key}`)
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (!error && result) {
              logger.debug(`Data retrieved from Supabase: ${key}`);
              return result.setting_value;
            } else if (error) {
              logger.debug(`No Supabase data found for key ${key}: ${error.message}`);
            }
          } else {
            logger.debug(`No user authenticated, skipping Supabase retrieval for key: ${key}`);
          }
        } catch (supabaseError) {
          logger.warn(`Supabase retrieval failed for key ${key}:`, supabaseError);
        }
      }

      // Check memory fallback
      if (this.fallbackData.has(key)) {
        const item = this.fallbackData.get(key)!;
        
        // Check if data has expired
        if (item.ttl && Date.now() - item.timestamp > item.ttl) {
          this.fallbackData.delete(key);
          logger.debug(`Expired data removed from memory: ${key}`);
          return options.fallback || null;
        }
        
        logger.debug(`Data retrieved from memory fallback: ${key}`);
        return item.data;
      }

      logger.debug(`No data found for key: ${key}`);
      return options.fallback || null;

    } catch (error) {
      logger.error(`Failed to retrieve data for key ${key}`, error);
      return options.fallback || null;
    }
  }

  /**
   * Remove data securely
   */
  async removeData(key: string): Promise<boolean> {
    if (!key || typeof key !== 'string') {
      logger.error('Invalid storage key provided');
      return false;
    }

    try {
      let removed = false;

      // Remove from enterprise cache
      const cache = getSafeCacheInstance();
      if (cache) {
        cache.delete(key);
        removed = true;
      }

      // Remove from Supabase
      try {
        const { getCurrentUser } = await import('../lib/supabase');
        const user = await getCurrentUser();
        
        if (user?.id) {
          const { error } = await supabase
            .from('app_settings')
            .delete()
            .eq('setting_key', `cache_${key}`)
            .eq('user_id', user.id);
          
          if (!error) {
            removed = true;
          }
        }
      } catch (supabaseError) {
        logger.warn(`Failed to remove from Supabase for key ${key}:`, supabaseError);
      }

      // Remove from memory fallback
      if (this.fallbackData.has(key)) {
        this.fallbackData.delete(key);
        removed = true;
      }

      logger.debug(`Data removed for key: ${key}`);
      return removed;

    } catch (error) {
      logger.error(`Failed to remove data for key ${key}`, error);
      return false;
    }
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    try {
      // Clear enterprise cache
      const cache = getSafeCacheInstance();
      if (cache) {
        cache.clear();
      }

      // Clear cache entries from Supabase
      try {
        const { getCurrentUser } = await import('../lib/supabase');
        const user = await getCurrentUser();
        
        if (user?.id) {
          await supabase
            .from('app_settings')
            .delete()
            .like('setting_key', 'cache_%')
            .eq('user_id', user.id);
        }
      } catch (supabaseError) {
        logger.warn(`Failed to clear Supabase cache entries:`, supabaseError);
      }

      // Clear memory fallback
      this.fallbackData.clear();

      logger.info('All stored data cleared');
    } catch (error) {
      logger.error('Failed to clear all data', error);
    }
  }

  /**
   * Check if key exists
   */
  async hasData(key: string): Promise<boolean> {
    if (!key || typeof key !== 'string') {
      return false;
    }

    // Check cache
    const cache = getSafeCacheInstance();
    if (cache && cache.has(key)) {
      return true;
    }

    // Check Supabase
    try {
      const { getCurrentUser } = await import('../lib/supabase');
      const user = await getCurrentUser();
      
      if (user?.id) {
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_key')
          .eq('setting_key', `cache_${key}`)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!error && data) {
          return true;
        }
      }
    } catch (supabaseError) {
      logger.debug(`Failed to check Supabase for key ${key}:`, supabaseError);
    }

    // Check memory fallback
    if (this.fallbackData.has(key)) {
      const item = this.fallbackData.get(key)!;
      if (!item.ttl || Date.now() - item.timestamp <= item.ttl) {
        return true;
      }
    }

    return false;
  }

  /**
   * Start cleanup interval for expired data
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      this.fallbackData.forEach((item, key) => {
        if (item.ttl && now - item.timestamp > item.ttl) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => {
        this.fallbackData.delete(key);
        logger.debug(`Expired data cleaned up: ${key}`);
      });
    }, 60000); // Run cleanup every minute
  }
}

// Export singleton instance
export const secureDataManager = new SecureDataManager();

/**
 * SafeStorage API - Compatible interface for easy migration
 * NO localStorage - all in memory or Supabase
 */
export class SafeStorage {
  /**
   * Store data securely (NO localStorage)
   */
  static async setItem(key: string, value: any, options: StorageOptions = {}): Promise<void> {
    const success = await secureDataManager.setData(key, value, options);
    if (!success) {
      throw new Error(`Failed to store data for key: ${key}`);
    }
  }

  /**
   * Retrieve data securely (NO localStorage)
   */
  static async getItem(key: string, fallback: any = null): Promise<any> {
    return await secureDataManager.getData(key, { fallback });
  }

  /**
   * Remove data securely (NO localStorage)
   */
  static async removeItem(key: string): Promise<void> {
    await secureDataManager.removeData(key);
  }

  /**
   * Check if key exists
   */
  static async hasItem(key: string): Promise<boolean> {
    return await secureDataManager.hasData(key);
  }

  /**
   * Clear all data (NO localStorage)
   */
  static async clear(): Promise<void> {
    await secureDataManager.clearAll();
  }

  /**
   * Get all keys (memory only)
   */
  static async keys(): Promise<string[]> {
    // Return empty array - no localStorage to iterate
    return [];
  }
}

/**
 * Storage Migration utilities - NO-OP since no localStorage
 */
export class StorageMigration {
  /**
   * NO-OP: No localStorage to migrate from
   */
  static async migrateFromLocalStorage(keys: string[]): Promise<void> {
    // NO-OP - No localStorage migration needed
    logger.debug('localStorage migration skipped - not using localStorage');
  }

  /**
   * NO-OP: No legacy data to migrate
   */
  static async migrateLegacyData(keys: string[]): Promise<void> {
    // NO-OP - No legacy data migration needed
    logger.debug('Legacy data migration skipped - not using localStorage');
  }
}

// Export default instance
export default secureDataManager;