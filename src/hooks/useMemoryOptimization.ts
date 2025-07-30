/**
 * Memory Optimization Hook
 * Automatically cleans up event listeners, intervals, and other resources
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseMemoryOptimizationReturn {
  addCleanup: (cleanup: () => void) => void;
  addInterval: (callback: () => void, delay: number) => NodeJS.Timeout;
  addTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
  addEventListener: (element: Element, event: string, handler: EventListener) => void;
  removeAllListeners: () => void;
}

export const useMemoryOptimization = (): UseMemoryOptimizationReturn => {
  const cleanupFunctions = useRef<(() => void)[]>([]);
  const intervals = useRef<NodeJS.Timeout[]>([]);
  const timeouts = useRef<NodeJS.Timeout[]>([]);
  const eventListeners = useRef<Array<{
    element: Element;
    event: string;
    handler: EventListener;
  }>>([]);

  const addCleanup = useCallback((cleanup: () => void) => {
    cleanupFunctions.current.push(cleanup);
  }, []);

  const addInterval = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const interval = setInterval(callback, delay);
    intervals.current.push(interval);
    return interval;
  }, []);

  const addTimeout = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timeout = setTimeout(() => {
      callback();
      // Remove from timeout list after execution
      timeouts.current = timeouts.current.filter(t => t !== timeout);
    }, delay);
    timeouts.current.push(timeout);
    return timeout;
  }, []);

  const addEventListener = useCallback((element: Element, event: string, handler: EventListener) => {
    element.addEventListener(event, handler);
    eventListeners.current.push({ element, event, handler });
  }, []);

  const removeAllListeners = useCallback(() => {
    eventListeners.current.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    eventListeners.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all intervals
      intervals.current.forEach(interval => clearInterval(interval));
      intervals.current = [];

      // Clear all timeouts
      timeouts.current.forEach(timeout => clearTimeout(timeout));
      timeouts.current = [];

      // Remove all event listeners
      eventListeners.current.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      eventListeners.current = [];

      // Run all cleanup functions
      cleanupFunctions.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Cleanup function error:', error);
        }
      });
      cleanupFunctions.current = [];
    };
  }, []);

  return {
    addCleanup,
    addInterval,
    addTimeout,
    addEventListener,
    removeAllListeners,
  };
};

// Hook for optimizing React state updates
export const useOptimizedState = <T>(initialValue: T) => {
  const value = useRef<T>(initialValue);
  const listeners = useRef<Set<(newValue: T) => void>>(new Set());

  const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
    const nextValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(value.current)
      : newValue;

    if (nextValue !== value.current) {
      value.current = nextValue;
      listeners.current.forEach(listener => listener(nextValue));
    }
  }, []);

  const subscribe = useCallback((listener: (newValue: T) => void) => {
    listeners.current.add(listener);
    return () => listeners.current.delete(listener);
  }, []);

  return [value.current, setValue, subscribe] as const;
};

// Hook for debounced effects to reduce excessive re-renders
export const useDebouncedEffect = (
  effect: () => void | (() => void),
  deps: React.DependencyList,
  delay: number = 300
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const cleanup = effect();
      return cleanup;
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [...deps, delay]);
};

// Hook for intersection observer to lazy load content
export const useIntersectionObserver = (
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const memory = useMemoryOptimization();

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(ref.current);

    memory.addCleanup(() => {
      observer.disconnect();
    });

    return () => observer.disconnect();
  }, [ref, options.threshold, options.root, options.rootMargin]);

  return isIntersecting;
};

