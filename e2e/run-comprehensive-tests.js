#!/usr/bin/env node

/**
 * Comprehensive E2E Test Runner
 * Addresses all 9 critical issues reported by user
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

class E2ETestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.startTime = Date.now();
  }

  log(message, color = colors.white) {
    console.log(`${color}${message}${colors.reset}`);
  }

  logHeader(message) {
    console.log('');
    console.log('='.repeat(80));
    this.log(message, colors.bright + colors.cyan);
    console.log('='.repeat(80));
  }

  logSuccess(message) {
    this.log(`✅ ${message}`, colors.green);
  }

  logError(message) {
    this.log(`❌ ${message}`, colors.red);
  }

  logWarning(message) {
    this.log(`⚠️  ${message}`, colors.yellow);
  }

  logInfo(message) {
    this.log(`ℹ️  ${message}`, colors.blue);
  }

  async checkPrerequisites() {
    this.logHeader('🔍 CHECKING PREREQUISITES');

    // Check if Playwright is installed
    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
      this.logSuccess('Playwright is installed');
    } catch (error) {
      this.logError('Playwright not found');
      throw new Error('Please install Playwright: npm install @playwright/test');
    }

    // Check if application is buildable
    this.logInfo('Checking if application builds...');
    try {
      execSync('npm run build', { stdio: 'pipe' });
      this.logSuccess('Application builds successfully');
    } catch (error) {
      this.logError('Application build failed');
      throw new Error('Fix build errors before running e2e tests');
    }

    // Check if test files exist
    const testDir = path.join(__dirname, 'tests');
    if (!fs.existsSync(testDir)) {
      throw new Error('Test directory not found');
    }

    const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.spec.ts'));
    this.logSuccess(`Found ${testFiles.length} test files`);

    return testFiles;
  }

  async runSingleTestSuite(testFile, options = {}) {
    const testName = path.basename(testFile, '.spec.ts');
    this.log(`\n🧪 Running ${testName} tests...`, colors.yellow);

    return new Promise((resolve) => {
      const args = [
        'test',
        `e2e/tests/${testFile}`,
        '--reporter=json'
      ];

      if (options.headed) args.push('--headed');
      if (options.debug) args.push('--debug');

      const process = spawn('npx', ['playwright', ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.join(__dirname, '..')
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        const result = {
          testFile,
          testName,
          exitCode: code,
          stdout,
          stderr,
          passed: code === 0
        };

        if (code === 0) {
          this.logSuccess(`${testName} tests PASSED`);
          this.results.passed++;
        } else {
          this.logError(`${testName} tests FAILED`);
          this.results.failed++;
          
          // Show error details
          if (stderr) {
            this.log(`Error details: ${stderr}`, colors.red);
          }
        }

        this.results.tests.push(result);
        resolve(result);
      });
    });
  }

  async runCriticalIssueTests() {
    this.logHeader('🎯 TESTING CRITICAL ISSUES FIXES');

    const criticalTests = [
      {
        file: '02-case-creation.spec.ts',
        description: 'Case creation error (saves but shows error)',
        priority: 'HIGH'
      },
      {
        file: '03-case-display.spec.ts',
        description: 'Case card quantities not showing',
        priority: 'HIGH'
      },
      {
        file: '04-mobile-responsiveness.spec.ts',
        description: 'Mobile notification dropdown & UI issues',
        priority: 'MEDIUM'
      },
      {
        file: '05-email-notifications.spec.ts',
        description: 'Email notification system',
        priority: 'HIGH'
      },
      {
        file: '06-case-amendments.spec.ts',
        description: 'Amendment history & status timing',
        priority: 'MEDIUM'
      },
      {
        file: '07-file-attachments.spec.ts',
        description: 'Case card attachment functionality',
        priority: 'MEDIUM'
      }
    ];

    this.logInfo(`Testing ${criticalTests.length} critical issue areas...`);

    for (const test of criticalTests) {
      this.log(`\n📋 ${test.description} (${test.priority} priority)`, colors.magenta);
      await this.runSingleTestSuite(test.file);
    }
  }

  async runFullTestSuite(options = {}) {
    this.logHeader('🚀 COMPREHENSIVE E2E TEST EXECUTION');

    const testFiles = await this.checkPrerequisites();

    // Run authentication tests first
    await this.runSingleTestSuite('01-authentication.spec.ts', options);

    // Then run critical issue tests
    await this.runCriticalIssueTests();

    // Generate comprehensive report
    this.generateReport();
  }

  generateReport() {
    this.logHeader('📊 TEST EXECUTION REPORT');

    const totalTests = this.results.tests.length;
    const duration = Math.round((Date.now() - this.startTime) / 1000);

    this.log(`Total Test Suites: ${totalTests}`, colors.bright);
    this.log(`Passed: ${this.results.passed}`, colors.green);
    this.log(`Failed: ${this.results.failed}`, colors.red);
    this.log(`Duration: ${duration}s`, colors.blue);

    const successRate = totalTests > 0 ? Math.round((this.results.passed / totalTests) * 100) : 0;
    this.log(`Success Rate: ${successRate}%`, successRate >= 80 ? colors.green : colors.red);

    // Detailed results
    if (this.results.failed > 0) {
      this.log('\n❌ FAILED TESTS:', colors.red);
      this.results.tests
        .filter(t => !t.passed)
        .forEach(test => {
          this.log(`  • ${test.testName}`, colors.red);
        });
    }

    if (this.results.passed > 0) {
      this.log('\n✅ PASSED TESTS:', colors.green);
      this.results.tests
        .filter(t => t.passed)
        .forEach(test => {
          this.log(`  • ${test.testName}`, colors.green);
        });
    }

    // Save detailed report
    this.saveDetailedReport();

    // Overall status
    console.log('\n' + '='.repeat(80));
    if (this.results.failed === 0) {
      this.logSuccess('🎉 ALL TESTS PASSED - APPLICATION IS READY FOR PRODUCTION');
    } else {
      this.logError('❌ SOME TESTS FAILED - REVIEW AND FIX ISSUES BEFORE DEPLOYMENT');
    }
    console.log('='.repeat(80));

    return this.results.failed === 0;
  }

  saveDetailedReport() {
    const reportPath = path.join(__dirname, 'test-results', 'comprehensive-report.json');
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      duration: Math.round((Date.now() - this.startTime) / 1000),
      summary: {
        total: this.results.tests.length,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: this.results.tests.length > 0 ? Math.round((this.results.passed / this.results.tests.length) * 100) : 0
      },
      tests: this.results.tests,
      criticalIssuesFixed: this.results.failed === 0
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.logInfo(`Detailed report saved to: ${reportPath}`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    headed: args.includes('--headed'),
    debug: args.includes('--debug'),
    quick: args.includes('--quick')
  };

  const runner = new E2ETestRunner();

  try {
    const success = await runner.runFullTestSuite(options);
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n💥 TEST EXECUTION FAILED:');
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { E2ETestRunner };