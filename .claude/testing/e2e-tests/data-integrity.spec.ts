import { test, expect } from '@playwright/test';

test.describe('Data Integrity & Business Logic Tests for Go-Live', () => {
  
  // Helper function to login
  async function loginUser(page: any) {
    await page.goto('/');
    await page.waitForSelector('.modern-login-form', { timeout: 10000 });
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    
    try {
      await page.click('.login-dropdown input, input[placeholder*="country" i]');
      await page.type('.login-dropdown input, input[placeholder*="country" i]', 'Malaysia');
      await page.keyboard.press('Enter');
    } catch (error) {
      // Continue without country selection if needed
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }

  test('Database Connection & Data Loading', async ({ page }) => {
    const apiCalls: string[] = [];
    const dataLoadErrors: string[] = [];
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('supabase') || url.includes('/api/')) {
        apiCalls.push(`${response.status()} ${url}`);
        
        if (!response.ok()) {
          dataLoadErrors.push(`Failed API call: ${response.status()} ${url}`);
        }
      }
    });

    await loginUser(page);
    
    // Navigate to data-heavy sections to trigger database calls
    const dataViews = [
      'text=/case/i',
      'text=/view/i',
      'text=/list/i',
      'text=/dashboard/i'
    ];

    for (const selector of dataViews) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await page.waitForTimeout(3000); // Allow data loading
          break;
        }
      } catch (error) {
        continue;
      }
    }

    console.log(`📊 Database activity: ${apiCalls.length} API calls made`);
    
    // For go-live: Database should be accessible
    expect(apiCalls.length).toBeGreaterThan(0);
    
    // For go-live: No critical database errors
    expect(dataLoadErrors.length).toBe(0);
    
    if (dataLoadErrors.length > 0) {
      console.error('❌ Database errors detected:', dataLoadErrors);
    }
  });

  test('Form Validation & Data Entry', async ({ page }) => {
    await loginUser(page);
    
    // Look for any form (case booking, edit forms, etc.)
    const formSelectors = [
      'text=/new.*case/i',
      'text=/create/i',
      'text=/add/i',
      'button:has-text("New")',
      'button:has-text("Create")',
      'button:has-text("Add")'
    ];

    let formFound = false;
    
    for (const selector of formSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          await page.waitForTimeout(2000);
          
          // Check if a form appeared
          const formElement = await page.locator('form, .form-container, input[type="text"]:first-of-type').first().isVisible({ timeout: 3000 });
          if (formElement) {
            formFound = true;
            
            // Test form validation by submitting empty form
            const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Submit")').first();
            if (await submitButton.isVisible({ timeout: 2000 })) {
              await submitButton.click();
              await page.waitForTimeout(1000);
              
              // Should show validation errors
              const validationVisible = await page.locator('.error, .invalid, .required, text=/required/i, text=/field/i').first().isVisible({ timeout: 2000 });
              
              if (validationVisible) {
                console.log('✅ Form validation working correctly');
              } else {
                console.warn('⚠️ Form validation may not be working');
              }
            }
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }

    // For go-live: Forms should be accessible
    if (!formFound) {
      console.warn('⚠️ No forms found - this may impact data entry functionality');
    }
  });

  test('Real-time Data Updates', async ({ page }) => {
    await loginUser(page);
    
    const realtimeErrors: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('realtime') || text.includes('subscription')) {
        if (msg.type() === 'error' || msg.type() === 'warn') {
          realtimeErrors.push(text);
        }
      }
    });

    // Navigate to views that should have real-time updates
    const realtimeViews = [
      'text=/case/i',
      'text=/booking/i',
      'text=/dashboard/i',
      'text=/list/i'
    ];

    for (const selector of realtimeViews) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await page.waitForTimeout(3000); // Allow real-time subscriptions to establish
          break;
        }
      } catch (error) {
        continue;
      }
    }

    // For go-live: Real-time system should work without errors
    const criticalRealtimeErrors = realtimeErrors.filter(error => 
      error.includes('failed') || 
      error.includes('error') || 
      error.includes('disconnected')
    );
    
    expect(criticalRealtimeErrors.length).toBe(0);
    
    if (criticalRealtimeErrors.length > 0) {
      console.error('❌ Real-time errors detected:', criticalRealtimeErrors);
    }
  });

  test('User Permissions & Security', async ({ page }) => {
    await loginUser(page);
    
    const permissionErrors: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('permission') || text.includes('unauthorized') || text.includes('forbidden')) {
        permissionErrors.push(text);
      }
    });

    // Try to access various parts of the application
    const protectedAreas = [
      'text=/admin/i',
      'text=/user/i',
      'text=/setting/i',
      'text=/manage/i',
      'text=/edit/i'
    ];

    for (const selector of protectedAreas) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await page.waitForTimeout(1500); // Allow permission checks
        }
      } catch (error) {
        continue;
      }
    }

    // For go-live: No permission system errors
    const criticalPermissionErrors = permissionErrors.filter(error => 
      error.includes('Unknown permission combination') ||
      error.includes('denied') ||
      error.includes('unauthorized')
    );
    
    expect(criticalPermissionErrors.length).toBe(0);
    
    if (criticalPermissionErrors.length > 0) {
      console.error('❌ Permission system errors:', criticalPermissionErrors);
    }
  });

  test('File Upload & Download Functionality', async ({ page }) => {
    await loginUser(page);
    
    // Look for file upload functionality
    const fileInputs = await page.locator('input[type="file"]').count();
    const uploadButtons = await page.locator('button:has-text("Upload"), button:has-text("Attach"), .upload-button').count();
    
    if (fileInputs > 0 || uploadButtons > 0) {
      console.log(`📎 File functionality detected: ${fileInputs} file inputs, ${uploadButtons} upload buttons`);
      
      // Test file input accessibility
      if (fileInputs > 0) {
        const fileInput = page.locator('input[type="file"]').first();
        const isVisible = await fileInput.isVisible();
        
        // File inputs might be hidden but should be accessible
        if (!isVisible) {
          // Check if there's a custom upload button that triggers the file input
          const customUploadButton = page.locator('button:has-text("Upload"), .upload-button').first();
          if (await customUploadButton.isVisible({ timeout: 2000 })) {
            console.log('✅ Custom file upload interface available');
          }
        } else {
          console.log('✅ File input directly accessible');
        }
      }
    } else {
      console.log('📎 No file upload functionality detected');
    }

    // Look for download functionality
    const downloadLinks = await page.locator('a[download], button:has-text("Download"), button:has-text("Export")').count();
    
    if (downloadLinks > 0) {
      console.log(`💾 Download functionality detected: ${downloadLinks} download options`);
    }
  });

  test('Search & Filter Functionality', async ({ page }) => {
    await loginUser(page);
    
    // Look for search and filter capabilities
    const searchElements = await page.locator('input[type="search"], input[placeholder*="search" i], .search-input').count();
    const filterElements = await page.locator('select, .filter, .dropdown, button:has-text("Filter")').count();
    
    console.log(`🔍 Search & Filter: ${searchElements} search inputs, ${filterElements} filter elements`);
    
    if (searchElements > 0) {
      try {
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], .search-input').first();
        if (await searchInput.isVisible({ timeout: 2000 })) {
          await searchInput.fill('test');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(2000);
          console.log('✅ Search functionality accessible');
        }
      } catch (error) {
        console.log('⚠️ Search functionality may have issues');
      }
    }

    if (filterElements > 0) {
      try {
        const filterElement = page.locator('select, .filter-dropdown').first();
        if (await filterElement.isVisible({ timeout: 2000 })) {
          // Try to interact with filter
          await filterElement.click();
          await page.waitForTimeout(1000);
          console.log('✅ Filter functionality accessible');
        }
      } catch (error) {
        console.log('⚠️ Filter functionality may have issues');
      }
    }
  });

  test('Data Export & Reporting', async ({ page }) => {
    await loginUser(page);
    
    // Look for reporting and export functionality
    const reportingElements = [
      'text=/report/i',
      'text=/export/i',
      'text=/download/i',
      'button:has-text("Export")',
      'button:has-text("Report")',
      'a:has-text("Download")'
    ];

    let reportingAvailable = false;
    
    for (const selector of reportingElements) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          reportingAvailable = true;
          await element.click();
          await page.waitForTimeout(1500);
          console.log('✅ Reporting/Export functionality found');
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!reportingAvailable) {
      console.log('📊 No obvious reporting/export functionality detected');
    }
  });

  test('Business Rules & Workflow Validation', async ({ page }) => {
    await loginUser(page);
    
    const workflowErrors: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error' && (
        text.includes('workflow') ||
        text.includes('validation') ||
        text.includes('business rule') ||
        text.includes('constraint')
      )) {
        workflowErrors.push(text);
      }
    });

    // Navigate through typical user workflows
    const workflowSteps = [
      'text=/case/i',
      'text=/booking/i',
      'text=/create/i',
      'text=/edit/i',
      'text=/save/i'
    ];

    for (const selector of workflowSteps) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await page.waitForTimeout(1500);
        }
      } catch (error) {
        continue;
      }
    }

    // For go-live: No critical workflow errors
    expect(workflowErrors.length).toBe(0);
    
    if (workflowErrors.length > 0) {
      console.error('❌ Business workflow errors detected:', workflowErrors);
    }
  });
});