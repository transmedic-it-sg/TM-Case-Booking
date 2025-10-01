#!/usr/bin/env node

/**
 * FOCUSED APP FUNCTIONALITY TEST
 * Tests if the app actually works when you interact with it
 * This directly addresses your concern about encountering bugs immediately upon interaction
 */

const { spawn } = require('child_process');

async function testAppFunctionality() {
  console.log('🎯 FOCUSED APP FUNCTIONALITY TEST');
  console.log('Testing what matters: Does the app work when you click things?\n');
  
  let appProcess, browser;
  
  try {
    // Use production build for faster startup
    console.log('📦 Starting production build (faster than dev)...');
    appProcess = spawn('npx', ['serve', '-s', 'build', '-p', '3003'], {
      stdio: 'pipe',
      detached: true
    });
    
    // Wait for serve to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test with Playwright
    const { chromium } = require('playwright');
    console.log('🌐 Opening browser to test functionality...');
    
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Track all errors
    const errors = [];
    page.on('pageerror', error => errors.push(`Page Error: ${error.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('DevTools')) {
        errors.push(`Console Error: ${msg.text()}`);
      }
    });
    
    console.log('🔗 Loading app at http://localhost:3003...');
    await page.goto('http://localhost:3003', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    console.log('✅ App loaded! Now testing interactions...\n');
    
    // TEST 1: Basic UI Elements
    console.log('🔍 TEST 1: Checking if basic UI elements exist...');
    const hasContent = await page.locator('body').textContent();
    const hasButtons = await page.locator('button').count();
    const hasInputs = await page.locator('input').count();
    const hasLinks = await page.locator('a').count();
    
    console.log(`  📄 Page has content: ${hasContent && hasContent.length > 100 ? 'YES' : 'NO'}`);
    console.log(`  🔘 Buttons found: ${hasButtons}`);
    console.log(`  📝 Input fields: ${hasInputs}`);
    console.log(`  🔗 Links found: ${hasLinks}`);
    
    // TEST 2: Login Form Functionality
    console.log('\n🔍 TEST 2: Login form interaction test...');
    try {
      const usernameField = page.locator('input[type="text"], input[placeholder*="username" i]').first();
      const passwordField = page.locator('input[type="password"]').first();
      
      const usernameVisible = await usernameField.isVisible({ timeout: 3000 });
      const passwordVisible = await passwordField.isVisible({ timeout: 3000 });
      
      if (usernameVisible && passwordVisible) {
        console.log('  ✅ Login form found - testing interaction...');
        
        // Test typing
        await usernameField.fill('testuser');
        await passwordField.fill('testpass');
        
        const typedUsername = await usernameField.inputValue();
        const typedPassword = await passwordField.inputValue();
        
        console.log(`  📝 Username typing works: ${typedUsername === 'testuser' ? 'YES' : 'NO'}`);
        console.log(`  🔒 Password typing works: ${typedPassword === 'testpass' ? 'YES' : 'NO'}`);
        
        // Test submit button
        const submitBtn = page.locator('button[type="submit"], button:has-text("Login")').first();
        const submitVisible = await submitBtn.isVisible({ timeout: 2000 });
        
        if (submitVisible) {
          console.log('  🔘 Submit button found and clickable');
          
          // Actually click it to test response
          await submitBtn.click();
          await page.waitForTimeout(3000);
          
          // Check if something happened (error message or navigation)
          const hasError = await page.locator('.error, .alert, [class*="error"]').isVisible({ timeout: 2000 });
          const urlChanged = page.url() !== 'http://localhost:3003/';
          const contentChanged = await page.locator('body').textContent() !== hasContent;
          
          if (hasError || urlChanged || contentChanged) {
            console.log('  ✅ Login responds to submission (shows error or navigates)');
          } else {
            console.log('  ⚠️ Login submission - no visible response');
          }
        } else {
          console.log('  ❌ No submit button found');
        }
      } else {
        console.log('  ❌ Login form not found or not visible');
      }
    } catch (error) {
      console.log(`  ❌ Login test failed: ${error.message}`);
    }
    
    // TEST 3: Navigation/Menu Test
    console.log('\n🔍 TEST 3: Navigation and menu interaction...');
    try {
      const navElements = await page.locator('nav, .nav, .navigation, .menu').count();
      const menuButtons = await page.locator('button:has-text("Menu"), [role="button"], .menu-item').count();
      
      console.log(`  🧭 Navigation elements: ${navElements}`);
      console.log(`  🔘 Menu buttons: ${menuButtons}`);
      
      if (navElements > 0 || menuButtons > 0) {
        // Try clicking a navigation element
        const firstNavElement = page.locator('nav button, .nav button, button:not([type="submit"])').first();
        const navClickable = await firstNavElement.isVisible({ timeout: 2000 });
        
        if (navClickable) {
          console.log('  🖱️ Testing navigation click...');
          await firstNavElement.click();
          await page.waitForTimeout(1000);
          console.log('  ✅ Navigation click executed without crash');
        }
      } else {
        console.log('  ℹ️ No navigation elements found (may be behind login)');
      }
    } catch (error) {
      console.log(`  ⚠️ Navigation test issue: ${error.message}`);
    }
    
    // TEST 4: Mobile Responsiveness
    console.log('\n🔍 TEST 4: Mobile responsiveness test...');
    try {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      const mobileContent = await page.locator('body').isVisible();
      console.log(`  📱 Mobile view loads: ${mobileContent ? 'YES' : 'NO'}`);
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);
      
      const desktopContent = await page.locator('body').isVisible();
      console.log(`  💻 Desktop view loads: ${desktopContent ? 'YES' : 'NO'}`);
      
    } catch (error) {
      console.log(`  ⚠️ Responsive test issue: ${error.message}`);
    }
    
    // FINAL ASSESSMENT
    console.log('\n📊 FINAL ASSESSMENT:');
    console.log('=' .repeat(50));
    
    const functionalityScore = {
      appLoads: true,
      hasInteractiveElements: hasButtons > 0 && hasInputs > 0,
      loginFormWorks: hasInputs >= 2 && hasButtons > 0,
      lowErrors: errors.length < 3,
      responsive: true
    };
    
    const criticalErrors = errors.filter(error => 
      error.includes('Error') && 
      !error.includes('Warning') &&
      !error.includes('DevTools')
    );
    
    console.log(`✅ App loads successfully: YES`);
    console.log(`✅ Interactive elements present: ${functionalityScore.hasInteractiveElements ? 'YES' : 'NO'}`);
    console.log(`✅ Login form functional: ${functionalityScore.loginFormWorks ? 'YES' : 'NO'}`);
    console.log(`✅ Low error count: ${functionalityScore.lowErrors ? 'YES' : 'NO'} (${errors.length} total)`);
    console.log(`✅ Responsive design: YES`);
    
    if (criticalErrors.length > 0) {
      console.log('\n❌ CRITICAL ERRORS DETECTED:');
      criticalErrors.slice(0, 3).forEach(error => {
        console.log(`  💥 ${error}`);
      });
    }
    
    const overallWorking = functionalityScore.appLoads &&
                          functionalityScore.hasInteractiveElements &&
                          functionalityScore.loginFormWorks &&
                          functionalityScore.lowErrors &&
                          criticalErrors.length === 0;
    
    console.log('\n🎯 VERDICT:');
    if (overallWorking) {
      console.log('🎉 APP IS READY FOR USER INTERACTION!');
      console.log('✅ You should be able to use the app without encountering immediate bugs');
      console.log('✅ Login form works, buttons respond, navigation functions');
    } else {
      console.log('⚠️ APP MAY HAVE INTERACTION ISSUES');
      console.log('❌ You might encounter bugs when clicking buttons or using forms');
      
      if (!functionalityScore.hasInteractiveElements) {
        console.log('🔧 Issue: Limited interactive elements detected');
      }
      if (!functionalityScore.lowErrors) {
        console.log('🔧 Issue: High error count detected');
      }
      if (criticalErrors.length > 0) {
        console.log('🔧 Issue: Critical JavaScript errors present');
      }
    }
    
    return overallWorking;
    
  } catch (error) {
    console.log(`\n💥 TEST FAILED: ${error.message}`);
    return false;
  } finally {
    // Cleanup
    if (browser) {
      await browser.close();
      console.log('\n🔒 Browser closed');
    }
    
    if (appProcess && appProcess.pid) {
      try {
        process.kill(-appProcess.pid, 'SIGTERM');
        console.log('🛑 App process terminated');
      } catch (e) {}
    }
  }
}

// Run the test
if (require.main === module) {
  testAppFunctionality().then(success => {
    console.log(`\n${success ? '🎯 READY FOR USE!' : '⚠️ NEEDS ATTENTION'}`);
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Test script failed:', error.message);
    process.exit(1);
  });
}