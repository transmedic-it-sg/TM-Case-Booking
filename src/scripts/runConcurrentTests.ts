#!/usr/bin/env node

/**
 * Concurrent User Test Runner
 * Execute this script to validate all production fixes work under concurrent load
 * 
 * Usage: npm run test:concurrent
 */

import { ConcurrentUserTester } from '../utils/concurrentUserTester';

async function main() {
  console.log('🚀 Starting Concurrent User Testing Suite...');
  console.log('📋 This will validate all production fixes under concurrent load');
  console.log('🔍 Testing for: data corruption, race conditions, fake data, cross-country contamination');
  console.log('');

  try {
    const startTime = Date.now();
    const results = await ConcurrentUserTester.runComprehensiveTest();
    const endTime = Date.now();

    // Display results
    console.log('\n' + '='.repeat(80));
    console.log('📊 CONCURRENT USER TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n🎯 Overall Status: ${results.overall.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`⏱️  Total Test Time: ${endTime - startTime}ms`);
    console.log(`👥 Max Concurrent Users: ${results.overall.performance.concurrentUsers}`);
    console.log(`📈 Average Response Time: ${results.overall.performance.averageResponseMs.toFixed(2)}ms`);

    console.log('\n🧪 Individual Test Results:');
    results.individualTests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      console.log(`  ${status} ${test.testName}`);
      if (test.errors.length > 0) {
        test.errors.forEach(error => console.log(`    🔴 ${error}`));
      }
      if (test.warnings.length > 0) {
        test.warnings.forEach(warning => console.log(`    🟡 ${warning}`));
      }
    });

    console.log('\n🔒 Data Integrity Validation:');
    const integrity = results.overall.dataIntegrity;
    console.log(`  ${integrity.noDuplicates ? '✅' : '❌'} No Duplicates`);
    console.log(`  ${integrity.noFakeData ? '✅' : '❌'} No Fake Data`);
    console.log(`  ${integrity.noEmptyFallbacks ? '✅' : '❌'} No Empty Fallbacks`);
    console.log(`  ${integrity.noCrossCountryContamination ? '✅' : '❌'} No Cross-Country Contamination`);

    if (results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      results.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }

    console.log('\n' + '='.repeat(80));
    
    if (results.overall.success) {
      console.log('🎉 ALL TESTS PASSED! System is ready for production with 100+ users.');
      console.log('✅ All data corruption issues have been resolved.');
      console.log('🔒 Fake data prevention is working correctly.');
      console.log('⚡ Performance is within acceptable limits.');
      console.log('🌍 Cross-country data isolation is functioning properly.');
      process.exit(0);
    } else {
      console.log('🚨 TESTS FAILED! System requires fixes before production deployment.');
      console.log('❌ Address all errors listed above before proceeding.');
      console.log('📋 Review recommendations for improvement guidance.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Concurrent testing failed with critical error:', error);
    console.error('🔧 Check your database connection and configuration.');
    console.error('📞 Contact development team if issue persists.');
    process.exit(1);
  }
}

// Handle uncaught errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled promise rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}