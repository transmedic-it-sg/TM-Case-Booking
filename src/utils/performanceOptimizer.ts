/**
 * Performance Optimization Utilities
 * Reduces memory usage, improves performance, and optimizes resource loading
 */

// Debounce utility to reduce excessive function calls
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for scroll/resize events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memoization utility for expensive calculations
export const memoize = <T extends (...args: any[]) => any>(fn: T) => {
  const cache = new Map();
  return (...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// Lazy loading utility for components
export const createLazyComponent = (importFunc: () => Promise<any>) => {
  return React.lazy(importFunc);
};

// Cache management for localStorage with automatic cleanup
export class OptimizedCache {
  private static instance: OptimizedCache;
  private cache = new Map<string, { data: any; expiry: number; }>();
  private maxSize = 100; // Maximum cache entries

  static getInstance(): OptimizedCache {
    if (!OptimizedCache.instance) {
      OptimizedCache.instance = new OptimizedCache();
    }
    return OptimizedCache.instance;
  }

  set(key: string, data: any, ttlMinutes: number = 30): void {
    // Clean up expired entries first
    this.cleanup();
    
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const expiry = Date.now() + (ttlMinutes * 60 * 1000);
    this.cache.set(key, { data, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((item, key) => {
      if (now > item.expiry) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clear(): void {
    this.cache.clear();
  }
}

// Optimized localStorage operations
export const optimizedStorage = {
  get: (key: string): any => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  set: (key: string, value: any): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silent fail
    }
  }
};

// Bundle size optimization - dynamic imports for heavy components
export const loadHeavyComponent = async (componentName: string) => {
  const cache = OptimizedCache.getInstance();
  const cached = cache.get(`component-${componentName}`);
  
  if (cached) {
    return cached;
  }

  let component;
  switch (componentName) {
    case 'SimplifiedEmailConfig':
      component = await import('../components/SimplifiedEmailConfig');
      break;
    case 'Reports':
      component = await import('../components/Reports');
      break;
    case 'AuditLogs':
      component = await import('../components/AuditLogs');
      break;
    default:
      throw new Error(`Unknown component: ${componentName}`);
  }

  cache.set(`component-${componentName}`, component, 60); // Cache for 1 hour
  return component;
};

// Performance monitoring
export const performanceMonitor = {
  measureRender: (componentName: string, renderFn: () => void) => {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    console.log(`${componentName} render time: ${(end - start).toFixed(2)}ms`);
  },

  measureAsync: async (operationName: string, asyncFn: () => Promise<any>) => {
    const start = performance.now();
    const result = await asyncFn();
    const end = performance.now();
    console.log(`${operationName} execution time: ${(end - start).toFixed(2)}ms`);
    return result;
  }
};

// Memory cleanup utilities
export const memoryOptimizer = {
  cleanupEventListeners: (element: HTMLElement, events: string[]) => {
    events.forEach(event => {
      element.removeEventListener(event, () => {});
    });
  },

  cleanupIntervals: (intervals: NodeJS.Timeout[]) => {
    intervals.forEach(interval => clearInterval(interval));
  },

  cleanupTimeouts: (timeouts: NodeJS.Timeout[]) => {
    timeouts.forEach(timeout => clearTimeout(timeout));
  }
};

// Import React at the end to avoid issues
import React from 'react';