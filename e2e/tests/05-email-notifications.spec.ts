import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth';
import { CaseHelpers } from '../utils/case-helpers';

test.describe('Email Notification Tests', () => {
  let auth: AuthHelper;
  let caseHelpers: CaseHelpers;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    caseHelpers = new CaseHelpers(page);
    await auth.login();
  });

  test('should configure email settings as admin', async ({ page }) => {
    // Navigate to email configuration
    await page.click('[data-testid="admin-menu"]');
    await page.click('[data-testid="email-config-link"]');
    
    // Should be able to access email config page
    await expect(page.locator('[data-testid="email-config-form"]')).toBeVisible();
    
    // Test SMTP configuration fields
    const smtpHost = page.locator('input[name="smtpHost"]');
    const smtpPort = page.locator('input[name="smtpPort"]');
    const smtpUser = page.locator('input[name="smtpUser"]');
    const smtpPassword = page.locator('input[name="smtpPassword"]');
    
    await expect(smtpHost).toBeVisible();
    await expect(smtpPort).toBeVisible();
    await expect(smtpUser).toBeVisible();
    await expect(smtpPassword).toBeVisible();
    
    // Fill email configuration
    await smtpHost.fill('smtp.gmail.com');
    await smtpPort.fill('587');
    await smtpUser.fill('test@example.com');
    await smtpPassword.fill('testpassword');
    
    // Save configuration
    await page.click('[data-testid="save-email-config"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should send email notifications on case status change', async ({ page }) => {
    // Create a new case first
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
    
    // Get the case reference
    const caseCards = page.locator('[data-testid^="case-card-"]');
    const firstCard = caseCards.first();
    const caseRefElement = firstCard.locator('[data-testid="case-reference"]');
    const caseRef = await caseRefElement.textContent();
    
    if (caseRef) {
      // Open case and change status
      await caseHelpers.openCaseCard(caseRef.trim());
      
      // Change case status
      await page.click('[data-testid="status-dropdown"]');
      await page.click('[data-testid="status-in-progress"]');
      
      // Confirm status change
      await page.click('[data-testid="confirm-status-change"]');
      
      // Should trigger email notification
      // Check for notification indicator or message
      const emailNotification = page.locator('[data-testid="email-sent-indicator"]');
      await expect(emailNotification).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle email template configuration', async ({ page }) => {
    await page.click('[data-testid="admin-menu"]');
    await page.click('[data-testid="email-config-link"]');
    
    // Navigate to email templates section
    await page.click('[data-testid="email-templates-tab"]');
    
    // Should show template editor
    await expect(page.locator('[data-testid="email-template-editor"]')).toBeVisible();
    
    // Test different template types
    const statusChangeTemplate = page.locator('[data-testid="status-change-template"]');
    const newCaseTemplate = page.locator('[data-testid="new-case-template"]');
    
    if (await statusChangeTemplate.isVisible()) {
      await statusChangeTemplate.click();
      
      const templateEditor = page.locator('[data-testid="template-content"]');
      await expect(templateEditor).toBeVisible();
      
      // Test template variables
      const templateContent = await templateEditor.textContent();
      expect(templateContent).toContain('{{caseReference}}');
      expect(templateContent).toContain('{{status}}');
    }
  });

  test('should validate email addresses in notification settings', async ({ page }) => {
    await page.click('[data-testid="admin-menu"]');
    await page.click('[data-testid="email-config-link"]');
    
    // Go to notification settings
    await page.click('[data-testid="notification-settings-tab"]');
    
    // Add invalid email address
    const emailInput = page.locator('input[name="notificationEmail"]');
    await emailInput.fill('invalid-email');
    
    await page.click('[data-testid="add-email-button"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="email-validation-error"]')).toBeVisible();
    
    // Add valid email
    await emailInput.fill('valid@example.com');
    await page.click('[data-testid="add-email-button"]');
    
    // Should add successfully
    await expect(page.locator('[data-testid="email-list"]')).toContainText('valid@example.com');
  });

  test('should test email connectivity', async ({ page }) => {
    await page.click('[data-testid="admin-menu"]');
    await page.click('[data-testid="email-config-link"]');
    
    // Test email connection
    await page.click('[data-testid="test-email-connection"]');
    
    // Should show connection test result
    await expect(page.locator('[data-testid="connection-test-result"]')).toBeVisible({ timeout: 15000 });
    
    const result = await page.locator('[data-testid="connection-test-result"]').textContent();
    expect(result).toMatch(/(Success|Error|Failed)/);
  });

  test('should queue and retry failed email notifications', async ({ page }) => {
    // This test checks the email queue functionality
    await page.click('[data-testid="admin-menu"]');
    await page.click('[data-testid="email-queue-monitor"]');
    
    // Should show email queue status
    await expect(page.locator('[data-testid="email-queue-table"]')).toBeVisible();
    
    // Check for failed emails if any exist
    const failedEmails = page.locator('[data-testid="failed-email-row"]');
    const failedCount = await failedEmails.count();
    
    if (failedCount > 0) {
      // Test retry functionality
      await failedEmails.first().locator('[data-testid="retry-email-button"]').click();
      
      // Should show retry confirmation
      await expect(page.locator('[data-testid="retry-confirmation"]')).toBeVisible();
    }
    
    // Check queue statistics
    const queueStats = page.locator('[data-testid="queue-statistics"]');
    await expect(queueStats).toBeVisible();
    await expect(queueStats).toContainText(/Pending:|Sent:|Failed:/);
  });
});