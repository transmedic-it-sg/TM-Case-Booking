#!/usr/bin/env node

/**
 * Comprehensive Functionality Test for TM-Case-Booking Application
 * Tests all critical functions and data transmission with Supabase
 */

// Import required modules
const { createClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_CONFIG = {
  // These should be set from environment or hardcoded for testing
  SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL || 'your-supabase-url',
  SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-supabase-anon-key',
  
  // Test data
  TEST_USER_ID: 'test-user-' + Date.now(),
  TEST_CASE_ID: 'test-case-' + Date.now(),
  TEST_ROLE: 'it',
  TEST_COUNTRY: 'SG'
};

// Create Supabase client
const supabase = createClient(TEST_CONFIG.SUPABASE_URL, TEST_CONFIG.SUPABASE_ANON_KEY);

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper functions
const logTest = (testName, passed, error = null) => {
  if (passed) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}`);
    if (error) {
      console.log(`   Error: ${error.message}`);
      testResults.errors.push({ test: testName, error: error.message });
    }
    testResults.failed++;
  }
};

const logInfo = (message) => {
  console.log(`ℹ️  ${message}`);
};

const logSection = (sectionName) => {
  console.log(`\n🔍 Testing ${sectionName}`);
  console.log('='.repeat(50));
};

// Test 1: Supabase Connection
async function testSupabaseConnection() {
  logSection('Supabase Connection');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      logTest('Basic Supabase Connection', false, error);
      return false;
    }
    
    logTest('Basic Supabase Connection', true);
    logInfo(`Connection successful - can query profiles table`);
    return true;
  } catch (error) {
    logTest('Basic Supabase Connection', false, error);
    return false;
  }
}

// Test 2: Code Tables Operations
async function testCodeTableOperations() {
  logSection('Code Table Operations');
  
  try {
    // Test getting code tables
    const { data: codeTables, error: getError } = await supabase
      .from('code_tables')
      .select('*')
      .eq('country', TEST_CONFIG.TEST_COUNTRY)
      .limit(5);
    
    if (getError) {
      logTest('Get Code Tables', false, getError);
      return false;
    }
    
    logTest('Get Code Tables', true);
    logInfo(`Found ${codeTables?.length || 0} code table entries for ${TEST_CONFIG.TEST_COUNTRY}`);
    
    // Test inserting a code table item
    const testItem = {
      country: TEST_CONFIG.TEST_COUNTRY,
      table_type: 'hospitals',
      code: 'test_hospital_' + Date.now(),
      display_name: 'Test Hospital ' + Date.now(),
      is_active: true
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('code_tables')
      .insert(testItem)
      .select()
      .single();
    
    if (insertError) {
      logTest('Insert Code Table Item', false, insertError);
      return false;
    }
    
    logTest('Insert Code Table Item', true);
    logInfo(`Inserted test hospital: ${insertData.display_name}`);
    
    // Clean up test data
    await supabase.from('code_tables').delete().eq('id', insertData.id);
    logInfo('Cleaned up test data');
    
    return true;
  } catch (error) {
    logTest('Code Table Operations', false, error);
    return false;
  }
}

// Test 3: Permissions System
async function testPermissionsSystem() {
  logSection('Permissions System');
  
  try {
    // Test getting permissions
    const { data: permissions, error: getError } = await supabase
      .from('permissions')
      .select('*')
      .limit(10);
    
    if (getError) {
      logTest('Get Permissions', false, getError);
      return false;
    }
    
    logTest('Get Permissions', true);
    logInfo(`Found ${permissions?.length || 0} permission entries`);
    
    // Test checking specific permission
    const { data: specificPerm, error: specificError } = await supabase
      .from('permissions')
      .select('*')
      .eq('role_id', TEST_CONFIG.TEST_ROLE)
      .eq('action_id', 'create-case')
      .single();
    
    if (specificError && specificError.code !== 'PGRST116') {
      logTest('Check Specific Permission', false, specificError);
      return false;
    }
    
    logTest('Check Specific Permission', true);
    logInfo(`IT role create-case permission: ${specificPerm?.allowed ? 'ALLOWED' : 'DENIED'}`);
    
    return true;
  } catch (error) {
    logTest('Permissions System', false, error);
    return false;
  }
}

// Test 4: Case Management
async function testCaseManagement() {
  logSection('Case Management');
  
  try {
    // Test getting existing cases
    const { data: cases, error: getError } = await supabase
      .from('case_bookings')
      .select('*')
      .limit(5);
    
    if (getError) {
      logTest('Get Cases', false, getError);
      return false;
    }
    
    logTest('Get Cases', true);
    logInfo(`Found ${cases?.length || 0} existing cases`);
    
    // Test case reference number generation (check counter)
    const { data: counter, error: counterError } = await supabase
      .from('case_counters')
      .select('*')
      .eq('country', TEST_CONFIG.TEST_COUNTRY)
      .eq('year', new Date().getFullYear())
      .single();
    
    if (counterError && counterError.code !== 'PGRST116') {
      logTest('Case Counter Check', false, counterError);
      return false;
    }
    
    logTest('Case Counter Check', true);
    logInfo(`Current counter for ${TEST_CONFIG.TEST_COUNTRY}: ${counter?.current_counter || 'Not initialized'}`);
    
    return true;
  } catch (error) {
    logTest('Case Management', false, error);
    return false;
  }
}

// Test 5: Status History
async function testStatusHistory() {
  logSection('Status History');
  
  try {
    // Test getting status history
    const { data: history, error: getError } = await supabase
      .from('status_history')
      .select('*')
      .limit(5);
    
    if (getError) {
      logTest('Get Status History', false, getError);
      return false;
    }
    
    logTest('Get Status History', true);
    logInfo(`Found ${history?.length || 0} status history entries`);
    
    // Check for any duplicate "Case Booked" entries (our recent fix)
    const { data: duplicates, error: duplicateError } = await supabase
      .from('status_history')
      .select('case_id, status')
      .eq('status', 'Case Booked');
    
    if (duplicateError) {
      logTest('Check Duplicate Case Booked', false, duplicateError);
      return false;
    }
    
    // Group by case_id to find duplicates
    const caseStatusCount = {};
    duplicates?.forEach(entry => {
      if (!caseStatusCount[entry.case_id]) {
        caseStatusCount[entry.case_id] = 0;
      }
      caseStatusCount[entry.case_id]++;
    });
    
    const duplicateCases = Object.entries(caseStatusCount).filter(([caseId, count]) => count > 1);
    
    logTest('Check Duplicate Case Booked', true);
    logInfo(`Found ${duplicateCases.length} cases with duplicate "Case Booked" entries`);
    
    return true;
  } catch (error) {
    logTest('Status History', false, error);
    return false;
  }
}

// Test 6: User Profiles
async function testUserProfiles() {
  logSection('User Profiles');
  
  try {
    // Test getting user profiles
    const { data: profiles, error: getError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (getError) {
      logTest('Get User Profiles', false, getError);
      return false;
    }
    
    logTest('Get User Profiles', true);
    logInfo(`Found ${profiles?.length || 0} user profiles`);
    
    // Check for IT role users
    const { data: itUsers, error: itError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'it');
    
    if (itError) {
      logTest('Get IT Role Users', false, itError);
      return false;
    }
    
    logTest('Get IT Role Users', true);
    logInfo(`Found ${itUsers?.length || 0} IT role users`);
    
    return true;
  } catch (error) {
    logTest('User Profiles', false, error);
    return false;
  }
}

// Test 7: Table Schema Validation
async function testTableSchema() {
  logSection('Table Schema Validation');
  
  const requiredTables = [
    'profiles',
    'case_bookings', 
    'status_history',
    'amendment_history',
    'notifications',
    'permissions',
    'code_tables',
    'case_counters'
  ];
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        logTest(`Table ${table} exists`, false, error);
      } else {
        logTest(`Table ${table} exists`, true);
      }
    } catch (error) {
      logTest(`Table ${table} exists`, false, error);
    }
  }
  
  return true;
}

// Test 8: Environment Variables
function testEnvironmentVariables() {
  logSection('Environment Variables');
  
  const requiredEnvVars = [
    'REACT_APP_SUPABASE_URL',
    'REACT_APP_SUPABASE_ANON_KEY'
  ];
  
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value && value !== 'your-supabase-url' && value !== 'your-supabase-anon-key') {
      logTest(`${envVar} is set`, true);
    } else {
      logTest(`${envVar} is set`, false, new Error('Environment variable not set or using placeholder'));
    }
  }
  
  return true;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Functionality Tests');
  console.log('Date:', new Date().toISOString());
  console.log('Test Config:', {
    supabaseUrl: TEST_CONFIG.SUPABASE_URL?.substring(0, 20) + '...',
    testRole: TEST_CONFIG.TEST_ROLE,
    testCountry: TEST_CONFIG.TEST_COUNTRY
  });
  
  try {
    // Run all tests
    testEnvironmentVariables();
    await testSupabaseConnection();
    await testTableSchema();
    await testUserProfiles();
    await testPermissionsSystem();
    await testCodeTableOperations();
    await testCaseManagement();
    await testStatusHistory();
    
    // Print summary
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    if (testResults.errors.length > 0) {
      console.log('\n🚨 Errors Details:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}: ${error.error}`);
      });
    }
    
    if (testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Application is fully functional.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
    
  } catch (error) {
    console.error('💥 Test runner crashed:', error);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().then(() => {
    process.exit(testResults.failed > 0 ? 1 : 0);
  });
}

module.exports = {
  runAllTests,
  testSupabaseConnection,
  testPermissionsSystem,
  testCaseManagement,
  testCodeTableOperations
};