import { useState, useEffect, useCallback } from 'react';
import { 
  DatabaseConnectionInfo, 
  testConnectionWithTimeout,
  getConnectionStatusDisplay 
} from '../utils/databaseConnectivity';

const CONNECTION_CHECK_INTERVAL = 60000; // Check every 60 seconds (reduced frequency)
const INITIAL_CHECK_DELAY = 1000; // Wait 1 second before first check
const CONNECTION_TIMEOUT = 3000; // 3 second timeout for faster checks

export const useDatabaseConnection = () => {
  const [connectionInfo, setConnectionInfo] = useState<DatabaseConnectionInfo>({
    status: 'connected', // Start optimistically
    lastChecked: new Date(),
    usingFallback: false
  });
  const [isVisible, setIsVisible] = useState(false);

  // Test connection function for background checks (no visual feedback)
  const testConnectionSilently = useCallback(async () => {
    try {
      const result = await testConnectionWithTimeout(CONNECTION_TIMEOUT);
      setConnectionInfo(result);
    } catch (error) {
      console.error('Background connection test failed:', error);
      setConnectionInfo({
        status: 'disconnected',
        lastChecked: new Date(),
        usingFallback: true,
        errorMessage: error instanceof Error ? error.message : 'Connection test failed'
      });
    }
  }, []);

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

  // Initial connection test and periodic checks
  useEffect(() => {
    // Initial check after delay
    const initialTimeout = setTimeout(() => {
      testConnectionSilently();
    }, INITIAL_CHECK_DELAY);

    // Periodic checks
    const interval = setInterval(() => {
      testConnectionSilently();
    }, CONNECTION_CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [testConnectionSilently]);

  // Check connection when coming back from background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        testConnectionSilently();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [testConnectionSilently]);

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