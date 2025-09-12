/**
 * LocalStorage Constants - DEPRECATED - Use secureStorage.ts instead
 * Maintained for backward compatibility during migration
 * Prevents scattered localStorage key strings throughout the app
 */

import { SecureStorageManager } from './secureStorage';

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

// Storage key prefixes for namespacing
export const STORAGE_PREFIXES = {
  USER: 'user_',
  CASE: 'case_',
  FILTER: 'filter_',
  CACHE: 'cache_',
  TEMP: 'temp_',
  SYSTEM: 'system_'
} as const;

// Cache duration constants (in milliseconds)
export const CACHE_DURATIONS = {
  SHORT: 5 * 60 * 1000,        // 5 minutes
  MEDIUM: 30 * 60 * 1000,      // 30 minutes
  LONG: 2 * 60 * 60 * 1000,    // 2 hours
  PERSISTENT: 24 * 60 * 60 * 1000  // 24 hours
} as const;

// Storage size limits (approximate)
export const STORAGE_LIMITS = {
  MAX_CASES: 10000,
  MAX_NOTIFICATIONS: 1000,
  MAX_AUDIT_LOGS: 5000,
  MAX_TEMP_FILES: 50,
  MAX_CACHE_SIZE: 50 * 1024 * 1024  // 50MB
} as const;

// Version control for data migration
export const DATA_VERSION = {
  CURRENT: '1.1.4',
  USERS: '1.0.0',
  CASES: '1.1.0',
  SETTINGS: '1.0.0'
} as const;

// DEPRECATED: Helper functions for localStorage operations
// Use SecureStorageManager from secureStorage.ts instead
export class StorageManager {
  static get<T>(key: string, defaultValue?: T): T | null {
    console.warn(`DEPRECATED: StorageManager.get("${key}") - Use SecureStorageManager instead`);
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
    console.warn(`DEPRECATED: StorageManager.set("${key}") - Use SecureStorageManager instead`);
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      return false;
    }
  }

  static remove(key: string): boolean {
    console.warn(`DEPRECATED: StorageManager.remove("${key}") - Use SecureStorageManager instead`);
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      return false;
    }
  }

  static clear(): boolean {
    console.warn('DEPRECATED: StorageManager.clear() - Use SecureStorageManager instead');
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  static exists(key: string): boolean {
    console.warn(`DEPRECATED: StorageManager.exists("${key}") - Use SecureStorageManager instead`);
    return localStorage.getItem(key) !== null;
  }

  static getSize(): number {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  static getKeys(): string[] {
    return Object.keys(localStorage);
  }

  static backup(): Record<string, string> {
    const backup: Record<string, string> = {};
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        backup[key] = localStorage[key];
      }
    }
    return backup;
  }

  static restore(backup: Record<string, string>): boolean {
    try {
      localStorage.clear();
      for (const [key, value] of Object.entries(backup)) {
        localStorage.setItem(key, value);
      }
      return true;
    } catch (error) {
      console.error('Error restoring localStorage backup:', error);
      return false;
    }
  }

  // Cache management
  static setCache<T>(key: string, data: T, duration: number = CACHE_DURATIONS.MEDIUM): void {
    const cacheData = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + duration
    };
    this.set(`${STORAGE_PREFIXES.CACHE}${key}`, cacheData);
  }

  static getCache<T>(key: string): T | null {
    const cacheData = this.get<{data: T, timestamp: number, expires: number}>(`${STORAGE_PREFIXES.CACHE}${key}`);
    
    if (!cacheData) return null;
    
    if (Date.now() > cacheData.expires) {
      this.remove(`${STORAGE_PREFIXES.CACHE}${key}`);
      return null;
    }
    
    return cacheData.data;
  }

  static clearCache(): void {
    const keys = this.getKeys();
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIXES.CACHE)) {
        this.remove(key);
      }
    });
  }

  // Cleanup utilities
  static cleanup(): void {
    // Remove expired cache entries
    this.clearCache();
    
    // Remove temporary data older than 1 hour
    const tempKeys = this.getKeys().filter(key => key.startsWith(STORAGE_PREFIXES.TEMP));
    tempKeys.forEach(key => {
      const data = this.get<{timestamp?: number}>(key);
      if (data && data.timestamp && Date.now() - data.timestamp > 60 * 60 * 1000) {
        this.remove(key);
      }
    });
  }

  // Migration helper
  static migrate(): void {
    const systemSettings = this.get<{version?: string}>(STORAGE_KEYS.SYSTEM_SETTINGS);
    const currentVersion = systemSettings?.version;
    
    if (!currentVersion || currentVersion !== DATA_VERSION.CURRENT) {
      console.log('Migrating localStorage data...');
      
      // Perform any necessary data migrations here
      // For now, just update the version
      const updatedSettings = this.get<{version?: string, lastMigration?: string}>(STORAGE_KEYS.SYSTEM_SETTINGS) || {};
      updatedSettings.version = DATA_VERSION.CURRENT;
      updatedSettings.lastMigration = new Date().toISOString();
      this.set(STORAGE_KEYS.SYSTEM_SETTINGS, updatedSettings);
      
      console.log('localStorage migration completed');
    }
  }
}

// Export the storage manager instance
export default StorageManager;