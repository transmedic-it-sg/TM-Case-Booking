import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth';
import { CaseHelpers } from '../utils/case-helpers';

test.describe('Case Display Tests', () => {
  let auth: AuthHelper;
  let caseHelpers: CaseHelpers;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    caseHelpers = new CaseHelpers(page);
    await auth.login();
  });

  test('should display case quantities correctly in case cards', async ({ page }) => {
    // Navigate to cases list
    await page.click('[data-testid="view-all-cases"]');
    await expect(page.locator('[data-testid="cases-list"]')).toBeVisible();
    
    // Wait for cases to load
    await page.waitForTimeout(2000);
    
    // Get the first case card
    const caseCards = page.locator('[data-testid^="case-card-"]');
    await expect(caseCards.first()).toBeVisible();
    
    // Get case reference number
    const firstCard = caseCards.first();
    const caseRefText = await firstCard.locator('[data-testid="case-reference"]').textContent();
    const caseRef = caseRefText?.trim();
    
    if (caseRef) {
      // Verify quantities are displayed and not empty
      await caseHelpers.verifyCaseQuantitiesVisible(caseRef);
      
      // Check specific quantity elements
      const surgerySetQty = firstCard.locator('[data-testid="surgery-set-quantity"]');
      const implantBoxQty = firstCard.locator('[data-testid="implant-box-quantity"]');
      
      // At least one should be visible and contain a number
      const surgeryQtyVisible = await surgerySetQty.isVisible();
      const implantQtyVisible = await implantBoxQty.isVisible();
      
      expect(surgeryQtyVisible || implantQtyVisible).toBeTruthy();
      
      if (surgeryQtyVisible) {
        const qtyText = await surgerySetQty.textContent();
        expect(qtyText).toMatch(/\d+/); // Should contain numbers
      }
      
      if (implantQtyVisible) {
        const qtyText = await implantBoxQty.textContent();
        expect(qtyText).toMatch(/\d+/); // Should contain numbers
      }
    }
  });

  test('should display all case data without undefined values', async ({ page }) => {
    await page.click('[data-testid="view-all-cases"]');
    await expect(page.locator('[data-testid="cases-list"]')).toBeVisible();
    
    // Wait for real-time data to load
    await page.waitForTimeout(3000);
    
    const caseCards = page.locator('[data-testid^="case-card-"]');
    const caseCount = await caseCards.count();
    
    if (caseCount > 0) {
      const firstCard = caseCards.first();
      
      // Check that critical fields are not undefined
      const hospital = firstCard.locator('[data-testid="case-hospital"]');
      const doctor = firstCard.locator('[data-testid="case-doctor"]');
      const procedure = firstCard.locator('[data-testid="case-procedure"]');
      const date = firstCard.locator('[data-testid="case-date"]');
      
      // These elements should exist and have text content
      await expect(hospital).not.toContainText('undefined');
      await expect(doctor).not.toContainText('undefined');
      await expect(procedure).not.toContainText('undefined');
      await expect(date).not.toContainText('undefined');
      
      // Should also not be empty
      await expect(hospital).not.toBeEmpty();
      await expect(doctor).not.toBeEmpty();
      await expect(procedure).not.toBeEmpty();
      await expect(date).not.toBeEmpty();
    }
  });

  test('should filter cases by country correctly', async ({ page }) => {
    await page.click('[data-testid="view-all-cases"]');
    await expect(page.locator('[data-testid="cases-list"]')).toBeVisible();
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check if country filter is working
    const caseCards = page.locator('[data-testid^="case-card-"]');
    const initialCount = await caseCards.count();
    
    // All visible cases should belong to the logged-in user's country
    if (initialCount > 0) {
      for (let i = 0; i < Math.min(initialCount, 3); i++) {
        const card = caseCards.nth(i);
        const countryElement = card.locator('[data-testid="case-country"]');
        
        if (await countryElement.isVisible()) {
          const countryText = await countryElement.textContent();
          // Should be the user's selected country (Indonesia in this case)
          expect(countryText).toContain('Indonesia');
        }
      }
    }
  });

  test('should load cases from real-time service correctly', async ({ page }) => {
    // Navigate to cases and wait for real-time loading
    await page.click('[data-testid="view-all-cases"]');
    await expect(page.locator('[data-testid="cases-list"]')).toBeVisible();
    
    // Monitor network activity for real-time queries
    let realtimeCallMade = false;
    
    page.on('response', response => {
      if (response.url().includes('supabase') && response.url().includes('case_bookings')) {
        realtimeCallMade = true;
      }
    });
    
    // Wait for real-time data
    await page.waitForTimeout(3000);
    
    // Check if cases loaded (either from cache or real-time)
    const loadingElement = page.locator('[data-testid="loading-spinner"]');
    const casesList = page.locator('[data-testid="cases-list"]');
    
    // Loading should complete
    await expect(loadingElement).not.toBeVisible();
    await expect(casesList).toBeVisible();
    
    // Cases should display if any exist
    const caseCards = page.locator('[data-testid^="case-card-"]');
    const hasMessage = page.locator('[data-testid="no-cases-message"]');
    
    // Either should have cases or show "no cases" message
    const caseCount = await caseCards.count();
    if (caseCount === 0) {
      await expect(hasMessage).toBeVisible();
    } else {
      await expect(caseCards.first()).toBeVisible();
    }
  });
});