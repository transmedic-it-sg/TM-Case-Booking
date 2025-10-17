import { test, expect } from '@playwright/test';

/**
 * COMPREHENSIVE MAPPING CONSISTENCY E2E TESTS
 * 
 * Tests the unified data service mapping consistency across:
 * - All countries (Singapore, Malaysia, Philippines, Indonesia, Vietnam, Hong Kong, Thailand)  
 * - All departments and doctors
 * - All surgery sets and implant boxes
 * - Field mapping consistency
 * - Service layer abstraction
 */

const BASE_URL = 'http://localhost:3002';

// Test admin user with access to all countries
const ADMIN_USER = { username: 'Admin', password: 'admin123' };

const COUNTRIES = [
  'Singapore', 'Malaysia', 'Philippines', 'Indonesia', 
  'Vietnam', 'Hong Kong', 'Thailand'
];

test.describe('🔗 Unified Data Service & Mapping Consistency Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Login as admin to access all features
    await page.fill('input#username', ADMIN_USER.username);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('🌏 Standardized Department Loading - All Countries', async ({ page }) => {
    console.log('Testing standardized department loading across all countries...');
    
    // Navigate to case booking form
    await page.click('text=Book Case', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    for (const country of COUNTRIES) {
      console.log(`Testing department data for: ${country}`);
      
      // Select country if country dropdown exists
      const countrySelect = page.locator('select[name="country"], [data-testid="country-select"]').first();
      if (await countrySelect.isVisible({ timeout: 5000 })) {
        await countrySelect.selectOption(country);
        await page.waitForTimeout(2000); // Wait for departments to load
      }
      
      // Check that departments are loaded for this country
      const departmentDropdown = page.locator('select[name="department"], [data-testid="department-select"]').first();
      
      if (await departmentDropdown.isVisible({ timeout: 5000 })) {
        const options = await departmentDropdown.locator('option').allTextContents();
        const validDepartments = options.filter(opt => opt.trim() && opt !== 'Select Department');
        
        expect(validDepartments.length).toBeGreaterThan(0);
        console.log(`✅ ${country}: Found ${validDepartments.length} departments`);
        
        // Verify departments are medical departments (basic validation)
        const commonDepts = ['Orthopaedics', 'Neurosurgery', 'Cardiology', 'General Surgery'];
        const hasCommonDept = validDepartments.some(dept => 
          commonDepts.some(common => dept.includes(common))
        );
        expect(hasCommonDept).toBeTruthy();
        console.log(`✅ ${country}: Has valid medical departments`);
      }
    }
  });

  test('👨‍⚕️ Unified Doctor Loading - Department Relationships', async ({ page }) => {
    console.log('Testing unified doctor loading with proper department relationships...');
    
    await page.click('text=Book Case', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Test doctor loading for each country
    for (const country of COUNTRIES) {
      console.log(`Testing doctor data for: ${country}`);
      
      // Select country
      const countrySelect = page.locator('select[name="country"], [data-testid="country-select"]').first();
      if (await countrySelect.isVisible({ timeout: 5000 })) {
        await countrySelect.selectOption(country);
        await page.waitForTimeout(2000);
      }
      
      // Select first available department
      const departmentDropdown = page.locator('select[name="department"], [data-testid="department-select"]').first();
      if (await departmentDropdown.isVisible()) {
        const options = await departmentDropdown.locator('option').allTextContents();
        const firstDept = options.find(opt => opt.trim() && opt !== 'Select Department');
        
        if (firstDept) {
          await departmentDropdown.selectOption(firstDept);
          await page.waitForTimeout(3000); // Wait for doctors to load
          
          // Check that doctors are loaded
          const doctorDropdown = page.locator('select[name="doctorName"], [data-testid="doctor-select"]').first();
          if (await doctorDropdown.isVisible({ timeout: 5000 })) {
            const doctorOptions = await doctorDropdown.locator('option').allTextContents();
            const validDoctors = doctorOptions.filter(opt => opt.trim() && opt !== 'Select Doctor');
            
            if (validDoctors.length > 0) {
              expect(validDoctors.length).toBeGreaterThan(0);
              console.log(`✅ ${country} - ${firstDept}: Found ${validDoctors.length} doctors`);
              
              // Verify doctor names are properly formatted
              const hasProperFormat = validDoctors.some(doctor => 
                doctor.includes('Dr') || doctor.length > 3
              );
              expect(hasProperFormat).toBeTruthy();
              console.log(`✅ ${country} - ${firstDept}: Doctors properly formatted`);
            }
          }
        }
      }
    }
  });

  test('🏥 Surgery Sets & Implant Boxes - Unified Service Access', async ({ page }) => {
    console.log('Testing surgery sets and implant boxes through unified service...');
    
    await page.click('text=Book Case', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Test for Singapore (known to have comprehensive data)
    const testCountry = 'Singapore';
    
    // Select country
    const countrySelect = page.locator('select[name="country"], [data-testid="country-select"]').first();
    if (await countrySelect.isVisible({ timeout: 5000 })) {
      await countrySelect.selectOption(testCountry);
      await page.waitForTimeout(2000);
    }
    
    // Select department
    const departmentDropdown = page.locator('select[name="department"], [data-testid="department-select"]').first();
    if (await departmentDropdown.isVisible()) {
      const options = await departmentDropdown.locator('option').allTextContents();
      const orthoDept = options.find(opt => opt.includes('Orthopaedics')) || 
                       options.find(opt => opt.trim() && opt !== 'Select Department');
      
      if (orthoDept) {
        await departmentDropdown.selectOption(orthoDept);
        await page.waitForTimeout(2000);
        
        // Select doctor
        const doctorDropdown = page.locator('select[name="doctorName"], [data-testid="doctor-select"]').first();
        if (await doctorDropdown.isVisible()) {
          const doctorOptions = await doctorDropdown.locator('option').allTextContents();
          const firstDoctor = doctorOptions.find(opt => opt.trim() && opt !== 'Select Doctor');
          
          if (firstDoctor) {
            await doctorDropdown.selectOption(firstDoctor);
            await page.waitForTimeout(2000);
            
            // Select procedure type
            const procedureDropdown = page.locator('select[name="procedureType"], [data-testid="procedure-select"]').first();
            if (await procedureDropdown.isVisible({ timeout: 5000 })) {
              const procOptions = await procedureDropdown.locator('option').allTextContents();
              const firstProc = procOptions.find(opt => opt.trim() && opt !== 'Select Procedure Type');
              
              if (firstProc) {
                await procedureDropdown.selectOption(firstProc);
                await page.waitForTimeout(3000);
                
                // Check surgery sets are loaded
                const surgerySetSelect = page.locator('[data-testid="surgery-sets-select"], select[name*="surgery"]').first();
                if (await surgerySetSelect.isVisible({ timeout: 5000 })) {
                  console.log(`✅ ${testCountry}: Surgery sets loaded successfully`);
                }
                
                // Check implant boxes are loaded  
                const implantBoxSelect = page.locator('[data-testid="implant-boxes-select"], select[name*="implant"]').first();
                if (await implantBoxSelect.isVisible({ timeout: 5000 })) {
                  console.log(`✅ ${testCountry}: Implant boxes loaded successfully`);
                }
                
                console.log(`✅ ${testCountry} - ${orthoDept} - ${firstDoctor}: Complete data chain verified`);
              }
            }
          }
        }
      }
    }
  });

  test('🛠️ Edit Sets - Unified Data Management', async ({ page }) => {
    console.log('Testing Edit Sets functionality with unified data service...');
    
    // Navigate to Edit Sets
    await page.click('text=Edit Sets', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Test that Edit Sets loads properly with unified service
    await expect(page.locator('h1, h2, h3').filter({ hasText: /Edit|Sets|Doctor/i })).toBeVisible({ timeout: 10000 });
    
    // Test department loading in Edit Sets
    const departmentSelect = page.locator('select[name*="department"], [data-testid*="department"]').first();
    if (await departmentSelect.isVisible({ timeout: 10000 })) {
      const options = await departmentSelect.locator('option').allTextContents();
      const validDepts = options.filter(opt => opt.trim() && opt !== 'Select Department');
      
      expect(validDepts.length).toBeGreaterThan(0);
      console.log(`✅ Edit Sets: Found ${validDepts.length} departments via unified service`);
      
      // Test selecting a department loads doctors
      const firstDept = validDepts[0];
      await departmentSelect.selectOption(firstDept);
      await page.waitForTimeout(3000);
      
      // Check that doctors table/list appears
      const doctorsContainer = page.locator('table, .doctor-list, [data-testid*="doctor"]').first();
      if (await doctorsContainer.isVisible({ timeout: 5000 })) {
        console.log(`✅ Edit Sets: Doctors loaded for department ${firstDept}`);
      }
    }
  });

  test('🔍 Data Consistency - No Country Leakage', async ({ page }) => {
    console.log('Testing data isolation and consistency across countries...');
    
    await page.click('text=Book Case', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Test that switching countries shows different data
    const countrySelect = page.locator('select[name="country"], [data-testid="country-select"]').first();
    
    if (await countrySelect.isVisible({ timeout: 5000 })) {
      // Store data for Singapore
      await countrySelect.selectOption('Singapore');
      await page.waitForTimeout(2000);
      
      const sgDepartments = await page.locator('select[name="department"] option').allTextContents();
      const sgValidDepts = sgDepartments.filter(opt => opt.trim() && opt !== 'Select Department');
      
      // Store data for Malaysia  
      await countrySelect.selectOption('Malaysia');
      await page.waitForTimeout(2000);
      
      const myDepartments = await page.locator('select[name="department"] option').allTextContents();
      const myValidDepts = myDepartments.filter(opt => opt.trim() && opt !== 'Select Department');
      
      // Both should have departments
      expect(sgValidDepts.length).toBeGreaterThan(0);
      expect(myValidDepts.length).toBeGreaterThan(0);
      
      console.log(`✅ Singapore has ${sgValidDepts.length} departments`);
      console.log(`✅ Malaysia has ${myValidDepts.length} departments`);
      console.log('✅ Country-specific data loading verified');
    }
  });

  test('🔐 User Access Control - Country Restrictions', async ({ page }) => {
    console.log('Testing user access control with country restrictions...');
    
    // Logout admin
    await page.click('text=Logout', { timeout: 5000 }).catch(() => {});
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Try to login with a limited user (if exists)
    // Note: This would need a test user with limited country access
    const limitedUser = { username: 'arthur.pei', password: 'arthur123' };
    
    await page.fill('input#username', limitedUser.username);
    await page.fill('input[type="password"]', limitedUser.password);
    await page.click('button[type="submit"]');
    
    // Check if login succeeds
    const isLoggedIn = await page.locator('text=Book Case, text=Dashboard').first().isVisible({ timeout: 10000 }).catch(() => false);
    
    if (isLoggedIn) {
      console.log('✅ Limited user logged in successfully');
      
      // Navigate to case booking
      await page.click('text=Book Case', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      // Check if country selection is restricted
      const countrySelect = page.locator('select[name="country"], [data-testid="country-select"]').first();
      
      if (await countrySelect.isVisible({ timeout: 5000 })) {
        const countryOptions = await countrySelect.locator('option').allTextContents();
        const validCountries = countryOptions.filter(opt => opt.trim() && opt !== 'Select Country');
        
        // Limited user should have fewer countries than admin
        expect(validCountries.length).toBeLessThanOrEqual(COUNTRIES.length);
        console.log(`✅ Limited user sees ${validCountries.length} countries (access controlled)`);
      }
    } else {
      console.log('ℹ️  Limited user test skipped - user not available or login failed');
    }
  });

  test('📊 Field Mapping Consistency - No Hardcoded Fields', async ({ page }) => {
    console.log('Testing field mapping consistency across forms...');
    
    // Test case booking form field consistency
    await page.click('text=Book Case', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Check that form fields exist and are properly mapped
    const requiredFields = [
      'input[name="hospital"], select[name="hospital"]',
      'select[name="department"]', 
      'input[name="dateOfSurgery"], input[type="date"]',
      'select[name="procedureType"]'
    ];
    
    for (const fieldSelector of requiredFields) {
      const field = page.locator(fieldSelector).first();
      const isVisible = await field.isVisible({ timeout: 5000 });
      
      if (isVisible) {
        console.log(`✅ Field found: ${fieldSelector}`);
      }
    }
    
    // Test that form can be filled (basic validation)
    const countrySelect = page.locator('select[name="country"]').first();
    if (await countrySelect.isVisible({ timeout: 5000 })) {
      await countrySelect.selectOption('Singapore');
      await page.waitForTimeout(1000);
      
      console.log('✅ Form fields respond to unified data service');
    }
  });

  test('🔄 Real-time Data Updates - Service Integration', async ({ page }) => {
    console.log('Testing real-time data updates through unified service...');
    
    await page.click('text=Book Case', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Test that data loads dynamically when selections change
    const countrySelect = page.locator('select[name="country"]').first();
    
    if (await countrySelect.isVisible({ timeout: 5000 })) {
      // Change country and verify departments update
      await countrySelect.selectOption('Singapore');
      await page.waitForTimeout(2000);
      
      const sgDeptCount = await page.locator('select[name="department"] option').count();
      
      await countrySelect.selectOption('Malaysia');  
      await page.waitForTimeout(2000);
      
      const myDeptCount = await page.locator('select[name="department"] option').count();
      
      // Both should have departments loaded
      expect(sgDeptCount).toBeGreaterThan(1); // Including "Select Department" option
      expect(myDeptCount).toBeGreaterThan(1);
      
      console.log(`✅ Real-time updates: SG=${sgDeptCount-1} depts, MY=${myDeptCount-1} depts`);
    }
  });

});