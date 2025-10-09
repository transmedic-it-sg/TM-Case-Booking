import { test, expect } from '@playwright/test';

test.describe('Supabase Backend Integration', () => {
  test('should verify Supabase connection and authentication', async ({ page }) => {
    const consoleMessages: string[] = [];
    const networkRequests: string[] = [];
    
    // Monitor console and network
    page.on('console', (msg) => consoleMessages.push(msg.text()));
    page.on('request', (req) => {
      if (req.url().includes('supabase')) {
        networkRequests.push(`${req.method()} ${req.url()}`);
      }
    });

    // Navigate to application
    await page.goto('/');

    // Should make initial Supabase requests
    await page.waitForTimeout(2000);
    
    // Verify Supabase requests are being made
    const authRequests = networkRequests.filter(req => 
      req.includes('/auth/') || 
      req.includes('session') || 
      req.includes('profiles')
    );
    
    expect(authRequests.length).toBeGreaterThan(0);
    
    // Check for Supabase connection errors
    const connectionErrors = consoleMessages.filter(msg => 
      msg.includes('supabase') && 
      (msg.includes('error') || msg.includes('failed') || msg.includes('timeout'))
    );
    
    expect(connectionErrors.length).toBe(0);
  });

  test('should handle permission matrix data correctly', async ({ page }) => {
    const apiErrors: string[] = [];
    
    page.on('response', async (response) => {
      if (response.url().includes('permissions') && !response.ok()) {
        apiErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // Login to trigger permission loading
    await page.goto('/');
    await page.fill('input[name="username"], input[placeholder*="username" i], input[type="text"]:first-of-type', 'admin');
    await page.fill('input[name="password"], input[placeholder*="password" i], input[type="password"]', 'admin123');
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Wait for permission system to load
    await page.waitForTimeout(3000);
    
    // Should not have permission API errors
    expect(apiErrors.length).toBe(0);
  });

  test('should validate real-time functionality', async ({ page }) => {
    const realtimeErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.text().includes('realtime') && (msg.type() === 'error' || msg.type() === 'warn')) {
        realtimeErrors.push(msg.text());
      }
    });

    // Login first
    await page.goto('/');
    await page.fill('input[name="username"], input[placeholder*="username" i], input[type="text"]:first-of-type', 'admin');
    await page.fill('input[name="password"], input[placeholder*="password" i], input[type="password"]', 'admin123');
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Navigate to cases view (triggers real-time subscriptions)
    await page.waitForSelector('nav, [data-testid="main-nav"]', { timeout: 10000 });
    
    // Look for cases/bookings navigation
    try {
      await page.click('text=/case|booking|view all/i');
      await page.waitForTimeout(2000);
    } catch (error) {
      console.log('Cases navigation not found, checking for real-time errors in current view');
    }
    
    // Should not have real-time connection errors
    const criticalRealtimeErrors = realtimeErrors.filter(error => 
      error.includes('subscription failed') ||
      error.includes('connection lost') ||
      error.includes('realtime error')
    );
    
    expect(criticalRealtimeErrors.length).toBe(0);
  });
});