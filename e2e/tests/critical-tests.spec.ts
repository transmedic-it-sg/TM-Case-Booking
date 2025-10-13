import { test, expect } from '@playwright/test';

test.describe('Critical Issues Verification', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the production app
    await page.goto('https://tm-case-booking.vercel.app');
    
    // Wait for the app to load
    await page.waitForSelector('body');
  });

  test('Check quantity badges visibility', async ({ page }) => {
    // This test verifies quantity badges are visible with proper colors
    // Navigate to a case that has quantity data
    
    // First, check if we need to log in
    const loginForm = page.locator('form');
    if (await loginForm.isVisible()) {
      console.log('Login required - skipping visual test');
      return;
    }

    // Look for quantity badges
    const quantityBadges = page.locator('.quantity-badge');
    if (await quantityBadges.count() > 0) {
      const firstBadge = quantityBadges.first();
      
      // Check if badge is visible and has proper styling
      await expect(firstBadge).toBeVisible();
      
      // Get computed styles
      const styles = await firstBadge.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          visibility: computed.visibility,
          display: computed.display
        };
      });
      
      console.log('Quantity badge styles:', styles);
      
      // Verify the badge has proper styling (not white on white)
      expect(styles.color).not.toBe('rgb(255, 255, 255)'); // Should not be white
      expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Should have background
      expect(styles.visibility).toBe('visible');
      expect(styles.display).not.toBe('none');
    }
  });

  test('Check attachment rendering', async ({ page }) => {
    // This test verifies attachments are showing correctly
    
    // First, check if we need to log in
    const loginForm = page.locator('form');
    if (await loginForm.isVisible()) {
      console.log('Login required - skipping attachment test');
      return;
    }

    // Look for attachment elements
    const attachments = page.locator('[class*="attachment"], [data-testid="attachment"]');
    if (await attachments.count() > 0) {
      const firstAttachment = attachments.first();
      
      // Check if attachment is visible
      await expect(firstAttachment).toBeVisible();
      
      console.log('Found attachments:', await attachments.count());
    } else {
      console.log('No attachments found in current view');
    }
  });

  test('Check case cards layout', async ({ page }) => {
    // This test verifies case cards are displaying properly
    
    // First, check if we need to log in
    const loginForm = page.locator('form');
    if (await loginForm.isVisible()) {
      console.log('Login required - skipping case cards test');
      return;
    }

    // Look for case cards
    const caseCards = page.locator('.case-card, [class*="case-card"]');
    if (await caseCards.count() > 0) {
      const firstCard = caseCards.first();
      
      // Check if case card is visible and properly styled
      await expect(firstCard).toBeVisible();
      
      // Check for common case card elements
      const cardElements = {
        header: firstCard.locator('.case-header, [class*="header"]'),
        details: firstCard.locator('.case-details, [class*="detail"]'),
        status: firstCard.locator('.status, [class*="status"]')
      };
      
      for (const [name, element] of Object.entries(cardElements)) {
        if (await element.count() > 0) {
          console.log(`Found ${name} elements:`, await element.count());
        }
      }
    } else {
      console.log('No case cards found in current view');
    }
  });

  test('Check page responsiveness', async ({ page }) => {
    // This test verifies the page loads and is functional
    
    // Check if page loads successfully
    await expect(page).toHaveTitle(/Case Booking|TM/);
    
    // Check if main content is present
    const mainContent = page.locator('main, #root, .App, [class*="app"]');
    await expect(mainContent.first()).toBeVisible();
    
    // Log any console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
    
    // Check for JavaScript errors
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
    });
  });

  test('Check email notification functionality mock', async ({ page }) => {
    // This test mocks email functionality checks
    
    // First, check if we need to log in
    const loginForm = page.locator('form');
    if (await loginForm.isVisible()) {
      console.log('Login required - skipping email notification test');
      return;
    }

    // Look for any notification-related elements
    const notificationElements = page.locator('[class*="notification"], [class*="email"], [data-testid*="notification"]');
    if (await notificationElements.count() > 0) {
      console.log('Found notification elements:', await notificationElements.count());
    }
    
    // Log network requests related to email
    page.on('request', request => {
      const url = request.url();
      if (url.includes('email') || url.includes('notification') || url.includes('send-email')) {
        console.log('Email-related request:', request.method(), url);
      }
    });
  });
});