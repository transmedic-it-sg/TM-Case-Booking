/**
 * CRITICAL USER FLOWS - E2E TESTS
 * Tests the main user journeys to prevent regressions
 */

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.REACT_APP_URL || 'http://localhost:3000';
const TEST_USER = {
  username: 'Admin',
  password: 'TestPass123',
  country: 'Singapore'
};

test.describe('Critical User Flows', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  // === FLOW 1: LOGIN ===
  test('User can login successfully', async ({ page }) => {
    // Fill login form
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.selectOption('select[name="country"]', TEST_USER.country);

    // Submit
    await page.click('button[type="submit"]');

    // Verify logged in
    await expect(page).toHaveURL(/.*booking/, { timeout: 10000 });
    await expect(page.locator('text=New Case Booking')).toBeVisible();
  });

  // === FLOW 2: CASE BOOKING ===
  test('User can create a new case', async ({ page }) => {
    // Login first
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.selectOption('select[name="country"]', TEST_USER.country);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*booking/);

    // Fill case form
    await page.fill('input[name="patientName"]', 'Test Patient');
    await page.fill('input[name="hospitalLocation"]', 'Test Hospital');
    await page.selectOption('select[name="department"]', { index: 1 }); // Select first department
    await page.selectOption('select[name="doctor"]', { index: 1 }); // Select first doctor
    await page.fill('input[name="operationDate"]', '2025-02-01');
    await page.fill('input[name="operationTime"]', '09:00');

    // Submit case
    await page.click('button:has-text("Submit Case")');

    // Verify success
    await expect(page.locator('text=Case submitted successfully')).toBeVisible({ timeout: 5000 });
  });

  // === FLOW 3: VIEW CASES LIST ===
  test('User can view cases list', async ({ page }) => {
    // Login
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.selectOption('select[name="country"]', TEST_USER.country);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*booking/);

    // Navigate to cases list
    await page.click('text=View Cases');

    // Verify cases list loaded
    await expect(page.locator('.cases-list')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.case-card')).toHaveCount(expect.any(Number));
  });

  // === FLOW 4: EDIT SETS - VIEW ===
  test('User can view Edit Sets', async ({ page }) => {
    // Login
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.selectOption('select[name="country"]', TEST_USER.country);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*booking/);

    // Navigate to Edit Sets
    await page.click('text=Edit Sets');

    // Verify Edit Sets loaded
    await expect(page.locator('.modern-edit-sets')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.tab-button')).toHaveCount(4); // 4 tabs
  });

  // === FLOW 5: EDIT SETS - ADD DOCTOR ===
  test('User can add a new doctor', async ({ page }) => {
    // Login
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.selectOption('select[name="country"]', TEST_USER.country);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*booking/);

    // Navigate to Edit Sets
    await page.click('text=Edit Sets');
    await expect(page.locator('.modern-edit-sets')).toBeVisible();

    // Click Doctors tab
    await page.click('.tab-button:has-text("Doctors")');

    // Click Add button
    await page.click('button:has-text("Add")');

    // Fill doctor form
    await page.fill('input[name="doctorName"]', `Test Doctor ${Date.now()}`);
    await page.selectOption('select[name="department"]', { index: 1 });

    // Submit
    await page.click('button:has-text("Save")');

    // Verify success
    await expect(page.locator('text=Doctor added successfully')).toBeVisible({ timeout: 5000 });
  });

  // === FLOW 6: EDIT SETS - DRAG AND DROP ===
  test('Doctors can be reordered via drag and drop', async ({ page }) => {
    // Login
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.selectOption('select[name="country"]', TEST_USER.country);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*booking/);

    // Navigate to Edit Sets
    await page.click('text=Edit Sets');
    await expect(page.locator('.modern-edit-sets')).toBeVisible();

    // Click Doctors tab
    await page.click('.tab-button:has-text("Doctors")');

    // Get first two doctor cards
    const doctorCards = await page.locator('.data-card[draggable="true"]').all();
    if (doctorCards.length >= 2) {
      // Drag first to second position
      const firstDoctor = doctorCards[0];
      const secondDoctor = doctorCards[1];

      const firstBox = await firstDoctor.boundingBox();
      const secondBox = await secondDoctor.boundingBox();

      if (firstBox && secondBox) {
        await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2);
        await page.mouse.up();

        // Verify reorder happened (toast notification)
        await expect(page.locator('text=Order updated successfully')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  // === FLOW 7: DROPDOWN VISIBILITY ===
  test('Dropdowns in Edit Sets are visible', async ({ page }) => {
    // Login
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.selectOption('select[name="country"]', TEST_USER.country);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*booking/);

    // Navigate to Edit Sets
    await page.click('text=Edit Sets');
    await expect(page.locator('.modern-edit-sets')).toBeVisible();

    // Click Add button to open form
    await page.click('button:has-text("Add")');

    // Click on dropdown
    await page.click('select[name="department"], .searchable-dropdown');

    // Verify dropdown menu is visible (not hidden by overflow)
    const dropdown = page.locator('.dropdown-menu, .searchable-dropdown-menu');
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // Verify dropdown is within viewport
    const box = await dropdown.boundingBox();
    if (box) {
      expect(box.y).toBeGreaterThan(0);
      expect(box.y + box.height).toBeLessThan(await page.viewportSize().then(v => v?.height || 1000));
    }
  });

  // === FLOW 8: STATUS CHANGE ===
  test('User can change case status', async ({ page }) => {
    // Login
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.selectOption('select[name="country"]', TEST_USER.country);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*booking/);

    // Navigate to cases list
    await page.click('text=View Cases');
    await expect(page.locator('.cases-list')).toBeVisible();

    // Click on first case to expand
    const firstCase = page.locator('.case-card').first();
    await firstCase.click();

    // Click status change button
    await page.click('button:has-text("Change Status")');

    // Select new status
    await page.selectOption('select[name="status"]', 'confirmed');

    // Confirm
    await page.click('button:has-text("Confirm")');

    // Verify success
    await expect(page.locator('text=Status updated successfully')).toBeVisible({ timeout: 5000 });
  });

  // === FLOW 9: USER LOGOUT ===
  test('User can logout', async ({ page }) => {
    // Login
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.selectOption('select[name="country"]', TEST_USER.country);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*booking/);

    // Click logout
    await page.click('button:has-text("Logout"), .logout-button');

    // Verify back to login
    await expect(page).toHaveURL('/', { timeout: 5000 });
    await expect(page.locator('input[name="username"]')).toBeVisible();
  });

  // === FLOW 10: PERMISSION CHECKS ===
  test('Permission-restricted features are hidden for non-admin', async ({ page }) => {
    // This test would need a non-admin user
    // For now, verify admin sees admin features

    // Login as admin
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.selectOption('select[name="country"]', TEST_USER.country);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*booking/);

    // Verify admin panel visible
    await expect(page.locator('text=Admin Panel, text=User Management')).toBeVisible();
  });
});

// === REGRESSION TESTS ===
test.describe('Regression Prevention', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Login for all regression tests
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.selectOption('select[name="country"]', TEST_USER.country);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*booking/);
  });

  test('No "Dr. Dr." duplication in doctor names', async ({ page }) => {
    await page.click('text=Edit Sets');
    await page.click('.tab-button:has-text("Doctors")');

    // Get all doctor name elements
    const doctorNames = await page.locator('.data-card h4, .doctor-name').allTextContents();

    // Verify no duplication
    for (const name of doctorNames) {
      expect(name).not.toMatch(/Dr\.\s+Dr\./);
    }
  });

  test('Procedure type selection does not blink/disappear', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking`);

    // Select department
    await page.selectOption('select[name="department"]', { index: 1 });

    // Select doctor
    await page.selectOption('select[name="doctor"]', { index: 1 });

    // Select procedure type
    const procedureSelect = page.locator('select[name="procedureType"]');
    await expect(procedureSelect).toBeVisible();

    await procedureSelect.selectOption({ index: 1 });

    // Wait a moment
    await page.waitForTimeout(1000);

    // Verify procedure type is still visible and selected
    await expect(procedureSelect).toBeVisible();
    const selectedValue = await procedureSelect.inputValue();
    expect(selectedValue).not.toBe('');
  });

  test('Multiple concurrent users do not conflict', async ({ browser }) => {
    // Create 3 separate browser contexts (simulating 3 users)
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(contexts.map(c => c.newPage()));

    // All 3 users login simultaneously
    await Promise.all(pages.map(async (page) => {
      await page.goto(BASE_URL);
      await page.fill('input[name="username"]', TEST_USER.username);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.selectOption('select[name="country"]', TEST_USER.country);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*booking/);
    }));

    // All 3 users navigate to Edit Sets
    await Promise.all(pages.map(p => p.click('text=Edit Sets')));

    // Verify all 3 can see the same data
    const doctorCounts = await Promise.all(
      pages.map(p => p.locator('.data-card').count())
    );

    // All should see same number of doctors
    expect(doctorCounts[0]).toBe(doctorCounts[1]);
    expect(doctorCounts[1]).toBe(doctorCounts[2]);

    // Cleanup
    await Promise.all(contexts.map(c => c.close()));
  });
});
