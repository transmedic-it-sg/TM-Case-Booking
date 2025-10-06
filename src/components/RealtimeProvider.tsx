/**
 * Real-time Provider - Enterprise Solution for Live Data
 * Eliminates manual cache clearing for 50-100 concurrent users
 *
 * Features:
 * - Automatic real-time subscriptions for all data tables
 * - Connection health monitoring with visual indicators
 * - Emergency fallback with force refresh capability
 * - Optimized batching to prevent excessive re-renders
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useRealtimeCases } from '../hooks/useRealtimeCases';
import { useRealtimeUsers, useRealtimeMasterData } from '../hooks/useRealtimeData';
import { useForceRefreshAll } from '../services/realtimeQueryService';

interface RealtimeContextType {
  casesConnected: boolean;
  usersConnected: boolean;
  masterDataConnected: boolean;
  overallConnected: boolean;
  reconnectAttempts: number;
  forceRefreshAll: () => void;
  lastActivity: Date | null;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
};

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  // Setup real-time subscriptions
  const casesRealtime = useRealtimeCases();
  const usersRealtime = useRealtimeUsers();
  const masterDataRealtime = useRealtimeMasterData();

  // Force refresh function
  const forceRefreshAll = useForceRefreshAll();

  // Track last activity for connection health with debouncing
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [debouncedConnectionStatus, setDebouncedConnectionStatus] = useState({
    overall: false,
    reconnectAttempts: 0
  });
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update activity timestamp when any connection receives data (debounced)
  useEffect(() => {
    if (casesRealtime.isConnected || usersRealtime.isConnected || masterDataRealtime.isConnected) {
      setLastActivity(new Date());
    }
  }, [casesRealtime.isConnected, usersRealtime.isConnected, masterDataRealtime.isConnected]);

  // Calculate connection statuses
  const casesConnected = casesRealtime.isConnected;
  const usersConnected = usersRealtime.isConnected;
  const masterDataConnected = masterDataRealtime.isConnected;
  const overallConnected = casesConnected && usersConnected && masterDataConnected;
  const totalReconnectAttempts = casesRealtime.reconnectAttempts + usersRealtime.reconnectAttempts + masterDataRealtime.reconnectAttempts;

  // Debounce connection status updates to prevent UI flicker
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedConnectionStatus({
        overall: overallConnected,
        reconnectAttempts: totalReconnectAttempts
      });
    }, 1000); // 1-second debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [overallConnected, totalReconnectAttempts]);

  // Log connection status changes
  useEffect(() => {}, [casesRealtime.isConnected, usersRealtime.isConnected, masterDataRealtime.isConnected, overallConnected, totalReconnectAttempts]);

  // Auto force refresh if connections are down for too long (NO STORAGE)
  const lastRefreshRef = useRef<number>(0);
  useEffect(() => {
    if (!overallConnected && totalReconnectAttempts > 20) { // Increased threshold
      // // // console.warn('🚨 Too many reconnect attempts - forcing cache refresh');

      // Throttle force refresh to once every 60 seconds (memory only)
      const now = Date.now();

      if ((now - lastRefreshRef.current) > 60000) {
        lastRefreshRef.current = now;
        forceRefreshAll();
      }
    }
  }, [overallConnected, totalReconnectAttempts, forceRefreshAll]);

  const contextValue: RealtimeContextType = {
    casesConnected: casesRealtime.isConnected,
    usersConnected: usersRealtime.isConnected,
    masterDataConnected: masterDataRealtime.isConnected,
    overallConnected: debouncedConnectionStatus.overall,
    reconnectAttempts: debouncedConnectionStatus.reconnectAttempts,
    forceRefreshAll,
    lastActivity
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
      <RealtimeStatusIndicator />
    </RealtimeContext.Provider>
  );
};

/**
 * Visual indicator for real-time connection status
 */
const RealtimeStatusIndicator: React.FC = () => {
  const { overallConnected, reconnectAttempts, lastActivity } = useRealtime();
  const [showIndicator, setShowIndicator] = useState(false);

  // Show indicator logic - immediate hide when connected, delayed show when disconnected
  useEffect(() => {
    if (overallConnected) {
      // Hide immediately when connectedsetShowIndicator(false);
    } else {
      // Only show indicator after significant disconnection (15+ failed attempts)
      // to avoid showing during normal startup and brief disconnections
      if (reconnectAttempts > 15) {setShowIndicator(true);
      }
    }
  }, [overallConnected, reconnectAttempts]);

  // Don't show indicator if connected or if we shouldn't show it
  if (!showIndicator || overallConnected) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 10000,
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: overallConnected ? '#22c55e' : '#ef4444',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          animation: overallConnected ? 'none' : 'pulse 1.5s infinite'
        }}
      />
      {overallConnected ? (
        <>✅ Live Data Connected</>
      ) : (
        <>⚠️ Reconnecting... ({reconnectAttempts})</>
      )}
      {lastActivity && (
        <div style={{ fontSize: '10px', opacity: 0.8 }}>
          Last: {lastActivity.toLocaleTimeString()}
        </div>
      )}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

/**
 * Connection Health Monitor Hook
 */
export const useConnectionHealth = () => {
  const { overallConnected, reconnectAttempts, lastActivity, forceRefreshAll } = useRealtime();

  const healthStatus = React.useMemo(() => {
    if (overallConnected && reconnectAttempts === 0) {
      return 'excellent';
    } else if (overallConnected && reconnectAttempts < 5) {
      return 'good';
    } else if (reconnectAttempts < 10) {
      return 'poor';
    } else {
      return 'critical';
    }
  }, [overallConnected, reconnectAttempts]);

  const timeSinceLastActivity = React.useMemo(() => {
    if (!lastActivity) return null;
    return Date.now() - lastActivity.getTime();
  }, [lastActivity]);

  return {
    healthStatus,
    isConnected: overallConnected,
    reconnectAttempts,
    timeSinceLastActivity,
    forceRefreshAll
  };
};