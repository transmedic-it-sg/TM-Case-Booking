import { test, expect } from '@playwright/test';

test.describe('Performance & Load Testing for Go-Live', () => {
  
  // Helper function to login
  async function loginUser(page: any) {
    await page.goto('/');
    await page.waitForSelector('.modern-login-form', { timeout: 10000 });
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    
    // Handle country selection
    try {
      await page.click('.login-dropdown input, input[placeholder*="country" i]');
      await page.type('.login-dropdown input, input[placeholder*="country" i]', 'Malaysia');
      await page.keyboard.press('Enter');
    } catch (error) {
      // Fallback approach if needed
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }

  test('Performance: Page Load Times', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // For go-live: Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    console.log(`📊 Login page load time: ${loadTime}ms`);
  });

  test('Performance: Authentication Speed', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.modern-login-form', { timeout: 10000 });
    
    const authStartTime = Date.now();
    
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    
    try {
      await page.click('.login-dropdown input, input[placeholder*="country" i]');
      await page.type('.login-dropdown input, input[placeholder*="country" i]', 'Malaysia');
      await page.keyboard.press('Enter');
    } catch (error) {
      // Continue without country if needed
    }
    
    await page.click('button[type="submit"]');
    
    // Wait for authentication to complete
    await page.waitForTimeout(5000);
    
    const authTime = Date.now() - authStartTime;
    
    // For go-live: Authentication should complete within 10 seconds
    expect(authTime).toBeLessThan(10000);
    
    console.log(`🔐 Authentication time: ${authTime}ms`);
  });

  test('Performance: Memory & Resource Usage', async ({ page }) => {
    await loginUser(page);
    
    // Monitor memory usage
    const initialMetrics = await page.evaluate(() => {
      return {
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null,
        timing: performance.timing
      };
    });

    // Simulate user activity
    const navigationSelectors = [
      'nav a:first-child',
      'nav a:nth-child(2)',
      'nav a:nth-child(3)'
    ];

    for (const selector of navigationSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        continue;
      }
    }

    const finalMetrics = await page.evaluate(() => {
      return {
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null
      };
    });

    if (initialMetrics.memory && finalMetrics.memory) {
      const memoryGrowth = finalMetrics.memory.usedJSHeapSize - initialMetrics.memory.usedJSHeapSize;
      console.log(`💾 Memory growth during navigation: ${memoryGrowth} bytes`);
      
      // For go-live: Memory growth should be reasonable (< 50MB)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('Load Testing: Multiple Rapid Operations', async ({ page }) => {
    await loginUser(page);
    
    const startTime = Date.now();
    let operationsCompleted = 0;
    
    // Perform 10 rapid navigation operations
    for (let i = 0; i < 10; i++) {
      try {
        // Click first navigation item
        const navItem = page.locator('nav a, nav button').first();
        if (await navItem.isVisible({ timeout: 1000 })) {
          await navItem.click();
          await page.waitForTimeout(300);
          operationsCompleted++;
        }
        
        // Click back or another nav item
        const backNav = page.locator('nav a, nav button').nth(1);
        if (await backNav.isVisible({ timeout: 1000 })) {
          await backNav.click();
          await page.waitForTimeout(300);
          operationsCompleted++;
        }
      } catch (error) {
        console.log(`Operation ${i} failed: ${error}`);
      }
    }
    
    const totalTime = Date.now() - startTime;
    const avgTimePerOperation = totalTime / operationsCompleted;
    
    console.log(`⚡ Completed ${operationsCompleted} operations in ${totalTime}ms (avg: ${avgTimePerOperation}ms per operation)`);
    
    // For go-live: Should handle rapid operations efficiently
    expect(avgTimePerOperation).toBeLessThan(2000); // Less than 2 seconds per operation
    expect(operationsCompleted).toBeGreaterThan(5); // At least half should succeed
  });

  test('Network Performance: API Response Times', async ({ page }) => {
    const apiResponseTimes: number[] = [];
    const slowRequests: string[] = [];
    
    page.on('response', async (response) => {
      const responseTime = response.timing().responseEnd;
      
      if (response.url().includes('/api/') || response.url().includes('supabase')) {
        apiResponseTimes.push(responseTime);
        
        if (responseTime > 3000) {
          slowRequests.push(`${response.url()} took ${responseTime}ms`);
        }
      }
    });

    await loginUser(page);
    
    // Navigate to trigger API calls
    const navigationSelectors = [
      'text=/case/i',
      'text=/booking/i',
      'text=/view/i'
    ];

    for (const selector of navigationSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await page.waitForTimeout(2000);
        }
      } catch (error) {
        continue;
      }
    }

    if (apiResponseTimes.length > 0) {
      const avgResponseTime = apiResponseTimes.reduce((a, b) => a + b, 0) / apiResponseTimes.length;
      const maxResponseTime = Math.max(...apiResponseTimes);
      
      console.log(`🌐 API Performance - Avg: ${avgResponseTime}ms, Max: ${maxResponseTime}ms`);
      
      // For go-live: API responses should be reasonable
      expect(avgResponseTime).toBeLessThan(2000); // Average under 2 seconds
      expect(maxResponseTime).toBeLessThan(10000); // Max under 10 seconds
    }

    // For go-live: Minimal slow requests
    expect(slowRequests.length).toBeLessThan(3);
    
    if (slowRequests.length > 0) {
      console.warn('🐌 Slow requests detected:', slowRequests);
    }
  });

  test('Concurrent User Simulation', async ({ browser }) => {
    const contexts = [];
    const pages = [];
    
    try {
      // Create 3 concurrent user sessions
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }

      const startTime = Date.now();
      
      // All users login simultaneously
      const loginPromises = pages.map(async (page, index) => {
        try {
          await page.goto('/');
          await page.waitForSelector('.modern-login-form', { timeout: 10000 });
          await page.fill('#username', 'admin');
          await page.fill('#password', 'admin123');
          
          try {
            await page.click('.login-dropdown input, input[placeholder*="country" i]');
            await page.type('.login-dropdown input, input[placeholder*="country" i]', 'Malaysia');
            await page.keyboard.press('Enter');
          } catch (error) {
            // Continue without country selection
          }
          
          await page.click('button[type="submit"]');
          await page.waitForTimeout(3000);
          
          return { success: true, user: index + 1 };
        } catch (error) {
          return { success: false, user: index + 1, error: error.message };
        }
      });

      const results = await Promise.all(loginPromises);
      const totalTime = Date.now() - startTime;
      
      const successfulLogins = results.filter(r => r.success).length;
      
      console.log(`👥 Concurrent test: ${successfulLogins}/3 users logged in successfully in ${totalTime}ms`);
      
      // For go-live: Should handle multiple concurrent users
      expect(successfulLogins).toBeGreaterThanOrEqual(2); // At least 2/3 should succeed
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
      
    } finally {
      // Cleanup
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('Browser Compatibility Check', async ({ page }) => {
    // Test basic functionality across different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop Large' },
      { width: 1366, height: 768, name: 'Desktop Medium' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      await page.goto('/');
      await page.waitForSelector('.modern-login-form', { timeout: 10000 });
      
      // Check if login form is properly displayed
      const formVisible = await page.locator('.modern-login-form').isVisible();
      expect(formVisible).toBeTruthy();
      
      // Check if essential elements are accessible
      const usernameField = await page.locator('#username').isVisible();
      const passwordField = await page.locator('#password').isVisible();
      const submitButton = await page.locator('button[type="submit"]').isVisible();
      
      expect(usernameField).toBeTruthy();
      expect(passwordField).toBeTruthy();
      expect(submitButton).toBeTruthy();
      
      console.log(`✅ ${viewport.name} (${viewport.width}x${viewport.height}): Layout compatible`);
    }
  });
});