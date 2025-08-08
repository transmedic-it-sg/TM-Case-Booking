import { useState, useEffect, useCallback } from 'react';
import { 
  DatabaseConnectionInfo, 
  testConnectionWithTimeout,
  getConnectionStatusDisplay 
} from '../utils/databaseConnectivity';

// Temporarily disabled - constants for future use
// const CONNECTION_CHECK_INTERVAL = 60000; // Check every 60 seconds (reduced frequency)
// const INITIAL_CHECK_DELAY = 1000; // Wait 1 second before first check
const CONNECTION_TIMEOUT = 3000; // 3 second timeout for faster checks

export const useDatabaseConnection = () => {
  const [connectionInfo, setConnectionInfo] = useState<DatabaseConnectionInfo>({
    status: 'connected', // Start optimistically
    lastChecked: new Date(),
    usingFallback: false
  });
  const [isVisible, setIsVisible] = useState(false);

  // Test connection function for background checks (no visual feedback) - temporarily disabled
  // const testConnectionSilently = useCallback(async () => {
  //   try {
  //     const result = await testConnectionWithTimeout(CONNECTION_TIMEOUT);
  //     setConnectionInfo(result);
  //   } catch (error) {
  //     console.error('Background connection test failed:', error);
  //     setConnectionInfo({
  //       status: 'disconnected',
  //       lastChecked: new Date(),
  //       usingFallback: true,
  //       errorMessage: error instanceof Error ? error.message : 'Connection test failed'
  //     });
  //   }
  // }, []);

  // Force a connection test (with visual feedback)
  const forceCheck = useCallback(async () => {
    setIsVisible(true);
    setConnectionInfo(prev => ({ ...prev, status: 'checking' }));
    
    try {
      const result = await testConnectionWithTimeout(CONNECTION_TIMEOUT);
      setConnectionInfo(result);
    } catch (error) {
      console.error('Manual connection test failed:', error);
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

  // DISABLED: Database connection testing causing infinite loops
  // TODO: Fix schema mismatch before re-enabling
  useEffect(() => {
    console.log('Database connection monitoring temporarily disabled');
    // Set optimistic connection status to prevent UI issues
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