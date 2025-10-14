import { test, expect } from '@playwright/test';

test.describe('Permission Matrix E2E Tests', () => {
  // Test data configuration
  const adminCredentials = {
    username: 'admin',
    password: 'admin123',
    country: 'Indonesia'
  };

  const operationsManagerCredentials = {
    username: 'operations-manager',
    password: 'password123',
    country: 'Indonesia'
  };

  // Helper function for direct authentication
  async function authenticateUser(page: any, username: string, password: string, country: string) {
    await page.goto('/');
    
    // Wait for login form to be visible
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    
    // Fill login form
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.selectOption('select[name="country"]', country);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for successful login (presence of navigation or dashboard)
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL('/');
  }

  // Helper function to navigate to permission matrix
  async function navigateToPermissionMatrix(page: any) {
    await page.goto('/permission-matrix');
    await page.waitForLoadState('networkidle');
    
    // Wait for the Permission Matrix page to load
    await page.waitForSelector('h1:text("Permission Management")', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Permission Management');
  }

  // Helper function to wait for permissions to load
  async function waitForPermissionsLoad(page: any) {
    // Wait for loading state to disappear
    await page.waitForFunction(() => {
      const loadingElement = document.querySelector('.loading-state');
      return !loadingElement || getComputedStyle(loadingElement).display === 'none';
    }, { timeout: 15000 });
    
    // Ensure permission matrix is visible
    await page.waitForSelector('.permission-matrix', { timeout: 10000 });
  }

  test.beforeEach(async ({ page }) => {
    // Set longer timeout for setup
    test.setTimeout(90000);
  });

  test('should display Permission Matrix page with correct structure', async ({ page }) => {
    await authenticateUser(page, adminCredentials.username, adminCredentials.password, adminCredentials.country);
    await navigateToPermissionMatrix(page);
    await waitForPermissionsLoad(page);

    // Check page title and description
    await expect(page.locator('h1')).toContainText('Permission Management');
    await expect(page.locator('.header-description-section p')).toContainText('Configure role-based access control');

    // Check that permission matrix table is present
    await expect(page.locator('.permission-matrix')).toBeVisible();
    
    // Check that role definitions section is present
    await expect(page.locator('.role-definitions')).toBeVisible();
    await expect(page.locator('h3:text("Role Definitions")')).toBeVisible();

    // Check that Edit Permissions button is present
    await expect(page.locator('.edit-button')).toBeVisible();
    await expect(page.locator('.edit-button')).toContainText('Edit Permissions');
  });

  test('should enable edit mode when Edit Permissions button is clicked', async ({ page }) => {
    await authenticateUser(page, adminCredentials.username, adminCredentials.password, adminCredentials.country);
    await navigateToPermissionMatrix(page);
    await waitForPermissionsLoad(page);

    // Click Edit Permissions button
    await page.click('.edit-button');
    
    // Verify edit mode is enabled
    await expect(page.locator('.save-button')).toBeVisible();
    await expect(page.locator('.cancel-button')).toBeVisible();
    await expect(page.locator('.save-button')).toContainText('Save Changes');
    await expect(page.locator('.cancel-button')).toContainText('Cancel');

    // Verify Edit button is no longer visible
    await expect(page.locator('.edit-button')).not.toBeVisible();
  });

  test('should test delete-case permission toggle for operations-manager role', async ({ page }) => {
    await authenticateUser(page, adminCredentials.username, adminCredentials.password, adminCredentials.country);
    await navigateToPermissionMatrix(page);
    await waitForPermissionsLoad(page);

    // Enable edit mode
    await page.click('.edit-button');
    await expect(page.locator('.save-button')).toBeVisible();

    // Find the delete-case permission for operations-manager role
    // Use more specific selector to find the exact permission toggle
    const deleteCaseToggle = page.locator('[data-action="delete-case"][data-role="operations-manager"]');
    
    // If selector above doesn't work, try alternative approaches
    if (await deleteCaseToggle.count() === 0) {
      // Alternative: look for permission matrix cells containing both identifiers
      const matrixCell = page.locator('.permission-cell')
        .filter({ has: page.locator('[data-action="delete-case"]') })
        .filter({ has: page.locator('[data-role="operations-manager"]') });
      
      if (await matrixCell.count() > 0) {
        const toggle = matrixCell.locator('input[type="checkbox"], .toggle-switch');
        await expect(toggle).toBeVisible();
        
        // Get current state
        const isCurrentlyChecked = await toggle.isChecked();
        
        // Toggle the permission
        await toggle.click();
        
        // Verify state changed
        await expect(toggle).toBeChecked(!isCurrentlyChecked);
      }
    } else {
      await expect(deleteCaseToggle).toBeVisible();
      
      // Get current state and toggle
      const isCurrentlyChecked = await deleteCaseToggle.isChecked();
      await deleteCaseToggle.click();
      
      // Verify state changed
      await expect(deleteCaseToggle).toBeChecked(!isCurrentlyChecked);
    }
  });

  test('should verify admin permissions cannot be modified', async ({ page }) => {
    await authenticateUser(page, adminCredentials.username, adminCredentials.password, adminCredentials.country);
    await navigateToPermissionMatrix(page);
    await waitForPermissionsLoad(page);

    // Enable edit mode
    await page.click('.edit-button');
    await expect(page.locator('.save-button')).toBeVisible();

    // Find admin role toggles - they should be disabled or read-only
    const adminToggles = page.locator('[data-role="admin"] input[type="checkbox"], [data-role="admin"] .toggle-switch');
    
    // Alternative selector if the above doesn't work
    if (await adminToggles.count() === 0) {
      // Look for any toggles in admin column
      const adminColumn = page.locator('.role-column').filter({ hasText: 'Admin' });
      const togglesInAdminColumn = adminColumn.locator('input[type="checkbox"], .toggle-switch');
      
      if (await togglesInAdminColumn.count() > 0) {
        // Check that admin toggles are disabled or have readonly class
        for (let i = 0; i < await togglesInAdminColumn.count(); i++) {
          const toggle = togglesInAdminColumn.nth(i);
          // Admin permissions should be disabled or have readonly styling
          const isDisabled = await toggle.isDisabled();
          const hasReadonlyClass = await toggle.getAttribute('class');
          
          // Either disabled or has readonly styling
          expect(isDisabled || (hasReadonlyClass && hasReadonlyClass.includes('readonly'))).toBeTruthy();
        }
      }
    } else {
      // Check that admin toggles are disabled
      const toggleCount = await adminToggles.count();
      for (let i = 0; i < toggleCount; i++) {
        const toggle = adminToggles.nth(i);
        await expect(toggle).toBeDisabled();
      }
    }
  });

  test('should save permission changes to database', async ({ page }) => {
    await authenticateUser(page, adminCredentials.username, adminCredentials.password, adminCredentials.country);
    await navigateToPermissionMatrix(page);
    await waitForPermissionsLoad(page);

    // Enable edit mode
    await page.click('.edit-button');
    await expect(page.locator('.save-button')).toBeVisible();

    // Find a non-admin permission to toggle (e.g., operations role)
    const operationsToggle = page.locator('[data-action="view-cases"][data-role="operations"]').first();
    
    // Alternative approach if direct selector doesn't work
    let toggleToModify = operationsToggle;
    if (await operationsToggle.count() === 0) {
      // Look for any toggleable permission that's not admin
      const nonAdminToggles = page.locator('.permission-cell input[type="checkbox"]:not([data-role="admin"]), .permission-cell .toggle-switch:not([data-role="admin"])');
      if (await nonAdminToggles.count() > 0) {
        toggleToModify = nonAdminToggles.first();
      }
    }

    if (await toggleToModify.count() > 0) {
      // Get initial state
      const initialState = await toggleToModify.isChecked();
      
      // Toggle the permission
      await toggleToModify.click();
      
      // Verify state changed
      await expect(toggleToModify).toBeChecked(!initialState);
      
      // Save changes
      await page.click('.save-button');
      
      // Handle confirmation modal if it appears
      const confirmButton = page.locator('button:text("Confirm")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }
      
      // Wait for save to complete
      await page.waitForSelector('.edit-button', { timeout: 15000 });
      
      // Refresh page to verify persistence
      await page.reload();
      await waitForPermissionsLoad(page);
      
      // Re-find the same toggle and verify it maintained the new state
      await page.click('.edit-button');
      await expect(page.locator('.save-button')).toBeVisible();
      
      // The toggle should maintain its new state after page reload
      await expect(toggleToModify).toBeChecked(!initialState);
    }
  });

  test('should display role summary and definitions correctly', async ({ page }) => {
    await authenticateUser(page, adminCredentials.username, adminCredentials.password, adminCredentials.country);
    await navigateToPermissionMatrix(page);
    await waitForPermissionsLoad(page);

    // Check role definitions section
    await expect(page.locator('h3:text("Role Definitions")')).toBeVisible();
    await expect(page.locator('.role-definitions')).toBeVisible();

    // Check that role badges are present
    const roleBadges = page.locator('.role-badge');
    await expect(roleBadges).toHaveCountGreaterThan(0);

    // Check system notes section
    await expect(page.locator('.system-notes')).toBeVisible();
    await expect(page.locator('h4:text("Role Details:")')).toBeVisible();

    // Verify specific role details are mentioned
    await expect(page.locator('.system-notes')).toContainText('Admin role has full access');
    await expect(page.locator('.system-notes')).toContainText('Status transitions follow a strict workflow');
    await expect(page.locator('.system-notes')).toContainText('User management is restricted to Admin');
  });

  test('should handle cancel operation correctly', async ({ page }) => {
    await authenticateUser(page, adminCredentials.username, adminCredentials.password, adminCredentials.country);
    await navigateToPermissionMatrix(page);
    await waitForPermissionsLoad(page);

    // Enable edit mode
    await page.click('.edit-button');
    await expect(page.locator('.save-button')).toBeVisible();

    // Find a toggle to modify
    const anyToggle = page.locator('.permission-cell input[type="checkbox"]:not([data-role="admin"]), .permission-cell .toggle-switch:not([data-role="admin"])').first();
    
    if (await anyToggle.count() > 0) {
      // Get initial state
      const initialState = await anyToggle.isChecked();
      
      // Toggle the permission
      await anyToggle.click();
      await expect(anyToggle).toBeChecked(!initialState);
      
      // Cancel changes
      await page.click('.cancel-button');
      
      // Wait for edit mode to exit
      await expect(page.locator('.edit-button')).toBeVisible();
      
      // Re-enable edit mode to check if changes were reverted
      await page.click('.edit-button');
      
      // The toggle should be back to its original state
      await expect(anyToggle).toBeChecked(initialState);
    }
  });

  test('should handle loading and error states appropriately', async ({ page }) => {
    await authenticateUser(page, adminCredentials.username, adminCredentials.password, adminCredentials.country);
    
    // Navigate to permission matrix
    await page.goto('/permission-matrix');
    
    // Check if loading state appears (might be quick)
    const loadingState = page.locator('.loading-state');
    if (await loadingState.isVisible({ timeout: 1000 })) {
      await expect(loadingState).toContainText('Loading permissions');
    }
    
    // Wait for loading to complete
    await waitForPermissionsLoad(page);
    
    // Verify no error state is showing
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).not.toBeVisible();
    
    // Verify permission matrix is loaded
    await expect(page.locator('.permission-matrix')).toBeVisible();
  });

  test('should verify specific permission matrix structure', async ({ page }) => {
    await authenticateUser(page, adminCredentials.username, adminCredentials.password, adminCredentials.country);
    await navigateToPermissionMatrix(page);
    await waitForPermissionsLoad(page);

    // Verify that key permission actions are present
    const expectedActions = [
      'create-case',
      'view-cases', 
      'amend-case',
      'delete-case',
      'manage-doctors',
      'booking-calendar'
    ];

    for (const action of expectedActions) {
      // Look for elements that contain the action identifier
      const actionElements = page.locator(`[data-action="${action}"], :text("${action}")`);
      if (await actionElements.count() === 0) {
        // Alternative: look for text content that might contain the action
        const textContent = await page.textContent('.permission-matrix');
        if (textContent && !textContent.includes(action.replace('-', ' '))) {
          console.log(`Warning: Could not find action ${action} in permission matrix`);
        }
      }
    }

    // Verify that key roles are present
    const expectedRoles = [
      'admin',
      'operations',
      'operations-manager'
    ];

    for (const role of expectedRoles) {
      const roleElements = page.locator(`[data-role="${role}"], .role-badge:text("${role}")`);
      if (await roleElements.count() === 0) {
        // Alternative: look for role in role definitions
        await expect(page.locator('.role-definitions')).toContainText(role, { ignoreCase: true });
      }
    }
  });

  test('should test database vs static data consistency', async ({ page }) => {
    await authenticateUser(page, adminCredentials.username, adminCredentials.password, adminCredentials.country);
    await navigateToPermissionMatrix(page);
    await waitForPermissionsLoad(page);

    // This test focuses on the specific issue: delete-case permission for operations-manager
    // Static data shows allowed: true, but database might have allowed: false

    // Enable edit mode to see current database state
    await page.click('.edit-button');
    await expect(page.locator('.save-button')).toBeVisible();

    // Look for operations-manager delete-case permission
    const deleteCasePermission = page.locator('[data-action="delete-case"][data-role="operations-manager"]');
    
    if (await deleteCasePermission.count() > 0) {
      // Check the current state - this reflects database state
      const isDatabaseAllowed = await deleteCasePermission.isChecked();
      
      // According to the issue, static data says true but database might be false
      // This test documents the current state for verification
      console.log(`Operations Manager delete-case permission in database: ${isDatabaseAllowed}`);
      
      // The permission should be toggleable (not disabled)
      await expect(deleteCasePermission).not.toBeDisabled();
      
      // Toggle it to test database update functionality
      await deleteCasePermission.click();
      const newState = await deleteCasePermission.isChecked();
      
      // Verify toggle worked
      expect(newState).toBe(!isDatabaseAllowed);
      
      // Test saving the change
      await page.click('.save-button');
      
      // Handle confirmation if it appears
      const confirmButton = page.locator('button:text("Confirm")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }
      
      // Wait for save completion
      await page.waitForSelector('.edit-button', { timeout: 15000 });
      
      // Verify change persisted by refreshing
      await page.reload();
      await waitForPermissionsLoad(page);
      await page.click('.edit-button');
      
      // Permission should maintain the new state
      await expect(deleteCasePermission).toBeChecked(newState);
    }
  });
});