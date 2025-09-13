/**
 * Secure Data Manager
 * Replaces localStorage fallbacks with enterprise-grade data management
 * Ensures data integrity and prevents false data issues
 */

import { /* getCacheInstance, */ getSafeCacheInstance } from './cacheManager';
import { logger } from './logger';

interface DataManagerConfig {
  enableFallbacks: boolean;
  encryptSensitive: boolean;
  validateData: boolean;
  maxRetries: number;
}

interface StorageOptions {
  encrypt?: boolean;
  validate?: boolean;
  fallback?: any;
  ttl?: number;
  tags?: string[];
}

class SecureDataManager {
  private config: DataManagerConfig;
  private fallbackData = new Map<string, any>();

  constructor(config: DataManagerConfig) {
    this.config = config;
  }

  /**
   * Store data securely with validation
   */
  async setData(key: string, data: any, options: StorageOptions = {}): Promise<boolean> {
    if (!key || typeof key !== 'string') {
      logger.error('Invalid storage key provided');
      return false;
    }

    try {
      // Validate data if required
      if (options.validate !== false && this.config.validateData) {
        if (!this.validateData(key, data)) {
          logger.error(`Data validation failed for key: ${key}`);
          return false;
        }
      }

      // Get cache instance
      const cache = getSafeCacheInstance();
      if (cache) {
        // Use enterprise cache as primary storage
        cache.set(key, data, {
          ttl: options.ttl,
          tags: options.tags || ['secure-data'],
          version: Date.now().toString()
        });
        
        logger.debug(`Data stored in enterprise cache: ${key}`);
        return true;
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

      // Try memory fallback
      if (this.config.enableFallbacks) {
        const fallbackEntry = this.fallbackData.get(key);
        if (fallbackEntry) {
          // Check TTL
          const age = Date.now() - fallbackEntry.timestamp;
          if (!fallbackEntry.ttl || age < fallbackEntry.ttl) {
            logger.debug(`Data retrieved from memory fallback: ${key}`);
            return fallbackEntry.data;
          } else {
            // Expired data
            this.fallbackData.delete(key);
            logger.debug(`Expired data removed from memory: ${key}`);
          }
        }
      }

      // No data found
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
    try {
      let removed = false;

      // Remove from enterprise cache
      const cache = getSafeCacheInstance();
      if (cache) {
        // Cache doesn't have direct delete method, so we invalidate
        cache.invalidateByTag(`key:${key}`);
        removed = true;
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
   * Check if data exists
   */
  async hasData(key: string): Promise<boolean> {
    try {
      const data = await this.getData(key);
      return data !== null && data !== undefined;
    } catch (error) {
      logger.error(`Failed to check data existence for key ${key}`, error);
      return false;
    }
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    try {
      // Clear enterprise cache
      const cache = getSafeCacheInstance();
      if (cache) {
        cache.invalidateByTag('secure-data');
      }

      // Clear memory fallback
      this.fallbackData.clear();

      logger.info('All secure data cleared');
    } catch (error) {
      logger.error('Failed to clear all data', error);
    }
  }

  /**
   * Validate data based on key patterns
   */
  private validateData(key: string, data: any): boolean {
    try {
      // Key-specific validation rules
      if (key.includes('user') || key.includes('auth')) {
        // User data should have required fields
        if (typeof data === 'object' && data !== null) {
          const requiredFields = ['id', 'role'];
          return requiredFields.every(field => field in data);
        }
        return false;
      }

      if (key.includes('case')) {
        // Case data validation
        if (typeof data === 'object' && data !== null) {
          return 'id' in data || Array.isArray(data);
        }
        return false;
      }

      if (key.includes('config') || key.includes('settings')) {
        // Config data should be an object
        return typeof data === 'object' && data !== null;
      }

      // Generic validation - ensure data is serializable
      JSON.stringify(data);
      return true;

    } catch (error) {
      logger.error(`Data validation failed for key ${key}`, error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  getStats(): any {
    return {
      fallbackEntries: this.fallbackData.size,
      cacheAvailable: getSafeCacheInstance() !== null,
      config: this.config
    };
  }
}

// Create singleton instance
const dataManagerConfig: DataManagerConfig = {
  enableFallbacks: true, // Enable memory fallbacks only
  encryptSensitive: false, // TODO: Implement encryption for sensitive data
  validateData: true,
  maxRetries: 3
};

const secureDataManager = new SecureDataManager(dataManagerConfig);

/**
 * Safe wrapper for localStorage operations
 * Migrates to secure data manager automatically
 */
export class SafeStorage {
  /**
   * Store data securely (replaces localStorage.setItem)
   */
  static async setItem(key: string, value: any, options: StorageOptions = {}): Promise<void> {
    const success = await secureDataManager.setData(key, value, options);
    if (!success) {
      throw new Error(`Failed to store data for key: ${key}`);
    }
  }

  /**
   * Retrieve data securely (replaces localStorage.getItem)
   */
  static async getItem(key: string, fallback: any = null): Promise<any> {
    return await secureDataManager.getData(key, { fallback });
  }

  /**
   * Remove data securely (replaces localStorage.removeItem)
   */
  static async removeItem(key: string): Promise<void> {
    await secureDataManager.removeData(key);
  }

  /**
   * Check if key exists (replaces localStorage key check)
   */
  static async hasItem(key: string): Promise<boolean> {
    return await secureDataManager.hasData(key);
  }

  /**
   * Clear all data (replaces localStorage.clear)
   */
  static async clear(): Promise<void> {
    await secureDataManager.clearAll();
  }

  /**
   * Synchronous fallback for critical data (use sparingly)
   */
  static getItemSync(key: string, fallback: any = null): any {
    try {
      const cache = getSafeCacheInstance();
      if (cache) {
        const data = cache.get(key);
        if (data !== null && data !== undefined) {
          return data;
        }
      }
      return fallback;
    } catch (error) {
      logger.error(`Sync data retrieval failed for key ${key}`, error);
      return fallback;
    }
  }
}

/**
 * Migration utility to move from localStorage to secure storage
 */
export class StorageMigration {
  /**
   * Migrate specific localStorage keys to secure storage
   */
  static async migrateFromLocalStorage(keys: string[]): Promise<void> {
    logger.info('Starting localStorage to secure storage migration');
    
    let migrated = 0;
    let failed = 0;

    for (const key of keys) {
      try {
        // Check if data exists in localStorage
        const localData = localStorage.getItem(key);
        if (localData !== null) {
          // Parse if it looks like JSON
          let parsedData;
          try {
            parsedData = JSON.parse(localData);
          } catch {
            parsedData = localData; // Keep as string if not JSON
          }

          // Store in secure storage
          await SafeStorage.setItem(key, parsedData, {
            tags: ['migrated-data'],
            ttl: 24 * 60 * 60 * 1000 // 24 hours
          });

          // Remove from localStorage after successful migration
          localStorage.removeItem(key);
          migrated++;
          
          logger.debug(`Migrated localStorage key: ${key}`);
        }
      } catch (error) {
        logger.error(`Failed to migrate localStorage key: ${key}`, error);
        failed++;
      }
    }

    logger.info(`Migration complete: ${migrated} migrated, ${failed} failed`);
  }

  /**
   * Emergency fallback: restore critical data from localStorage
   */
  static async emergencyRestore(keys: string[]): Promise<void> {
    logger.warn('Starting emergency data restoration from localStorage');

    for (const key of keys) {
      try {
        const localData = localStorage.getItem(key);
        if (localData !== null) {
          let parsedData;
          try {
            parsedData = JSON.parse(localData);
          } catch {
            parsedData = localData;
          }

          await SafeStorage.setItem(key, parsedData, {
            tags: ['emergency-restore'],
            ttl: 60 * 60 * 1000 // 1 hour
          });
        }
      } catch (error) {
        logger.error(`Emergency restore failed for key: ${key}`, error);
      }
    }
  }
}

// Export main utilities
export { SecureDataManager, secureDataManager };
export default SafeStorage;