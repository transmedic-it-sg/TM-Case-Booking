import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth';

test.describe('Mobile Responsiveness Tests', () => {
  let auth: AuthHelper;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
  });

  test('should display mobile notification dropdown correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await auth.login();
    
    // Check if notification dropdown is properly styled on mobile
    const notificationButton = page.locator('[data-testid="notification-button"]');
    await expect(notificationButton).toBeVisible();
    
    // Click to open dropdown
    await notificationButton.click();
    
    const notificationDropdown = page.locator('[data-testid="notification-dropdown"]');
    await expect(notificationDropdown).toBeVisible();
    
    // Check mobile-specific styling
    const dropdownRect = await notificationDropdown.boundingBox();
    expect(dropdownRect?.width).toBeLessThan(400); // Should fit mobile screen
    
    // Check for proper mobile padding and margins
    const computedStyle = await notificationDropdown.evaluate(el => {
      return window.getComputedStyle(el);
    });
    
    // Should have appropriate mobile spacing
    expect(parseInt(computedStyle.padding || '0')).toBeGreaterThan(8);
  });

  test('should move status colors to More section on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await auth.login();
    
    // Navigate to cases list
    await page.click('[data-testid="view-all-cases"]');
    await expect(page.locator('[data-testid="cases-list"]')).toBeVisible();
    
    // Check if More section is visible on mobile
    const moreSection = page.locator('[data-testid="more-section"]');
    await expect(moreSection).toBeVisible();
    
    // Click to expand More section
    await moreSection.click();
    
    // Status colors should be inside More section on mobile
    const statusColors = page.locator('[data-testid="status-colors"]');
    await expect(statusColors).toBeVisible();
    
    // Verify it's inside the More section
    const statusInMore = moreSection.locator('[data-testid="status-colors"]');
    await expect(statusInMore).toBeVisible();
  });

  test('should fix mobile modal padding issues', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await auth.login();
    
    // Open a modal (case details)
    await page.click('[data-testid="view-all-cases"]');
    await page.waitForTimeout(1000);
    
    const caseCards = page.locator('[data-testid^="case-card-"]');
    if (await caseCards.count() > 0) {
      await caseCards.first().click();
      
      // Check modal is visible
      const modal = page.locator('[data-testid="case-modal"]');
      await expect(modal).toBeVisible();
      
      // Check modal padding on mobile
      const modalRect = await modal.boundingBox();
      const viewportWidth = 375;
      
      // Modal should not be full width, should have some margin
      expect(modalRect?.width).toBeLessThan(viewportWidth - 20);
      
      // Check content padding
      const modalContent = modal.locator('[data-testid="modal-content"]');
      const contentStyle = await modalContent.evaluate(el => {
        return window.getComputedStyle(el);
      });
      
      // Should have proper mobile padding
      expect(parseInt(contentStyle.padding || '0')).toBeGreaterThan(12);
    }
  });

  test('should display properly on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await auth.login();
    
    // Check main navigation is properly laid out
    const mainNav = page.locator('[data-testid="main-navigation"]');
    await expect(mainNav).toBeVisible();
    
    // Check sidebar if exists
    const sidebar = page.locator('[data-testid="sidebar"]');
    if (await sidebar.isVisible()) {
      const sidebarRect = await sidebar.boundingBox();
      expect(sidebarRect?.width).toBeLessThan(400); // Reasonable tablet sidebar width
    }
    
    // Check cases grid layout on tablet
    await page.click('[data-testid="view-all-cases"]');
    const casesGrid = page.locator('[data-testid="cases-grid"]');
    
    if (await casesGrid.isVisible()) {
      const gridStyle = await casesGrid.evaluate(el => {
        return window.getComputedStyle(el);
      });
      
      // Should use appropriate grid layout for tablet
      expect(gridStyle.display).toBe('grid');
    }
  });

  test('should handle touch interactions correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await auth.login();
    
    // Test touch interaction with case cards
    await page.click('[data-testid="view-all-cases"]');
    await page.waitForTimeout(1000);
    
    const caseCards = page.locator('[data-testid^="case-card-"]');
    if (await caseCards.count() > 0) {
      const firstCard = caseCards.first();
      
      // Simulate touch tap
      await firstCard.tap();
      
      // Should respond to touch interaction
      const modal = page.locator('[data-testid="case-modal"]');
      await expect(modal).toBeVisible();
      
      // Test swipe gestures if implemented
      const swipeArea = page.locator('[data-testid="swipe-area"]');
      if (await swipeArea.isVisible()) {
        // Simulate swipe
        const box = await swipeArea.boundingBox();
        if (box) {
          await page.mouse.move(box.x + 10, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
          await page.mouse.up();
        }
      }
    }
  });
});