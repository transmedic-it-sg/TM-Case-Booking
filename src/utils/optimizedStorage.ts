/**
 * Optimized Storage Service
 * Reduces localStorage reads/writes and implements efficient caching
 */

import { OptimizedCache } from './performanceOptimizer';

class OptimizedStorageService {
  private static instance: OptimizedStorageService;
  private cache = OptimizedCache.getInstance();
  private writeQueue = new Map<string, { data: any; timestamp: number }>();
  private batchWriteDelay = 1000; // 1 second batch delay
  private batchTimeout: NodeJS.Timeout | null = null;

  static getInstance(): OptimizedStorageService {
    if (!OptimizedStorageService.instance) {
      OptimizedStorageService.instance = new OptimizedStorageService();
    }
    return OptimizedStorageService.instance;
  }

  /**
   * Get data from localStorage with caching
   */
  get<T = any>(key: string, defaultValue: T | null = null): T | null {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached !== null) {
      return cached;
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        // Cache for future reads
        this.cache.set(key, parsed, 30); // Cache for 30 minutes
        return parsed;
      }
    } catch (error) {
      console.warn(`Failed to read from localStorage: ${key}`, error);
    }

    return defaultValue;
  }

  /**
   * Set data to localStorage with batching
   */
  set(key: string, value: any, immediate: boolean = false): void {
    // Update cache immediately
    this.cache.set(key, value, 30);

    if (immediate) {
      this.writeToStorage(key, value);
    } else {
      // Queue for batch write
      this.writeQueue.set(key, { data: value, timestamp: Date.now() });
      this.scheduleBatchWrite();
    }
  }

  /**
   * Remove data from localStorage and cache
   */
  remove(key: string): void {
    this.cache.clear();
    this.writeQueue.delete(key);
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove from localStorage: ${key}`, error);
    }
  }

  /**
   * Get multiple keys at once (optimized)
   */
  getMultiple(keys: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    
    keys.forEach(key => {
      result[key] = this.get(key);
    });
    
    return result;
  }

  /**
   * Set multiple keys at once (optimized)
   */
  setMultiple(data: Record<string, any>, immediate: boolean = false): void {
    Object.entries(data).forEach(([key, value]) => {
      this.set(key, value, immediate);
    });
  }

  /**
   * Check if key exists (from cache or localStorage)
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.cache.clear();
    this.writeQueue.clear();
    
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      queueSize: this.writeQueue.size,
      nextBatchWrite: this.batchTimeout ? 'scheduled' : 'none'
    };
  }

  /**
   * Force flush all queued writes
   */
  flush(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.processBatchWrite();
  }

  private writeToStorage(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to write to localStorage: ${key}`, error);
      // Try to free up space by clearing old cache entries
      this.cache.clear();
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (retryError) {
        console.error(`Failed to write to localStorage after cache clear: ${key}`, retryError);
      }
    }
  }

  private scheduleBatchWrite(): void {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(() => {
      this.processBatchWrite();
    }, this.batchWriteDelay);
  }

  private processBatchWrite(): void {
    if (this.writeQueue.size === 0) return;

    // Write all queued items
    this.writeQueue.forEach((item, key) => {
      this.writeToStorage(key, item.data);
    });

    // Clear the queue
    this.writeQueue.clear();
    this.batchTimeout = null;
  }
}

// Create singleton instance
const optimizedStorage = OptimizedStorageService.getInstance();

// Specialized storage services for different data types
export const userStorage = {
  getUsers: () => optimizedStorage.get('users', []),
  setUsers: (users: any[]) => optimizedStorage.set('users', users),
  getCurrentUser: () => optimizedStorage.get('currentUser'),
  setCurrentUser: (user: any) => optimizedStorage.set('currentUser', user, true), // Immediate
};

export const caseStorage = {
  getCases: () => optimizedStorage.get('cases', []),
  setCases: (cases: any[]) => optimizedStorage.set('cases', cases),
  getCaseById: (id: string) => {
    const cases = caseStorage.getCases();
    return cases ? cases.find((c: any) => c.id === id) || null : null;
  },
};

export const configStorage = {
  getSystemConfig: () => optimizedStorage.get('systemConfig'),
  setSystemConfig: (config: any) => optimizedStorage.set('systemConfig', config, true),
  getEmailConfig: (country: string) => optimizedStorage.get(`emailConfig-${country}`),
  setEmailConfig: (country: string, config: any) => optimizedStorage.set(`emailConfig-${country}`, config),
};

export const cacheStorage = {
  get: (key: string, defaultValue: any = null) => optimizedStorage.get(`cache-${key}`, defaultValue),
  set: (key: string, value: any, ttlMinutes: number = 30) => {
    OptimizedCache.getInstance().set(`cache-${key}`, value, ttlMinutes);
  },
  clear: () => {
    // Only clear cache entries, not all storage
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (key.startsWith('cache-')) {
        localStorage.removeItem(key);
      }
    });
  },
};

// Export main instance
export default optimizedStorage;

// Cleanup function for app shutdown
export const cleanupStorage = () => {
  optimizedStorage.flush();
};