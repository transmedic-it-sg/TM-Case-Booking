/**
 * Database Connection Monitor
 * Handles database connectivity, retry logic, and fallback to localStorage
 */

import { supabase } from '../lib/supabase';

export interface ConnectionStatus {
  isConnected: boolean;
  isRetrying: boolean;
  retryCount: number;
  lastError?: string;
  fallbackMode: boolean;
}

export interface ConnectionMonitorOptions {
  maxRetries: number;
  retryInterval: number; // milliseconds
  onStatusChange?: (status: ConnectionStatus) => void;
  onFallbackActivated?: () => void;
}

class DatabaseConnectionMonitor {
  private status: ConnectionStatus = {
    isConnected: true,
    isRetrying: false,
    retryCount: 0,
    fallbackMode: false
  };

  private options: ConnectionMonitorOptions = {
    maxRetries: 3,
    retryInterval: 5000
  };

  private retryTimeout?: NodeJS.Timeout;
  private listeners: Array<(status: ConnectionStatus) => void> = [];

  constructor(options?: Partial<ConnectionMonitorOptions>) {
    this.options = { ...this.options, ...options };
  }

  public getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  public addListener(callback: (status: ConnectionStatus) => void): void {
    this.listeners.push(callback);
  }

  public removeListener(callback: (status: ConnectionStatus) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getStatus()));
    if (this.options.onStatusChange) {
      this.options.onStatusChange(this.getStatus());
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      // Simple test query to check connection
      const { error } = await supabase
        .from('departments')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Database connection test failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Database connection test error:', error);
      return false;
    }
  }

  public async handleConnectionError(error: any): Promise<boolean> {
    const errorMessage = error.message || 'Unknown database error';
    
    // Check if this is actually a connection error vs a data/logic error
    if (this.isDataError(errorMessage)) {
      console.log('Data error detected (not connection issue):', errorMessage);
      // Don't treat data errors as connection failures
      return false;
    }

    console.error('Database connection error detected:', error);

    this.status.isConnected = false;
    this.status.lastError = errorMessage;
    this.notifyListeners();

    // If we haven't exceeded max retries, start retry process
    if (this.status.retryCount < this.options.maxRetries && !this.status.isRetrying) {
      return this.startRetryProcess();
    } else {
      // Activate fallback mode
      this.activateFallbackMode();
      return false;
    }
  }

  private isDataError(errorMessage: string): boolean {
    const dataErrorPatterns = [
      'Department .* not found',
      'not found in',
      'No rows returned',
      'Invalid input',
      'Validation error',
      'Constraint violation',
      'Foreign key constraint',
      'Unique constraint',
      'row-level security policy',
      'invalid input syntax for type uuid',
      'RLS policy',
      'permission denied'
    ];
    
    return dataErrorPatterns.some(pattern => 
      new RegExp(pattern, 'i').test(errorMessage)
    );
  }

  private async startRetryProcess(): Promise<boolean> {
    this.status.isRetrying = true;
    this.status.retryCount++;
    this.notifyListeners();

    console.log(`Attempting to reconnect (${this.status.retryCount}/${this.options.maxRetries})...`);

    return new Promise((resolve) => {
      this.retryTimeout = setTimeout(async () => {
        const isConnected = await this.testConnection();

        if (isConnected) {
          // Connection restored
          this.status.isConnected = true;
          this.status.isRetrying = false;
          this.status.retryCount = 0;
          this.status.lastError = undefined;
          this.status.fallbackMode = false;
          this.notifyListeners();
          
          console.log('Database connection restored!');
          resolve(true);
        } else {
          // Retry failed
          this.status.isRetrying = false;
          
          if (this.status.retryCount < this.options.maxRetries) {
            // Try again
            this.notifyListeners();
            resolve(await this.startRetryProcess());
          } else {
            // Max retries exceeded, activate fallback
            this.activateFallbackMode();
            resolve(false);
          }
        }
      }, this.options.retryInterval);
    });
  }

  private activateFallbackMode(): void {
    this.status.fallbackMode = true;
    this.status.isRetrying = false;
    this.notifyListeners();

    console.warn('Max retry attempts exceeded. Activating localStorage fallback mode.');
    
    if (this.options.onFallbackActivated) {
      this.options.onFallbackActivated();
    }
  }

  public resetConnection(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.status = {
      isConnected: true,
      isRetrying: false,
      retryCount: 0,
      fallbackMode: false
    };

    this.notifyListeners();
  }

  public forceReconnect(): Promise<boolean> {
    this.resetConnection();
    return this.testConnection();
  }
}

// Global instance
export const connectionMonitor = new DatabaseConnectionMonitor({
  maxRetries: 3,
  retryInterval: 5000
});

// Helper function to execute database operations with retry logic
export async function withConnectionRetry<T>(
  operation: () => Promise<T>,
  fallback?: () => T | Promise<T>
): Promise<T> {
  try {
    const result = await operation();
    
    // If operation succeeded and we were in fallback mode, try to restore connection
    if (connectionMonitor.getStatus().fallbackMode) {
      const reconnected = await connectionMonitor.forceReconnect();
      if (reconnected) {
        console.log('Database connection restored during operation');
      }
    }
    
    return result;
  } catch (error) {
    const shouldRetry = await connectionMonitor.handleConnectionError(error);
    
    if (shouldRetry) {
      // Retry the operation
      return withConnectionRetry(operation, fallback);
    } else {
      // Use fallback if available
      if (fallback) {
        console.log('Using fallback operation due to database connection failure');
        return await fallback();
      }
      throw error;
    }
  }
}

export default DatabaseConnectionMonitor;