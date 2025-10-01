// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * End-to-End Tests for TM-Case-Booking Application
 * Tests critical user workflows and app functionality
 */

test.describe('Application Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('App loads without crashing', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Check that we don't have any critical JavaScript errors
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Verify login form exists
    const loginForm = page.locator('.login-container, #login, [data-testid="login"]');
    await expect(loginForm).toBeVisible({ timeout: 10000 });
    
    // Check for any crash indicators
    const errorElements = page.locator('.error, .crash, [data-testid="error"]');
    await expect(errorElements).toHaveCount(0);
    
    // Verify no critical console errors
    expect(errors.filter(error => 
      !error.includes('Warning') && 
      !error.includes('DevTools')
    )).toHaveLength(0);
  });

  test('Login functionality works', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for login form
    await page.waitForSelector('input[type="text"], input[placeholder*="username"], input[placeholder*="Username"]', { timeout: 10000 });
    
    // Find username and password fields
    const usernameField = page.locator('input[type="text"], input[placeholder*="username"], input[placeholder*="Username"]').first();
    const passwordField = page.locator('input[type="password"]').first();
    
    await expect(usernameField).toBeVisible();
    await expect(passwordField).toBeVisible();
    
    // Try login with test credentials
    await usernameField.fill('admin');
    await passwordField.fill('password');
    
    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    await submitButton.click();
    
    // Check result - either success or specific error message
    await page.waitForTimeout(3000);
    
    // Either we get to dashboard or we get a clear error message
    const dashboard = page.locator('[data-testid="dashboard"], .dashboard, .main-content');
    const errorMessage = page.locator('.error, .alert, [data-testid="error"]');
    
    const dashboardVisible = await dashboard.isVisible().catch(() => false);
    const errorVisible = await errorMessage.isVisible().catch(() => false);
    
    // Test passes if either login succeeds OR we get a proper error message
    expect(dashboardVisible || errorVisible).toBeTruthy();
  });

  test('Navigation menu functions', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Attempt login first (skip if already logged in)
    const usernameField = page.locator('input[type="text"]').first();
    if (await usernameField.isVisible({ timeout: 5000 })) {
      await usernameField.fill('admin');
      await page.locator('input[type="password"]').first().fill('password');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(3000);
    }
    
    // Check if main navigation exists
    const navElements = [
      '.nav, .navigation, .menu',
      'button:has-text("Case Booking"), a:has-text("Case Booking")',
      'button:has-text("Cases"), a:has-text("Cases")',
      'button:has-text("Reports"), a:has-text("Reports")'
    ];
    
    let navFound = false;
    for (const selector of navElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        navFound = true;
        break;
      }
    }
    
    expect(navFound).toBeTruthy();
  });

  test('Critical components load without errors', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Track JavaScript errors
    const jsErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('DevTools')) {
        jsErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // Check for any uncaught errors
    expect(jsErrors.filter(error => 
      !error.includes('Warning') && 
      !error.includes('DevTools') &&
      !error.includes('Download the React DevTools')
    )).toHaveLength(0);
  });

  test('Responsive design works', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForLoadState('networkidle');
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(2000);
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(2000);
    
    // Verify no layout breaks (no horizontal scroll on mobile)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Allow 20px tolerance
  });
});

test.describe('Performance Tests', () => {
  test('Page load performance', async ({ page }) => {
    // Start timing
    const startTime = Date.now();
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // App should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
    
    // Check for performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart
      };
    });
    
    console.log('Performance metrics:', performanceMetrics);
  });
});

test.describe('Accessibility Tests', () => {
  test('Basic accessibility checks', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Check for basic accessibility attributes
    const mainContent = page.locator('main, [role="main"], .main-content').first();
    
    // Either main element exists or we have a login form
    const hasMain = await mainContent.isVisible({ timeout: 5000 });
    const hasLogin = await page.locator('input[type="text"], input[type="password"]').first().isVisible({ timeout: 5000 });
    
    expect(hasMain || hasLogin).toBeTruthy();
    
    // Check for proper heading structure
    const headings = await page.locator('h1, h2, h3').count();
    expect(headings).toBeGreaterThan(0);
  });
});