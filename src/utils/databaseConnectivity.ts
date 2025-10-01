import { supabase } from '../lib/supabase';

export interface DatabaseConnectionInfo {
  status: 'connected' | 'disconnected' | 'checking' | 'fallback';
  lastChecked: Date;
  responseTime?: number;
  errorMessage?: string;
  usingFallback: boolean;
}

export interface DatabaseStatusDisplay {
  text: string;
  color: string;
  icon: string;
  description: string;
}

/**
 * Test database connection with timeout
 */
export const testConnectionWithTimeout = async (timeout: number = 3000): Promise<DatabaseConnectionInfo> => {
  const startTime = Date.now();

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), timeout);
    });

    // Test connection to a simple table
    const connectionPromise = supabase
      .from('code_tables')
      .select('id')
      .limit(1);

    // Race between connection test and timeout
    const { error } = await Promise.race([connectionPromise, timeoutPromise]);

    const responseTime = Date.now() - startTime;

    if (error) {
      console.error('Database connection test failed:', error);
      return {
        status: 'disconnected',
        lastChecked: new Date(),
        responseTime,
        errorMessage: error.message,
        usingFallback: true
      };
    }

    return {
      status: 'connected',
      lastChecked: new Date(),
      responseTime,
      usingFallback: false
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Database connection error:', error);

    return {
      status: 'disconnected',
      lastChecked: new Date(),
      responseTime,
      errorMessage: error instanceof Error ? error.message : 'Connection failed',
      usingFallback: true
    };
  }
};

/**
 * Get display information for connection status
 */
export const getConnectionStatusDisplay = (info: DatabaseConnectionInfo): DatabaseStatusDisplay => {
  switch (info.status) {
    case 'connected':
      return {
        text: 'Connected',
        color: '#22c55e', // Green
        icon: '🟢',
        description: 'Successfully connected to Supabase database. All features are available.'
      };

    case 'disconnected':
      return {
        text: 'Disconnected',
        color: '#ef4444', // Red
        icon: '🔴',
        description: 'Unable to connect to Supabase database. Using local storage fallback mode.'
      };

    case 'checking':
      return {
        text: 'Checking...',
        color: '#f59e0b', // Amber
        icon: '🟡',
        description: 'Testing database connection...'
      };

    case 'fallback':
      return {
        text: 'Offline Mode',
        color: '#f59e0b', // Amber
        icon: '📴',
        description: 'Operating in offline mode using local storage. Data will sync when connection is restored.'
      };

    default:
      return {
        text: 'Unknown',
        color: '#6b7280', // Gray
        icon: '❓',
        description: 'Connection status unknown'
      };
  }
};