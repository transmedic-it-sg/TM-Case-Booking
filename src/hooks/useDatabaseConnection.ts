import { useState, useEffect, useCallback } from 'react';
import { 
  DatabaseConnectionInfo, 
  testConnectionWithTimeout,
  getConnectionStatusDisplay 
} from '../utils/databaseConnectivity';

const CONNECTION_CHECK_INTERVAL = 30000; // Check every 30 seconds
const INITIAL_CHECK_DELAY = 2000; // Wait 2 seconds before first check
const CONNECTION_TIMEOUT = 5000; // 5 second timeout for connection tests

export const useDatabaseConnection = () => {
  const [connectionInfo, setConnectionInfo] = useState<DatabaseConnectionInfo>({
    status: 'checking',
    lastChecked: new Date(),
    usingFallback: false
  });
  const [isVisible, setIsVisible] = useState(false);

  // Test connection function
  const testConnection = useCallback(async () => {
    setConnectionInfo(prev => ({ ...prev, status: 'checking' }));
    
    try {
      const result = await testConnectionWithTimeout(CONNECTION_TIMEOUT);
      setConnectionInfo(result);
      
      // Show indicator briefly if status changed
      if (result.status !== connectionInfo.status) {
        setIsVisible(true);
        setTimeout(() => setIsVisible(false), 3000);
      }
      
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionInfo({
        status: 'disconnected',
        lastChecked: new Date(),
        usingFallback: true,
        errorMessage: error instanceof Error ? error.message : 'Connection test failed'
      });
    }
  }, [connectionInfo.status]);

  // Force a connection test
  const forceCheck = useCallback(() => {
    setIsVisible(true);
    testConnection();
  }, [testConnection]);

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
      testConnection();
    }, INITIAL_CHECK_DELAY);

    // Periodic checks
    const interval = setInterval(() => {
      testConnection();
    }, CONNECTION_CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [testConnection]);

  // Check connection when coming back from background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        testConnection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [testConnection]);

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