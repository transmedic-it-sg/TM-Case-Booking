import { test, expect } from '@playwright/test';

test.describe('User Management - Delete Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3002');
    
    // Login as admin
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'Admin@1234');
    await page.click('button:has-text("Login")');
    
    // Wait for dashboard and navigate to User Management
    await page.waitForSelector('text=TM Case Booking System', { timeout: 10000 });
    await page.click('button:has-text("User Management")');
    await page.waitForSelector('h2:has-text("User Management")');
  });

  test('should delete a test user successfully', async ({ page }) => {
    // First create a test user
    await page.click('button:has-text("Add User")');
    await page.waitForSelector('h2:has-text("Add User")');
    
    // Fill in test user details
    const testUsername = `testuser_${Date.now()}`;
    await page.fill('input[placeholder="Enter username"]', testUsername);
    await page.fill('input[placeholder="Enter full name"]', 'Test User For Deletion');
    await page.fill('input[placeholder="Enter email"]', `${testUsername}@test.com`);
    await page.fill('input[placeholder="Enter password"]', 'Test@1234');
    
    // Select role and country
    await page.selectOption('select#role', 'salesperson');
    await page.click('label:has-text("Malaysia")');
    
    // Save the user
    await page.click('button:has-text("Add User"):visible');
    
    // Wait for success notification
    await page.waitForSelector('text=User created successfully', { timeout: 5000 });
    
    // Search for the created user
    await page.fill('input[placeholder="Search by name, username, or email..."]', testUsername);
    
    // Find the user row and click delete
    const userRow = page.locator(`tr:has-text("${testUsername}")`);
    await expect(userRow).toBeVisible();
    
    // Click delete button for this user
    await userRow.locator('button[title="Delete User"]').click();
    
    // Confirm deletion in modal
    await page.waitForSelector('text=Delete User');
    await page.click('button:has-text("Delete User"):visible');
    
    // Wait for success notification
    await page.waitForSelector('text=User deleted successfully', { timeout: 5000 });
    
    // Verify user is no longer in the list
    await page.fill('input[placeholder="Search by name, username, or email..."]', testUsername);
    await expect(userRow).not.toBeVisible();
  });

  test('should handle deletion error gracefully', async ({ page }) => {
    // Try to delete a user that might have dependencies
    // Look for any existing user (not admin)
    const userRows = page.locator('tbody tr');
    const count = await userRows.count();
    
    if (count > 1) { // At least one non-admin user
      // Find a user that's not admin
      for (let i = 0; i < count; i++) {
        const row = userRows.nth(i);
        const username = await row.locator('td:nth-child(2)').textContent();
        
        if (username && username !== 'admin') {
          // Try to delete this user
          const deleteBtn = row.locator('button[title="Delete User"]');
          if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            
            // Confirm deletion
            await page.waitForSelector('text=Delete User');
            await page.click('button:has-text("Delete User"):visible');
            
            // Check for either success or error notification
            await Promise.race([
              page.waitForSelector('text=User deleted successfully', { timeout: 5000 }),
              page.waitForSelector('text=Failed to delete user', { timeout: 5000 })
            ]);
            
            break;
          }
        }
      }
    }
  });
});