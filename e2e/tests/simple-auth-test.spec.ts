import { test, expect } from '@playwright/test';

test.describe('Simple Authentication Test', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try different possible input selectors for username
    const usernameSelectors = [
      'input[name="username"]',
      'input[placeholder*="username" i]', 
      'input[placeholder*="user" i]',
      'input[type="text"]',
      'input[id*="username"]',
      'input[id*="user"]'
    ];
    
    let usernameFound = false;
    for (const selector of usernameSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        console.log(`Found username field with selector: ${selector}`);
        usernameFound = true;
        break;
      }
    }
    
    // Try different possible input selectors for password
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[placeholder*="password" i]',
      'input[id*="password"]'
    ];
    
    let passwordFound = false;
    for (const selector of passwordSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        console.log(`Found password field with selector: ${selector}`);
        passwordFound = true;
        break;
      }
    }
    
    if (!usernameFound || !passwordFound) {
      // Take a screenshot for debugging
      await page.screenshot({ path: 'debug-login-page.png', fullPage: true });
      
      // Log all visible input elements
      const allInputs = page.locator('input');
      const inputCount = await allInputs.count();
      console.log(`Total input elements found: ${inputCount}`);
      
      for (let i = 0; i < inputCount; i++) {
        const input = allInputs.nth(i);
        const name = await input.getAttribute('name');
        const type = await input.getAttribute('type');
        const placeholder = await input.getAttribute('placeholder');
        console.log(`Input ${i}: name="${name}", type="${type}", placeholder="${placeholder}"`);
      }
      
      // Log page content for debugging
      const pageContent = await page.content();
      console.log('Page content length:', pageContent.length);
      console.log('Page title:', await page.title());
    }
    
    expect(usernameFound).toBe(true);
    expect(passwordFound).toBe(true);
  });
});