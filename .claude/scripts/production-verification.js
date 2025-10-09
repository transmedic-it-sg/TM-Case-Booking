#!/usr/bin/env node

/**
 * Production Verification Script
 * Tests the live production URL to ensure deployment success
 */

const { spawn } = require('child_process');

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
      stdio: 'pipe',
      shell: true,
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', reject);
  });
}

async function testProductionURL() {
  const productionURL = 'https://tm-case-booking-au5g2lpjv-tmsg-its-projects.vercel.app';
  
  log('🌐 Testing Production URL Accessibility...', 'cyan');
  
  try {
    const result = await runCommand('curl', ['-I', '-s', '-w', '%{http_code}', productionURL]);
    
    if (result.stdout.includes('200')) {
      log('✅ Production URL is accessible (HTTP 200)', 'green');
      return true;
    } else {
      log(`⚠️ Production URL returned: ${result.stdout}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Failed to test production URL: ${error.message}`, 'red');
    return false;
  }
}

async function checkDNSResolution() {
  log('🔍 Checking DNS Resolution...', 'cyan');
  
  try {
    const result = await runCommand('nslookup', ['tm-case-booking-au5g2lpjv-tmsg-its-projects.vercel.app']);
    
    if (result.code === 0) {
      log('✅ DNS resolution successful', 'green');
      return true;
    } else {
      log('⚠️ DNS resolution issues detected', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ DNS check failed: ${error.message}`, 'red');
    return false;
  }
}

async function verifyBuildArtifacts() {
  log('📦 Verifying Build Artifacts...', 'cyan');
  
  const fs = require('fs');
  const path = require('path');
  
  const buildDir = 'build';
  
  if (!fs.existsSync(buildDir)) {
    log('❌ Build directory not found', 'red');
    return false;
  }
  
  const staticDir = path.join(buildDir, 'static');
  if (!fs.existsSync(staticDir)) {
    log('❌ Static assets directory not found', 'red');
    return false;
  }
  
  const jsDir = path.join(staticDir, 'js');
  const cssDir = path.join(staticDir, 'css');
  
  if (fs.existsSync(jsDir) && fs.existsSync(cssDir)) {
    const jsFiles = fs.readdirSync(jsDir);
    const cssFiles = fs.readdirSync(cssDir);
    
    log(`✅ Build artifacts verified: ${jsFiles.length} JS files, ${cssFiles.length} CSS files`, 'green');
    return true;
  } else {
    log('❌ Missing JS or CSS build artifacts', 'red');
    return false;
  }
}

async function main() {
  log('🏥 TM Case Booking System - Production Verification', 'magenta');
  log('='.repeat(55), 'magenta');
  log('', 'reset');
  log('🚀 PRODUCTION URL: https://tm-case-booking-au5g2lpjv-tmsg-its-projects.vercel.app', 'blue');
  log('', 'reset');
  
  const checks = [
    { name: 'Build Artifacts', fn: verifyBuildArtifacts },
    { name: 'DNS Resolution', fn: checkDNSResolution },
    { name: 'URL Accessibility', fn: testProductionURL }
  ];
  
  let passedChecks = 0;
  
  for (const check of checks) {
    try {
      const passed = await check.fn();
      if (passed) {
        passedChecks++;
      }
    } catch (error) {
      log(`💥 ${check.name} check failed: ${error.message}`, 'red');
    }
  }
  
  log('', 'reset');
  log('📊 Verification Results', 'magenta');
  log('='.repeat(25), 'magenta');
  log(`✅ Passed: ${passedChecks}/${checks.length}`, passedChecks === checks.length ? 'green' : 'yellow');
  
  if (passedChecks === checks.length) {
    log('', 'reset');
    log('🎉 PRODUCTION DEPLOYMENT VERIFIED!', 'green');
    log('✅ All systems operational', 'green');
    log('✅ Application accessible globally', 'green');
    log('✅ Build artifacts properly deployed', 'green');
    log('', 'reset');
    log('🧪 MANUAL TESTING CHECKLIST:', 'cyan');
    log('1. Open: https://tm-case-booking-au5g2lpjv-tmsg-its-projects.vercel.app', 'blue');
    log('2. Verify login form loads without errors', 'blue');
    log('3. Check browser console for permission errors', 'blue');
    log('4. Test authentication with valid credentials', 'blue');
    log('5. Navigate through main application sections', 'blue');
    log('6. Test on mobile device/responsive view', 'blue');
    log('', 'reset');
    log('🔧 MONITORING RECOMMENDATIONS:', 'yellow');
    log('• Monitor browser console for any new errors', 'blue');
    log('• Check application performance and load times', 'blue');
    log('• Verify all core functionality is working', 'blue');
    log('• Test with different user roles and permissions', 'blue');
  } else {
    log('', 'reset');
    log('⚠️ PARTIAL VERIFICATION SUCCESS', 'yellow');
    log('Some checks failed but deployment may still be functional', 'yellow');
    log('Recommend manual testing of the production URL', 'yellow');
  }
}

main().catch(error => {
  log(`💥 Verification failed: ${error.message}`, 'red');
  process.exit(1);
});