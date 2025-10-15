import { Page, expect } from '@playwright/test';

export interface TestUser {
  username: string;
  password: string;
}

export const TEST_USERS = {
  admin: { username: 'Admin', password: 'admin123' },
  anrong: { username: 'anrong.low', password: 'anrong123' },
  virgil: { username: 'virgil.lee', password: 'virgil123' },
  operations: { username: 'Jasmine Mai', password: 'jasmine123' }
};

export class AuthHelper {
  constructor(private page: Page) {}

  async login(username: string, password: string, country?: string) {
    // Navigate to login page
    await this.page.goto('/');
    
    // Wait for login form
    await this.page.waitForSelector('input#username');
    await this.page.waitForSelector('input[type="password"]');
    
    // Fill credentials
    await this.page.fill('input#username', username);
    await this.page.fill('input[type="password"]', password);
    
    // Select country if provided
    if (country) {
      const countrySelect = this.page.locator('select[name="country"], input[name="country"]');
      if (await countrySelect.isVisible()) {
        await countrySelect.fill(country);
      }
    }
    
    // Submit form
    await this.page.click('button[type="submit"]');
    
    // Wait for successful login
    await this.page.waitForLoadState('networkidle');
  }

  async logout() {
    // Look for logout button/link
    const logoutSelectors = [
      'button:has-text("Logout")',
      'a:has-text("Logout")',
      '[data-testid="logout"]',
      'text=Logout'
    ];
    
    for (const selector of logoutSelectors) {
      const element = this.page.locator(selector);
      if (await element.isVisible()) {
        await element.click();
        await this.page.waitForLoadState('networkidle');
        return;
      }
    }
  }

  async expectLoggedIn() {
    // Check for indicators that user is logged in
    const loginIndicators = [
      'text=Dashboard',
      'text=Book Case',
      'text=Cases',
      '[data-testid="user-menu"]',
      'text=Logout'
    ];
    
    let found = false;
    for (const selector of loginIndicators) {
      const element = this.page.locator(selector);
      if (await element.isVisible()) {
        found = true;
        break;
      }
    }
    
    expect(found).toBe(true);
  }

  async expectLoggedOut() {
    // Should see login form
    await expect(this.page.locator('input#username')).toBeVisible();
    await expect(this.page.locator('input[type="password"]')).toBeVisible();
  }

  async expectError(errorMessage: string) {
    await expect(this.page.locator(`text=${errorMessage}`)).toBeVisible();
  }
}

export async function loginUser(page: Page, user: TestUser) {
  // Navigate to login page
  await page.goto('/');
  
  // Wait for login form
  await page.waitForSelector('input[name="username"]');
  await page.waitForSelector('input[name="password"]');
  
  // Fill credentials
  await page.fill('input[name="username"]', user.username);
  await page.fill('input[name="password"]', user.password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for successful login
  await page.waitForLoadState('networkidle');
}

export async function logout(page: Page) {
  // Look for logout button/link
  const logoutSelectors = [
    'button:has-text("Logout")',
    'a:has-text("Logout")',
    '[data-testid="logout"]',
    'text=Logout'
  ];
  
  for (const selector of logoutSelectors) {
    const element = page.locator(selector);
    if (await element.isVisible()) {
      await element.click();
      await page.waitForLoadState('networkidle');
      return;
    }
  }
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check for indicators that user is logged in
  const loginIndicators = [
    'text=Dashboard',
    'text=Book Case',
    'text=Cases',
    '[data-testid="user-menu"]',
    'text=Logout'
  ];
  
  for (const selector of loginIndicators) {
    if (await page.locator(selector).isVisible()) {
      return true;
    }
  }
  
  return false;
}