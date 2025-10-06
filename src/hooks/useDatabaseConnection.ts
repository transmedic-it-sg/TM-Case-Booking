import { useState, useEffect, useCallback } from 'react';
import {
  DatabaseConnectionInfo,
  testConnectionWithTimeout,
  getConnectionStatusDisplay
} from '../utils/databaseConnectivity';

// Connection check settings
const CONNECTION_TIMEOUT = 3000; // 3 second timeout for faster checks

export const useDatabaseConnection = () => {
  const [connectionInfo, setConnectionInfo] = useState<DatabaseConnectionInfo>({
    status: 'connected', // Start optimistically
    lastChecked: new Date(),
    usingFallback: false
  });
  const [isVisible, setIsVisible] = useState(false);

  // Force a connection test (with visual feedback)
  const forceCheck = useCallback(async () => {
    setIsVisible(true);
    setConnectionInfo(prev => ({ ...prev, status: 'checking' }));

    try {
      const result = await testConnectionWithTimeout(CONNECTION_TIMEOUT);
      setConnectionInfo(result);
    } catch (error) {
      // // // console.error('Manual connection test failed:', error);
      setConnectionInfo({
        status: 'disconnected',
        lastChecked: new Date(),
        usingFallback: true,
        errorMessage: error instanceof Error ? error.message : 'Connection test failed'
      });
    }
  }, []);

  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  // Get display information
  const displayInfo = getConnectionStatusDisplay(connectionInfo);

  // Initialize with optimistic connection status
  useEffect(() => {// Set optimistic connection status to prevent UI issues
    setConnectionInfo({
      status: 'connected',
      lastChecked: new Date(),
      usingFallback: false
    });
  }, []);

  return {
    connectionInfo,
    displayInfo,
    isVisible,
    forceCheck,
    toggleVisibility,
    isConnected: connectionInfo.status === 'connected',
    isDisconnected: connectionInfo.status === 'disconnected',
    isChecking: connectionInfo.status === 'checking',
    usingFallback: connectionInfo.usingFallback
  };
};