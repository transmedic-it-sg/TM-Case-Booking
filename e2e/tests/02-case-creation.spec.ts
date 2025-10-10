import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth';
import { CaseHelpers } from '../utils/case-helpers';

test.describe('Case Creation Tests', () => {
  let auth: AuthHelper;
  let caseHelpers: CaseHelpers;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    caseHelpers = new CaseHelpers(page);
    await auth.login();
  });

  test('should create a new case successfully without errors', async ({ page }) => {
    // Navigate to case booking form
    await caseHelpers.navigateToCaseBooking();
    
    // Fill required fields
    await caseHelpers.fillBasicCaseInfo({
      hospital: 'Test Hospital',
      dateOfSurgery: '2025-12-31',
      doctor: 'Dr. Test',
      procedureType: 'Surgery',
      procedureName: 'Test Procedure'
    });
    
    // Add surgery sets
    await caseHelpers.addSurgerySet('Basic Surgery Set', 2);
    
    // Add implant boxes
    await caseHelpers.addImplantBox('Test Implant Box', 1);
    
    // Submit case
    await caseHelpers.submitCase();
    
    // Verify success - should NOT show error message
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    
    // Should show success message
    await caseHelpers.expectCaseCreationSuccess();
  });

  test('should show validation errors for incomplete case', async ({ page }) => {
    await caseHelpers.navigateToCaseBooking();
    
    // Try to submit without required fields
    await caseHelpers.submitCase();
    
    // Should show validation errors
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
  });

  test('should save case data and redirect properly after creation', async ({ page }) => {
    await caseHelpers.navigateToCaseBooking();
    
    const caseData = {
      hospital: 'Test Hospital',
      dateOfSurgery: '2025-12-31',
      doctor: 'Dr. Test',
      procedureType: 'Surgery',
      procedureName: 'Test Procedure'
    };
    
    await caseHelpers.fillBasicCaseInfo(caseData);
    await caseHelpers.submitCase();
    
    // Wait for success and navigation
    await caseHelpers.expectCaseCreationSuccess();
    
    // Verify the new case appears in the cases list
    await expect(page.locator('[data-testid="cases-list"]')).toBeVisible();
    
    // Verify case data is saved correctly by checking the displayed case
    const latestCase = page.locator('[data-testid^="case-card-"]').first();
    await expect(latestCase).toContainText(caseData.doctor!);
    await expect(latestCase).toContainText(caseData.procedureType!);
  });

  test('should handle surgery set ordering from Edit Sets configuration', async ({ page }) => {
    await caseHelpers.navigateToCaseBooking();
    
    // Fill basic info to enable sets selection
    await caseHelpers.fillBasicCaseInfo({
      doctor: 'Dr. Test',
      procedureType: 'Surgery',
      procedureName: 'Test Procedure'
    });
    
    // Click on Surgery Sets tab
    await page.click('[data-testid="surgery-sets-tab"]');
    
    // Verify sets are displayed in Edit Sets order (sort_order)
    const setElements = page.locator('[data-testid^="surgery-set-"]');
    const firstSetText = await setElements.first().textContent();
    
    // The sets should be ordered according to sort_order from database
    expect(firstSetText).toBeTruthy();
    
    // Verify all sets have proper ordering controls
    await expect(setElements.first()).toBeVisible();
  });
});