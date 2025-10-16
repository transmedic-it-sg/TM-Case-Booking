import { test, expect } from '@playwright/test';

// Test configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3002';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

test.describe('Critical Bug Fixes E2E Tests', () => {
  // Helper function to login as admin
  async function loginAsAdmin(page) {
    await page.goto(TEST_URL);
    await page.fill('input[name="username"]', ADMIN_USERNAME);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  }

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('1. System Settings', () => {
    test('should save system settings without JSON errors', async ({ page }) => {
      // Navigate to System Settings
      await page.click('button:has-text("Settings")');
      await page.click('text=System Settings');
      
      // Wait for settings form to load
      await page.waitForSelector('.system-settings-form', { timeout: 5000 });
      
      // Modify a setting
      const cacheTimeoutInput = await page.locator('input[name="cacheTimeout"]');
      await cacheTimeoutInput.clear();
      await cacheTimeoutInput.fill('600');
      
      // Save settings
      await page.click('button:has-text("Save Settings")');
      
      // Verify success message
      await expect(page.locator('.notification-success')).toContainText(/Settings saved/i, { timeout: 5000 });
      
      // Reload page and verify setting persisted
      await page.reload();
      await page.click('button:has-text("Settings")');
      await page.click('text=System Settings');
      await page.waitForSelector('.system-settings-form', { timeout: 5000 });
      
      const savedValue = await page.locator('input[name="cacheTimeout"]').inputValue();
      expect(savedValue).toBe('600');
    });

    test('should display maintenance mode immediately for non-admin users', async ({ page, context }) => {
      // Enable maintenance mode as admin
      await page.click('button:has-text("Settings")');
      await page.click('text=System Settings');
      await page.waitForSelector('.system-settings-form', { timeout: 5000 });
      
      const maintenanceToggle = await page.locator('input[name="maintenanceMode"]');
      await maintenanceToggle.check();
      await page.click('button:has-text("Save Settings")');
      
      // Wait for save confirmation
      await expect(page.locator('.notification-success')).toContainText(/Settings saved/i, { timeout: 5000 });
      
      // Open new page as non-admin user
      const newPage = await context.newPage();
      await newPage.goto(TEST_URL);
      await newPage.fill('input[name="username"]', 'user');
      await newPage.fill('input[type="password"]', 'user123');
      await newPage.click('button[type="submit"]');
      
      // Should see maintenance mode modal within 2 seconds
      await expect(newPage.locator('.maintenance-modal')).toBeVisible({ timeout: 2000 });
      
      // Clean up - disable maintenance mode
      await maintenanceToggle.uncheck();
      await page.click('button:has-text("Save Settings")');
      await newPage.close();
    });
  });

  test.describe('2. User Management', () => {
    test('should delete user without foreign key errors', async ({ page }) => {
      // Navigate to User Management
      await page.click('text=User Management');
      await page.waitForSelector('.user-list', { timeout: 5000 });
      
      // Find a test user to delete (not admin)
      const testUserRow = await page.locator('tr:has-text("testuser")').first();
      if (await testUserRow.count() > 0) {
        // Click delete button
        await testUserRow.locator('button.delete-user').click();
        
        // Confirm deletion
        await page.click('button:has-text("Confirm Delete")');
        
        // Verify success message
        await expect(page.locator('.notification-success')).toContainText(/User deleted/i, { timeout: 5000 });
        
        // Verify user is removed from list
        await expect(page.locator('tr:has-text("testuser")')).toHaveCount(0);
      }
    });
  });

  test.describe('3. Code Tables - Department Deletion', () => {
    test('should delete department from country-specific code table', async ({ page }) => {
      // Navigate to Code Tables
      await page.click('text=Code Tables');
      await page.waitForSelector('.code-tables-container', { timeout: 5000 });
      
      // Select a country
      await page.selectOption('select[name="country"]', 'Singapore');
      
      // Find departments section
      const departmentsSection = await page.locator('.code-table-section:has-text("Departments")');
      
      // Add a test department first
      await departmentsSection.locator('button:has-text("Add")').click();
      await page.fill('input[placeholder="Enter department name"]', 'Test Department E2E');
      await page.click('button:has-text("Save")');
      
      // Now delete it
      const testDeptItem = await departmentsSection.locator('.department-item:has-text("Test Department E2E")');
      await testDeptItem.locator('button.delete-department').click();
      
      // Confirm deletion
      await page.click('button:has-text("Confirm")');
      
      // Verify department is removed
      await expect(departmentsSection.locator(':has-text("Test Department E2E")')).toHaveCount(0);
      
      // Refresh page and verify it's still gone
      await page.reload();
      await page.selectOption('select[name="country"]', 'Singapore');
      await expect(departmentsSection.locator(':has-text("Test Department E2E")')).toHaveCount(0);
    });
  });

  test.describe('4. Booking Calendar RPC', () => {
    test('should load calendar without RPC errors', async ({ page }) => {
      // Navigate to Booking Calendar
      await page.click('text=Booking Calendar');
      
      // Wait for calendar to load
      await page.waitForSelector('.booking-calendar', { timeout: 5000 });
      
      // Switch to usage view
      await page.click('button:has-text("Usage View")');
      
      // Should not have any error messages
      await expect(page.locator('.error-message')).toHaveCount(0);
      
      // Calendar should display properly
      await expect(page.locator('.calendar-grid')).toBeVisible();
      
      // Check console for RPC errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('get_daily_usage')) {
          consoleErrors.push(msg.text());
        }
      });
      
      // Wait a bit for any console errors to appear
      await page.waitForTimeout(2000);
      expect(consoleErrors).toHaveLength(0);
    });
  });

  test.describe('5. Multi-Select Dropdown Border Colors', () => {
    test('should display correct border color #20b2aa', async ({ page }) => {
      // Navigate to a page with multi-select dropdown
      await page.click('text=Cases');
      await page.click('button:has-text("Filters")');
      
      // Find a multi-select dropdown
      const multiSelect = await page.locator('.custom-multi-select').first();
      await multiSelect.click();
      
      // Check border color on hover
      const triggerElement = await multiSelect.locator('.multi-select-trigger');
      await triggerElement.hover();
      
      const borderColor = await triggerElement.evaluate(el => {
        return window.getComputedStyle(el).borderColor;
      });
      
      // Convert rgb to hex and check
      expect(borderColor).toMatch(/rgb\(32,\s*178,\s*170\)/i); // #20b2aa in RGB
    });
  });

  test.describe('6. Mobile Status Colors', () => {
    test('should not display status colors in mobile view', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });
      
      // Navigate to Cases
      await page.click('text=Cases');
      await page.waitForSelector('.cases-list', { timeout: 5000 });
      
      // Check status badges
      const statusBadges = await page.locator('.case-status .status-text').first();
      
      if (await statusBadges.count() > 0) {
        const backgroundColor = await statusBadges.evaluate(el => {
          return window.getComputedStyle(el).backgroundColor;
        });
        
        // Should be gray (#f0f0f0) not colored
        expect(backgroundColor).toMatch(/rgb\(240,\s*240,\s*240\)/i);
      }
      
      // Check case card headers
      const caseCardHeader = await page.locator('.case-card-header').first();
      if (await caseCardHeader.count() > 0) {
        const headerBg = await caseCardHeader.evaluate(el => {
          return window.getComputedStyle(el).background;
        });
        
        // Should not contain gradient
        expect(headerBg).not.toContain('gradient');
      }
    });
  });

  test.describe('7. Sales Approval Text', () => {
    test('should display "Sales Approved" instead of "Sales Approval"', async ({ page }) => {
      // Navigate to Status Legend
      await page.click('button:has-text("Status Legend")');
      
      // Check for correct text
      await expect(page.locator('.status-legend')).toContainText('Sales Approved');
      await expect(page.locator('.status-legend')).not.toContainText('Sales Approval');
      
      // Check in cases list
      await page.click('text=Cases');
      
      // Find a case with Order Prepared status
      const orderPreparedCase = await page.locator('.case-card:has-text("Order Prepared")').first();
      
      if (await orderPreparedCase.count() > 0) {
        await orderPreparedCase.hover();
        // Tooltip should say "Submit for Sales Approved"
        await expect(page.locator('.tooltip:has-text("Submit for Sales Approved")')).toBeVisible();
      }
    });
  });

  test.describe('8. Data Export/Import', () => {
    test('should export and import data correctly', async ({ page }) => {
      // Navigate to Data Management
      await page.click('text=Data Management');
      await page.waitForSelector('.data-export-import', { timeout: 5000 });
      
      // Export data
      await page.click('button:has-text("Export All Data")');
      
      // Wait for download
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("Download")')
      ]);
      
      // Verify download
      expect(download).toBeTruthy();
      const fileName = download.suggestedFilename();
      expect(fileName).toContain('tm-case-booking-export');
      expect(fileName).toContain('.json');
      
      // Test import (using the same file)
      const filePath = await download.path();
      if (filePath) {
        await page.setInputFiles('input[type="file"]', filePath);
        await page.click('button:has-text("Import Data")');
        
        // Verify success message
        await expect(page.locator('.notification-success')).toContainText(/Data imported/i, { timeout: 5000 });
      }
    });
  });

  test.describe('9. Performance Tests', () => {
    test('should load cases list quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.click('text=Cases');
      await page.waitForSelector('.cases-list', { timeout: 5000 });
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle rapid status updates', async ({ page }) => {
      await page.click('text=Cases');
      await page.waitForSelector('.cases-list', { timeout: 5000 });
      
      // Find cases with different statuses
      const cases = await page.locator('.case-card').all();
      
      if (cases.length > 0) {
        // Rapidly update multiple cases
        for (let i = 0; i < Math.min(3, cases.length); i++) {
          const caseCard = cases[i];
          const statusButton = await caseCard.locator('.status-update-button').first();
          
          if (await statusButton.count() > 0) {
            await statusButton.click();
            // Don't wait for response, immediately proceed
          }
        }
        
        // All updates should complete without errors
        await page.waitForTimeout(2000);
        await expect(page.locator('.error-message')).toHaveCount(0);
      }
    });
  });
});

// Run specific critical path test
test.describe('Critical User Journey', () => {
  test('should complete full case booking workflow', async ({ page }) => {
    await loginAsAdmin(page);
    
    // 1. Create new case
    await page.click('text=New Case');
    await page.waitForSelector('.case-form', { timeout: 5000 });
    
    // Fill case details
    await page.selectOption('select[name="country"]', 'Singapore');
    await page.selectOption('select[name="hospital"]', { index: 1 });
    await page.selectOption('select[name="department"]', { index: 1 });
    await page.fill('input[name="patientName"]', 'Test Patient E2E');
    await page.fill('input[name="dateOfSurgery"]', '2025-02-01');
    
    // Submit case
    await page.click('button:has-text("Submit Case")');
    
    // Verify success
    await expect(page.locator('.notification-success')).toContainText(/Case created/i, { timeout: 5000 });
    
    // 2. Update case status
    await page.click('text=Cases');
    const newCase = await page.locator('.case-card:has-text("Test Patient E2E")').first();
    
    if (await newCase.count() > 0) {
      // Update to Order Preparation
      await newCase.locator('button:has-text("Prepare Order")').click();
      await page.click('button:has-text("Confirm")');
      
      // Verify status updated
      await expect(newCase.locator('.status-text')).toContainText('Preparing Order');
    }
    
    // 3. Check audit log
    await page.click('text=Audit Logs');
    await page.waitForSelector('.audit-logs-table', { timeout: 5000 });
    
    // Should see the case creation and status update
    await expect(page.locator('.audit-log-entry:has-text("Case Created")')).toBeVisible();
    await expect(page.locator('.audit-log-entry:has-text("Status Updated")')).toBeVisible();
  });
});