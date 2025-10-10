import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth';

test.describe('Authentication Tests', () => {
  let auth: AuthHelper;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
  });

  test('should login successfully with valid admin credentials', async ({ page }) => {
    await auth.login('admin', 'admin123', 'Indonesia');
    await auth.expectLoggedIn();
    
    // Verify admin has access to admin features
    await expect(page.locator('[data-testid="admin-menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('input[name="username"]', 'invalid');
    await page.fill('input[name="password"]', 'invalid');
    await page.selectOption('select[name="country"]', 'Indonesia');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Should remain on login page
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await auth.login();
    await auth.logout();
    await auth.expectLoggedOut();
  });

  test('should maintain session across page refresh', async ({ page }) => {
    await auth.login();
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await auth.expectLoggedIn();
  });

  test('should handle temporary password change requirement', async ({ page }) => {
    // This test assumes there's a test user with temporary password
    await page.goto('/');
    
    await page.fill('input[name="username"]', 'tempuser');
    await page.fill('input[name="password"]', 'temp123');
    await page.selectOption('select[name="country"]', 'Indonesia');
    await page.click('button[type="submit"]');
    
    // Should redirect to password change page
    await expect(page.locator('[data-testid="password-change-form"]')).toBeVisible();
  });
});