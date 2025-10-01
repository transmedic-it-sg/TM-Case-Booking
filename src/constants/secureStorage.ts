/**
 * Secure Storage Constants - Centralized storage key definitions
 * Replaces localStorage with enterprise-grade secure storage
 * Prevents scattered storage key strings throughout the app
 */

import { SafeStorage } from '../utils/secureDataManager';

// Main storage keys
export const STORAGE_KEYS = {
  // User & Authentication
  CURRENT_USER: 'currentUser',
  USERS: 'users',
  REMEMBER_ME: 'rememberMe',
  LAST_LOGIN: 'lastLogin',

  // Case Data
  CASES: 'cases',
  CASE_REFERENCE_COUNTER: 'caseReferenceCounter',
  CASE_DRAFTS: 'caseDrafts',

  // Application State
  USER_PREFERENCES: 'userPreferences',
  SELECTED_COUNTRY: 'selectedCountry',
  FILTER_PREFERENCES: 'filterPreferences',
  COLUMN_PREFERENCES: 'columnPreferences',

  // System Data
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'auditLogs',
  SYSTEM_SETTINGS: 'systemSettings',

  // Code Tables
  HOSPITALS: 'hospitals',
  DEPARTMENTS: 'departments',
  PROCEDURE_TYPES: 'procedureTypes',
  SURGERY_SETS: 'surgerySets',
  IMPLANT_BOXES: 'implantBoxes',

  // UI State
  EXPANDED_CASES: 'expandedCases',
  COLLAPSED_SECTIONS: 'collapsedSections',
  SIDEBAR_STATE: 'sidebarState',
  THEME_PREFERENCE: 'themePreference',

  // Cache
  DATA_CACHE: 'dataCache',
  CACHE_TIMESTAMPS: 'cacheTimestamps',

  // Temporary Data
  TEMP_ATTACHMENTS: 'tempAttachments',
  FORM_AUTOSAVE: 'formAutosave',
  SESSION_DATA: 'sessionData'
} as const;

// Storage key types
export type StorageKey = keyof typeof STORAGE_KEYS;
export type StorageValue = typeof STORAGE_KEYS[StorageKey];

// TTL configurations for different data types
export const TTL_CONFIG = {
  // Session data - short term
  SESSION: 24 * 60 * 60 * 1000, // 24 hours

  // User data - medium term
  USER_DATA: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Application data - long term
  APP_DATA: 30 * 24 * 60 * 60 * 1000, // 30 days

  // Temporary data - very short
  TEMP_DATA: 60 * 60 * 1000, // 1 hour

  // System settings - very long
  SYSTEM_DATA: 90 * 24 * 60 * 60 * 1000, // 90 days
} as const;

// Tag configurations for cache invalidation
export const STORAGE_TAGS = {
  USER: ['user-data'],
  CASE: ['case-data'],
  SYSTEM: ['system-data'],
  SESSION: ['session-data'],
  TEMP: ['temp-data'],
  UI: ['ui-state'],
  CODE_TABLES: ['code-tables'],
  AUDIT: ['audit-data'],
} as const;

// Version control for data migration
export const DATA_VERSION = {
  CURRENT: '1.2.9',
  USERS: '1.0.0',
  CASES: '1.1.0',
  SETTINGS: '1.0.0'
} as const;

// Helper functions for secure storage operations
export class SecureStorageManager {
  /**
   * Get data from secure storage
   */
  static async get<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const item = await SafeStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue || null;
      return typeof item === 'string' ? JSON.parse(item) : item;
    } catch (error) {
      console.error(`Error reading from secure storage key "${key}":`, error);
      return defaultValue || null;
    }
  }

  /**
   * Set data in secure storage with appropriate TTL and tags
   */
  static async set<T>(key: string, value: T, options?: {
    ttl?: number;
    tags?: string[];
  }): Promise<boolean> {
    try {
      // Determine appropriate TTL and tags based on key type
      let ttl = options?.ttl || TTL_CONFIG.APP_DATA;
      let tags = options?.tags || ['app-data'];

      // Auto-configure based on key patterns
      if (key.includes('user') || key.includes('auth')) {
        ttl = TTL_CONFIG.USER_DATA;
        tags = [...STORAGE_TAGS.USER];
      } else if (key.includes('case')) {
        ttl = TTL_CONFIG.APP_DATA;
        tags = [...STORAGE_TAGS.CASE];
      } else if (key.includes('session') || key.includes('current')) {
        ttl = TTL_CONFIG.SESSION;
        tags = [...STORAGE_TAGS.SESSION];
      } else if (key.includes('temp') || key.includes('draft')) {
        ttl = TTL_CONFIG.TEMP_DATA;
        tags = [...STORAGE_TAGS.TEMP];
      } else if (key.includes('system') || key.includes('settings')) {
        ttl = TTL_CONFIG.SYSTEM_DATA;
        tags = [...STORAGE_TAGS.SYSTEM];
      } else if (key.includes('audit') || key.includes('log')) {
        ttl = TTL_CONFIG.SYSTEM_DATA;
        tags = [...STORAGE_TAGS.AUDIT];
      }

      await SafeStorage.setItem(key, value, { ttl, tags });
      return true;
    } catch (error) {
      console.error(`Error writing to secure storage key "${key}":`, error);
      return false;
    }
  }

  /**
   * Remove data from secure storage
   */
  static async remove(key: string): Promise<boolean> {
    try {
      await SafeStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing secure storage key "${key}":`, error);
      return false;
    }
  }

  /**
   * Clear all secure storage data
   */
  static async clear(): Promise<boolean> {
    try {
      await SafeStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing secure storage:', error);
      return false;
    }
  }

  /**
   * Check if key exists in secure storage
   */
  static async exists(key: string): Promise<boolean> {
    try {
      return await SafeStorage.hasItem(key);
    } catch (error) {
      console.error(`Error checking existence of secure storage key "${key}":`, error);
      return false;
    }
  }

  /**
   * Migrate data from localStorage to secure storage
   */
  static async migrateFromLocalStorage(keys: string[]): Promise<void> {
    const migrated: string[] = [];
    const failed: string[] = [];

    for (const key of keys) {
      try {
        const localData = localStorage.getItem(key);
        if (localData !== null) {
          let parsedData;
          try {
            parsedData = JSON.parse(localData);
          } catch {
            parsedData = localData; // Keep as string if not JSON
          }

          await this.set(key, parsedData);
          localStorage.removeItem(key); // Remove after successful migration
          migrated.push(key);
        }
      } catch (error) {
        console.error(`Failed to migrate key "${key}":`, error);
        failed.push(key);
      }
    }if (failed.length > 0) {
      console.warn('Failed to migrate keys:', failed);
    }
  }

  /**
   * Batch operation for multiple keys
   */
  static async batchGet<T>(keys: string[]): Promise<Record<string, T | null>> {
    const results: Record<string, T | null> = {};

    await Promise.all(
      keys.map(async (key) => {
        results[key] = await this.get<T>(key);
      })
    );

    return results;
  }

  /**
   * Get storage statistics and health info
   */
  static async getStorageInfo(): Promise<{
    totalKeys: number;
    secureStorageAvailable: boolean;
    lastMigration?: string;
  }> {
    try {
      // This would be implemented based on the secure storage backend
      return {
        totalKeys: 0, // Would count actual keys
        secureStorageAvailable: true,
        lastMigration: await this.get('__migration_timestamp') || undefined
      };
    } catch (error) {
      return {
        totalKeys: 0,
        secureStorageAvailable: false
      };
    }
  }
}

// Export legacy localStorage manager for gradual migration
export class LegacyStorageManager {
  static get<T>(key: string, defaultValue?: T): T | null {
    console.warn(`DEPRECATED: Using legacy localStorage for key "${key}". Migrate to SecureStorageManager.`);
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue || null;
      return JSON.parse(item);
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return defaultValue || null;
    }
  }

  static set<T>(key: string, value: T): boolean {
    console.warn(`DEPRECATED: Using legacy localStorage for key "${key}". Migrate to SecureStorageManager.`);
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      return false;
    }
  }

  static remove(key: string): boolean {
    console.warn(`DEPRECATED: Using legacy localStorage for key "${key}". Migrate to SecureStorageManager.`);
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      return false;
    }
  }

  static clear(): boolean {
    console.warn('DEPRECATED: Using legacy localStorage.clear(). Migrate to SecureStorageManager.');
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  static exists(key: string): boolean {
    console.warn(`DEPRECATED: Using legacy localStorage for key "${key}". Migrate to SecureStorageManager.`);
    return localStorage.getItem(key) !== null;
  }
}

// Default export - use SecureStorageManager
export default SecureStorageManager;

// Re-export SafeStorage for direct access
export { SafeStorage };