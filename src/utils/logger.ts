/**
 * Production-Safe Logging Utility
 * Removes sensitive information and reduces console output in production
 */

// Future enhancement: structured logging
// interface LogEntry {
//   level: 'debug' | 'info' | 'warn' | 'error';
//   message: string;
//   data?: any;
//   timestamp: Date;
// }

class Logger {
  private isDevelopment: boolean;
  private sensitiveKeys = [
    'password', 'token', 'session', 'key', 'secret', 'auth',
    'credential', 'access_token', 'refresh_token', 'api_key'
  ];

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.sensitiveKeys.some(sensitiveKey => 
        lowerKey.includes(sensitiveKey)
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private shouldLog(level: string): boolean {
    if (this.isDevelopment) {
      return true;
    }

    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.log(`🔍 ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(`ℹ️ ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️ ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      console.error(`❌ ${message}`, error instanceof Error ? error.message : error);
    }
  }

  // Special methods for sensitive operations
  authLog(message: string, userInfo?: any): void {
    if (this.isDevelopment) {
      const sanitizedUser = userInfo ? {
        id: userInfo.id,
        name: userInfo.name,
        role: userInfo.role,
        // Remove sensitive fields
      } : undefined;
      console.log(`🔐 AUTH: ${message}`, sanitizedUser);
    }
  }

  permissionLog(message: string, data?: any): void {
    // Temporarily disabled to reduce console noise in development
    // Enable only when debugging permission issues
    if (false && this.isDevelopment) {
      const essential = data ? {
        role: data.roleId || data.role,
        action: data.actionId || data.action,
        result: data.result || data.allowed
      } : undefined;
      console.log(`🛡️ PERM: ${message}`, essential);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports
export const { debug, info, warn, error, authLog, permissionLog } = logger;