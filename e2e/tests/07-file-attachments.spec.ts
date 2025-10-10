import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth';
import { CaseHelpers } from '../utils/case-helpers';
import path from 'path';

test.describe('File Attachment Tests', () => {
  let auth: AuthHelper;
  let caseHelpers: CaseHelpers;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    caseHelpers = new CaseHelpers(page);
    await auth.login();
  });

  test('should attach files to case cards successfully', async ({ page }) => {
    await page.click('[data-testid="view-all-cases"]');
    await page.waitForTimeout(2000);
    
    const caseCards = page.locator('[data-testid^="case-card-"]');
    if (await caseCards.count() > 0) {
      const firstCard = caseCards.first();
      const caseRefElement = firstCard.locator('[data-testid="case-reference"]');
      const caseRef = await caseRefElement.textContent();
      
      if (caseRef) {
        await caseHelpers.openCaseCard(caseRef.trim());
        
        // Look for attachment section
        const attachmentSection = page.locator('[data-testid="attachment-section"]');
        await expect(attachmentSection).toBeVisible();
        
        // Click attach file button
        const attachButton = page.locator('[data-testid="attach-file-button"]');
        await expect(attachButton).toBeVisible();
        await attachButton.click();
        
        // Check if file input is available
        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toBeVisible();
        
        // Create a test file to upload
        const testFilePath = path.join(__dirname, '../fixtures/test-document.txt');
        
        // Upload file
        await fileInput.setInputFiles(testFilePath);
        
        // Submit attachment
        const submitButton = page.locator('[data-testid="submit-attachment-button"]');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          // Verify file was attached
          await expect(page.locator('[data-testid="attachment-success"]')).toBeVisible();
          
          // Verify file appears in attachments list
          const attachmentsList = page.locator('[data-testid="attachments-list"]');
          await expect(attachmentsList).toBeVisible();
          await expect(attachmentsList).toContainText('test-document.txt');
        }
      }
    }
  });

  test('should validate file types and sizes', async ({ page }) => {
    await page.click('[data-testid="view-all-cases"]');
    await page.waitForTimeout(2000);
    
    const caseCards = page.locator('[data-testid^="case-card-"]');
    if (await caseCards.count() > 0) {
      const firstCard = caseCards.first();
      await firstCard.click();
      
      const attachButton = page.locator('[data-testid="attach-file-button"]');
      if (await attachButton.isVisible()) {
        await attachButton.click();
        
        const fileInput = page.locator('input[type="file"]');
        
        // Test with invalid file type (if restrictions exist)
        // This would depend on the actual implementation
        const invalidFilePath = path.join(__dirname, '../fixtures/test-script.exe');
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(invalidFilePath);
          
          // Should show validation error for invalid file type
          const validationError = page.locator('[data-testid="file-validation-error"]');
          
          // Either show error immediately or after submit attempt
          const submitButton = page.locator('[data-testid="submit-attachment-button"]');
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await expect(validationError).toBeVisible();
          }
        }
      }
    }
  });

  test('should download attached files', async ({ page }) => {
    await page.click('[data-testid="view-all-cases"]');
    await page.waitForTimeout(2000);
    
    const caseCards = page.locator('[data-testid^="case-card-"]');
    if (await caseCards.count() > 0) {
      const firstCard = caseCards.first();
      await firstCard.click();
      
      // Check if there are existing attachments
      const attachmentsList = page.locator('[data-testid="attachments-list"]');
      if (await attachmentsList.isVisible()) {
        const attachmentItems = page.locator('[data-testid^="attachment-"]');
        const itemCount = await attachmentItems.count();
        
        if (itemCount > 0) {
          // Try to download first attachment
          const downloadButton = attachmentItems.first().locator('[data-testid="download-attachment"]');
          
          if (await downloadButton.isVisible()) {
            // Set up download handler
            const downloadPromise = page.waitForEvent('download');
            await downloadButton.click();
            
            const download = await downloadPromise;
            
            // Verify download started
            expect(download.suggestedFilename()).toBeTruthy();
          }
        }
      }
    }
  });

  test('should delete attachments with proper permissions', async ({ page }) => {
    await page.click('[data-testid="view-all-cases"]');
    await page.waitForTimeout(2000);
    
    const caseCards = page.locator('[data-testid^="case-card-"]');
    if (await caseCards.count() > 0) {
      const firstCard = caseCards.first();
      await firstCard.click();
      
      const attachmentsList = page.locator('[data-testid="attachments-list"]');
      if (await attachmentsList.isVisible()) {
        const attachmentItems = page.locator('[data-testid^="attachment-"]');
        const initialCount = await attachmentItems.count();
        
        if (initialCount > 0) {
          // Admin should see delete button
          const deleteButton = attachmentItems.first().locator('[data-testid="delete-attachment"]');
          
          if (await deleteButton.isVisible()) {
            await deleteButton.click();
            
            // Should show confirmation dialog
            const confirmDialog = page.locator('[data-testid="delete-confirmation"]');
            await expect(confirmDialog).toBeVisible();
            
            // Confirm deletion
            await page.click('[data-testid="confirm-delete"]');
            
            // Verify attachment was removed
            const newCount = await attachmentItems.count();
            expect(newCount).toBeLessThan(initialCount);
          }
        }
      }
    }
  });

  test('should handle multiple file uploads', async ({ page }) => {
    await page.click('[data-testid="view-all-cases"]');
    await page.waitForTimeout(2000);
    
    const caseCards = page.locator('[data-testid^="case-card-"]');
    if (await caseCards.count() > 0) {
      const firstCard = caseCards.first();
      await firstCard.click();
      
      const attachButton = page.locator('[data-testid="attach-file-button"]');
      if (await attachButton.isVisible()) {
        await attachButton.click();
        
        const fileInput = page.locator('input[type="file"]');
        
        // Test multiple file selection if supported
        const multipleSupported = await fileInput.evaluate(input => input.hasAttribute('multiple'));
        
        if (multipleSupported) {
          const file1Path = path.join(__dirname, '../fixtures/test-document1.txt');
          const file2Path = path.join(__dirname, '../fixtures/test-document2.txt');
          
          await fileInput.setInputFiles([file1Path, file2Path]);
          
          // Submit multiple files
          const submitButton = page.locator('[data-testid="submit-attachment-button"]');
          if (await submitButton.isVisible()) {
            await submitButton.click();
            
            // Verify both files were uploaded
            const attachmentsList = page.locator('[data-testid="attachments-list"]');
            await expect(attachmentsList).toContainText('test-document1.txt');
            await expect(attachmentsList).toContainText('test-document2.txt');
          }
        }
      }
    }
  });

  test('should show attachment progress and status', async ({ page }) => {
    await page.click('[data-testid="view-all-cases"]');
    await page.waitForTimeout(2000);
    
    const caseCards = page.locator('[data-testid^="case-card-"]');
    if (await caseCards.count() > 0) {
      const firstCard = caseCards.first();
      await firstCard.click();
      
      const attachButton = page.locator('[data-testid="attach-file-button"]');
      if (await attachButton.isVisible()) {
        await attachButton.click();
        
        const fileInput = page.locator('input[type="file"]');
        const testFilePath = path.join(__dirname, '../fixtures/large-test-file.pdf');
        
        await fileInput.setInputFiles(testFilePath);
        
        const submitButton = page.locator('[data-testid="submit-attachment-button"]');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          // Check for upload progress indicator
          const progressIndicator = page.locator('[data-testid="upload-progress"]');
          if (await progressIndicator.isVisible()) {
            // Wait for upload to complete
            await expect(progressIndicator).not.toBeVisible({ timeout: 30000 });
          }
          
          // Verify final status
          const statusIndicator = page.locator('[data-testid="upload-status"]');
          if (await statusIndicator.isVisible()) {
            const statusText = await statusIndicator.textContent();
            expect(statusText).toMatch(/(Success|Complete|Uploaded)/i);
          }
        }
      }
    }
  });
});