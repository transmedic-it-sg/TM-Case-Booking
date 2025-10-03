/**
 * Enterprise Provider Component
 * Integrates all enterprise cache and data management features
 * Provides context for real-time updates and cache management
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createClient } from '@supabase/supabase-js';
import { initializeCache, getCacheInstance } from '../utils/cacheManager';
import { logger } from '../utils/logger';

interface CacheStats {
  size: number;
  maxSize: number;
  hitRatio: number;
  memoryUsage: string;
}

interface EnterpriseContextType {
  isOnline: boolean;
  cacheStats: CacheStats | null;
  refreshCache: () => void;
  clearAllCache: () => void;
  deploymentInfo: DeploymentInfo | null;
}

interface DeploymentInfo {
  version: string;
  cacheVersion: string;
  buildTime: string;
  isLatest: boolean;
}

const EnterpriseContext = createContext<EnterpriseContextType | undefined>(undefined);

// Configure React Query client with enterprise settings - Fixed for v5
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 5 minutes by default
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000, // v5: renamed from cacheTime to gcTime

        // Retry configuration
        retry: (failureCount: number, error: Error) => {
          // Don't retry 4xx errors
          const errorWithStatus = error as any;
          if (errorWithStatus?.status >= 400 && errorWithStatus?.status < 500) {
            return false;
          }
          return failureCount < 3;
        },

        // Background refetching
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,

        // Error handling - moved to onError callback
        throwOnError: false,
      },
      mutations: {
        retry: 1,
        throwOnError: false,
      },
    },
  });
};

interface EnterpriseProviderProps {
  children: ReactNode;
  supabaseUrl: string;
  supabaseKey: string;
}

export const EnterpriseProvider: React.FC<EnterpriseProviderProps> = ({
  children,
  supabaseUrl,
  supabaseKey,
}) => {
  const [queryClient] = useState(() => createQueryClient());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(null);
  const [supabaseClient] = useState(() => createClient(supabaseUrl, supabaseKey));

  // Initialize enterprise cache
  useEffect(() => {
    try {
      initializeCache(supabaseClient);
      logger.info('Enterprise cache initialized');
    } catch (error) {
      logger.error('Failed to initialize enterprise cache', error);
    }
  }, [supabaseClient]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logger.info('Application back online');

      // Invalidate all queries to refetch fresh data
      queryClient.invalidateQueries();
    };

    const handleOffline = () => {
      setIsOnline(false);
      logger.warn('Application offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  // Service Worker integration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, version, appVersion } = event.data;

        switch (type) {
          case 'CACHE_UPDATED':
            logger.info('Cache updated by service worker', { version, appVersion });
            handleCacheUpdate();
            break;

          case 'VERSION_UPDATE':
            logger.info('New version available', event.data);
            checkForUpdates();
            break;
        }
      });
    }
  }, []);

  // Deployment version checking
  useEffect(() => {
    checkForUpdates();

    // Check for updates every 5 minutes
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Cache statistics monitoring
  useEffect(() => {
    const updateCacheStats = () => {
      try {
        const cache = getCacheInstance();
        const stats = cache.getStats() as CacheStats;
        setCacheStats(stats);
      } catch (error) {
        // Cache not initialized yet
        setCacheStats(null);
      }
    };

    updateCacheStats();
    const interval = setInterval(updateCacheStats, 30 * 1000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleCacheUpdate = () => {
    // Clear React Query cache
    queryClient.clear();

    // Clear enterprise cache
    try {
      const cache = getCacheInstance();
      cache.clearAll();
    } catch (error) {
      logger.error('Failed to clear enterprise cache', error);
    }

    logger.info('All caches cleared due to update');
  };

  const checkForUpdates = async () => {
    try {
      const response = await fetch('/meta.json', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (response.ok) {
        const metadata = await response.json();
        const currentVersion = process.env.REACT_APP_VERSION || '1.0.0';

        setDeploymentInfo({
          version: metadata.version,
          cacheVersion: metadata.cacheVersion,
          buildTime: metadata.buildTime,
          isLatest: metadata.version === currentVersion
        });

        // If versions don't match, there's a new deployment
        if (metadata.version !== currentVersion) {
          logger.warn('New deployment detected', {
            current: currentVersion,
            latest: metadata.version
          });

          // Show update notification (implement as needed)
          showUpdateNotification(metadata);
        }
      }
    } catch (error) {
      logger.error('Failed to check for updates', error);
    }
  };

  const showUpdateNotification = (metadata: any) => {
    // Implement your notification system here
    // For example, show a toast or modal asking user to refresh// Auto-refresh after a delay in production
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => {
        window.location.reload();
      }, 30000); // 30 seconds delay
    }
  };

  const refreshCache = () => {
    handleCacheUpdate();
    queryClient.invalidateQueries();
    logger.info('Cache manually refreshed');
  };

  const clearAllCache = async () => {
    // Clear React Query
    queryClient.clear();

    // Clear enterprise cache
    try {
      const cache = getCacheInstance();
      cache.clearAll();
    } catch (error) {
      logger.error('Failed to clear enterprise cache', error);
    }

    // Clear service worker cache
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    }

    // Clear browser storage
    try {
      // Clear handled by Supabase auth signOut
      sessionStorage.clear();
    } catch (error) {
      logger.error('Failed to clear browser storage', error);
    }

    logger.info('All caches and storage cleared');

    // Reload page after clearing everything
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const contextValue: EnterpriseContextType = {
    isOnline,
    cacheStats,
    refreshCache,
    clearAllCache,
    deploymentInfo,
  };

  return (
    <EnterpriseContext.Provider value={contextValue}>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </EnterpriseContext.Provider>
  );
};

export const useEnterprise = (): EnterpriseContextType => {
  const context = useContext(EnterpriseContext);
  if (context === undefined) {
    throw new Error('useEnterprise must be used within an EnterpriseProvider');
  }
  return context;
};

// Developer tools component for cache monitoring
export const CacheMonitor: React.FC = () => {
  const { cacheStats, isOnline, deploymentInfo, refreshCache, clearAllCache } = useEnterprise();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        🏢 Enterprise Cache Monitor
      </div>

      <div>
        📶 Status: {isOnline ? '🟢 Online' : '🔴 Offline'}
      </div>

      {deploymentInfo && (
        <div>
          🚀 Version: {deploymentInfo.version}
          {!deploymentInfo.isLatest && ' (Update Available)'}
        </div>
      )}

      {cacheStats && (
        <div>
          💾 Cache: {cacheStats.size}/{cacheStats.maxSize} entries
          <br />
          📊 Memory: {cacheStats.memoryUsage}
        </div>
      )}

      <div style={{ marginTop: '8px' }}>
        <button
          onClick={refreshCache}
          style={{
            marginRight: '4px',
            padding: '2px 6px',
            fontSize: '10px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          ↻ Refresh
        </button>
        <button
          onClick={clearAllCache}
          style={{
            padding: '2px 6px',
            fontSize: '10px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          🗑️ Clear All
        </button>
      </div>
    </div>
  );
};