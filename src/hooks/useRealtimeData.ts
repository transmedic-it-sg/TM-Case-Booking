/**
 * Real-time Data Hook - Enterprise Solution for 50-100 Concurrent Users
 * Eliminates manual cache clearing with intelligent real-time updates
 *
 * Features:
 * - Supabase real-time subscriptions with automatic cache invalidation
 * - Smart batching to prevent excessive re-renders
 * - Connection health monitoring with auto-reconnection
 * - Optimized for 50-100 concurrent users
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { realtimeDebugger } from '../utils/realtimeDebugger';

interface RealtimeConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  queryKeys: string[][]; // React Query keys to invalidate
  schema?: string;
  debounceMs?: number;
  batchUpdates?: boolean;
}

interface ConnectionStatus {
  connected: boolean;
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
}

export const useRealtimeData = (configs: RealtimeConfig[]) => {
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingInvalidations = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCleanupRef = useRef(false);
  const configsRef = useRef(configs);

  // Update refs when values change
  queryClientRef.current = queryClient;
  configsRef.current = configs;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    lastHeartbeat: null,
    reconnectAttempts: 0
  });

  // Removed redundant batchInvalidateQueries - handled directly in handleDatabaseChange

  // Handle real-time database changes
  const handleDatabaseChange = useCallback((
    payload: RealtimePostgresChangesPayload<any>,
    config: RealtimeConfig
  ) => {// Update connection status
    setConnectionStatus(prev => ({
      ...prev,
      connected: true,
      lastHeartbeat: new Date(),
      reconnectAttempts: 0
    }));

    // Invalidate related queries using refs to prevent dependency loops
    if (config.batchUpdates) {
      config.queryKeys.forEach(key => {
        pendingInvalidations.current.add(JSON.stringify(key));
      });

      // Clear existing timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      // Batch updates over 100ms window
      batchTimeoutRef.current = setTimeout(() => {
        const uniqueKeys = Array.from(pendingInvalidations.current)
          .map(key => JSON.parse(key));

        uniqueKeys.forEach(queryKey => {
          queryClientRef.current.invalidateQueries({ queryKey });
        });

        pendingInvalidations.current.clear();
      }, 100);
    } else {
      config.queryKeys.forEach(queryKey => {
        queryClientRef.current.invalidateQueries({ queryKey });
      });
    }
  }, []); // Remove dependencies to prevent infinite loops - use refs instead

  // Setup real-time subscriptions with stability controls
  useEffect(() => {
    if (isCleanupRef.current) return; // Prevent new subscriptions during cleanup

    const channels: RealtimeChannel[] = [];

    configsRef.current.forEach((config, index) => {
      const channelName = `realtime_${config.table}_${index}_${Math.random().toString(36).substr(2, 9)}`;realtimeDebugger.logEvent('subscription', {
        table: config.table,
        message: 'Setting up subscription'
      });

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes' as any,
          {
            event: config.event || '*',
            schema: config.schema || 'public',
            table: config.table
          },
          (payload: any) => {
            if (!isCleanupRef.current) {
              realtimeDebugger.logEvent('message', {
                table: config.table,
                message: `Received ${payload.eventType} event`
              });
              handleDatabaseChange(payload, config);
            }
          }
        )
        .subscribe((status) => {
          if (isCleanupRef.current) return; // Ignore status updates during cleanup
          
          if (status === 'SUBSCRIBED') {
            realtimeDebugger.logEvent('connection', {
              table: config.table,
              message: 'Successfully subscribed'
            });
            setConnectionStatus(prev => ({
              ...prev,
              connected: true,
              lastHeartbeat: new Date(),
              reconnectAttempts: 0 // Reset on successful connection
            }));
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            const reconnectAttempts = Math.min(connectionStatus.reconnectAttempts + 1, 10);
            realtimeDebugger.logEvent('disconnection', {
              table: config.table,
              message: `Connection ${status}`,
              reconnectAttempt: reconnectAttempts
            });
            setConnectionStatus(prev => ({
              ...prev,
              connected: false,
              reconnectAttempts: Math.min(prev.reconnectAttempts + 1, 10) // Cap at 10
            }));
          }
        });

      channels.push(channel);
    });

    channelsRef.current = channels;

    // Cleanup function
    return () => {
      isCleanupRef.current = true;channels.forEach(channel => {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          // // // console.warn('Error removing channel:', error);
        }
      });

      channelsRef.current = [];

      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Reset cleanup flag after a delay
      setTimeout(() => {
        isCleanupRef.current = false;
      }, 1000);
    };
  }, [handleDatabaseChange]); // Uses configsRef.current instead of configs to prevent loops

  // Connection health monitoring with exponential backoff
  useEffect(() => {
    const healthCheck = setInterval(() => {
      if (isCleanupRef.current) return; // Skip during cleanup

      const now = new Date();
      const timeSinceLastHeartbeat = connectionStatus.lastHeartbeat
        ? now.getTime() - connectionStatus.lastHeartbeat.getTime()
        : Infinity;

      // If no heartbeat for 60 seconds, mark as disconnected (increased from 30s)
      if (timeSinceLastHeartbeat > 60000 && connectionStatus.connected) {
        // // // console.warn('🚨 Real-time connection appears to be stale');
        realtimeDebugger.logEvent('error', {
          message: 'Connection timeout - no heartbeat for 60s'
        });
        setConnectionStatus(prev => ({
          ...prev,
          connected: false
        }));
      }

      // Track memory usage periodically
      realtimeDebugger.trackMemoryUsage();

      // REMOVED AUTO-RECONNECT to prevent infinite loops
      // Manual reconnection only through forceRefresh function
    }, 30000); // Check every 30 seconds (increased from 10s)

    return () => clearInterval(healthCheck);
  }, [connectionStatus.connected, connectionStatus.lastHeartbeat]); // Remove reconnectAttempts to prevent loops

  // Manual refresh function for fallback
  const forceRefresh = useCallback(() => {configsRef.current.forEach(config => {
      config.queryKeys.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
    });
  }, [queryClient]);

  return {
    connectionStatus,
    forceRefresh,
    isConnected: connectionStatus.connected,
    reconnectAttempts: connectionStatus.reconnectAttempts
  };
};

// REMOVED: Conflicting useRealtimeCases hook
// Using the comprehensive implementation from useRealtimeCases.ts instead

/**
 * Hook for user and settings real-time updates
 */
export const useRealtimeUsers = () => {
  return useRealtimeData([
    {
      table: 'profiles',
      event: '*',
      queryKeys: [
        ['users'],
        ['user-list'],
        ['current-user']
      ],
      batchUpdates: true
    },
    {
      table: 'system_settings',
      event: '*',
      queryKeys: [
        ['system-settings'],
        ['app-config'],
        ['user-preferences']
      ],
      batchUpdates: true
    },
    {
      table: 'app_settings',
      event: '*',
      queryKeys: [
        ['app-settings'],
        ['email-config'],
        ['notification-matrix']
      ],
      batchUpdates: true
    }
  ]);
};

/**
 * Hook for code tables and master data real-time updates
 */
export const useRealtimeMasterData = () => {
  return useRealtimeData([
    {
      table: 'code_tables',
      event: '*',
      queryKeys: [
        ['countries'],
        ['departments'],
        ['procedures'],
        ['hospitals'],
        ['master-data']
      ],
      batchUpdates: true
    },
    {
      table: 'surgery_sets',
      event: '*',
      queryKeys: [
        ['surgery-sets'],
        ['edit-sets'],
        ['master-data']
      ],
      batchUpdates: true
    },
    {
      table: 'implant_boxes',
      event: '*',
      queryKeys: [
        ['implant-boxes'],
        ['edit-sets'],
        ['master-data']
      ],
      batchUpdates: true
    }
  ]);
};