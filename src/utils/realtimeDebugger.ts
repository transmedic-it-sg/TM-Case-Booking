/**
 * Real-time Connection Debugger
 * Provides comprehensive debugging and monitoring for WebSocket connections
 */

interface ConnectionEvent {
  timestamp: Date;
  type: 'connection' | 'disconnection' | 'error' | 'message' | 'subscription';
  table?: string;
  message?: string;
  data?: any;
  reconnectAttempt?: number;
}

interface ConnectionMetrics {
  totalConnections: number;
  totalDisconnections: number;
  totalErrors: number;
  averageConnectionTime: number;
  reconnectionRate: number;
  memoryUsage: number[];
  isHealthy: boolean;
}

class RealtimeDebugger {
  private static instance: RealtimeDebugger;
  private events: ConnectionEvent[] = [];
  private maxEvents = 500; // Prevent memory bloat
  private startTime = Date.now();

  static getInstance(): RealtimeDebugger {
    if (!RealtimeDebugger.instance) {
      RealtimeDebugger.instance = new RealtimeDebugger();
    }
    return RealtimeDebugger.instance;
  }

  logEvent(type: ConnectionEvent['type'], data: Partial<ConnectionEvent> = {}) {
    const event: ConnectionEvent = {
      timestamp: new Date(),
      type,
      ...data
    };

    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const emoji = this.getEventEmoji(type);
      console.log(`${emoji} [${type.toUpperCase()}]`, {
        table: data.table,
        message: data.message,
        reconnectAttempt: data.reconnectAttempt,
        timestamp: event.timestamp.toLocaleTimeString()
      });
    }
  }

  getConnectionMetrics(): ConnectionMetrics {
    const connections = this.events.filter(e => e.type === 'connection');
    const disconnections = this.events.filter(e => e.type === 'disconnection');
    const errors = this.events.filter(e => e.type === 'error');
    
    // Calculate average connection time
    const connectionTimes = connections.map(c => c.timestamp.getTime());
    const avgConnectionTime = connectionTimes.length > 1 
      ? (connectionTimes[connectionTimes.length - 1] - connectionTimes[0]) / connectionTimes.length
      : 0;

    // Calculate reconnection rate (reconnections per minute)
    const reconnections = this.events.filter(e => e.reconnectAttempt && e.reconnectAttempt > 0);
    const minutesRunning = (Date.now() - this.startTime) / (1000 * 60);
    const reconnectionRate = reconnections.length / Math.max(minutesRunning, 1);

    // Memory usage tracking
    const memoryUsage = this.events
      .filter(e => e.data?.memoryUsage)
      .map(e => e.data.memoryUsage);

    // Health check
    const recentErrors = errors.filter(e => 
      Date.now() - e.timestamp.getTime() < 60000 // Last minute
    );
    const isHealthy = recentErrors.length < 5 && reconnectionRate < 2;

    return {
      totalConnections: connections.length,
      totalDisconnections: disconnections.length,
      totalErrors: errors.length,
      averageConnectionTime: avgConnectionTime,
      reconnectionRate,
      memoryUsage,
      isHealthy
    };
  }

  detectInfiniteReconnectionLoop(): boolean {
    const recentReconnects = this.events
      .filter(e => e.type === 'connection' && e.reconnectAttempt && e.reconnectAttempt > 0)
      .filter(e => Date.now() - e.timestamp.getTime() < 30000); // Last 30 seconds

    return recentReconnects.length > 10;
  }

  generateReport(): string {
    const metrics = this.getConnectionMetrics();
    const hasInfiniteLoop = this.detectInfiniteReconnectionLoop();
    const recentEvents = this.events.slice(-10);

    return `
🔍 REAL-TIME CONNECTION REPORT
========================================
🕐 Generated: ${new Date().toLocaleString()}
⏱️ Runtime: ${Math.round((Date.now() - this.startTime) / 1000)}s

📊 CONNECTION METRICS
• Total Connections: ${metrics.totalConnections}
• Total Disconnections: ${metrics.totalDisconnections}
• Total Errors: ${metrics.totalErrors}
• Reconnection Rate: ${metrics.reconnectionRate.toFixed(2)}/min
• Health Status: ${metrics.isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}

🚨 ISSUE DETECTION
• Infinite Loop Detected: ${hasInfiniteLoop ? '⚠️ YES' : '✅ NO'}
• Memory Trend: ${this.getMemoryTrend(metrics.memoryUsage)}

📋 RECENT EVENTS (Last 10)
${recentEvents.map(e => 
  `• ${this.getEventEmoji(e.type)} [${e.timestamp.toLocaleTimeString()}] ${e.type.toUpperCase()} ${e.table || ''} ${e.message || ''}`
).join('\n')}

💡 RECOMMENDATIONS
${this.generateRecommendations(metrics, hasInfiniteLoop)}
`;
  }

  private getEventEmoji(type: ConnectionEvent['type']): string {
    const emojis = {
      connection: '🔌',
      disconnection: '🔌❌',
      error: '⚠️',
      message: '📡',
      subscription: '📺'
    };
    return emojis[type] || '📝';
  }

  private getMemoryTrend(memoryUsage: number[]): string {
    if (memoryUsage.length < 2) return 'Unknown';
    
    const recent = memoryUsage.slice(-5);
    const trend = recent[recent.length - 1] - recent[0];
    
    if (trend > 5 * 1024 * 1024) return '📈 INCREASING (Potential Leak)';
    if (trend < -1 * 1024 * 1024) return '📉 DECREASING';
    return '📊 STABLE';
  }

  private generateRecommendations(metrics: ConnectionMetrics, hasInfiniteLoop: boolean): string {
    const recommendations: string[] = [];

    if (hasInfiniteLoop) {
      recommendations.push('🚨 CRITICAL: Stop infinite reconnection loop immediately');
      recommendations.push('🔧 Add exponential backoff to reconnection logic');
      recommendations.push('🛑 Implement maximum reconnection attempts limit');
    }

    if (metrics.reconnectionRate > 1) {
      recommendations.push('⚠️ High reconnection rate detected');
      recommendations.push('🔍 Check network stability and Supabase connection');
    }

    if (metrics.totalErrors > 10) {
      recommendations.push('🐛 Multiple errors detected');
      recommendations.push('📋 Review error logs for patterns');
    }

    if (!metrics.isHealthy) {
      recommendations.push('❌ System is unhealthy');
      recommendations.push('🛠️ Consider implementing circuit breaker pattern');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System appears healthy');
      recommendations.push('✨ Continue monitoring for stability');
    }

    return recommendations.join('\n');
  }

  // Add memory usage tracking
  trackMemoryUsage() {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      this.logEvent('message', {
        message: 'Memory usage tracked',
        data: { memoryUsage: (performance as any).memory.usedJSHeapSize }
      });
    }
  }

  // Export logs for analysis
  exportLogs(): string {
    return JSON.stringify({
      events: this.events,
      metrics: this.getConnectionMetrics(),
      report: this.generateReport(),
      exportTime: new Date().toISOString()
    }, null, 2);
  }

  // Clear old logs
  clearLogs() {
    this.events = [];
    this.startTime = Date.now();
  }
}

// Global instance
export const realtimeDebugger = RealtimeDebugger.getInstance();

// Development tools
if (process.env.NODE_ENV === 'development') {
  // Expose to window for manual debugging
  (window as any).realtimeDebugger = realtimeDebugger;
  
  // Auto-generate reports every 60 seconds
  setInterval(() => {
    const metrics = realtimeDebugger.getConnectionMetrics();
    if (!metrics.isHealthy) {
      console.warn('🚨 REAL-TIME HEALTH CHECK FAILED');
      console.log(realtimeDebugger.generateReport());
    }
  }, 60000);
}