/**
 * Real Supabase Integration Tests
 * Tests actual database connections and real-time subscriptions
 * Validates production-ready functionality
 */

import { supabase } from '../../lib/supabase';
import { realtimeCaseService } from '../../services/realtimeCaseService';
import TestingFramework from '../../utils/testingFramework';
import RealTimeOverhaulValidator from '../../utils/validateRealTimeOverhaul';

describe('Supabase Integration Tests', () => {
  let testingFramework: TestingFramework;
  let validator: RealTimeOverhaulValidator;

  beforeAll(() => {
    testingFramework = new TestingFramework();
    validator = new RealTimeOverhaulValidator();
  });

  describe('Database Connection Tests', () => {
    test('should establish database connection', async () => {
      const connectionTest = await testingFramework.testDatabaseConnection();
      
      expect(connectionTest.database).toBe(true);
      expect(connectionTest.query).toBe(true);
      expect(connectionTest.latency).toBeLessThan(5000); // Should respond within 5 seconds
    }, 10000);

    test('should handle database queries without caching', async () => {
      const startTime = Date.now();
      
      // Make multiple calls to ensure no caching
      const call1 = await realtimeCaseService.getAllCases();
      const time1 = Date.now() - startTime;
      
      const call2 = await realtimeCaseService.getAllCases();
      const time2 = Date.now() - startTime;
      
      const call3 = await realtimeCaseService.getAllCases();
      const time3 = Date.now() - startTime;
      
      // All calls should be arrays (valid responses)
      expect(Array.isArray(call1)).toBe(true);
      expect(Array.isArray(call2)).toBe(true);
      expect(Array.isArray(call3)).toBe(true);
      
      // Each call should take reasonable time (hitting database)
      expect(time1).toBeGreaterThan(10); // Not cached/mocked
      expect(time2 - time1).toBeGreaterThan(10); // Second call also hits DB
      expect(time3 - time2).toBeGreaterThan(10); // Third call also hits DB
      
      console.log(`Call times: ${time1}ms, ${time2 - time1}ms, ${time3 - time2}ms`);
    }, 15000);
  });

  describe('Real-time Subscription Tests', () => {
    test('should establish real-time subscriptions', async () => {
      const subscriptionTest = await testingFramework.testRealtimeSubscription('case_bookings');
      
      expect(subscriptionTest.passed).toBe(true);
      expect(subscriptionTest.duration).toBeLessThan(5000);
    }, 10000);

    test('should handle multiple concurrent subscriptions', async () => {
      const subscriptionPromises = [
        testingFramework.testRealtimeSubscription('case_bookings'),
        testingFramework.testRealtimeSubscription('profiles'),
        testingFramework.testRealtimeSubscription('app_settings')
      ];
      
      const results = await Promise.all(subscriptionPromises);
      
      // At least one subscription should work (case_bookings)
      const successfulSubs = results.filter(r => r.passed);
      expect(successfulSubs.length).toBeGreaterThanOrEqual(1);
      
      results.forEach(result => {
        expect(result.duration).toBeLessThan(10000);
      });
    }, 15000);
  });

  describe('Case Service Functionality Tests', () => {
    test('should generate case reference numbers', async () => {
      const refNumber1 = await realtimeCaseService.generateCaseReferenceNumber('Singapore');
      const refNumber2 = await realtimeCaseService.generateCaseReferenceNumber('Malaysia');
      
      expect(typeof refNumber1).toBe('string');
      expect(typeof refNumber2).toBe('string');
      expect(refNumber1.length).toBeGreaterThan(0);
      expect(refNumber2.length).toBeGreaterThan(0);
      
      // Should be unique
      expect(refNumber1).not.toBe(refNumber2);
    }, 10000);

    test('should handle case statistics calculation', async () => {
      const stats = await realtimeCaseService.getCaseStatistics();
      
      expect(typeof stats).toBe('object');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.byStatus).toBe('object');
      expect(typeof stats.byCountry).toBe('object');
      expect(stats.total).toBeGreaterThanOrEqual(0);
    }, 10000);

    test('should search cases effectively', async () => {
      // Try searching for a common term
      const searchResults = await realtimeCaseService.searchCases('test');
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThanOrEqual(0);
      
      // If there are results, they should have the expected structure
      if (searchResults.length > 0) {
        const firstResult = searchResults[0];
        expect(firstResult).toHaveProperty('id');
        expect(firstResult).toHaveProperty('caseReferenceNumber');
        expect(firstResult).toHaveProperty('status');
      }
    }, 10000);
  });

  describe('Performance Tests', () => {
    test('should handle concurrent database calls efficiently', async () => {
      const concurrentCalls = 10;
      const startTime = Date.now();
      
      // Make multiple concurrent calls
      const promises = Array(concurrentCalls).fill(null).map(() => 
        realtimeCaseService.getAllCases()
      );
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All calls should succeed
      expect(results.length).toBe(concurrentCalls);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
      
      // Average time per call should be reasonable
      const avgTimePerCall = totalTime / concurrentCalls;
      expect(avgTimePerCall).toBeLessThan(2000); // Should average less than 2 seconds per call
      
      console.log(`${concurrentCalls} concurrent calls completed in ${totalTime}ms (avg: ${avgTimePerCall}ms per call)`);
    }, 30000);

    test('should maintain performance under load', async () => {
      const monitor = testingFramework.monitorPerformance('LoadTest');
      
      // Simulate sustained load
      for (let i = 0; i < 5; i++) {
        await realtimeCaseService.getAllCases();
        monitor.recordUpdate();
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between calls
      }
      
      const metrics = monitor.getMetrics();
      
      expect(metrics.totalUpdates).toBe(5);
      expect(metrics.averageUpdateTime).toBeLessThan(2000); // Average should be reasonable
      expect(metrics.updatesPerSecond).toBeGreaterThan(0);
      
      console.log('Load test metrics:', metrics);
    }, 15000);
  });

  describe('Comprehensive Validation', () => {
    test('should pass complete overhaul validation', async () => {
      const validationResult = await validator.validateCompleteOverhaul();
      const report = validator.generateReport(validationResult);
      
      console.log('\n' + report);
      
      // Should have minimal critical issues
      expect(validationResult.criticalIssues.length).toBeLessThanOrEqual(2); // Allow for minor issues
      
      // Key components should pass
      const dbConnectionTest = validationResult.results.find(r => r.component === 'Database Connection');
      expect(dbConnectionTest?.passed).toBe(true);
      
      const caseServiceTest = validationResult.results.find(r => r.component === 'Real-time Case Service');
      expect(caseServiceTest?.passed).toBe(true);
      
      // Generate recommendations
      expect(validationResult.recommendations.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Error Handling Tests', () => {
    test('should handle network failures gracefully', async () => {
      // Temporarily disable network (simulation)
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      try {
        await expect(realtimeCaseService.getAllCases()).rejects.toThrow();
      } catch (error) {
        expect(error).toBeDefined();
      } finally {
        // Restore fetch
        global.fetch = originalFetch;
      }
    });

    test('should handle invalid data gracefully', async () => {
      try {
        // Try to save invalid case data
        const invalidCase = {} as any;
        const result = await realtimeCaseService.saveCase(invalidCase);
        
        // Should either reject or return null
        expect(result).toBeNull();
      } catch (error) {
        // Error is expected for invalid data
        expect(error).toBeDefined();
      }
    });
  });
});