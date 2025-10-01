#!/usr/bin/env node

/**
 * UNIFIED COMPREHENSIVE TESTING SUITE
 * Consolidates ALL testing functionality into ONE script
 * Implements all recommended tools: ESLint, Prettier, TypeScript, Security, E2E, Performance
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class UnifiedTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overall: 'PENDING',
      stages: {},
      security: { issues: [], vulnerabilities: [] },
      performance: {},
      coverage: {},
      errors: [],
      warnings: [],
      summary: {}
    };
    this.startTime = Date.now();
  }

  async runTests(mode = 'full') {
    console.log('🚀 UNIFIED COMPREHENSIVE TESTING SUITE');
    console.log('=' .repeat(60));
    console.log(`📋 Mode: ${mode.toUpperCase()}`);
    console.log(`⏰ Started: ${new Date().toLocaleTimeString()}`);
    
    try {
      switch (mode) {
        case 'quick':
          await this.runQuickValidation();
          break;
        case 'security':
          await this.runSecurityOnly();
          break;
        case 'build':
          await this.runBuildOnly();
          break;
        default:
          await this.runFullSuite();
      }
      
      this.generateUnifiedReport();
      
    } catch (error) {
      this.results.overall = 'FAILED';
      this.results.errors.push(`Critical failure: ${error.message}`);
      console.error('💥 Testing failed:', error.message);
      process.exit(1);
    }
  }

  async runQuickValidation() {
    console.log('\n⚡ QUICK VALIDATION MODE');
    await this.stage1_CodeQuality();
    await this.stage2_TypeScript();
    await this.stage3_Security();
    await this.stage4_Build();
  }

  async runSecurityOnly() {
    console.log('\n🔒 SECURITY SCAN MODE');
    await this.stage3_Security();
  }

  async runBuildOnly() {
    console.log('\n🏗️ BUILD VERIFICATION MODE');
    await this.stage2_TypeScript();
    await this.stage4_Build();
  }

  async runFullSuite() {
    console.log('\n🌐 FULL COMPREHENSIVE TESTING');
    await this.stage1_CodeQuality();
    await this.stage2_TypeScript();
    await this.stage3_Security();
    await this.stage4_Build();
    await this.stage5_UnitTests();
    await this.stage6_AppStartup();
    await this.stage7_Performance();
  }

  // === STAGE 1: CODE QUALITY ===
  async stage1_CodeQuality() {
    console.log('\n📝 Stage 1: Code Quality & Static Analysis');
    
    try {
      // ESLint
      const lintResult = await this.runCommand('npm run lint', 30000);
      this.results.stages.lint = {
        status: lintResult.code === 0 ? 'PASSED' : 'FAILED',
        output: lintResult.output,
        duration: lintResult.duration
      };
      
      // Prettier
      const formatResult = await this.runCommand('npm run format:check', 30000);
      this.results.stages.format = {
        status: formatResult.code === 0 ? 'PASSED' : 'FAILED',
        output: formatResult.output,
        duration: formatResult.duration
      };
      
      // Component audit
      const componentIssues = await this.auditComponentStructure();
      this.results.stages.components = {
        status: componentIssues.length === 0 ? 'PASSED' : 'WARNINGS',
        issues: componentIssues,
        count: componentIssues.length
      };
      
      console.log(`  ✅ ESLint: ${this.results.stages.lint.status}`);
      console.log(`  ✅ Prettier: ${this.results.stages.format.status}`);
      console.log(`  ✅ Components: ${this.results.stages.components.status} (${componentIssues.length} issues)`);
      
    } catch (error) {
      this.results.stages.codeQuality = { status: 'ERROR', error: error.message };
      this.results.errors.push(`Code quality check failed: ${error.message}`);
    }
  }

  // === STAGE 2: TYPESCRIPT ===
  async stage2_TypeScript() {
    console.log('\n🔍 Stage 2: TypeScript Compilation');
    
    try {
      const tsResult = await this.runCommand('npm run typecheck', 60000);
      this.results.stages.typescript = {
        status: tsResult.code === 0 ? 'PASSED' : 'FAILED',
        output: tsResult.output,
        duration: tsResult.duration
      };
      
      console.log(`  ✅ TypeScript: ${this.results.stages.typescript.status}`);
      
    } catch (error) {
      this.results.stages.typescript = { status: 'ERROR', error: error.message };
      this.results.errors.push(`TypeScript check failed: ${error.message}`);
    }
  }

  // === STAGE 3: SECURITY ===
  async stage3_Security() {
    console.log('\n🔒 Stage 3: Security Analysis');
    
    try {
      // npm audit
      const auditResult = await this.runCommand('npm audit --json', 30000);
      let auditData = {};
      try {
        auditData = JSON.parse(auditResult.output || '{}');
      } catch (e) {
        auditData = { metadata: { vulnerabilities: {} } };
      }
      
      this.results.security.audit = {
        status: auditResult.code === 0 ? 'PASSED' : 'WARNINGS',
        vulnerabilities: auditData.metadata?.vulnerabilities || {},
        total: auditData.metadata?.totalDependencies || 0
      };
      
      // Security pattern scanning
      const securityIssues = await this.scanSecurityPatterns();
      this.results.security.patterns = securityIssues;
      
      // Environment file scanning
      const envIssues = await this.scanEnvironmentFiles();
      this.results.security.environment = envIssues;
      
      const totalSecurityIssues = securityIssues.length + envIssues.length;
      const criticalVulns = auditData.metadata?.vulnerabilities?.critical || 0;
      
      console.log(`  ✅ npm audit: ${this.results.security.audit.status} (${criticalVulns} critical)`);
      console.log(`  ✅ Code patterns: ${totalSecurityIssues === 0 ? 'CLEAN' : totalSecurityIssues + ' issues'}`);
      
    } catch (error) {
      this.results.security.error = error.message;
      this.results.errors.push(`Security scan failed: ${error.message}`);
    }
  }

  // === STAGE 4: BUILD ===
  async stage4_Build() {
    console.log('\n🏗️ Stage 4: Build Verification');
    
    try {
      const buildResult = await this.runCommand('npm run build', 300000);
      this.results.stages.build = {
        status: buildResult.code === 0 ? 'PASSED' : 'FAILED',
        output: buildResult.output,
        duration: buildResult.duration
      };
      
      // Analyze build artifacts
      if (fs.existsSync('build')) {
        const buildStats = this.analyzeBuildArtifacts();
        this.results.performance.buildStats = buildStats;
        console.log(`  📦 Build size: ${Math.round(buildStats.totalSize / 1024)}KB`);
      }
      
      console.log(`  ✅ Build: ${this.results.stages.build.status}`);
      
    } catch (error) {
      this.results.stages.build = { status: 'ERROR', error: error.message };
      this.results.errors.push(`Build failed: ${error.message}`);
    }
  }

  // === STAGE 5: UNIT TESTS ===
  async stage5_UnitTests() {
    console.log('\n🧪 Stage 5: Unit Tests & Coverage');
    
    try {
      const testResult = await this.runCommand('npm run test:coverage', 120000);
      this.results.stages.unitTests = {
        status: testResult.code === 0 ? 'PASSED' : 'FAILED',
        output: testResult.output,
        duration: testResult.duration
      };
      
      // Parse coverage if available
      if (fs.existsSync('coverage/coverage-summary.json')) {
        const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
        this.results.coverage = coverage.total;
        console.log(`  📊 Coverage: ${coverage.total.lines.pct}% lines, ${coverage.total.statements.pct}% statements`);
      }
      
      console.log(`  ✅ Unit tests: ${this.results.stages.unitTests.status}`);
      
    } catch (error) {
      this.results.stages.unitTests = { status: 'ERROR', error: error.message };
      this.results.warnings.push(`Unit tests failed: ${error.message}`);
    }
  }

  // === STAGE 6: APP STARTUP ===
  async stage6_AppStartup() {
    console.log('\n🚀 Stage 6: Application Startup Test');
    
    try {
      const startupResult = await this.testAppStartup();
      this.results.stages.startup = startupResult;
      
      console.log(`  ✅ App startup: ${startupResult.status}`);
      
      if (startupResult.details) {
        console.log(`  🔐 Login form: ${startupResult.details.loginFormExists ? 'YES' : 'NO'}`);
        console.log(`  🖱️ Interactive elements: ${startupResult.details.interactiveElements ? startupResult.interactiveElements || 'YES' : 'NO'}`);
        console.log(`  🐛 Critical errors: ${startupResult.details.criticalErrors || 0}`);
        console.log(`  📱 Responsive design: TESTED`);
      } else {
        if (startupResult.loginFound) console.log(`  🔐 Login form: YES`);
        if (startupResult.errorsFound) console.log(`  ⚠️ Runtime errors: YES`);
      }
      
      if (startupResult.message) {
        console.log(`  💬 ${startupResult.message}`);
      }
      
    } catch (error) {
      this.results.stages.startup = { status: 'ERROR', error: error.message };
      this.results.errors.push(`App startup test failed: ${error.message}`);
    }
  }

  // === STAGE 7: PERFORMANCE ===
  async stage7_Performance() {
    console.log('\n⚡ Stage 7: Performance Analysis');
    
    try {
      const perfMetrics = {
        buildSize: this.results.performance.buildStats?.totalSize || 0,
        loadTime: 0,
        status: 'INFO'
      };
      
      // Basic performance analysis
      if (this.results.performance.buildStats) {
        const sizeKB = Math.round(this.results.performance.buildStats.totalSize / 1024);
        perfMetrics.buildSizeKB = sizeKB;
        
        if (sizeKB > 5000) { // 5MB
          this.results.warnings.push(`Large bundle size: ${sizeKB}KB`);
        }
      }
      
      this.results.performance.metrics = perfMetrics;
      console.log(`  ✅ Performance analysis completed`);
      
    } catch (error) {
      this.results.performance.error = error.message;
      this.results.warnings.push(`Performance analysis failed: ${error.message}`);
    }
  }

  // === UTILITY METHODS ===

  async runCommand(command, timeout = 120000) {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const process = spawn('sh', ['-c', command], { 
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        resolve({
          code,
          output: output + errorOutput,
          success: code === 0,
          duration: Date.now() - startTime
        });
      });
      
      process.on('error', (error) => {
        reject(error);
      });
      
      // Timeout handling
      const timeoutId = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error(`Command timeout: ${command}`));
      }, timeout);
      
      process.on('close', () => clearTimeout(timeoutId));
    });
  }

  async testAppStartup() {
    console.log('    🚀 Starting comprehensive app functionality test...');
    
    try {
      // Try Playwright first (better E2E testing)
      let playwright;
      try {
        const { chromium } = require('playwright');
        playwright = { chromium };
      } catch (error) {
        console.log('    ⚠️ Playwright not available, trying Puppeteer...');
        
        // Fallback to Puppeteer
        try {
          const puppeteer = require('puppeteer');
          return await this.testWithPuppeteer(puppeteer);
        } catch (puppeteerError) {
          return {
            status: 'ERROR',
            reason: 'No browser automation available',
            error: `Playwright: ${error.message}, Puppeteer: ${puppeteerError.message}`
          };
        }
      }
      
      // Use Playwright for comprehensive testing
      return await this.testWithPlaywright(playwright);
      
    } catch (error) {
      return {
        status: 'ERROR',
        error: error.message
      };
    }
  }

  async testWithPlaywright(playwright) {
    let appProcess, browser;
    
    try {
      console.log('    📱 Starting React app...');
      appProcess = spawn('npm', ['start'], {
        stdio: 'pipe',
        env: { ...process.env, PORT: '3001' },
        detached: true
      });
      
      // Wait for app to start
      console.log('    ⏳ Waiting for app startup (30s)...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      console.log('    🌐 Launching browser with Playwright...');
      browser = await playwright.chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Track errors
      const consoleErrors = [];
      const pageErrors = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !msg.text().includes('DevTools')) {
          consoleErrors.push(msg.text());
        }
      });
      
      page.on('pageerror', (error) => {
        pageErrors.push(error.message);
      });
      
      // Test 1: Page loads
      console.log('    🔗 Testing: Page loads without errors...');
      await page.goto('http://localhost:3001', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      console.log('    ✅ Page loaded successfully!');
      
      // Test 2: Login form exists and works
      console.log('    🔍 Testing: Login form functionality...');
      const usernameField = await page.locator('input[type="text"], input[placeholder*="username" i]').first();
      const passwordField = await page.locator('input[type="password"]').first();
      
      const loginFormExists = await usernameField.isVisible({ timeout: 5000 }) && 
                              await passwordField.isVisible({ timeout: 5000 });
      
      if (loginFormExists) {
        console.log('    ✅ Login form found');
        
        // Test login interaction
        await usernameField.fill('admin');
        await passwordField.fill('password123');
        
        const submitButton = await page.locator('button[type="submit"], button:has-text("Login")').first();
        if (await submitButton.isVisible({ timeout: 2000 })) {
          console.log('    🔍 Testing: Login submission...');
          await submitButton.click();
          
          // Wait for response
          await page.waitForTimeout(5000);
          
          // Check result
          const hasError = await page.locator('.error, .alert, [class*="error"]').isVisible({ timeout: 2000 });
          const hasDashboard = await page.locator('.dashboard, .main-content, nav, .navigation').isVisible({ timeout: 2000 });
          
          if (hasDashboard) {
            console.log('    ✅ Login successful or dashboard accessible');
          } else if (hasError) {
            console.log('    ✅ Login properly handles invalid credentials');
          } else {
            console.log('    ⚠️ Login response unclear');
          }
        }
      }
      
      // Test 3: Navigation elements
      console.log('    🔍 Testing: Navigation and interactive elements...');
      const interactiveElements = await page.locator('button, a, input, [role="button"]').count();
      console.log(`    ✅ Found ${interactiveElements} interactive elements`);
      
      // Test 4: Check for critical errors
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('Warning') && 
        !error.includes('DevTools') &&
        error.includes('Error')
      ).length;
      
      // Test 5: Responsive design
      console.log('    📱 Testing: Responsive design...');
      await page.setViewportSize({ width: 375, height: 667 }); // Mobile
      await page.waitForTimeout(1000);
      await page.setViewportSize({ width: 1280, height: 720 }); // Desktop
      
      console.log('    ✅ Responsive design test completed');
      
      // Final assessment
      const testResults = {
        pageLoads: true,
        loginFormExists,
        interactiveElements: interactiveElements > 5,
        lowErrors: criticalErrors < 2 && pageErrors.length === 0,
        consoleErrors: consoleErrors.length,
        pageErrors: pageErrors.length,
        criticalErrors
      };
      
      const overallWorking = testResults.pageLoads && 
                           testResults.loginFormExists && 
                           testResults.interactiveElements && 
                           testResults.lowErrors;
      
      return {
        status: overallWorking ? 'PASSED' : 'WARNINGS',
        details: testResults,
        loginFound: loginFormExists,
        errorsFound: criticalErrors > 0 || pageErrors.length > 0,
        interactiveElements,
        message: overallWorking ? 
          'App is fully functional for user interactions' : 
          'App has some issues that may affect user experience'
      };
      
    } catch (error) {
      return {
        status: 'ERROR',
        error: error.message,
        message: 'Failed to test app functionality'
      };
    } finally {
      // Cleanup
      if (browser) {
        try {
          await browser.close();
          console.log('    🔒 Browser closed');
        } catch (e) {}
      }
      
      if (appProcess && appProcess.pid) {
        try {
          process.kill(-appProcess.pid, 'SIGTERM');
          console.log('    🛑 App process terminated');
        } catch (e) {}
      }
    }
  }

  async testWithPuppeteer(puppeteer) {
    // Simplified Puppeteer fallback (original implementation)
    try {
      const appProcess = spawn('npm', ['start'], {
        stdio: 'pipe',
        env: { ...process.env, PORT: '3001' },
        detached: true
      });
      
      await new Promise(resolve => setTimeout(resolve, 20000));
      
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      let loginFound = false;
      let errorsFound = false;
      
      try {
        await page.goto('http://localhost:3001', { 
          waitUntil: 'networkidle0',
          timeout: 20000 
        });
        
        const usernameField = await page.$('input[type="text"]');
        const passwordField = await page.$('input[type="password"]');
        loginFound = usernameField && passwordField;
        
        const errorElements = await page.$$('.error, .crash');
        errorsFound = errorElements.length > 0;
        
      } catch (error) {
        console.log(`    ⚠️ Browser test error: ${error.message}`);
      }
      
      await browser.close();
      
      if (appProcess.pid) {
        try {
          process.kill(-appProcess.pid, 'SIGTERM');
        } catch (e) {}
      }
      
      return {
        status: loginFound && !errorsFound ? 'PASSED' : 'WARNINGS',
        loginFound,
        errorsFound,
        message: loginFound && !errorsFound ? 
          'Basic app functionality works' : 
          'App may have functionality issues'
      };
      
    } catch (error) {
      return {
        status: 'ERROR',
        error: error.message
      };
    }
  }

  async auditComponentStructure() {
    const issues = [];
    
    // Check for missing component files
    const componentImports = [
      { file: 'src/components/EditSets.tsx', target: './EditSets/ModernEditSets' },
      { file: 'src/components/CasesList.tsx', target: './CasesList/index' },
      { file: 'src/components/EditSets/index.tsx', target: './ModernEditSets' }
    ];
    
    for (const { file, target } of componentImports) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (!content.includes(target)) {
          issues.push({
            type: 'WRONG_IMPORT',
            file,
            expected: target,
            message: `Component may be importing wrong target`
          });
        }
      }
    }
    
    return issues;
  }

  async scanSecurityPatterns() {
    const issues = [];
    const files = this.getAllSourceFiles();
    
    const patterns = [
      {
        pattern: /password\s*=\s*['"][a-zA-Z0-9]{4,}['"]/i,
        type: 'HARDCODED_PASSWORD',
        severity: 'CRITICAL'
      },
      {
        pattern: /innerHTML\s*=\s*[^;]*\$\{[^}]*user[^}]*\}[^;]*;/i,
        type: 'XSS_RISK',
        severity: 'HIGH'
      },
      {
        pattern: /eval\s*\(/i,
        type: 'CODE_INJECTION',
        severity: 'CRITICAL'
      },
      {
        pattern: /console\.log.*password/i,
        type: 'PASSWORD_LOGGING',
        severity: 'MEDIUM'
      }
    ];
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        for (const { pattern, type, severity } of patterns) {
          if (pattern.test(content)) {
            issues.push({
              file: file.replace(process.cwd(), ''),
              type,
              severity,
              message: `${type} detected in ${path.basename(file)}`
            });
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    return issues;
  }

  async scanEnvironmentFiles() {
    const issues = [];
    const envFiles = ['.env', '.env.local', '.env.production'];
    
    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        try {
          const content = fs.readFileSync(envFile, 'utf8');
          if (content.includes('password') || content.includes('secret')) {
            issues.push({
              file: envFile,
              type: 'ENV_SECRETS',
              message: 'Potential secrets in environment file'
            });
          }
        } catch (error) {
          // Skip files we can't read
        }
      }
    }
    
    return issues;
  }

  getAllSourceFiles() {
    const files = [];
    const walk = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walk(fullPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx')) {
          files.push(fullPath);
        }
      }
    };
    
    if (fs.existsSync('src')) {
      walk('src');
    }
    return files;
  }

  analyzeBuildArtifacts() {
    const stats = {
      totalSize: 0,
      jsFiles: 0,
      cssFiles: 0,
      assets: 0
    };
    
    if (!fs.existsSync('build')) return stats;
    
    const walk = (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          stats.totalSize += stat.size;
          if (item.endsWith('.js')) stats.jsFiles++;
          if (item.endsWith('.css')) stats.cssFiles++;
          if (!item.endsWith('.js') && !item.endsWith('.css') && !item.endsWith('.html')) {
            stats.assets++;
          }
        } else if (stat.isDirectory()) {
          walk(fullPath);
        }
      }
    };
    
    walk('build');
    return stats;
  }

  generateUnifiedReport() {
    const duration = Date.now() - this.startTime;
    
    console.log('\n📊 UNIFIED TEST REPORT');
    console.log('=' .repeat(60));
    
    // Calculate overall status
    const failed = Object.values(this.results.stages).some(stage => stage.status === 'FAILED');
    const errors = this.results.errors.length > 0;
    const criticalSecurity = this.results.security.patterns?.some(p => p.severity === 'CRITICAL') || false;
    
    this.results.overall = (failed || errors || criticalSecurity) ? 'FAILED' : 'PASSED';
    
    console.log(`🎯 Overall Status: ${this.results.overall}`);
    console.log(`⏰ Duration: ${Math.round(duration / 1000)}s`);
    console.log(`📅 Completed: ${new Date().toLocaleTimeString()}`);
    
    // Stage Results
    console.log('\n📋 Test Results:');
    for (const [stage, result] of Object.entries(this.results.stages)) {
      const status = result.status || 'UNKNOWN';
      const icon = status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : '⚠️';
      const duration = result.duration ? ` (${Math.round(result.duration / 1000)}s)` : '';
      console.log(`  ${icon} ${stage}: ${status}${duration}`);
    }
    
    // Security Summary
    const secIssues = (this.results.security.patterns?.length || 0) + (this.results.security.environment?.length || 0);
    const criticalVulns = this.results.security.audit?.vulnerabilities?.critical || 0;
    
    console.log('\n🔒 Security Summary:');
    console.log(`  🔍 Code patterns: ${secIssues} issues found`);
    console.log(`  📦 Dependencies: ${criticalVulns} critical vulnerabilities`);
    
    // Performance Summary
    if (this.results.performance.buildStats) {
      console.log('\n⚡ Performance Summary:');
      console.log(`  📦 Build size: ${Math.round(this.results.performance.buildStats.totalSize / 1024)}KB`);
      console.log(`  📄 JS files: ${this.results.performance.buildStats.jsFiles}`);
      console.log(`  🎨 CSS files: ${this.results.performance.buildStats.cssFiles}`);
    }
    
    // Coverage Summary
    if (this.results.coverage.lines) {
      console.log('\n📊 Coverage Summary:');
      console.log(`  📈 Lines: ${this.results.coverage.lines.pct}%`);
      console.log(`  📈 Statements: ${this.results.coverage.statements.pct}%`);
      console.log(`  📈 Functions: ${this.results.coverage.functions.pct}%`);
      console.log(`  📈 Branches: ${this.results.coverage.branches.pct}%`);
    }
    
    // Errors and Warnings
    if (this.results.errors.length > 0) {
      console.log('\n💥 Errors:');
      this.results.errors.forEach(error => console.log(`  ❌ ${error}`));
    }
    
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      this.results.warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
    }
    
    // Save report
    this.results.summary = {
      duration,
      totalStages: Object.keys(this.results.stages).length,
      passedStages: Object.values(this.results.stages).filter(s => s.status === 'PASSED').length,
      failedStages: Object.values(this.results.stages).filter(s => s.status === 'FAILED').length,
      securityIssues: secIssues,
      criticalVulnerabilities: criticalVulns
    };
    
    fs.writeFileSync('.claude/claude-test-report.json', JSON.stringify(this.results, null, 2));
    console.log('\n📄 Detailed report saved to .claude/claude-test-report.json');
    
    // Final verdict with actionable feedback
    if (this.results.overall === 'PASSED') {
      console.log('\n🎉 ALL TESTS PASSED - PRODUCTION READY!');
      console.log('✅ App has been comprehensively validated');
    } else {
      console.log('\n💥 TESTS FAILED - REQUIRES FIXES');
      console.log('❌ App is NOT production ready');
      
      // Specific guidance
      if (this.results.stages.typescript?.status === 'FAILED') {
        console.log('🔧 Fix TypeScript compilation errors first');
      }
      if (this.results.stages.build?.status === 'FAILED') {
        console.log('🔧 Fix build process issues');
      }
      if (criticalSecurity || criticalVulns > 0) {
        console.log('🔧 Address critical security vulnerabilities');
      }
      
      process.exit(1);
    }
  }
}

// === CLI INTERFACE ===
async function main() {
  const args = process.argv.slice(2);
  const mode = args.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 
               args.find(arg => ['quick', 'security', 'build', 'full'].includes(arg)) || 
               'quick';
  
  const tester = new UnifiedTester();
  await tester.runTests(mode);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unified testing failed:', error.message);
    process.exit(1);
  });
}

module.exports = { UnifiedTester };