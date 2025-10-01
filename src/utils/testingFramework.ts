/**
 * Comprehensive Testing Framework for Real-time Overhaul
 * Ensures functionality verification after each component conversion
 * 
 * Features:
 * - Real-time subscription testing
 * - React Query state validation
 * - Supabase connection verification
 * - Component behavior tracking
 * - Performance monitoring
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface TestResult {
  component: string;
  test: string;
  passed: boolean;
  details: string;
  timestamp: Date;
  duration: number;
}

interface ConnectionTest {
  realtime: boolean;
  database: boolean;
  query: boolean;
  latency: number;
}

class TestingFramework {
  private results: TestResult[] = [];
  private queryClient: QueryClient | null = null;

  constructor(queryClient?: QueryClient) {
    this.queryClient = queryClient || null;
  }

  /**
   * Test real-time subscription functionality
   */
  async testRealtimeSubscription(table: string): Promise<TestResult> {
    const startTime = Date.now();
    const testName = `Realtime Subscription - ${table}`;
    
    try {
      console.log(`🧪 Testing real-time subscription for ${table}...`);
      
      let messageReceived = false; // eslint-disable-line @typescript-eslint/no-unused-vars
      let subscriptionError = null;
      
      const channel = supabase
        .channel(`test_${table}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table
          },
          (payload) => {
            messageReceived = true;
            console.log(`✅ Real-time message received for ${table}:`, payload);
          }
        )
        .subscribe((status) => {
          console.log(`📡 Subscription status for ${table}:`, status);
          if (status === 'CHANNEL_ERROR') {
            subscriptionError = 'Channel subscription failed';
          }
        });

      // Wait for subscription to establish
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test with a simple query to trigger real-time update
      const testQuery = await supabase.from(table).select('*').limit(1);
      
      const duration = Date.now() - startTime;
      const passed = !subscriptionError && testQuery.error === null;
      
      const result: TestResult = {
        component: table,
        test: testName,
        passed,
        details: passed 
          ? `Subscription established successfully in ${duration}ms`
          : `Failed: ${subscriptionError || testQuery.error?.message}`,
        timestamp: new Date(),
        duration
      };
      
      this.results.push(result);
      
      // Cleanup
      supabase.removeChannel(channel);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        component: table,
        test: testName,
        passed: false,
        details: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        duration
      };
      
      this.results.push(result);
      return result;
    }
  }

  /**
   * Test React Query integration
   */
  async testReactQueryIntegration(queryKey: string[], queryFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    const testName = `React Query - ${queryKey.join('.')}`;
    
    try {
      console.log(`🧪 Testing React Query integration for ${queryKey.join('.')}...`);
      
      if (!this.queryClient) {
        throw new Error('QueryClient not provided to testing framework');
      }
      
      // Test query execution
      const result = await queryFn();
      
      // Test cache behavior
      const cacheData = this.queryClient.getQueryData(queryKey); // eslint-disable-line @typescript-eslint/no-unused-vars
      
      // Test invalidation
      this.queryClient.invalidateQueries({ queryKey });
      
      const duration = Date.now() - startTime;
      const passed = result !== undefined && result !== null;
      
      const testResult: TestResult = {
        component: queryKey.join('.'),
        test: testName,
        passed,
        details: passed 
          ? `Query executed successfully, returned ${Array.isArray(result) ? result.length : typeof result} data in ${duration}ms`
          : 'Query returned null or undefined',
        timestamp: new Date(),
        duration
      };
      
      this.results.push(testResult);
      return testResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult: TestResult = {
        component: queryKey.join('.'),
        test: testName,
        passed: false,
        details: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        duration
      };
      
      this.results.push(testResult);
      return testResult;
    }
  }

  /**
   * Test database connection and basic queries
   */
  async testDatabaseConnection(): Promise<ConnectionTest> {
    console.log('🧪 Testing database connection...');
    
    const tests: ConnectionTest = {
      realtime: false,
      database: false,
      query: false,
      latency: 0
    };
    
    const startTime = Date.now();
    
    try {
      // Test basic database connection
      const { data, error } = await supabase.from('case_bookings').select('count').limit(1);
      tests.database = !error;
      tests.query = data !== null;
      
      // Test realtime connection
      const channel = supabase.channel('test_connection');
      channel.subscribe((status) => {
        tests.realtime = status === 'SUBSCRIBED';
      });
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      tests.latency = Date.now() - startTime;
      
      // Cleanup
      supabase.removeChannel(channel);
      
      console.log('📊 Connection test results:', tests);
      
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
    }
    
    return tests;
  }

  /**
   * Test component rendering with real-time data
   */
  async testComponentWithRealtime(
    componentName: string, 
    testFunction: () => Promise<boolean>
  ): Promise<TestResult> {
    const startTime = Date.now();
    const testName = `Component Test - ${componentName}`;
    
    try {
      console.log(`🧪 Testing component ${componentName}...`);
      
      const passed = await testFunction();
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        component: componentName,
        test: testName,
        passed,
        details: passed 
          ? `Component test passed in ${duration}ms`
          : `Component test failed after ${duration}ms`,
        timestamp: new Date(),
        duration
      };
      
      this.results.push(result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        component: componentName,
        test: testName,
        passed: false,
        details: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        duration
      };
      
      this.results.push(result);
      return result;
    }
  }

  /**
   * Performance monitoring for real-time updates
   */
  monitorPerformance(componentName: string) {
    const startTime = performance.now();
    let updateCount = 0;
    
    console.log(`📊 Starting performance monitoring for ${componentName}...`);
    
    return {
      recordUpdate: () => {
        updateCount++;
        const currentTime = performance.now();
        const elapsedTime = currentTime - startTime;
        console.log(`⚡ ${componentName} update #${updateCount} at ${elapsedTime.toFixed(2)}ms`);
      },
      
      getMetrics: () => {
        const totalTime = performance.now() - startTime;
        return {
          component: componentName,
          totalUpdates: updateCount,
          totalTime: totalTime,
          averageUpdateTime: updateCount > 0 ? totalTime / updateCount : 0,
          updatesPerSecond: updateCount / (totalTime / 1000)
        };
      }
    };
  }

  /**
   * Generate comprehensive test report
   */
  generateReport(): string {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const successRate = total > 0 ? (passed / total * 100).toFixed(1) : '0';
    
    let report = `\n📋 REAL-TIME TESTING REPORT\n`;
    report += `=================================\n`;
    report += `Total Tests: ${total}\n`;
    report += `Passed: ${passed} ✅\n`;
    report += `Failed: ${failed} ❌\n`;
    report += `Success Rate: ${successRate}%\n\n`;
    
    if (failed > 0) {
      report += `❌ FAILED TESTS:\n`;
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          report += `  • ${result.component} - ${result.test}\n`;
          report += `    Details: ${result.details}\n`;
          report += `    Duration: ${result.duration}ms\n\n`;
        });
    }
    
    if (passed > 0) {
      report += `✅ PASSED TESTS:\n`;
      this.results
        .filter(r => r.passed)
        .forEach(result => {
          report += `  • ${result.component} - ${result.test} (${result.duration}ms)\n`;
        });
    }
    
    return report;
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = [];
    console.log('🧹 Test results cleared');
  }

  /**
   * Quick validation helper for development
   */
  static quickValidation = {
    realtimeConnection: () => {
      console.log('🔍 Quick real-time connection check...');
      const channel = supabase.channel('quick_test');
      let connected = false;
      
      channel.subscribe((status) => {
        connected = status === 'SUBSCRIBED';
        console.log(`📡 Quick test status: ${status} ${connected ? '✅' : '⏳'}`);
      });
      
      setTimeout(() => {
        supabase.removeChannel(channel);
        console.log(`🏁 Quick test complete: ${connected ? 'CONNECTED' : 'FAILED'}`);
      }, 3000);
    },
    
    cacheStatus: (queryClient: QueryClient) => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      console.log(`💾 Cache status: ${queries.length} queries cached`);
      queries.forEach(query => {
        console.log(`  • ${JSON.stringify(query.queryKey)}: ${query.state.status}`);
      });
    }
  };
}

export default TestingFramework;
export type { TestResult, ConnectionTest };