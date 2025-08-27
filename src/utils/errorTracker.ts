/**
 * Error Tracking and User Traceability System - Production Ready
 * Comprehensive error tracking with user context for 100+ concurrent users
 * Integrates with production logger for optimized bandwidth usage
 */

import { logger } from './productionLogger';

interface ErrorContext {
  userId?: string;
  userName?: string;
  sessionId: string;
  userAgent: string;
  url: string;
  timestamp: string;
  component?: string;
  action?: string;
  additionalData?: Record<string, any>;
}

interface TrackedError {
  id: string;
  message: string;
  stack?: string;
  type: 'javascript' | 'network' | 'validation' | 'business' | 'critical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: ErrorContext;
  resolved: boolean;
  firstOccurrence: string;
  lastOccurrence: string;
  occurrenceCount: number;
  affectedUsers: string[];
}

interface UserSession {
  sessionId: string;
  userId?: string;
  userName?: string;
  startTime: string;
  lastActivity: string;
  pageViews: string[];
  errorCount: number;
  warningCount: number;
  actionsPerformed: string[];
}

class ErrorTracker {
  private errors = new Map<string, TrackedError>();
  private userSessions = new Map<string, UserSession>();
  private readonly MAX_ERRORS_IN_MEMORY = 100;
  private readonly MAX_SESSIONS_IN_MEMORY = 50;
  private readonly ERROR_AGGREGATION_WINDOW = 300000; // 5 minutes

  constructor() {
    this.setupGlobalErrorHandlers();
    this.setupUnloadHandler();
    this.startPeriodicCleanup();
  }

  // ===========================================================================
  // CORE ERROR TRACKING METHODS
  // ===========================================================================

  trackError(
    error: Error | string, 
    type: TrackedError['type'] = 'javascript',
    severity: TrackedError['severity'] = 'medium',
    component?: string,
    additionalData?: Record<string, any>
  ): string {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    const context = this.buildErrorContext(component, additionalData);
    const errorId = this.generateErrorId(errorMessage, context.url, component);
    
    // Check if this error already exists
    if (this.errors.has(errorId)) {
      this.updateExistingError(errorId, context);
    } else {
      this.createNewError(errorId, errorMessage, errorStack, type, severity, context);
    }

    // Update user session
    this.updateUserSession(context, 'error');

    // Log to production logger
    logger.userError(
      context.userId || 'anonymous',
      errorMessage,
      {
        errorId,
        type,
        severity,
        component,
        stack: errorStack,
        additionalData
      },
      'errorTracker'
    );

    // Send critical errors immediately
    if (severity === 'critical') {
      this.sendCriticalErrorAlert(errorId, errorMessage, context);
    }

    return errorId;
  }

  trackUserAction(
    action: string,
    component?: string,
    success: boolean = true,
    additionalData?: Record<string, any>
  ): void {
    const context = this.buildErrorContext(component, additionalData);
    
    // Update user session with action
    this.updateUserSession(context, 'action', action);
    
    // Log action for traceability
    logger.userAction(
      context.userId || 'anonymous',
      action,
      {
        component,
        success,
        additionalData,
        sessionId: context.sessionId
      },
      'userActions'
    );

    // Track failed actions as potential errors
    if (!success) {
      this.trackError(
        `Action failed: ${action}`,
        'business',
        'medium',
        component,
        { action, ...additionalData }
      );
    }
  }

  trackPageView(pageName: string, additionalData?: Record<string, any>): void {
    const context = this.buildErrorContext(pageName, additionalData);
    this.updateUserSession(context, 'pageView', pageName);
    
    logger.info(
      `Page view: ${pageName}`,
      {
        userId: context.userId,
        sessionId: context.sessionId,
        additionalData
      },
      'pageViews'
    );
  }

  trackPerformanceIssue(
    operation: string,
    duration: number,
    threshold: number = 5000,
    component?: string
  ): void {
    if (duration > threshold) {
      this.trackError(
        `Performance issue: ${operation} took ${duration}ms (threshold: ${threshold}ms)`,
        'javascript',
        duration > threshold * 2 ? 'high' : 'medium',
        component,
        { operation, duration, threshold }
      );
    }

    logger.systemMetric(
      `performance_${operation}`,
      duration,
      this.getCurrentUserId()
    );
  }

  // ===========================================================================
  // NETWORK ERROR TRACKING
  // ===========================================================================

  trackNetworkError(
    url: string,
    method: string,
    statusCode?: number,
    response?: string,
    component?: string
  ): string {
    const errorMessage = `Network error: ${method} ${url}${statusCode ? ` (${statusCode})` : ''}`;
    
    return this.trackError(
      errorMessage,
      'network',
      statusCode && statusCode >= 500 ? 'high' : 'medium',
      component,
      {
        url,
        method,
        statusCode,
        response: response?.substring(0, 200), // Limit response size
        timestamp: new Date().toISOString()
      }
    );
  }

  trackValidationError(
    field: string,
    value: any,
    rule: string,
    component?: string
  ): string {
    const errorMessage = `Validation error: ${field} failed ${rule}`;
    
    return this.trackError(
      errorMessage,
      'validation',
      'low',
      component,
      {
        field,
        value: typeof value === 'string' ? value.substring(0, 50) : String(value).substring(0, 50),
        rule
      }
    );
  }

  // ===========================================================================
  // ERROR MANAGEMENT
  // ===========================================================================

  private createNewError(
    id: string,
    message: string,
    stack: string | undefined,
    type: TrackedError['type'],
    severity: TrackedError['severity'],
    context: ErrorContext
  ): void {
    const trackedError: TrackedError = {
      id,
      message,
      stack,
      type,
      severity,
      context,
      resolved: false,
      firstOccurrence: context.timestamp,
      lastOccurrence: context.timestamp,
      occurrenceCount: 1,
      affectedUsers: context.userId ? [context.userId] : []
    };

    this.errors.set(id, trackedError);
    this.maintainErrorLimit();
  }

  private updateExistingError(id: string, context: ErrorContext): void {
    const existingError = this.errors.get(id);
    if (!existingError) return;

    existingError.occurrenceCount++;
    existingError.lastOccurrence = context.timestamp;
    
    // Add user to affected users list
    if (context.userId && !existingError.affectedUsers.includes(context.userId)) {
      existingError.affectedUsers.push(context.userId);
    }

    // Escalate severity if error is recurring frequently
    if (existingError.occurrenceCount > 10 && existingError.severity !== 'critical') {
      const newSeverity = existingError.severity === 'high' ? 'critical' : 'high';
      existingError.severity = newSeverity;
      
      logger.warn(
        `Error severity escalated to ${newSeverity}`,
        { errorId: id, occurrenceCount: existingError.occurrenceCount },
        'errorTracker'
      );
    }
  }

  private generateErrorId(message: string, url: string, component?: string): string {
    // Create a consistent ID for similar errors
    const normalizedMessage = message.replace(/\d+/g, 'N').replace(/['"]/g, '');
    const normalizedUrl = url.split('?')[0]; // Remove query parameters
    const baseId = `${normalizedMessage}-${normalizedUrl}-${component || 'unknown'}`;
    
    // Create hash from base ID
    let hash = 0;
    for (let i = 0; i < baseId.length; i++) {
      const char = baseId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `error-${Math.abs(hash).toString(36)}`;
  }

  // ===========================================================================
  // USER SESSION MANAGEMENT
  // ===========================================================================

  private updateUserSession(
    context: ErrorContext, 
    eventType: 'error' | 'action' | 'pageView', 
    eventData?: string
  ): void {
    let session = this.userSessions.get(context.sessionId);
    
    if (!session) {
      session = {
        sessionId: context.sessionId,
        userId: context.userId,
        userName: context.userName,
        startTime: context.timestamp,
        lastActivity: context.timestamp,
        pageViews: [],
        errorCount: 0,
        warningCount: 0,
        actionsPerformed: []
      };
      
      this.userSessions.set(context.sessionId, session);
      this.maintainSessionLimit();
    }

    // Update session
    session.lastActivity = context.timestamp;
    session.userId = context.userId || session.userId;
    session.userName = context.userName || session.userName;

    switch (eventType) {
      case 'error':
        session.errorCount++;
        break;
      case 'action':
        if (eventData) {
          session.actionsPerformed.push(`${context.timestamp}: ${eventData}`);
          // Keep only last 20 actions
          session.actionsPerformed = session.actionsPerformed.slice(-20);
        }
        break;
      case 'pageView':
        if (eventData) {
          session.pageViews.push(`${context.timestamp}: ${eventData}`);
          // Keep only last 10 page views
          session.pageViews = session.pageViews.slice(-10);
        }
        break;
    }
  }

  private buildErrorContext(component?: string, additionalData?: Record<string, any>): ErrorContext {
    return {
      userId: this.getCurrentUserId(),
      userName: this.getCurrentUserName(),
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      component,
      additionalData
    };
  }

  // ===========================================================================
  // GLOBAL ERROR HANDLERS
  // ===========================================================================

  private setupGlobalErrorHandlers(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError(
        event.error || event.message,
        'javascript',
        'high',
        undefined,
        {
          filename: event.filename,
          lineNumber: event.lineno,
          columnNumber: event.colno
        }
      );
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(
        `Unhandled promise rejection: ${event.reason}`,
        'javascript',
        'high',
        undefined,
        {
          reason: event.reason,
          promise: event.promise
        }
      );
    });

    // Network errors (fetch)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Track network errors
        if (!response.ok) {
          this.trackNetworkError(
            args[0] as string,
            (args[1]?.method as string) || 'GET',
            response.status,
            response.statusText
          );
        }
        
        return response;
      } catch (error) {
        this.trackNetworkError(
          args[0] as string,
          (args[1]?.method as string) || 'GET'
        );
        throw error;
      }
    };
  }

  private setupUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      // Send final session data
      const currentSession = this.userSessions.get(this.getSessionId());
      if (currentSession) {
        logger.info(
          'Session ended',
          {
            sessionSummary: {
              duration: Date.now() - new Date(currentSession.startTime).getTime(),
              pageViews: currentSession.pageViews.length,
              errorsEncountered: currentSession.errorCount,
              actionsPerformed: currentSession.actionsPerformed.length
            }
          },
          'sessionManagement'
        );
      }
    });
  }

  // ===========================================================================
  // UTILITIES AND MAINTENANCE
  // ===========================================================================

  private getCurrentUserId(): string | undefined {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || '{}');
      return user.id || user.username;
    } catch {
      return undefined;
    }
  }

  private getCurrentUserName(): string | undefined {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || '{}');
      return user.name || user.username;
    } catch {
      return undefined;
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('error-tracker-session-id');
    
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error-tracker-session-id', sessionId);
    }
    
    return sessionId;
  }

  private maintainErrorLimit(): void {
    if (this.errors.size > this.MAX_ERRORS_IN_MEMORY) {
      // Remove oldest errors
      const errorEntries: Array<[string, TrackedError]> = [];
      this.errors.forEach((value, key) => {
        errorEntries.push([key, value]);
      });
      
      const sortedErrors = errorEntries
        .sort((a, b) => new Date(a[1].firstOccurrence).getTime() - new Date(b[1].firstOccurrence).getTime());
      
      const toRemove = sortedErrors.slice(0, this.errors.size - this.MAX_ERRORS_IN_MEMORY);
      toRemove.forEach(([id]) => this.errors.delete(id));
    }
  }

  private maintainSessionLimit(): void {
    if (this.userSessions.size > this.MAX_SESSIONS_IN_MEMORY) {
      // Remove oldest sessions
      const sessionEntries: Array<[string, UserSession]> = [];
      this.userSessions.forEach((value, key) => {
        sessionEntries.push([key, value]);
      });
      
      const sortedSessions = sessionEntries
        .sort((a, b) => new Date(a[1].startTime).getTime() - new Date(b[1].startTime).getTime());
      
      const toRemove = sortedSessions.slice(0, this.userSessions.size - this.MAX_SESSIONS_IN_MEMORY);
      toRemove.forEach(([id]) => this.userSessions.delete(id));
    }
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldData();
    }, 600000); // Clean up every 10 minutes
  }

  private cleanupOldData(): void {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24); // Remove data older than 24 hours

    // Clean up old errors
    this.errors.forEach((error, id) => {
      if (new Date(error.lastOccurrence) < cutoffTime) {
        this.errors.delete(id);
      }
    });

    // Clean up old sessions
    this.userSessions.forEach((session, id) => {
      if (new Date(session.lastActivity) < cutoffTime) {
        this.userSessions.delete(id);
      }
    });
  }

  private async sendCriticalErrorAlert(errorId: string, message: string, context: ErrorContext): Promise<void> {
    // In production, this would send alerts to monitoring systems
    logger.critical(
      `CRITICAL ERROR ALERT: ${message}`,
      {
        errorId,
        context,
        requiresImmediateAttention: true
      },
      'criticalAlerts'
    );

    // Example: Send to monitoring service
    /*
    try {
      await fetch('/api/alerts/critical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId,
          message,
          context,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send critical error alert:', error);
    }
    */
  }

  // ===========================================================================
  // PUBLIC API METHODS
  // ===========================================================================

  getErrorSummary(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    topErrors: Array<{ id: string; message: string; count: number; severity: string }>;
  } {
    const errors = Array.from(this.errors.values());
    
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    
    errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + error.occurrenceCount;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + error.occurrenceCount;
    });

    const topErrors = errors
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
      .slice(0, 10)
      .map(error => ({
        id: error.id,
        message: error.message.substring(0, 100),
        count: error.occurrenceCount,
        severity: error.severity
      }));

    return {
      totalErrors: errors.length,
      errorsByType,
      errorsBySeverity,
      topErrors
    };
  }

  getUserSessionSummary(sessionId?: string): UserSession | undefined {
    const targetSessionId = sessionId || this.getSessionId();
    return this.userSessions.get(targetSessionId);
  }

  getAllUserSessions(): UserSession[] {
    return Array.from(this.userSessions.values());
  }

  markErrorAsResolved(errorId: string): boolean {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
      logger.info(`Error marked as resolved: ${errorId}`, { errorId }, 'errorResolution');
      return true;
    }
    return false;
  }

  clearAllData(): void {
    this.errors.clear();
    this.userSessions.clear();
    logger.info('Error tracker data cleared', {}, 'maintenance');
  }

  exportErrorData(): { errors: TrackedError[]; sessions: UserSession[] } {
    return {
      errors: Array.from(this.errors.values()),
      sessions: Array.from(this.userSessions.values())
    };
  }
}

// Create singleton instance
export const errorTracker = new ErrorTracker();
export default errorTracker;