#!/usr/bin/env node

/**
 * Production Validation Test Runner
 * 
 * This script validates the production application by testing real user flows
 * and checking for the specific issues that were reported in production.
 */

const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function runValidationTests() {
  log('🏥 TM Case Booking System - Production Validation', 'magenta');
  log('================================================', 'magenta');
  log('');
  
  const testSuite = [
    {
      name: 'TypeScript Compilation',
      command: 'npm',
      args: ['run', 'typecheck'],
      critical: true
    },
    {
      name: 'Production Build',
      command: 'npm',
      args: ['run', 'build'],
      critical: true
    },
    {
      name: 'Complete Go-Live E2E Test Suite',
      command: 'npm',
      args: ['run', 'test:e2e:go-live'],
      critical: true
    }
  ];

  let passedTests = 0;
  let failedTests = 0;
  const failures = [];

  for (const test of testSuite) {
    try {
      log(`\n🧪 Running: ${test.name}`, 'cyan');
      log('─'.repeat(50), 'cyan');
      
      await runCommand(test.command, test.args);
      
      log(`✅ ${test.name} - PASSED`, 'green');
      passedTests++;
    } catch (error) {
      log(`❌ ${test.name} - FAILED`, 'red');
      failedTests++;
      failures.push({ name: test.name, critical: test.critical });
    }
  }

  // Summary
  log('\n📊 Test Results Summary', 'magenta');
  log('='.repeat(30), 'magenta');
  log(`✅ Passed: ${passedTests}`, 'green');
  log(`❌ Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');

  if (failures.length > 0) {
    log('\n💥 Failed Tests:', 'red');
    failures.forEach(failure => {
      const criticality = failure.critical ? '[CRITICAL]' : '[WARNING]';
      log(`   ${criticality} ${failure.name}`, failure.critical ? 'red' : 'yellow');
    });
  }

  const criticalFailures = failures.filter(f => f.critical);
  
  if (criticalFailures.length === 0) {
    log('\n🎉 Production validation PASSED!', 'green');
    log('✅ Application is ready for production deployment', 'green');
    log('🚀 No critical issues detected', 'green');
    return true;
  } else {
    log('\n🚨 Production validation FAILED!', 'red');
    log('❌ Critical issues must be resolved before deployment', 'red');
    log(`💀 ${criticalFailures.length} critical test(s) failed`, 'red');
    return false;
  }
}

async function main() {
  try {
    const success = await runValidationTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log('\n💥 Validation runner crashed!', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Help text
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('🏥 Production Validation Test Runner', 'cyan');
  log('');
  log('This script runs comprehensive tests to validate that the application', 'blue');
  log('is ready for production deployment and fixes the reported issues:', 'blue');
  log('');
  log('• Login functionality working correctly', 'green');
  log('• No permission mapping errors in console', 'green');
  log('• Supabase integration functioning', 'green');
  log('• TypeScript compilation successful', 'green');
  log('• Production build successful', 'green');
  log('');
  log('Usage: npm run test:production', 'yellow');
  process.exit(0);
}

main();