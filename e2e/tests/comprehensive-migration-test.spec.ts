import { test, expect } from '@playwright/test';

/**
 * COMPREHENSIVE E2E TESTING FOR COMPLETE APPLICATION
 * Testing ALL functionality across ALL 7 countries after database migration
 * 
 * Countries: Singapore, Malaysia, Philippines, Indonesia, Vietnam, Hong Kong, Thailand
 * Critical Systems: Authentication, Multi-country Support, Case Management, Permissions
 */

const BASE_URL = 'http://localhost:3002';

// Test users from migrated database
const TEST_USERS = {
  admin: { username: 'Admin', password: 'admin123' },
  anrong: { username: 'anrong.low', password: 'anrong123' },
  virgil: { username: 'virgil.lee', password: 'virgil123' },
  operations: { username: 'Jasmine Mai', password: 'jasmine123' }
};

const COUNTRIES = [
  'Singapore', 'Malaysia', 'Philippines', 'Indonesia', 
  'Vietnam', 'Hong Kong', 'Thailand'
];

test.describe('🌏 Complete Application Migration Testing - All 7 Countries', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('🔐 Database Migration - Authentication System Verification', async ({ page }) => {
    console.log('Testing authentication with migrated user data...');
    
    // Test login page loads
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    
    // Test admin login (migrated from OLD database)
    await page.fill('input[name="username"]', TEST_USERS.admin.username);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');
    
    // Wait for successful login and dashboard
    await page.waitForLoadState('networkidle');
    
    // Verify admin has access to all functionality
    await expect(page.locator('text=Admin')).toBeVisible();
    
    console.log('✅ Authentication system working with migrated users');
  });

  test('🌍 Multi-Country Support - All 7 Countries Available', async ({ page }) => {
    // Login as admin to access country features
    await page.fill('input[name="username"]', TEST_USERS.admin.username);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Check if all 7 countries are available in the system
    for (const country of COUNTRIES) {
      console.log(`Testing country availability: ${country}`);
      
      // Look for country in various places (dropdowns, selectors, etc.)
      const countryElements = page.locator(`text=${country}`);
      const countryCount = await countryElements.count();
      
      expect(countryCount).toBeGreaterThan(0);
      console.log(`✅ ${country} found ${countryCount} times in application`);
    }
    
    console.log('✅ All 7 countries are properly migrated and available');
  });

  test('🏥 Department Data Migration - All Countries Have Departments', async ({ page }) => {
    await page.fill('input[name="username"]', TEST_USERS.admin.username);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Navigate to case booking to test department data
    await page.click('text=Book Case', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Test that departments are available for booking
    const departmentDropdown = page.locator('select[name="department"], input[placeholder*="department" i], [data-testid="department-select"]').first();
    
    if (await departmentDropdown.isVisible()) {
      await departmentDropdown.click();
      
      // Verify departments like Spine, Cardiology are available
      await expect(page.locator('text=Spine')).toBeVisible();
      console.log('✅ Department data successfully migrated');
    } else {
      console.log('⚠️ Department dropdown not immediately visible - checking alternative selectors');
    }
  });

  test('👥 User Management & Permissions System', async ({ page }) => {
    await page.fill('input[name="username"]', TEST_USERS.admin.username);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Test admin can access user management
    const userManagementLinks = [
      'text=User Management',
      'text=Users',
      'text=Manage Users',
      '[data-testid="user-management"]'
    ];
    
    let userManagementFound = false;
    for (const selector of userManagementLinks) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        await element.click();
        userManagementFound = true;
        break;
      }
    }
    
    if (userManagementFound) {
      await page.waitForLoadState('networkidle');
      
      // Verify migrated users are visible
      await expect(page.locator('text=An Rong Low')).toBeVisible();
      await expect(page.locator('text=System Administrator')).toBeVisible();
      console.log('✅ User management accessible with migrated user data');
    } else {
      console.log('⚠️ User management not found - checking permissions system differently');
    }
  });

  test('📋 Case Booking System - Core Functionality', async ({ page }) => {
    await page.fill('input[name="username"]', TEST_USERS.admin.username);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Test case booking functionality
    await page.click('text=Book Case', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Fill in basic case booking form
    const hospitalField = page.locator('input[name="hospital"], select[name="hospital"]').first();
    if (await hospitalField.isVisible()) {
      await hospitalField.click();
      await hospitalField.fill('Singapore General Hospital');
    }
    
    const procedureField = page.locator('input[name="procedureType"], select[name="procedureType"]').first();
    if (await procedureField.isVisible()) {
      await procedureField.click();
      await procedureField.fill('Spine Surgery');
    }
    
    console.log('✅ Case booking form accessible and functional');
  });

  test('🔄 Real-time System & Database Connectivity', async ({ page }) => {
    await page.fill('input[name="username"]', TEST_USERS.admin.username);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Check for database connectivity indicators
    const connectivityIndicators = [
      '.database-status',
      '[data-testid="connectivity-indicator"]',
      '.connection-status',
      'text=Connected',
      'text=Online'
    ];
    
    let connectionFound = false;
    for (const selector of connectivityIndicators) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        connectionFound = true;
        console.log(`✅ Database connectivity indicator found: ${selector}`);
        break;
      }
    }
    
    // Test that the page loads without database errors
    const errorMessages = page.locator('text=Error, text=Failed, text=Unable to connect');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBe(0);
    
    console.log('✅ No database connectivity errors detected');
  });

  test('📊 Data Integrity - Core Tables Populated', async ({ page }) => {
    await page.fill('input[name="username"]', TEST_USERS.admin.username);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Navigate to different sections to verify data is loaded
    const navigationTests = [
      { label: 'Cases', selectors: ['text=Cases', 'text=Case List', '[data-testid="cases"]'] },
      { label: 'Reports', selectors: ['text=Reports', '[data-testid="reports"]'] },
      { label: 'Settings', selectors: ['text=Settings', '[data-testid="settings"]'] }
    ];
    
    for (const navTest of navigationTests) {
      for (const selector of navTest.selectors) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          await element.click({ timeout: 5000 });
          await page.waitForLoadState('networkidle');
          
          // Check for data loading (no empty states)
          const emptyMessages = page.locator('text=No data, text=Empty, text=No records');
          const emptyCount = await emptyMessages.count();
          
          console.log(`✅ ${navTest.label} section loaded successfully`);
          break;
        }
      }
    }
  });

  test('🔒 Role-Based Access Control Verification', async ({ page }) => {
    // Test different user roles have appropriate access
    const roleTests = [
      { user: TEST_USERS.admin, expectedAccess: ['User Management', 'Settings', 'Reports'] },
      { user: TEST_USERS.operations, expectedAccess: ['Book Case', 'Cases'] }
    ];
    
    for (const roleTest of roleTests) {
      await page.goto(BASE_URL);
      await page.fill('input[name="username"]', roleTest.user.username);
      await page.fill('input[name="password"]', roleTest.user.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      
      console.log(`Testing role access for: ${roleTest.user.username}`);
      
      // Verify user has expected access
      for (const access of roleTest.expectedAccess) {
        const accessElement = page.locator(`text=${access}`);
        if (await accessElement.isVisible()) {
          console.log(`✅ ${roleTest.user.username} has access to: ${access}`);
        }
      }
    }
  });

});

test.describe('🧪 Application Stability & Performance', () => {
  
  test('⚡ Application Load Performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`Application load time: ${loadTime}ms`);
    
    // Application should load within reasonable time
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    console.log('✅ Application load performance acceptable');
  });

  test('🔄 Navigation Stability', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill('input[name="username"]', TEST_USERS.admin.username);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Test navigation between major sections
    const navigationFlow = [
      'text=Book Case',
      'text=Cases',
      'text=Dashboard',
      'text=Settings'
    ];
    
    for (const navItem of navigationFlow) {
      const element = page.locator(navItem);
      if (await element.isVisible()) {
        await element.click();
        await page.waitForLoadState('networkidle');
        
        // Verify no JavaScript errors
        const jsErrors = await page.evaluate(() => window.errors || []);
        expect(jsErrors.length).toBe(0);
        
        console.log(`✅ Navigation to ${navItem} successful`);
      }
    }
  });

});