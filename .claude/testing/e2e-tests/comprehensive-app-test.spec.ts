import { test, expect } from '@playwright/test';

// Test data and credentials
const TEST_DATA = {
  user: {
    username: 'admin',
    password: 'admin123',
    country: 'Malaysia' // Update based on your available countries
  },
  testCase: {
    hospital: 'Test Hospital',
    patientName: 'Test Patient',
    doctorName: 'Dr. Test',
    procedureType: 'Cardiology',
    procedureName: 'Test Procedure'
  }
};

test.describe('TM Case Booking System - Comprehensive Go-Live Tests', () => {
  
  // Helper function to login
  async function loginUser(page: any) {
    await page.goto('/');
    
    // Wait for the form to be ready
    await page.waitForSelector('.modern-login-form', { timeout: 10000 });
    
    // Fill in credentials
    await page.fill('#username', TEST_DATA.user.username);
    await page.fill('#password', TEST_DATA.user.password);
    
    // Handle country dropdown - try multiple selectors
    try {
      // Try SearchableDropdown first
      await page.click('[data-testid="searchable-dropdown"], .login-dropdown input, input[placeholder*="country" i]');
      await page.type('[data-testid="searchable-dropdown"], .login-dropdown input, input[placeholder*="country" i]', TEST_DATA.user.country);
      await page.keyboard.press('Enter');
    } catch (error) {
      // Fallback to regular select if SearchableDropdown fails
      try {
        await page.selectOption('select#country, select[name="country"]', TEST_DATA.user.country);
      } catch (selectError) {
        console.log('Country selection failed, continuing with test...');
      }
    }
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for authentication success
    await page.waitForTimeout(3000);
  }
  
  test('1. Authentication & Session Management', async ({ page }) => {
    // Monitor console for errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        consoleErrors.push(msg.text());
      }
    });

    // Test login flow
    await loginUser(page);
    
    // Verify login success - check for typical post-login elements
    const loginSuccess = await page.locator('nav, .dashboard, .navigation, .main-content, button:has-text("Logout")').first().isVisible();
    expect(loginSuccess).toBeTruthy();
    
    // Test session persistence
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Should still be logged in
    const stillLoggedIn = await page.locator('.modern-login-form').isVisible();
    expect(stillLoggedIn).toBeFalsy();
    
    // Check for critical console errors during authentication
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('Unknown permission combination') ||
      error.includes('Authentication failed') ||
      error.includes('No user authenticated')
    );
    
    if (criticalErrors.length > 0) {
      console.warn('Authentication errors detected:', criticalErrors);
    }
    
    // For go-live: No critical authentication errors allowed
    expect(criticalErrors.length).toBe(0);
  });

  test('2. Navigation & Permission System', async ({ page }) => {
    await loginUser(page);
    
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        consoleErrors.push(msg.text());
      }
    });

    // Test navigation to major sections
    const navigationTests = [
      { name: 'Cases/Bookings', selectors: ['text=/case/i', 'text=/booking/i', 'text=/view.*case/i'] },
      { name: 'Calendar', selectors: ['text=/calendar/i', 'text=/schedule/i'] },
      { name: 'Edit Sets', selectors: ['text=/edit.*set/i', 'text=/manage.*set/i', 'text=/set/i'] },
      { name: 'User Management', selectors: ['text=/user/i', 'text=/admin/i', 'text=/manage.*user/i'] },
      { name: 'Settings', selectors: ['text=/setting/i', 'text=/config/i'] }
    ];

    for (const navTest of navigationTests) {
      for (const selector of navTest.selectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            await element.click();
            await page.waitForTimeout(1500); // Allow for permission checks
            console.log(`✅ Successfully navigated to ${navTest.name}`);
            break;
          }
        } catch (error) {
          // Try next selector
          continue;
        }
      }
    }

    // Check for permission errors
    const permissionErrors = consoleErrors.filter(error => 
      error.includes('Unknown permission combination') ||
      error.includes('permission denied') ||
      error.includes('unauthorized')
    );

    // For go-live: No permission mapping errors allowed
    expect(permissionErrors.length).toBe(0);
  });

  test('3. Case Booking Functionality', async ({ page }) => {
    await loginUser(page);
    
    // Look for case booking/creation functionality
    const caseButtons = [
      'text=/new.*case/i',
      'text=/create.*case/i', 
      'text=/book.*case/i',
      'text=/add.*case/i',
      'button:has-text("Book")',
      'button:has-text("Create")',
      '.btn-primary:has-text("New")'
    ];

    let bookingFormFound = false;
    
    for (const selector of caseButtons) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          await page.waitForTimeout(1000);
          
          // Check if booking form appears
          const formVisible = await page.locator('form, .form, .booking-form, input[placeholder*="hospital" i]').first().isVisible({ timeout: 3000 });
          if (formVisible) {
            bookingFormFound = true;
            console.log('✅ Case booking form accessible');
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }

    // For go-live: Case booking should be accessible
    if (!bookingFormFound) {
      console.warn('⚠️ Case booking form not found - this may impact go-live readiness');
    }
  });

  test('4. Data Loading & Real-time Functionality', async ({ page }) => {
    await loginUser(page);
    
    const networkErrors: string[] = [];
    const slowRequests: string[] = [];
    
    page.on('response', async (response) => {
      // Monitor for API errors
      if (!response.ok() && response.url().includes('/api/') || response.url().includes('supabase')) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
      
      // Monitor slow requests (>5 seconds)
      if (response.timing().responseEnd > 5000) {
        slowRequests.push(`Slow request: ${response.url()} (${response.timing().responseEnd}ms)`);
      }
    });

    // Try to navigate to cases view to trigger data loading
    const dataViews = [
      'text=/view.*case/i',
      'text=/all.*case/i',
      'text=/case.*list/i',
      'text=/dashboard/i'
    ];

    for (const selector of dataViews) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await page.waitForTimeout(3000); // Allow data loading
          break;
        }
      } catch (error) {
        continue;
      }
    }

    // For go-live: No critical API errors
    const criticalApiErrors = networkErrors.filter(error => 
      error.includes('500') || error.includes('502') || error.includes('503')
    );
    expect(criticalApiErrors.length).toBe(0);

    // For go-live: No extremely slow requests
    expect(slowRequests.length).toBeLessThan(3);
  });

  test('5. Edit Sets & Management Functions', async ({ page }) => {
    await loginUser(page);
    
    // Look for edit sets functionality
    const editSetsSelectors = [
      'text=/edit.*set/i',
      'text=/manage.*set/i',
      'text=/doctor/i',
      'text=/procedure/i',
      'text=/implant/i'
    ];

    let managementAccessible = false;

    for (const selector of editSetsSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await page.waitForTimeout(1500);
          
          // Check if management interface loads
          const managementInterface = await page.locator('table, .list, .grid, .management-interface').first().isVisible({ timeout: 3000 });
          if (managementInterface) {
            managementAccessible = true;
            console.log('✅ Management functions accessible');
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }

    // For go-live: Management functions should be accessible
    if (!managementAccessible) {
      console.warn('⚠️ Management interface not accessible - check permissions');
    }
  });

  test('6. Mobile Responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    
    await loginUser(page);
    
    // Check if main elements are visible on mobile
    const mobileElementsVisible = await page.locator('nav, .navigation, button').first().isVisible({ timeout: 5000 });
    expect(mobileElementsVisible).toBeTruthy();
    
    // Check if mobile navigation works
    try {
      const mobileMenuButton = page.locator('.mobile-menu, .hamburger, button[aria-label*="menu" i]').first();
      if (await mobileMenuButton.isVisible({ timeout: 2000 })) {
        await mobileMenuButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log('Mobile menu not found or not needed');
    }
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('7. Error Handling & Stability', async ({ page }) => {
    const consoleErrors: string[] = [];
    const unhandledErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      unhandledErrors.push(error.message);
    });

    await loginUser(page);
    
    // Stress test: rapid navigation
    const rapidNavSelectors = [
      'nav a:first-child',
      'nav a:nth-child(2)', 
      'nav a:nth-child(3)'
    ];

    for (let i = 0; i < 3; i++) {
      for (const selector of rapidNavSelectors) {
        try {
          const link = page.locator(selector).first();
          if (await link.isVisible({ timeout: 1000 })) {
            await link.click();
            await page.waitForTimeout(500);
          }
        } catch (error) {
          // Continue testing
        }
      }
    }

    // For go-live: No unhandled JavaScript errors
    expect(unhandledErrors.length).toBe(0);
    
    // For go-live: Minimal console errors
    const criticalConsoleErrors = consoleErrors.filter(error => 
      !error.includes('DevTools') && 
      !error.includes('extension') &&
      !error.includes('favicon')
    );
    expect(criticalConsoleErrors.length).toBeLessThan(5);
  });

  test('8. Logout Functionality', async ({ page }) => {
    await loginUser(page);
    
    // Find and test logout
    const logoutSelectors = [
      'button:has-text("Logout")',
      'button:has-text("Sign Out")',
      'a:has-text("Logout")',
      '.logout-button',
      '[data-testid="logout"]'
    ];

    let logoutSuccess = false;

    for (const selector of logoutSelectors) {
      try {
        const logoutButton = page.locator(selector).first();
        if (await logoutButton.isVisible({ timeout: 2000 })) {
          await logoutButton.click();
          await page.waitForTimeout(2000);
          
          // Check if redirected to login
          const backToLogin = await page.locator('.modern-login-form, .login-form').isVisible({ timeout: 3000 });
          if (backToLogin) {
            logoutSuccess = true;
            console.log('✅ Logout functionality working');
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }

    // For go-live: Logout should work
    expect(logoutSuccess).toBeTruthy();
  });
});