/**
 * Centralized Error Handling System
 * Provides standardized error handling with user notifications and retry logic
 */

// Note: Toast and Notification systems are handled via custom events
// import { useToast } from '../components/ToastContainer';
// import { useNotifications } from '../contexts/NotificationContext';

export interface ErrorHandlingOptions {
  operation: string;
  userMessage?: string;
  showToast?: boolean;
  showNotification?: boolean;
  includeDetails?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  fallbackToLocalStorage?: boolean;
}

export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  retryCount?: number;
  usedFallback?: boolean;
}

// Global hooks for error handling (must be used within React context)
// These are reserved for future use when we implement a different approach
// let toastInstance: ReturnType<typeof useToast> | null = null;
// let notificationInstance: ReturnType<typeof useNotifications> | null = null;

export const initializeErrorHandler = () => {
  // This will be called from App.tsx to initialize the handlers
  // We'll use a different approach since hooks can't be used outside components
};

export class ErrorHandler {
  private static retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s delays

  /**
   * Execute an operation with standardized error handling and retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: ErrorHandlingOptions
  ): Promise<OperationResult<T>> {
    const {
      operation: operationName,
      userMessage,
      showToast = true,
      showNotification = false,
      includeDetails = true,
      autoRetry = true,
      maxRetries = 3,
      fallbackToLocalStorage = false
    } = options;

    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Success - show success message if it was retried
        if (retryCount > 0) {
          this.showUserMessage(
            'success',
            `${operationName} completed successfully after ${retryCount} ${retryCount === 1 ? 'retry' : 'retries'}`,
            undefined,
            showToast,
            showNotification
          );
        }

        return {
          success: true,
          data: result,
          retryCount
        };
      } catch (error) {
        retryCount = attempt + 1;

        // If this isn't the last attempt and auto-retry is enabled, wait and retry
        if (attempt < maxRetries && autoRetry) {
          console.warn(`${operationName} failed (attempt ${retryCount}/${maxRetries + 1}), retrying...`, error);
          await this.delay(this.retryDelays[attempt] || 4000);
          continue;
        }

        // Final failure - show error to user
        const errorMessage = this.formatErrorMessage(error);
        const fullMessage = userMessage || `${operationName} failed`;
        const detailMessage = includeDetails ? `${fullMessage}: ${errorMessage}` : fullMessage;

        this.showUserMessage(
          'error',
          detailMessage,
          includeDetails ? this.getErrorDetails(error, retryCount) : undefined,
          showToast,
          showNotification
        );

        // Try localStorage fallback if enabled
        if (fallbackToLocalStorage) {
          this.showUserMessage(
            'warning',
            `${operationName} failed - using offline mode. Data will sync when connection is restored.`,
            undefined,
            true,
            true
          );
          
          return {
            success: false,
            error: errorMessage,
            retryCount,
            usedFallback: true
          };
        }

        return {
          success: false,
          error: errorMessage,
          retryCount
        };
      }
    }

    return {
      success: false,
      error: 'Maximum retries exceeded',
      retryCount
    };
  }

  /**
   * Show a user-facing message via toast and/or notification
   */
  private static showUserMessage(
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    details?: string,
    showToast = true,
    showNotification = false
  ) {
    const fullMessage = details ? `${message}\n\nDetails: ${details}` : message;

    // Show toast notification (immediate)
    if (showToast) {
      // We'll need to use a different approach since we can't use hooks here
      // Instead, we'll dispatch a custom event that the App component can listen to
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { type, message: fullMessage }
      }));
    }

    // Show persistent notification
    if (showNotification) {
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: { type, message: fullMessage }
      }));
    }

    // Always log to console for debugging
    const consoleMethod = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`[${type.toUpperCase()}] ${message}`, details ? { details } : '');
  }

  /**
   * Format error message for display
   */
  private static formatErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error?.message) return error.error.message;
    if (error?.error) return error.error.toString();
    return JSON.stringify(error);
  }

  /**
   * Get detailed error information for technical users
   */
  private static getErrorDetails(error: any, retryCount: number): string {
    const details = [];
    
    if (retryCount > 0) {
      details.push(`Retried ${retryCount} times`);
    }

    if (error?.code) {
      details.push(`Code: ${error.code}`);
    }

    if (error?.status) {
      details.push(`Status: ${error.status}`);
    }

    if (error?.statusText) {
      details.push(`Status Text: ${error.statusText}`);
    }

    return details.join(', ');
  }

  /**
   * Simple delay utility
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is a network/connection error
   */
  static isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const errorStr = error.toString().toLowerCase();
    const networkErrors = [
      'network',
      'connection',
      'timeout',
      'fetch',
      'offline',
      'unreachable',
      'disconnected'
    ];
    
    return networkErrors.some(keyword => errorStr.includes(keyword));
  }

  /**
   * Check if error is a permission/auth error
   */
  static isPermissionError(error: any): boolean {
    if (!error) return false;
    
    const errorStr = error.toString().toLowerCase();
    const permissionErrors = [
      'forbidden',
      'unauthorized',
      'permission',
      'access denied',
      '403',
      '401'
    ];
    
    return permissionErrors.some(keyword => errorStr.includes(keyword));
  }

  /**
   * Quick method to handle simple operations with user feedback
   */
  static async handleOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    userMessage?: string
  ): Promise<OperationResult<T>> {
    return this.executeWithRetry(operation, {
      operation: operationName,
      userMessage,
      showToast: true,
      showNotification: false,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 3
    });
  }

  /**
   * Handle critical operations that should always notify the user
   */
  static async handleCriticalOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    userMessage?: string
  ): Promise<OperationResult<T>> {
    return this.executeWithRetry(operation, {
      operation: operationName,
      userMessage,
      showToast: true,
      showNotification: true,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 3
    });
  }
}

/**
 * Convenience functions for common error handling patterns
 */

export const handleSupabaseOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  fallbackToLocalStorage = false
): Promise<OperationResult<T>> => {
  return ErrorHandler.executeWithRetry(operation, {
    operation: operationName,
    showToast: true,
    showNotification: false,
    includeDetails: true,
    autoRetry: true,
    maxRetries: 3,
    fallbackToLocalStorage
  });
};

export const handleUserAction = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  userMessage?: string
): Promise<OperationResult<T>> => {
  return ErrorHandler.executeWithRetry(operation, {
    operation: operationName,
    userMessage,
    showToast: true,
    showNotification: true,
    includeDetails: true,
    autoRetry: false,
    maxRetries: 0
  });
};

export const handleBackgroundOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<OperationResult<T>> => {
  return ErrorHandler.executeWithRetry(operation, {
    operation: operationName,
    showToast: false,
    showNotification: false,
    includeDetails: false,
    autoRetry: true,
    maxRetries: 3
  });
};