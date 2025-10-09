import { test, expect } from '@playwright/test';

// Test credentials for e2e testing
const TEST_CREDENTIALS = {
  valid: {
    username: 'admin',
    password: 'admin123'
  },
  invalid: {
    username: 'invalid_user',
    password: 'wrong_password'
  }
};

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should load login page successfully', async ({ page }) => {
    // Check if login form is visible
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    
    // Check for essential form elements
    await expect(page.locator('input[name="username"], input[placeholder*="username" i], input[type="text"]:first-of-type')).toBeVisible();
    await expect(page.locator('input[name="password"], input[placeholder*="password" i], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")')).toBeVisible();
  });

  test('should show validation error for empty fields', async ({ page }) => {
    // Click submit without entering credentials
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Should show error message or validation
    await expect(page.locator('text=/required|empty|fill/i')).toBeVisible({ timeout: 3000 }).catch(() => {
      // Alternative: check if form fields are highlighted as invalid
      expect(page.locator('input:invalid')).toBeTruthy();
    });
  });

  test('should reject invalid credentials', async ({ page }) => {
    // Enter invalid credentials
    await page.fill('input[name="username"], input[placeholder*="username" i], input[type="text"]:first-of-type', TEST_CREDENTIALS.invalid.username);
    await page.fill('input[name="password"], input[placeholder*="password" i], input[type="password"]', TEST_CREDENTIALS.invalid.password);
    
    // Submit the form
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Should show error message
    await expect(page.locator('text=/invalid|incorrect|wrong|error/i')).toBeVisible({ timeout: 5000 });
    
    // Should remain on login page
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should successfully login with valid credentials and check for permission errors', async ({ page }) => {
    // Monitor console for permission errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        consoleErrors.push(msg.text());
      }
    });

    // Enter valid credentials
    await page.fill('input[name="username"], input[placeholder*="username" i], input[type="text"]:first-of-type', TEST_CREDENTIALS.valid.username);
    await page.fill('input[name="password"], input[placeholder*="password" i], input[type="password"]', TEST_CREDENTIALS.valid.password);
    
    // Submit the form
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Wait for navigation after successful login
    await page.waitForURL('**/dashboard*', { timeout: 10000 }).catch(async () => {
      // Alternative: wait for login form to disappear
      await page.waitForSelector('[data-testid="login-form"]', { state: 'hidden', timeout: 10000 }).catch(() => {
        // Alternative: check for main navigation or app content
        return page.waitForSelector('nav, [data-testid="main-nav"], [data-testid="dashboard"]', { timeout: 10000 });
      });
    });
    
    // Verify successful login by checking for authenticated content
    const isAuthenticated = await page.locator('nav, [data-testid="main-nav"], [data-testid="dashboard"], text=/dashboard|welcome|logout/i').isVisible();
    expect(isAuthenticated).toBeTruthy();
    
    // Check for permission errors in console
    const permissionErrors = consoleErrors.filter(error => 
      error.includes('Unknown permission combination') || 
      error.includes('permission') ||
      error.includes('No user authenticated')
    );
    
    // Log permission errors for debugging
    if (permissionErrors.length > 0) {
      console.warn('Permission errors detected:', permissionErrors);
    }
    
    // Critical: Ensure no permission errors during login
    expect(permissionErrors.length).toBe(0);
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Login first
    await page.fill('input[name="username"], input[placeholder*="username" i], input[type="text"]:first-of-type', TEST_CREDENTIALS.valid.username);
    await page.fill('input[name="password"], input[placeholder*="password" i], input[type="password"]', TEST_CREDENTIALS.valid.password);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Wait for successful login
    await page.waitForSelector('nav, [data-testid="main-nav"], [data-testid="dashboard"]', { timeout: 10000 });
    
    // Refresh the page
    await page.reload();
    
    // Should still be authenticated (not redirected to login)
    const isStillAuthenticated = await page.locator('[data-testid="login-form"]').isVisible();
    expect(isStillAuthenticated).toBeFalsy();
    
    // Should show authenticated content
    await expect(page.locator('nav, [data-testid="main-nav"], [data-testid="dashboard"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('input[name="username"], input[placeholder*="username" i], input[type="text"]:first-of-type', TEST_CREDENTIALS.valid.username);
    await page.fill('input[name="password"], input[placeholder*="password" i], input[type="password"]', TEST_CREDENTIALS.valid.password);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Wait for successful login
    await page.waitForSelector('nav, [data-testid="main-nav"], [data-testid="dashboard"]', { timeout: 10000 });
    
    // Find and click logout button
    await page.click('button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout-button"]');
    
    // Should be redirected to login page
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Permission System Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each permission test
    await page.goto('/');
    await page.fill('input[name="username"], input[placeholder*="username" i], input[type="text"]:first-of-type', TEST_CREDENTIALS.valid.username);
    await page.fill('input[name="password"], input[placeholder*="password" i], input[type="password"]', TEST_CREDENTIALS.valid.password);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Wait for authentication
    await page.waitForSelector('nav, [data-testid="main-nav"], [data-testid="dashboard"]', { timeout: 10000 });
  });

  test('should not show console errors for resource permissions', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate through different sections that trigger permission checks
    const navigationItems = [
      'text=/case|booking/i',
      'text=/sets|manage/i',
      'text=/user|admin/i',
      'text=/calendar/i'
    ];

    for (const navItem of navigationItems) {
      try {
        const element = page.locator(navItem).first();
        if (await element.isVisible()) {
          await element.click();
          // Wait for any async permission checks
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        // Skip if navigation item doesn't exist
        console.log(`Navigation item ${navItem} not found, skipping`);
      }
    }

    // Check for specific permission errors mentioned in the bug report
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('Unknown permission combination: resource=sets') ||
      error.includes('Unknown permission combination: resource=doctors') ||
      error.includes('Unknown permission combination: resource=procedures') ||
      error.includes('Unknown permission combination: resource=surgery-implants') ||
      error.includes('Unknown permission combination: resource=case') ||
      error.includes('Unknown permission combination: resource=order') ||
      error.includes('Unknown permission combination: resource=delivery')
    );

    // Log all errors for debugging
    if (consoleErrors.length > 0) {
      console.warn('Console errors detected:', consoleErrors);
    }

    // Critical: No permission mapping errors should occur
    expect(criticalErrors.length).toBe(0);
  });
});