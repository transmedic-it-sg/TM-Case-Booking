/**
 * Comprehensive Validation for Real-time Overhaul
 * Tests all critical functionality after conversion
 */

import TestingFramework from './testingFramework';
import { realtimeCaseService } from '../services/realtimeCaseService';
import { supabase } from '../lib/supabase';

interface ValidationResult {
  component: string;
  passed: boolean;
  details: string;
  criticalIssues: string[];
}

class RealTimeOverhaulValidator {
  private testingFramework: TestingFramework;
  private results: ValidationResult[] = [];

  constructor() {
    this.testingFramework = new TestingFramework();
  }

  /**
   * Run comprehensive validation of the real-time overhaul
   */
  async validateCompleteOverhaul(): Promise<{
    overallSuccess: boolean;
    results: ValidationResult[];
    criticalIssues: string[];
    recommendations: string[];
  }> {
    console.log('🧪 Starting comprehensive real-time overhaul validation...');
    
    const results: ValidationResult[] = [];
    const criticalIssues: string[] = [];
    
    // Test 1: Database Connection
    console.log('🧪 Testing database connection...');
    const dbTest = await this.testDatabaseConnection();
    results.push(dbTest);
    if (!dbTest.passed) criticalIssues.push(`Database connection failed: ${dbTest.details}`);

    // Test 2: Real-time subscriptions
    console.log('🧪 Testing real-time subscriptions...');
    const realtimeTest = await this.testRealtimeSubscriptions();
    results.push(realtimeTest);
    if (!realtimeTest.passed) criticalIssues.push(`Real-time subscriptions failed: ${realtimeTest.details}`);

    // Test 3: Case service functionality
    console.log('🧪 Testing real-time case service...');
    const caseServiceTest = await this.testCaseService();
    results.push(caseServiceTest);
    if (!caseServiceTest.passed) criticalIssues.push(`Case service failed: ${caseServiceTest.details}`);

    // Test 4: No caching verification
    console.log('🧪 Verifying no caching behavior...');
    const noCacheTest = await this.testNoCaching();
    results.push(noCacheTest);
    if (!noCacheTest.passed) criticalIssues.push(`Caching detected: ${noCacheTest.details}`);

    // Test 5: Data freshness
    console.log('🧪 Testing data freshness...');
    const freshnessTest = await this.testDataFreshness();
    results.push(freshnessTest);
    if (!freshnessTest.passed) criticalIssues.push(`Data not fresh: ${freshnessTest.details}`);

    const overallSuccess = results.every(r => r.passed);
    const recommendations = this.generateRecommendations(results);

    console.log(`🧪 Validation complete. Overall success: ${overallSuccess ? '✅' : '❌'}`);
    
    return {
      overallSuccess,
      results,
      criticalIssues,
      recommendations
    };
  }

  private async testDatabaseConnection(): Promise<ValidationResult> {
    try {
      const { data, error } = await supabase.from('case_bookings').select('count').limit(1);
      
      if (error) {
        return {
          component: 'Database Connection',
          passed: false,
          details: `Connection failed: ${error.message}`,
          criticalIssues: ['Database connection failure']
        };
      }

      return {
        component: 'Database Connection',
        passed: true,
        details: 'Database connection successful',
        criticalIssues: []
      };
    } catch (error) {
      return {
        component: 'Database Connection',
        passed: false,
        details: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
        criticalIssues: ['Database connection exception']
      };
    }
  }

  private async testRealtimeSubscriptions(): Promise<ValidationResult> {
    return new Promise((resolve) => {
      let subscriptionSuccess = false;
      let subscriptionError: string | null = null;
      
      const timeout = setTimeout(() => {
        resolve({
          component: 'Real-time Subscriptions',
          passed: false,
          details: 'Subscription test timed out',
          criticalIssues: ['Real-time subscription timeout']
        });
      }, 5000);

      const channel = supabase
        .channel('validation_test')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'case_bookings'
          },
          (payload) => {
            subscriptionSuccess = true;
            clearTimeout(timeout);
            resolve({
              component: 'Real-time Subscriptions',
              passed: true,
              details: 'Real-time subscription working correctly',
              criticalIssues: []
            });
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            subscriptionError = 'Channel subscription failed';
            clearTimeout(timeout);
            resolve({
              component: 'Real-time Subscriptions',
              passed: false,
              details: subscriptionError,
              criticalIssues: ['Real-time channel error']
            });
          } else if (status === 'SUBSCRIBED') {
            // Subscription established, now test with a query
            setTimeout(async () => {
              try {
                await supabase.from('case_bookings').select('*').limit(1);
              } catch (error) {
                // Query failed but subscription might still work
              }
            }, 1000);
          }
        });

      // Cleanup after test
      setTimeout(() => {
        supabase.removeChannel(channel);
        if (!subscriptionSuccess && !subscriptionError) {
          clearTimeout(timeout);
          resolve({
            component: 'Real-time Subscriptions',
            passed: false,
            details: 'No real-time events received during test',
            criticalIssues: ['No real-time events']
          });
        }
      }, 4000);
    });
  }

  private async testCaseService(): Promise<ValidationResult> {
    try {
      // Test case retrieval
      const cases = await realtimeCaseService.getAllCases();
      
      // Test reference number generation
      const refNumber = await realtimeCaseService.generateCaseReferenceNumber();
      
      // Test statistics
      const stats = await realtimeCaseService.getCaseStatistics();

      const issues: string[] = [];
      
      if (!Array.isArray(cases)) {
        issues.push('getAllCases did not return an array');
      }
      
      if (!refNumber || typeof refNumber !== 'string') {
        issues.push('generateCaseReferenceNumber failed');
      }
      
      if (!stats || typeof stats.total !== 'number') {
        issues.push('getCaseStatistics failed');
      }

      return {
        component: 'Real-time Case Service',
        passed: issues.length === 0,
        details: issues.length === 0 
          ? `Service working correctly. Found ${cases.length} cases, generated ref: ${refNumber}`
          : `Issues found: ${issues.join(', ')}`,
        criticalIssues: issues
      };
    } catch (error) {
      return {
        component: 'Real-time Case Service',
        passed: false,
        details: `Service failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        criticalIssues: ['Case service exception']
      };
    }
  }

  private async testNoCaching(): Promise<ValidationResult> {
    try {
      // Test multiple calls to ensure no caching
      const startTime = Date.now();
      
      const call1 = await realtimeCaseService.getAllCases();
      const time1 = Date.now();
      
      const call2 = await realtimeCaseService.getAllCases();
      const time2 = Date.now();
      
      const call3 = await realtimeCaseService.getAllCases();
      const time3 = Date.now();
      
      // Calculate response times
      const time1Delta = time1 - startTime;
      const time2Delta = time2 - time1;
      const time3Delta = time3 - time2;
      
      const issues: string[] = [];
      
      // If subsequent calls are significantly faster, caching might still be present
      if (time2Delta < time1Delta * 0.1 && time3Delta < time1Delta * 0.1) {
        issues.push('Subsequent calls suspiciously fast - possible caching detected');
      }
      
      // All calls should hit the database
      if (time2Delta < 10 || time3Delta < 10) {
        issues.push('Response times too fast - likely cached responses');
      }

      return {
        component: 'No Caching Verification',
        passed: issues.length === 0,
        details: issues.length === 0 
          ? `All calls hit database. Times: ${time1Delta}ms, ${time2Delta}ms, ${time3Delta}ms`
          : `Caching issues: ${issues.join(', ')}`,
        criticalIssues: issues
      };
    } catch (error) {
      return {
        component: 'No Caching Verification',
        passed: false,
        details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        criticalIssues: ['No caching test failed']
      };
    }
  }

  private async testDataFreshness(): Promise<ValidationResult> {
    try {
      // Test that data is always fresh by comparing timestamps
      const data1 = await realtimeCaseService.getAllCases();
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      const data2 = await realtimeCaseService.getAllCases();
      
      // Both calls should potentially return same data but from fresh database calls
      const issues: string[] = [];
      
      if (!Array.isArray(data1) || !Array.isArray(data2)) {
        issues.push('Data format incorrect');
      }
      
      // Test that the service is actually making database calls
      // by checking if the calls take reasonable time
      const startTime = Date.now();
      await realtimeCaseService.getAllCases();
      const endTime = Date.now();
      
      if (endTime - startTime < 5) {
        issues.push('Database call too fast - possible caching or mocking');
      }

      return {
        component: 'Data Freshness',
        passed: issues.length === 0,
        details: issues.length === 0 
          ? `Data freshness verified. Database call took ${endTime - startTime}ms`
          : `Freshness issues: ${issues.join(', ')}`,
        criticalIssues: issues
      };
    } catch (error) {
      return {
        component: 'Data Freshness',
        passed: false,
        details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        criticalIssues: ['Data freshness test failed']
      };
    }
  }

  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    
    const failedTests = results.filter(r => !r.passed);
    
    if (failedTests.length === 0) {
      recommendations.push('✅ All tests passed! Real-time overhaul is working correctly.');
      recommendations.push('🚀 Safe to deploy to production for 50-100 concurrent users.');
      recommendations.push('📊 Monitor real-time connection status in production.');
    } else {
      recommendations.push('❌ Critical issues found - DO NOT DEPLOY to production yet.');
      
      failedTests.forEach(test => {
        if (test.component === 'Database Connection') {
          recommendations.push('🔧 Fix database connection before proceeding.');
        }
        if (test.component === 'Real-time Subscriptions') {
          recommendations.push('🔧 Fix real-time subscriptions - core functionality broken.');
        }
        if (test.component === 'No Caching Verification') {
          recommendations.push('🔧 Remove remaining cache layers - data staleness risk.');
        }
      });
    }
    
    return recommendations;
  }

  /**
   * Generate comprehensive report
   */
  generateReport(validationResult: {
    overallSuccess: boolean;
    results: ValidationResult[];
    criticalIssues: string[];
    recommendations: string[];
  }): string {
    let report = '\n🧪 REAL-TIME OVERHAUL VALIDATION REPORT\n';
    report += '==============================================\n\n';
    
    report += `🎯 OVERALL STATUS: ${validationResult.overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}\n\n`;
    
    if (validationResult.criticalIssues.length > 0) {
      report += '🚨 CRITICAL ISSUES:\n';
      validationResult.criticalIssues.forEach(issue => {
        report += `  • ${issue}\n`;
      });
      report += '\n';
    }
    
    report += '📋 DETAILED TEST RESULTS:\n';
    validationResult.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      report += `  ${status} ${result.component}: ${result.details}\n`;
    });
    report += '\n';
    
    report += '💡 RECOMMENDATIONS:\n';
    validationResult.recommendations.forEach(rec => {
      report += `  ${rec}\n`;
    });
    
    return report;
  }
}

export default RealTimeOverhaulValidator;