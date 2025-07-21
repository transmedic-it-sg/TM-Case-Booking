import { supabase } from '../lib/supabase';
import { getDatabaseName } from './getDatabaseName';

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking' | 'fallback';

export interface DatabaseConnectionInfo {
  status: ConnectionStatus;
  lastChecked: Date;
  usingFallback: boolean;
  errorMessage?: string;
  responseTime?: number;
}

// Simple connection test using a lightweight query
export const testDatabaseConnection = async (): Promise<DatabaseConnectionInfo> => {
  const startTime = Date.now();
  
  try {
    // Use a simple query to test connection - just check if we can access the database
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      console.warn('Database connection test failed:', error.message);
      return {
        status: 'disconnected',
        lastChecked: new Date(),
        usingFallback: true,
        errorMessage: error.message,
        responseTime
      };
    }
    
    return {
      status: 'connected',
      lastChecked: new Date(),
      usingFallback: false,
      responseTime
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.warn('Database connection test error:', error);
    
    return {
      status: 'disconnected',
      lastChecked: new Date(),
      usingFallback: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown connection error',
      responseTime
    };
  }
};

// Test connection with timeout
export const testConnectionWithTimeout = async (timeoutMs: number = 5000): Promise<DatabaseConnectionInfo> => {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve({
        status: 'disconnected',
        lastChecked: new Date(),
        usingFallback: true,
        errorMessage: 'Connection timeout',
        responseTime: timeoutMs
      });
    }, timeoutMs);
    
    testDatabaseConnection().then((result) => {
      clearTimeout(timeoutId);
      resolve(result);
    }).catch((error) => {
      clearTimeout(timeoutId);
      resolve({
        status: 'disconnected',
        lastChecked: new Date(),
        usingFallback: true,
        errorMessage: error instanceof Error ? error.message : 'Connection failed',
        responseTime: timeoutMs
      });
    });
  });
};

// Get connection status display info
export const getConnectionStatusDisplay = (info: DatabaseConnectionInfo) => {
  switch (info.status) {
    case 'connected':
      return {
        color: '#22c55e', // Green
        icon: '🟢',
        text: 'Database Connected',
        description: `Connected to: ${getDatabaseName()} (${info.responseTime}ms)`,
        bgColor: '#dcfce7'
      };
    case 'disconnected':
      return {
        color: '#ef4444', // Red
        icon: '🔴',
        text: 'Database Disconnected',
        description: `Using local storage fallback${info.errorMessage ? ` - ${info.errorMessage}` : ''}`,
        bgColor: '#fee2e2'
      };
    case 'checking':
      return {
        color: '#f59e0b', // Amber
        icon: '🟡',
        text: 'Checking Connection',
        description: 'Testing database connectivity...',
        bgColor: '#fef3c7'
      };
    case 'fallback':
      return {
        color: '#f59e0b', // Amber
        icon: '🟠',
        text: 'Fallback Mode',
        description: 'Using local storage due to connection issues',
        bgColor: '#fef3c7'
      };
    default:
      return {
        color: '#6b7280', // Gray
        icon: '⚪',
        text: 'Unknown Status',
        description: 'Connection status unknown',
        bgColor: '#f3f4f6'
      };
  }
};