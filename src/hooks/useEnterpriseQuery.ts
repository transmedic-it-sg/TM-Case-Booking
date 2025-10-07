/**
 * Enterprise Query Hook
 * Integrates React Query with real-time cache invalidation
 * Solves: Multi-user data synchronization and cache coherence
 */

import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { getCacheInstance } from '../utils/cacheManager';

interface UseEnterpriseQueryOptions<TData = unknown> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  tags?: string[];
  enableRealtime?: boolean;
  enableOptimistic?: boolean;
  staleTime?: number;
  gcTime?: number; // v5: renamed from cacheTime
}

/**
 * Enhanced useQuery with enterprise features
 */
export const useEnterpriseQuery = <TData = unknown>(options: UseEnterpriseQueryOptions<TData>) => {
  const {
    queryKey,
    queryFn,
    tags = [],
    enableRealtime = true,
    staleTime = 0, // NO CACHE - Always fresh for 50 concurrent users
    gcTime = 0, // NO CACHE - No storage
  } = options;

  const queryClient = useQueryClient();
  const cache = getCacheInstance();

  // Standard React Query - Fixed for v5
  const query = useQuery({
    queryKey,
    queryFn,
    staleTime,
    gcTime, // v5: renamed from cacheTime
    // Enable background refetch
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Retry configuration
    retry: (failureCount: number, error: Error) => {
      // Don't retry on 4xx errors
      const errorWithStatus = error as any;
      if (errorWithStatus?.status >= 400 && errorWithStatus?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    throwOnError: false,
  });

  // Real-time invalidation setup
  useEffect(() => {
    if (!enableRealtime || tags.length === 0) return;

    const unsubscribers: (() => void)[] = [];

    // Subscribe to each tag for automatic invalidation
    tags.forEach(tag => {
      const unsubscribe = cache.subscribe(`tag:${tag}`, () => {queryClient.invalidateQueries({ queryKey });
      });
      unsubscribers.push(unsubscribe);
    });

    // Cleanup subscriptions
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [queryKey, tags, enableRealtime, queryClient, cache]);

  return query;
};

/**
 * Enhanced useMutation with cache invalidation
 */
export const useEnterpriseMutation = (options: {
  mutationFn: (variables: any) => Promise<any>;
  invalidateTags?: string[];
  invalidateQueries?: QueryKey[];
  enableOptimistic?: boolean;
  optimisticUpdateFn?: (variables: any, currentData: any) => any;
}) => {
  const {
    mutationFn,
    invalidateTags = [],
    invalidateQueries = [],
    enableOptimistic = false,
    optimisticUpdateFn,
  } = options;

  const queryClient = useQueryClient();
  const cache = getCacheInstance();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Optimistic updates
      if (enableOptimistic && optimisticUpdateFn) {
        // Cancel any outgoing refetches
        await Promise.all(
          invalidateQueries.map(queryKey =>
            queryClient.cancelQueries({ queryKey })
          )
        );

        // Snapshot previous values
        const previousData = invalidateQueries.map(queryKey => ({
          queryKey,
          data: queryClient.getQueryData(queryKey)
        }));

        // Optimistically update
        invalidateQueries.forEach(queryKey => {
          queryClient.setQueryData(queryKey, (old: any) =>
            optimisticUpdateFn(variables, old)
          );
        });

        return { previousData };
      }
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousData) {
        context.previousData.forEach(({ queryKey, data }: any) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate cache by tags
      invalidateTags.forEach(tag => {
        cache.invalidateByTag(tag);
      });

      // Invalidate specific queries
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });},
  });
};

/**
 * Hook for country-specific cache management
 * Solves: Country-based data isolation
 */
export const useCountryCache = (country: string) => {
  const cache = getCacheInstance();
  const queryClient = useQueryClient();

  const invalidateCountryData = useCallback(() => {
    // Invalidate all country-specific cache entries
    cache.invalidateByTag(`country:${country}`);

    // Invalidate React Query entries with country in key
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key.some(k =>
          typeof k === 'string' && k.includes(country)
        );
      }
    });}, [country, cache, queryClient]);

  const getCountryData = useCallback((key: string) => {
    return cache.get(`${country}:${key}`);
  }, [country, cache]);

  const setCountryData = useCallback((key: string, data: any, ttl?: number) => {
    cache.set(`${country}:${key}`, data, {
      tags: [`country:${country}`, 'sets-data'],
      ttl
    });
  }, [country, cache]);

  return {
    invalidateCountryData,
    getCountryData,
    setCountryData,
  };
};

/**
 * Hook for monitoring cache performance
 */
export const useCacheMonitoring = () => {
  const cache = getCacheInstance();
  const queryClient = useQueryClient();

  const getCacheStats = useCallback(() => {
    const enterpriseStats = cache.getStats();
    const reactQueryCache = queryClient.getQueryCache();

    return {
      ...enterpriseStats,
      reactQuerySize: reactQueryCache.getAll().length,
      timestamp: new Date().toISOString(),
    };
  }, [cache, queryClient]);

  const logCacheStats = useCallback(() => {
    const stats = getCacheStats();
// console.table(stats);
  }, [getCacheStats]);

  return {
    getCacheStats,
    logCacheStats,
  };
};