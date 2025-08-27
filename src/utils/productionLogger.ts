/**
 * Production Logger - Optimized for Multi-User Environment
 * Reduces bandwidth usage and memory impact while maintaining traceability
 * Designed for 100+ concurrent users with proper user identification
 */

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  userId?: string;
  sessionId?: string;
  module?: string;
  data?: any;
  userAgent?: string;
  url?: string;
}

interface LoggerConfig {
  maxLocalEntries: number;
  batchSize: number;
  flushInterval: number; // milliseconds
  enableConsoleOutput: boolean;
  logLevels: string[];
  persistToLocalStorage: boolean;
}

class ProductionLogger {
  private config: LoggerConfig = {
    maxLocalEntries: 100, // Limit memory usage
    batchSize: 10, // Send logs in batches to reduce bandwidth
    flushInterval: 60000, // Flush every minute
    enableConsoleOutput: process.env.NODE_ENV === 'development',
    logLevels: process.env.NODE_ENV === 'development' 
      ? ['debug', 'info', 'warn', 'error', 'critical']
      : ['warn', 'error', 'critical'], // Only important logs in production
    persistToLocalStorage: false // Disabled by default to prevent memory issues
  };

  private logBuffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'app-logs';

  constructor(customConfig?: Partial<LoggerConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.startPeriodicFlush();
    this.setupUnloadHandler();
  }

  // ===========================================================================
  // CORE LOGGING METHODS
  // ===========================================================================

  debug(message: string, data?: any, module?: string): void {
    this.log('debug', message, data, module);
  }

  info(message: string, data?: any, module?: string): void {
    this.log('info', message, data, module);
  }

  warn(message: string, data?: any, module?: string): void {
    this.log('warn', message, data, module);
  }

  error(message: string, data?: any, module?: string): void {
    this.log('error', message, data, module);
  }

  critical(message: string, data?: any, module?: string): void {
    this.log('critical', message, data, module);
    // Critical errors are sent immediately
    this.flushLogs();
  }

  // ===========================================================================
  // USER TRACEABILITY METHODS
  // ===========================================================================

  userAction(userId: string, action: string, details?: any, module?: string): void {
    this.log('info', `User action: ${action}`, {
      userId,
      action,
      details,
      userTraceability: true
    }, module);
  }

  userError(userId: string, error: string, context?: any, module?: string): void {
    this.log('error', `User error: ${error}`, {
      userId,
      error,
      context,
      userTraceability: true,
      requiresAttention: true
    }, module);
  }

  systemMetric(metric: string, value: number | string, userId?: string): void {
    if (this.config.logLevels.includes('debug')) {
      this.log('debug', `System metric: ${metric}`, {
        metric,
        value,
        userId,
        isMetric: true
      }, 'system');
    }
  }

  // ===========================================================================
  // PERFORMANCE TRACKING
  // ===========================================================================

  startPerformanceTimer(operation: string, userId?: string): string {
    const timerId = `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.config.logLevels.includes('debug')) {
      this.log('debug', `Performance timer started: ${operation}`, {
        timerId,
        operation,
        userId,
        startTime: performance.now()
      }, 'performance');
    }
    
    return timerId;
  }

  endPerformanceTimer(timerId: string, operation: string, userId?: string): number {
    const endTime = performance.now();
    const duration = endTime; // We'll calculate actual duration when processing logs
    
    if (this.config.logLevels.includes('debug')) {
      this.log('debug', `Performance timer ended: ${operation}`, {
        timerId,
        operation,
        userId,
        duration: `${duration}ms`,
        endTime
      }, 'performance');
    }
    
    return duration;
  }

  // ===========================================================================
  // CORE LOGGING IMPLEMENTATION
  // ===========================================================================

  private log(level: LogEntry['level'], message: string, data?: any, module?: string): void {
    // Skip if log level is not enabled
    if (!this.config.logLevels.includes(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      module,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Only include data if it's not too large (prevent memory issues)
    if (data !== undefined) {
      try {
        const dataSize = JSON.stringify(data).length;
        if (dataSize < 1000) { // Limit data size to 1KB
          entry.data = data;
        } else {
          entry.data = { 
            _truncated: true, 
            _originalSize: dataSize,
            _summary: this.summarizeData(data)
          };
        }
      } catch (error) {
        entry.data = { _error: 'Could not serialize data' };
      }
    }

    // Add to buffer
    this.logBuffer.push(entry);

    // Console output (only in development or for critical errors)
    if (this.config.enableConsoleOutput || level === 'critical') {
      this.outputToConsole(entry);
    }

    // Maintain buffer size limit
    if (this.logBuffer.length > this.config.maxLocalEntries) {
      this.logBuffer = this.logBuffer.slice(-this.config.maxLocalEntries);
    }

    // Persist to localStorage if enabled (not recommended for production)
    if (this.config.persistToLocalStorage) {
      this.persistLogs();
    }

    // Auto-flush for critical errors
    if (level === 'critical' || this.logBuffer.length >= this.config.batchSize) {
      this.flushLogs();
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const consoleMessage = `[${entry.level.toUpperCase()}] ${entry.timestamp} - ${entry.message}`;
    
    switch (entry.level) {
      case 'debug':
        console.log(consoleMessage, entry.data);
        break;
      case 'info':
        console.info(consoleMessage, entry.data);
        break;
      case 'warn':
        console.warn(consoleMessage, entry.data);
        break;
      case 'error':
      case 'critical':
        console.error(consoleMessage, entry.data);
        break;
    }
  }

  // ===========================================================================
  // DATA MANAGEMENT
  // ===========================================================================

  private summarizeData(data: any): string {
    try {
      if (typeof data === 'object' && data !== null) {
        const keys = Object.keys(data);
        return `Object with keys: [${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}]`;
      }
      return String(data).substring(0, 100);
    } catch {
      return 'Unknown data type';
    }
  }

  private getCurrentUserId(): string | undefined {
    try {
      // Try multiple sources for user ID
      const storedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return user.id || user.username;
      }
      
      // Fallback to session-based identification
      return sessionStorage.getItem('session-token') || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('logging-session-id');
    
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('logging-session-id', sessionId);
    }
    
    return sessionId;
  }

  // ===========================================================================
  // LOG TRANSMISSION AND PERSISTENCE
  // ===========================================================================

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToSend = this.logBuffer.splice(0, this.config.batchSize);

    try {
      // In a real production environment, you would send these to a logging service
      // For now, we'll use a placeholder that could be replaced with actual endpoint
      await this.sendLogsToService(logsToSend);
    } catch (error) {
      // If sending fails, put logs back in buffer (up to limit)
      const remainingSpace = this.config.maxLocalEntries - this.logBuffer.length;
      if (remainingSpace > 0) {
        this.logBuffer.unshift(...logsToSend.slice(0, remainingSpace));
      }
      
      console.error('Failed to send logs to service:', error);
    }
  }

  private async sendLogsToService(logs: LogEntry[]): Promise<void> {
    // Placeholder for actual logging service integration
    // In production, this would send to your logging infrastructure
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Would send ${logs.length} logs to logging service:`, logs);
    }
    
    // Example implementation for a real logging service:
    /*
    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs })
      });
      
      if (!response.ok) {
        throw new Error(`Logging service responded with ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Failed to send logs: ${error.message}`);
    }
    */
  }

  private persistLogs(): void {
    try {
      const existingLogs = this.getPersistedLogs();
      const allLogs = [...existingLogs, ...this.logBuffer].slice(-this.config.maxLocalEntries);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allLogs));
    } catch (error) {
      // If localStorage is full, clear old logs and try again
      try {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logBuffer.slice(-50))); // Keep only recent logs
      } catch {
        // Give up on persistence if still failing
        console.warn('Unable to persist logs to localStorage');
      }
    }
  }

  private getPersistedLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // ===========================================================================
  // TIMER AND CLEANUP
  // ===========================================================================

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushLogs();
    }, this.config.flushInterval);
  }

  private setupUnloadHandler(): void {
    // Flush logs when page is being unloaded
    window.addEventListener('beforeunload', () => {
      this.flushLogs();
    });

    // Also handle visibility change (when user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushLogs();
      }
    });
  }

  // ===========================================================================
  // PUBLIC UTILITY METHODS
  // ===========================================================================

  getLogSummary(): {
    bufferSize: number;
    sessionId: string;
    userId: string | undefined;
    config: LoggerConfig;
  } {
    return {
      bufferSize: this.logBuffer.length,
      sessionId: this.getSessionId(),
      userId: this.getCurrentUserId(),
      config: this.config
    };
  }

  clearLogs(): void {
    this.logBuffer = [];
    if (this.config.persistToLocalStorage) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  exportLogs(): LogEntry[] {
    return [...this.logBuffer, ...this.getPersistedLogs()];
  }

  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Final flush
    this.flushLogs();
  }
}

// Create singleton instance with production-optimized defaults
export const logger = new ProductionLogger({
  enableConsoleOutput: process.env.NODE_ENV === 'development',
  logLevels: process.env.NODE_ENV === 'development' 
    ? ['debug', 'info', 'warn', 'error', 'critical']
    : ['warn', 'error', 'critical'],
  maxLocalEntries: 50, // Reduced for production
  batchSize: 5, // Smaller batches for better bandwidth management
  flushInterval: 120000, // 2 minutes in production
  persistToLocalStorage: false // Disabled for multi-user environment
});

export default logger;