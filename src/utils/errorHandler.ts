/**
 * Centralized Error Handling System
 * Provides standardized error handling with user notifications and retry logic
 */

export interface ErrorHandlingOptions {
  operation: string;
  userMessage?: string;
  showToast?: boolean;
  showNotification?: boolean;
  includeDetails?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  fallbackToLocalStorage?: boolean;
  allowEmptyResult?: boolean; // Allow empty arrays/objects as valid results
  preventFakeData?: boolean; // Explicitly prevent any fake/hardcoded data fallbacks
}

export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  retryCount?: number;
  usedFallback?: boolean;
  isEmpty?: boolean; // Indicates if result is empty but valid
  dataSource?: 'database' | 'cache' | 'localStorage' | 'hardcoded'; // Track data source
}

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
      fallbackToLocalStorage = false,
      allowEmptyResult = true,
      preventFakeData = true
    } = options;

    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();

        // Validate result to prevent fake data
        const isValidResult = this.validateResult(result, allowEmptyResult, preventFakeData);

        if (!isValidResult.isValid) {
          throw new Error(`Invalid result detected: ${isValidResult.reason}. No fake data allowed in production.`);
        }

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
          retryCount,
          isEmpty: isValidResult.isEmpty,
          dataSource: 'database' // Assume database unless specified otherwise
        };
      } catch (error) {
        retryCount = attempt + 1;

        // If this isn't the last attempt and auto-retry is enabled, wait and retry
        if (attempt < maxRetries && autoRetry) {
          // // // console.warn(`${operationName} failed (attempt ${retryCount}/${maxRetries + 1}), retrying...`, error);
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

        // Try localStorage fallback if enabled and fake data is not prevented
        if (fallbackToLocalStorage && !preventFakeData) {
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
            usedFallback: true,
            dataSource: 'localStorage'
          };
        }

        // If fake data is prevented, ensure we don't return any fallback data
        if (preventFakeData) {
          this.showUserMessage(
            'error',
            `${operationName} failed and no fallback data available. Empty result returned to prevent data corruption.`,
            'This is a security measure to prevent fake/hardcoded data from contaminating the system.',
            showToast,
            showNotification
          );
        }

        return {
          success: false,
          error: errorMessage,
          retryCount,
          dataSource: undefined
        };
      }
    }

    return {
      success: false,
      error: 'Maximum retries exceeded',
      retryCount,
      dataSource: undefined
    };
  }

  /**
   * CRITICAL: Validate results to prevent fake/hardcoded data contamination
   * This is essential for production integrity with 100+ users
   */
  private static validateResult<T>(
    result: T,
    allowEmptyResult: boolean,
    preventFakeData: boolean
  ): { isValid: boolean; reason?: string; isEmpty: boolean } {

    // Allow null/undefined if empty results are permitted
    if (result === null || result === undefined) {
      return {
        isValid: allowEmptyResult,
        reason: allowEmptyResult ? undefined : 'Null/undefined result not allowed',
        isEmpty: true
      };
    }

    // Check for array results
    if (Array.isArray(result)) {
      const isEmpty = result.length === 0;

      if (isEmpty && !allowEmptyResult) {
        return {
          isValid: false,
          reason: 'Empty array not allowed',
          isEmpty: true
        };
      }

      if (preventFakeData && result.length > 0) {
        // Check for suspicious hardcoded data patterns
        const suspiciousFakeData = this.detectFakeData(result);
        if (suspiciousFakeData.length > 0) {
          return {
            isValid: false,
            reason: `Potential fake data detected: ${suspiciousFakeData.join(', ')}`,
            isEmpty: false
          };
        }
      }

      return { isValid: true, isEmpty, reason: undefined };
    }

    // Check for object results
    if (typeof result === 'object') {
      const keys = Object.keys(result);
      const isEmpty = keys.length === 0;

      if (isEmpty && !allowEmptyResult) {
        return {
          isValid: false,
          reason: 'Empty object not allowed',
          isEmpty: true
        };
      }

      if (preventFakeData && !isEmpty) {
        // Check if object contains suspicious hardcoded data
        const suspiciousFakeData = this.detectFakeData([result]);
        if (suspiciousFakeData.length > 0) {
          return {
            isValid: false,
            reason: `Potential fake data detected in object: ${suspiciousFakeData.join(', ')}`,
            isEmpty: false
          };
        }
      }

      return { isValid: true, isEmpty, reason: undefined };
    }

    // For primitive values, they're generally valid unless we're being strict about fake data
    return { isValid: true, isEmpty: false, reason: undefined };
  }

  /**
   * Detect potential fake/hardcoded data patterns
   */
  private static detectFakeData(data: any[]): string[] {
    const suspiciousPatterns: string[] = [];

    // Common fake data patterns to detect
    const fakeDataIndicators = {
      // Hardcoded country lists
      countries: ['Singapore', 'Malaysia', 'Philippines', 'Indonesia', 'Vietnam', 'Hong Kong', 'Thailand'],
      // Hardcoded department names
      departments: ['Cardiology', 'Orthopedics', 'Neurosurgery', 'Oncology', 'Emergency', 'Radiology'],
      // Hardcoded procedure types
      procedureTypes: ['Knee', 'Head', 'Hip', 'Hands', 'Neck', 'Spine'],
      // Hardcoded status patterns
      statuses: ['pending', 'confirmed', 'order-placed', 'completed', 'cancelled'],
      // Test/placeholder data
      testData: ['Test', 'Sample', 'Example', 'Placeholder', 'Default', 'Lorem ipsum']
    };

    data.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        // Check for complete hardcoded arrays matching our known fake data
        Object.entries(fakeDataIndicators).forEach(([category, indicators]) => {
          if (Array.isArray(item) && item.length > 0) {
            // Check if array exactly matches a fake data pattern
            const matchesPattern = indicators.some(indicator =>
              item.includes(indicator) && item.filter(i => indicators.includes(i)).length > 2
            );

            if (matchesPattern) {
              suspiciousPatterns.push(`Hardcoded ${category} array at index ${index}`);
            }
          } else if (item.name || item.display_name || item.title) {
            // Check individual items for fake data patterns
            const itemName = item.name || item.display_name || item.title;
            if (typeof itemName === 'string') {
              indicators.forEach(indicator => {
                if (itemName.toLowerCase().includes(indicator.toLowerCase())) {
                  const consecutiveFakeCount = data.filter(d => {
                    const name = d?.name || d?.display_name || d?.title || '';
                    return typeof name === 'string' && indicators.some(ind =>
                      name.toLowerCase().includes(ind.toLowerCase())
                    );
                  }).length;

                  // If more than 3 consecutive fake-looking entries, flag as suspicious
                  if (consecutiveFakeCount > 3) {
                    suspiciousPatterns.push(`Multiple ${category} fake data entries (${consecutiveFakeCount} found)`);
                  }
                }
              });
            }
          }
        });
      }
    });

    return Array.from(new Set(suspiciousPatterns)); // Remove duplicates
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
    fallbackToLocalStorage,
    allowEmptyResult: true,
    preventFakeData: true // CRITICAL: Prevent fake data in production
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
    maxRetries: 0,
    allowEmptyResult: true,
    preventFakeData: true // CRITICAL: Prevent fake data in user actions
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
    maxRetries: 3,
    allowEmptyResult: true,
    preventFakeData: true // CRITICAL: Prevent fake data even in background
  });
};

/**
 * CRITICAL: Handle production data operations with strict fake data prevention
 * Use this for all data fetching operations that must never return fake data
 */
export const handleProductionDataOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  allowEmpty = true
): Promise<OperationResult<T>> => {
  return ErrorHandler.executeWithRetry(operation, {
    operation: operationName,
    userMessage: `${operationName} - No fallback data available to ensure production integrity`,
    showToast: true,
    showNotification: true,
    includeDetails: true,
    autoRetry: true,
    maxRetries: 3,
    fallbackToLocalStorage: false, // Never use localStorage for production data
    allowEmptyResult: allowEmpty,
    preventFakeData: true // ABSOLUTELY NO fake data
  });
};