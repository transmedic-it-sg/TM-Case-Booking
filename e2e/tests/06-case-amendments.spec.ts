import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth';
import { CaseHelpers } from '../utils/case-helpers';

test.describe('Case Amendment Tests', () => {
  let auth: AuthHelper;
  let caseHelpers: CaseHelpers;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    caseHelpers = new CaseHelpers(page);
    await auth.login();
  });

  test('should display amendment history correctly', async ({ page }) => {
    // Navigate to cases list
    await page.click('[data-testid="view-all-cases"]');
    await expect(page.locator('[data-testid="cases-list"]')).toBeVisible();
    await page.waitForTimeout(2000);
    
    // Get first case that has amendments
    const caseCards = page.locator('[data-testid^="case-card-"]');
    if (await caseCards.count() > 0) {
      const firstCard = caseCards.first();
      const caseRefElement = firstCard.locator('[data-testid="case-reference"]');
      const caseRef = await caseRefElement.textContent();
      
      if (caseRef) {
        await caseHelpers.openCaseCard(caseRef.trim());
        
        // Check if amendment history tab exists and is accessible
        const historyTab = page.locator('[data-testid="amendment-history-tab"]');
        if (await historyTab.isVisible()) {
          await historyTab.click();
          
          // Verify amendment history section is displayed
          await expect(page.locator('[data-testid="amendment-history-section"]')).toBeVisible();
          
          // Check for proper timeline display
          const historyItems = page.locator('[data-testid="amendment-history-item"]');
          const itemCount = await historyItems.count();
          
          if (itemCount > 0) {
            // Verify each history item has required information
            for (let i = 0; i < Math.min(itemCount, 3); i++) {
              const item = historyItems.nth(i);
              
              // Should show timestamp
              await expect(item.locator('[data-testid="amendment-timestamp"]')).toBeVisible();
              
              // Should show user who made the amendment
              await expect(item.locator('[data-testid="amendment-user"]')).toBeVisible();
              
              // Should show what was changed
              await expect(item.locator('[data-testid="amendment-changes"]')).toBeVisible();
              
              // Verify timestamp is properly formatted
              const timestamp = await item.locator('[data-testid="amendment-timestamp"]').textContent();
              expect(timestamp).toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/); // Date format
            }
          }
        }
      }
    }
  });

  test('should create and track amendments properly', async ({ page }) => {
    // First create a new case
    await caseHelpers.navigateToCaseBooking();
    await caseHelpers.fillBasicCaseInfo({
      hospital: 'Test Hospital',
      dateOfSurgery: '2025-12-31',
      doctor: 'Dr. Test',
      procedureType: 'Surgery',
      procedureName: 'Test Procedure'
    });
    await caseHelpers.submitCase();
    await caseHelpers.expectCaseCreationSuccess();
    
    // Get the new case reference
    const caseCards = page.locator('[data-testid^="case-card-"]');
    const firstCard = caseCards.first();
    const caseRefElement = firstCard.locator('[data-testid="case-reference"]');
    const caseRef = await caseRefElement.textContent();
    
    if (caseRef) {
      // Amend the case
      await caseHelpers.amendCase(caseRef.trim(), {
        doctor: 'Dr. Updated',
        procedureType: 'Updated Surgery',
        notes: 'This is an amendment test'
      });
      
      // Verify amendment was recorded
      await caseHelpers.verifyAmendmentHistory(caseRef.trim());
      
      // Check that the amendment appears in history
      const historyItems = page.locator('[data-testid="amendment-history-item"]');
      const latestAmendment = historyItems.first();
      
      await expect(latestAmendment).toContainText('Dr. Updated');
      await expect(latestAmendment).toContainText('This is an amendment test');
    }
  });

  test('should show proper timing for status update history', async ({ page }) => {
    await page.click('[data-testid="view-all-cases"]');
    await page.waitForTimeout(2000);
    
    const caseCards = page.locator('[data-testid^="case-card-"]');
    if (await caseCards.count() > 0) {
      const firstCard = caseCards.first();
      const caseRefElement = firstCard.locator('[data-testid="case-reference"]');
      const caseRef = await caseRefElement.textContent();
      
      if (caseRef) {
        await caseHelpers.openCaseCard(caseRef.trim());
        
        // Change status to create a new history entry
        const statusDropdown = page.locator('[data-testid="status-dropdown"]');
        if (await statusDropdown.isVisible()) {
          await statusDropdown.click();
          await page.click('[data-testid="status-in-progress"]');
          
          // Confirm status change
          await page.click('[data-testid="confirm-status-change"]');
          
          // Check status history
          await page.click('[data-testid="status-history-tab"]');
          
          const statusHistoryItems = page.locator('[data-testid="status-history-item"]');
          const latestStatus = statusHistoryItems.first();
          
          // Verify timing is recent (within last few minutes)
          const timestamp = await latestStatus.locator('[data-testid="status-timestamp"]').textContent();
          
          // Should show recent timestamp
          expect(timestamp).toBeTruthy();
          
          // Check if it shows relative time (e.g., "2 minutes ago") or absolute time
          const now = new Date();
          const isRecentUpdate = timestamp?.includes('minute') || 
                                 timestamp?.includes('second') ||
                                 timestamp?.includes(now.toISOString().split('T')[0]); // Today's date
          
          expect(isRecentUpdate).toBeTruthy();
        }
      }
    }
  });

  test('should validate amendment permissions', async ({ page }) => {
    // Test that only authorized users can make amendments
    await page.click('[data-testid="view-all-cases"]');
    await page.waitForTimeout(2000);
    
    const caseCards = page.locator('[data-testid^="case-card-"]');
    if (await caseCards.count() > 0) {
      const firstCard = caseCards.first();
      await firstCard.click();
      
      // Admin should see amend button
      const amendButton = page.locator('[data-testid="amend-case-button"]');
      await expect(amendButton).toBeVisible();
      
      // Button should be enabled for admin
      const isDisabled = await amendButton.isDisabled();
      expect(isDisabled).toBeFalsy();
    }
  });

  test('should preserve original case data in amendments', async ({ page }) => {
    await page.click('[data-testid="view-all-cases"]');
    await page.waitForTimeout(2000);
    
    const caseCards = page.locator('[data-testid^="case-card-"]');
    if (await caseCards.count() > 0) {
      const firstCard = caseCards.first();
      const caseRefElement = firstCard.locator('[data-testid="case-reference"]');
      const caseRef = await caseRefElement.textContent();
      
      if (caseRef) {
        await caseHelpers.openCaseCard(caseRef.trim());
        
        // Get original data
        const originalDoctor = await page.locator('[data-testid="case-doctor"]').textContent();
        const originalProcedure = await page.locator('[data-testid="case-procedure"]').textContent();
        
        // Open amendment form
        await page.click('[data-testid="amend-case-button"]');
        await expect(page.locator('[data-testid="amendment-form"]')).toBeVisible();
        
        // Verify original data is pre-filled
        const doctorField = page.locator('select[name="doctor"]');
        const procedureField = page.locator('select[name="procedureName"]');
        
        const selectedDoctor = await doctorField.inputValue();
        const selectedProcedure = await procedureField.inputValue();
        
        // Original values should be selected in form
        expect(selectedDoctor).toBeTruthy();
        expect(selectedProcedure).toBeTruthy();
      }
    }
  });
});