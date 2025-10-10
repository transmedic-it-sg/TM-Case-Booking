import { Page, expect } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async login(username: string = 'admin', password: string = 'admin123', country: string = 'Indonesia') {
    // Navigate to login page
    await this.page.goto('/');
    
    // Wait for login form to be visible
    await expect(this.page.locator('[data-testid="login-form"]')).toBeVisible();
    
    // Fill login credentials
    await this.page.fill('input[name="username"]', username);
    await this.page.fill('input[name="password"]', password);
    await this.page.selectOption('select[name="country"]', country);
    
    // Submit login
    await this.page.click('button[type="submit"]');
    
    // Wait for successful login (main dashboard)
    await expect(this.page.locator('[data-testid="main-dashboard"]')).toBeVisible({ timeout: 10000 });
    
    // Verify user is logged in by checking for logout button or user menu
    await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible();
  }

  async logout() {
    // Click user menu
    await this.page.click('[data-testid="user-menu"]');
    
    // Click logout
    await this.page.click('[data-testid="logout-button"]');
    
    // Verify redirected to login
    await expect(this.page.locator('[data-testid="login-form"]')).toBeVisible();
  }

  async expectLoggedIn() {
    await expect(this.page.locator('[data-testid="main-dashboard"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible();
  }

  async expectLoggedOut() {
    await expect(this.page.locator('[data-testid="login-form"]')).toBeVisible();
  }
}