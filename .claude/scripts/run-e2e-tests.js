#!/usr/bin/env node

/**
 * E2E Testing Runner for TM Case Booking System
 * 
 * This script provides a simple interface to run Playwright e2e tests
 * that simulate real user behavior and catch production issues.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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

function checkPlaywrightInstallation() {
  const playwrightPath = path.join(process.cwd(), 'node_modules', '@playwright', 'test');
  if (!fs.existsSync(playwrightPath)) {
    log('❌ Playwright not found. Installing...', 'yellow');
    return false;
  }
  return true;
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

async function installPlaywright() {
  try {
    log('📦 Installing Playwright browsers...', 'cyan');
    await runCommand('npx', ['playwright', 'install']);
    log('✅ Playwright browsers installed successfully', 'green');
  } catch (error) {
    log('❌ Failed to install Playwright browsers', 'red');
    throw error;
  }
}

async function runTests(testType = 'all') {
  const configPath = path.join('.claude', 'playwright.config.ts');
  
  if (!fs.existsSync(configPath)) {
    log('❌ Playwright config not found at .claude/playwright.config.ts', 'red');
    return;
  }

  const testArgs = ['playwright', 'test', '--config', configPath];
  
  switch (testType) {
    case 'login':
      testArgs.push('.claude/e2e-tests/login.spec.ts');
      break;
    case 'supabase':
      testArgs.push('.claude/e2e-tests/supabase-integration.spec.ts');
      break;
    case 'comprehensive':
      testArgs.push('.claude/e2e-tests/comprehensive-app-test.spec.ts');
      break;
    case 'performance':
      testArgs.push('.claude/e2e-tests/performance-and-load.spec.ts');
      break;
    case 'data':
      testArgs.push('.claude/e2e-tests/data-integrity.spec.ts');
      break;
    case 'go-live':
      testArgs.push('.claude/e2e-tests/production-ready-test.spec.ts');
      break;
    case 'full':
      testArgs.push('.claude/e2e-tests/comprehensive-app-test.spec.ts');
      testArgs.push('.claude/e2e-tests/performance-and-load.spec.ts');
      testArgs.push('.claude/e2e-tests/data-integrity.spec.ts');
      break;
    case 'quick':
      testArgs.push('--grep', 'Authentication & Session Management');
      break;
    case 'permission-errors':
      testArgs.push('--grep', 'Navigation & Permission System');
      break;
    case 'all':
    default:
      // Run all tests
      break;
  }

  try {
    log(`🧪 Running ${testType} e2e tests...`, 'cyan');
    await runCommand('npx', testArgs);
    log('✅ All tests passed!', 'green');
  } catch (error) {
    log('❌ Some tests failed. Check the test report for details.', 'red');
    throw error;
  }
}

async function main() {
  const testType = process.argv[2] || 'all';
  
  log('🚀 TM Case Booking E2E Test Runner', 'magenta');
  log('=====================================', 'magenta');
  
  try {
    // Check and install Playwright if needed
    if (!checkPlaywrightInstallation()) {
      await installPlaywright();
    }

    // Run the tests
    await runTests(testType);
    
    log('\n🎉 E2E testing completed successfully!', 'green');
    log('📊 Check playwright-report/index.html for detailed results', 'blue');
    
  } catch (error) {
    log('\n💥 E2E testing failed!', 'red');
    log('📋 This indicates real issues in the production application', 'yellow');
    log('🔧 Please fix the identified issues before deployment', 'yellow');
    process.exit(1);
  }
}

// Help text
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('🧪 TM Case Booking E2E Test Runner Usage:', 'cyan');
  log('');
  log('🚀 GO-LIVE TESTING:', 'magenta');
  log('npm run test:e2e go-live       # Complete go-live validation suite', 'green');
  log('npm run test:e2e comprehensive # Full application functionality test', 'green');
  log('npm run test:e2e performance   # Performance & load testing', 'green');
  log('npm run test:e2e data          # Data integrity & business logic', 'green');
  log('');
  log('🔧 SPECIFIC TESTING:', 'yellow');
  log('npm run test:e2e               # Run all e2e tests', 'blue');
  log('npm run test:e2e login         # Test login functionality only', 'blue');
  log('npm run test:e2e supabase      # Test Supabase integration only', 'blue');
  log('npm run test:e2e quick         # Quick authentication test', 'blue');
  log('npm run test:e2e permission-errors # Test for permission mapping errors', 'blue');
  log('');
  log('📋 Test Coverage:', 'yellow');
  log('✅ Authentication & Session Management', 'green');
  log('✅ Navigation & Permission System Validation', 'green');
  log('✅ Case Booking & Data Entry Functionality', 'green');
  log('✅ Real-time Data Updates & Performance', 'green');
  log('✅ Mobile Responsiveness & Browser Compatibility', 'green');
  log('✅ Error Handling & Stability Testing', 'green');
  log('✅ Database Integration & API Performance', 'green');
  log('✅ Load Testing & Concurrent User Simulation', 'green');
  log('');
  log('🎯 GO-LIVE READINESS CRITERIA:', 'cyan');
  log('• No permission mapping errors in console', 'green');
  log('• Authentication works across all browsers', 'green');
  log('• Page load times under 5 seconds', 'green');
  log('• API responses under 2 seconds average', 'green');
  log('• Mobile compatibility verified', 'green');
  log('• No critical JavaScript errors', 'green');
  log('• Database connections stable', 'green');
  log('• Multi-user concurrent access working', 'green');
  process.exit(0);
}

// Run the main function
main();