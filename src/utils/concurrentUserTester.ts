/**
 * Concurrent User Testing Framework
 * Simulates multiple users accessing the system simultaneously to test all fixes
 * CRITICAL: Validates that no data corruption occurs under concurrent load
 */

import { ErrorHandler, handleProductionDataOperation } from './errorHandler';
import { DataValidationService } from './dataValidationService';
import { lookupOperations } from '../services/supabaseServiceFixed';
import { getCountries, getDepartments, getHospitals, clearCache } from '../services/constantsService';

interface ConcurrentTestResult {
  testName: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  performance: {
    totalTimeMs: number;
    averageResponseMs: number;
    concurrentUsers: number;
  };
  dataIntegrity: {
    noDuplicates: boolean;
    noFakeData: boolean;
    noEmptyFallbacks: boolean;
    noCrossCountryContamination: boolean;
  };
}

interface ConcurrentTestSuite {
  overall: ConcurrentTestResult;
  individualTests: ConcurrentTestResult[];
  recommendations: string[];
}

export class ConcurrentUserTester {
  private static readonly TEST_COUNTRIES = ['Singapore', 'Malaysia', 'Philippines'];
  private static readonly CONCURRENT_USERS = [5, 10, 20, 50]; // Simulate different load levels
  private static readonly TEST_ITERATIONS = 3;

  /**
   * Run comprehensive concurrent user testing
   */
  static async runComprehensiveTest(): Promise<ConcurrentTestSuite> {
    console.log('🧪 Starting comprehensive concurrent user testing...');
    
    const individualTests: ConcurrentTestResult[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    
    try {
      // Test 1: Concurrent Country Data Fetching
      const countryTest = await this.testConcurrentCountryFetching();
      individualTests.push(countryTest);
      allErrors.push(...countryTest.errors);
      allWarnings.push(...countryTest.warnings);

      // Test 2: Concurrent Department Access
      const departmentTest = await this.testConcurrentDepartmentAccess();
      individualTests.push(departmentTest);
      allErrors.push(...departmentTest.errors);
      allWarnings.push(...departmentTest.warnings);

      // Test 3: Concurrent Cache Operations
      const cacheTest = await this.testConcurrentCacheOperations();
      individualTests.push(cacheTest);
      allErrors.push(...cacheTest.errors);
      allWarnings.push(...cacheTest.warnings);

      // Test 4: Concurrent Cross-Country Data Validation
      const validationTest = await this.testConcurrentDataValidation();
      individualTests.push(validationTest);
      allErrors.push(...validationTest.errors);
      allWarnings.push(...validationTest.warnings);

      // Test 5: Error Handler Fake Data Prevention
      const errorHandlerTest = await this.testErrorHandlerFakeDataPrevention();
      individualTests.push(errorHandlerTest);
      allErrors.push(...errorHandlerTest.errors);
      allWarnings.push(...errorHandlerTest.warnings);

      // Calculate overall results
      const overallSuccess = individualTests.every(test => test.success);
      const totalTime = individualTests.reduce((sum, test) => sum + test.performance.totalTimeMs, 0);
      const avgResponseTime = totalTime / individualTests.length;

      const overall: ConcurrentTestResult = {
        testName: 'Comprehensive Concurrent User Testing',
        success: overallSuccess,
        errors: Array.from(new Set(allErrors)), // Remove duplicates
        warnings: Array.from(new Set(allWarnings)),
        performance: {
          totalTimeMs: totalTime,
          averageResponseMs: avgResponseTime,
          concurrentUsers: Math.max(...this.CONCURRENT_USERS)
        },
        dataIntegrity: {
          noDuplicates: !allErrors.some(e => e.includes('duplicate')),
          noFakeData: !allErrors.some(e => e.includes('fake data')),
          noEmptyFallbacks: !allErrors.some(e => e.includes('empty fallback')),
          noCrossCountryContamination: !allErrors.some(e => e.includes('contamination'))
        }
      };

      // Generate recommendations
      const recommendations = this.generateRecommendations(individualTests, overall);

      const result: ConcurrentTestSuite = {
        overall,
        individualTests,
        recommendations
      };

      console.log('✅ Comprehensive concurrent user testing completed:', result);
      return result;

    } catch (error) {
      console.error('❌ Concurrent user testing failed:', error);
      throw error;
    }
  }

  /**
   * Test concurrent country data fetching to verify no race conditions
   */
  private static async testConcurrentCountryFetching(): Promise<ConcurrentTestResult> {
    const testName = 'Concurrent Country Data Fetching';
    console.log(`🧪 Running ${testName}...`);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const startTime = Date.now();
    
    try {
      // Clear cache to ensure fresh start
      clearCache();
      
      // Create multiple concurrent requests for country data
      const concurrentPromises = this.CONCURRENT_USERS.map(userCount => 
        Promise.all(Array.from({ length: userCount }, async (_, userIndex) => {
          try {
            const countries = await getCountries();
            
            // Validate results
            if (countries.length === 0) {
              warnings.push(`User ${userIndex}: Empty country list returned`);
            }
            
            // Check for fake data patterns
            if (countries.includes('Singapore') && countries.includes('Malaysia') && 
                countries.includes('Philippines') && countries.length === 7) {
              errors.push(`User ${userIndex}: Potential hardcoded country list detected`);
            }
            
            return { userIndex, countries };
          } catch (error) {
            errors.push(`User ${userIndex}: ${error}`);
            return { userIndex, countries: [] };
          }
        }))
      );

      const results = await Promise.all(concurrentPromises);
      const endTime = Date.now();

      // Analyze results for consistency
      const allCountryLists = results.flat().map(r => r.countries);
      const uniqueCountryLists = new Set(allCountryLists.map(list => JSON.stringify(list.sort())));
      
      if (uniqueCountryLists.size > 1) {
        errors.push('Inconsistent country lists returned across concurrent users');
      }

      return {
        testName,
        success: errors.length === 0,
        errors,
        warnings,
        performance: {
          totalTimeMs: endTime - startTime,
          averageResponseMs: (endTime - startTime) / results.flat().length,
          concurrentUsers: results.flat().length
        },
        dataIntegrity: {
          noDuplicates: uniqueCountryLists.size <= 1,
          noFakeData: !errors.some(e => e.includes('hardcoded')),
          noEmptyFallbacks: !warnings.some(w => w.includes('Empty')),
          noCrossCountryContamination: true // N/A for countries
        }
      };

    } catch (error) {
      errors.push(`Test setup failed: ${error}`);
      
      return {
        testName,
        success: false,
        errors,
        warnings,
        performance: {
          totalTimeMs: Date.now() - startTime,
          averageResponseMs: 0,
          concurrentUsers: 0
        },
        dataIntegrity: {
          noDuplicates: false,
          noFakeData: false,
          noEmptyFallbacks: false,
          noCrossCountryContamination: false
        }
      };
    }
  }

  /**
   * Test concurrent department access across countries
   */
  private static async testConcurrentDepartmentAccess(): Promise<ConcurrentTestResult> {
    const testName = 'Concurrent Department Access';
    console.log(`🧪 Running ${testName}...`);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const startTime = Date.now();
    
    try {
      // Clear cache to ensure fresh start
      clearCache();
      
      // Create concurrent requests for department data across different countries
      const concurrentPromises = this.TEST_COUNTRIES.flatMap(country =>
        Array.from({ length: 10 }, async (_, userIndex) => {
          try {
            const departments = await getDepartments(country);
            
            // Validate no cross-country contamination
            if (departments.length > 0) {
              // Check if departments are appropriate for the country
              const suspiciousEntries = departments.filter(dept => 
                dept.toLowerCase().includes('test') || 
                dept.toLowerCase().includes('sample')
              );
              
              if (suspiciousEntries.length > 0) {
                warnings.push(`${country} User ${userIndex}: Suspicious department names: ${suspiciousEntries.join(', ')}`);
              }
            }
            
            return { country, userIndex, departments };
          } catch (error) {
            errors.push(`${country} User ${userIndex}: ${error}`);
            return { country, userIndex, departments: [] };
          }
        })
      );

      const results = await Promise.all(concurrentPromises);
      const endTime = Date.now();

      // Check for cross-country contamination
      const departmentsByCountry = new Map<string, Set<string>>();
      results.forEach(result => {
        if (!departmentsByCountry.has(result.country)) {
          departmentsByCountry.set(result.country, new Set());
        }
        result.departments.forEach(dept => 
          departmentsByCountry.get(result.country)!.add(dept)
        );
      });

      // Verify no departments appear in multiple countries inappropriately
      const allDepartments = new Map<string, string[]>();
      departmentsByCountry.forEach((depts, country) => {
        Array.from(depts).forEach(dept => {
          if (!allDepartments.has(dept)) {
            allDepartments.set(dept, []);
          }
          allDepartments.get(dept)!.push(country);
        });
      });

      Array.from(allDepartments.entries()).forEach(([dept, countries]) => {
        if (countries.length > 1) {
          errors.push(`Cross-country contamination: Department "${dept}" found in ${countries.join(', ')}`);
        }
      });

      return {
        testName,
        success: errors.length === 0,
        errors,
        warnings,
        performance: {
          totalTimeMs: endTime - startTime,
          averageResponseMs: (endTime - startTime) / results.length,
          concurrentUsers: results.length
        },
        dataIntegrity: {
          noDuplicates: true,
          noFakeData: !warnings.some(w => w.includes('Suspicious')),
          noEmptyFallbacks: true,
          noCrossCountryContamination: !errors.some(e => e.includes('contamination'))
        }
      };

    } catch (error) {
      return this.createFailedTestResult(testName, startTime, error);
    }
  }

  /**
   * Test concurrent cache operations
   */
  private static async testConcurrentCacheOperations(): Promise<ConcurrentTestResult> {
    const testName = 'Concurrent Cache Operations';
    console.log(`🧪 Running ${testName}...`);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const startTime = Date.now();
    
    try {
      // Test concurrent cache clearing and fetching
      const concurrentPromises = Array.from({ length: 20 }, async (_, userIndex) => {
        try {
          if (userIndex % 5 === 0) {
            // Every 5th user clears cache
            clearCache();
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          }
          
          // All users fetch data
          const [countries, departments] = await Promise.all([
            getCountries(),
            getDepartments(this.TEST_COUNTRIES[userIndex % this.TEST_COUNTRIES.length])
          ]);
          
          return { userIndex, countries, departments };
        } catch (error: any) {
          errors.push(`User ${userIndex}: ${error.toString()}`);
          return { userIndex, countries: [], departments: [] };
        }
      });

      const results = await Promise.all(concurrentPromises);
      const endTime = Date.now();

      // Validate cache integrity
      const nonEmptyResults = results.filter(r => r.countries.length > 0);
      if (nonEmptyResults.length > 0) {
        const firstResult = nonEmptyResults[0];
        nonEmptyResults.forEach((result, index) => {
          if (JSON.stringify(result.countries.sort()) !== JSON.stringify(firstResult.countries.sort())) {
            warnings.push(`Cache inconsistency detected in user ${result.userIndex}`);
          }
        });
      }

      return {
        testName,
        success: errors.length === 0,
        errors,
        warnings,
        performance: {
          totalTimeMs: endTime - startTime,
          averageResponseMs: (endTime - startTime) / results.length,
          concurrentUsers: results.length
        },
        dataIntegrity: {
          noDuplicates: true,
          noFakeData: true,
          noEmptyFallbacks: true,
          noCrossCountryContamination: !warnings.some(w => w.includes('inconsistency'))
        }
      };

    } catch (error) {
      return this.createFailedTestResult(testName, startTime, error);
    }
  }

  /**
   * Test concurrent data validation
   */
  private static async testConcurrentDataValidation(): Promise<ConcurrentTestResult> {
    const testName = 'Concurrent Data Validation';
    console.log(`🧪 Running ${testName}...`);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const startTime = Date.now();
    
    try {
      // Run concurrent validation checks
      const concurrentPromises = Array.from({ length: 10 }, async (_, userIndex) => {
        try {
          const contamCheck = await DataValidationService.checkCrossCountryContamination();
          const healthCheck = await DataValidationService.checkDatabaseHealth();
          
          if (contamCheck.hasContamination) {
            errors.push(`User ${userIndex}: Cross-country contamination detected (${contamCheck.severity})`);
          }
          
          if (healthCheck.dataIntegrityIssues.length > 0) {
            warnings.push(`User ${userIndex}: Data integrity issues: ${healthCheck.dataIntegrityIssues.join(', ')}`);
          }
          
          return { userIndex, contamCheck, healthCheck };
        } catch (error) {
          errors.push(`User ${userIndex}: Validation failed: ${error}`);
          return { userIndex, contamCheck: null, healthCheck: null };
        }
      });

      const results = await Promise.all(concurrentPromises);
      const endTime = Date.now();

      return {
        testName,
        success: errors.length === 0,
        errors,
        warnings,
        performance: {
          totalTimeMs: endTime - startTime,
          averageResponseMs: (endTime - startTime) / results.length,
          concurrentUsers: results.length
        },
        dataIntegrity: {
          noDuplicates: true,
          noFakeData: true,
          noEmptyFallbacks: true,
          noCrossCountryContamination: !errors.some(e => e.includes('contamination'))
        }
      };

    } catch (error) {
      return this.createFailedTestResult(testName, startTime, error);
    }
  }

  /**
   * Test error handler fake data prevention
   */
  private static async testErrorHandlerFakeDataPrevention(): Promise<ConcurrentTestResult> {
    const testName = 'Error Handler Fake Data Prevention';
    console.log(`🧪 Running ${testName}...`);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const startTime = Date.now();
    
    try {
      // Test operations that might return fake data
      const testOperations = [
        () => Promise.resolve(['Singapore', 'Malaysia', 'Philippines', 'Indonesia', 'Vietnam', 'Hong Kong', 'Thailand']),
        () => Promise.resolve(['Cardiology', 'Orthopedics', 'Neurosurgery', 'Oncology']),
        () => Promise.resolve([]),
        () => Promise.reject(new Error('Database connection failed')),
        () => Promise.resolve([{ name: 'Test Department' }, { name: 'Sample Hospital' }])
      ];

      const concurrentPromises = testOperations.map(async (operation, index) => {
        try {
          const result = await handleProductionDataOperation(
            operation as () => Promise<any>,
            `Test Operation ${index}`,
            true
          );
          
          if (result.success && result.data && Array.isArray(result.data)) {
            // Check if the successful result contains fake data patterns
            const fakeDataPatterns = [
              'Singapore', 'Malaysia', 'Philippines', 'Indonesia', 'Vietnam', 'Hong Kong', 'Thailand'
            ];
            
            if (result.data!.length === 7 && 
                fakeDataPatterns.every(pattern => result.data!.includes(pattern))) {
              errors.push(`Operation ${index}: Fake data detected and should have been rejected`);
            }
          }
          
          return { index, result };
        } catch (error: any) {
          // Expected for some operations
          return { index, error: error.toString() };
        }
      });

      const results = await Promise.all(concurrentPromises);
      const endTime = Date.now();

      return {
        testName,
        success: errors.length === 0,
        errors,
        warnings,
        performance: {
          totalTimeMs: endTime - startTime,
          averageResponseMs: (endTime - startTime) / results.length,
          concurrentUsers: results.length
        },
        dataIntegrity: {
          noDuplicates: true,
          noFakeData: !errors.some(e => e.includes('Fake data')),
          noEmptyFallbacks: true,
          noCrossCountryContamination: true
        }
      };

    } catch (error) {
      return this.createFailedTestResult(testName, startTime, error);
    }
  }

  /**
   * Helper to create failed test result
   */
  private static createFailedTestResult(
    testName: string, 
    startTime: number, 
    error: any
  ): ConcurrentTestResult {
    return {
      testName,
      success: false,
      errors: [error.toString()],
      warnings: [],
      performance: {
        totalTimeMs: Date.now() - startTime,
        averageResponseMs: 0,
        concurrentUsers: 0
      },
      dataIntegrity: {
        noDuplicates: false,
        noFakeData: false,
        noEmptyFallbacks: false,
        noCrossCountryContamination: false
      }
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private static generateRecommendations(
    individualTests: ConcurrentTestResult[],
    overall: ConcurrentTestResult
  ): string[] {
    const recommendations: string[] = [];
    
    if (!overall.success) {
      recommendations.push('🚨 CRITICAL: Fix all identified errors before production deployment');
    }
    
    if (overall.performance.averageResponseMs > 5000) {
      recommendations.push('⚡ Performance: Consider optimizing database queries for better response times');
    }
    
    if (!overall.dataIntegrity.noCrossCountryContamination) {
      recommendations.push('🌍 Data Integrity: Implement stricter country data separation');
    }
    
    if (!overall.dataIntegrity.noFakeData) {
      recommendations.push('🔒 Security: Review and eliminate all hardcoded fallback data');
    }
    
    const failedTests = individualTests.filter(test => !test.success);
    if (failedTests.length > 0) {
      recommendations.push(`🧪 Testing: Focus on fixing ${failedTests.map(t => t.testName).join(', ')}`);
    }
    
    if (overall.warnings.length > 0) {
      recommendations.push('⚠️ Monitoring: Set up alerts for the warning conditions identified');
    }
    
    if (overall.success) {
      recommendations.push('✅ Production Ready: All concurrent user tests passed successfully');
    }
    
    return recommendations;
  }
}

/**
 * Quick test runner for development
 */
export const runQuickConcurrentTest = async (): Promise<boolean> => {
  try {
    const result = await ConcurrentUserTester.runComprehensiveTest();
    console.log('🧪 Quick Concurrent Test Results:', {
      success: result.overall.success,
      totalErrors: result.overall.errors.length,
      recommendations: result.recommendations.slice(0, 3) // Show top 3 recommendations
    });
    
    return result.overall.success;
  } catch (error) {
    console.error('❌ Quick concurrent test failed:', error);
    return false;
  }
};