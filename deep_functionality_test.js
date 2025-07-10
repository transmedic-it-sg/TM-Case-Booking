// Deep functionality test - simulating actual frontend data flow
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simulate the exact getSupabaseCases function
async function testGetSupabaseCases(country) {
  try {
    console.log(`\n🔍 Testing getSupabaseCases for country: ${country || 'ALL'}`);
    
    let query = supabase
      .from('case_bookings')
      .select(`
        *,
        status_history (
          id,
          status,
          processed_by,
          timestamp,
          details,
          attachments
        )
      `)
      .order('created_at', { ascending: false });
    
    if (country) {
      query = query.eq('country', country);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Database Error:', error);
      return { success: false, data: [], error };
    }
    
    console.log(`✅ Raw data received: ${data?.length || 0} cases`);
    
    // Test the exact transformation logic from supabaseCaseService.ts
    const transformedCases = data.map(caseData => ({
      id: caseData.id,
      caseReferenceNumber: caseData.case_reference_number,
      hospital: caseData.hospital,
      department: caseData.department,
      dateOfSurgery: caseData.date_of_surgery,
      procedureType: caseData.procedure_type,
      procedureName: caseData.procedure_name,
      doctorName: caseData.doctor_name,
      timeOfProcedure: caseData.time_of_procedure,
      surgerySetSelection: caseData.surgery_set_selection || [],
      implantBox: caseData.implant_box || [],
      specialInstruction: caseData.special_instruction,
      status: caseData.status,
      submittedBy: caseData.submitted_by,
      submittedAt: caseData.submitted_at,
      processedBy: caseData.processed_by,
      processedAt: caseData.processed_at,
      processOrderDetails: caseData.process_order_details,
      country: caseData.country,
      isAmended: caseData.is_amended,
      amendedBy: caseData.amended_by,
      amendedAt: caseData.amended_at,
      statusHistory: caseData.status_history?.map((history) => ({
        status: history.status,
        timestamp: history.timestamp,
        processedBy: history.processed_by,
        details: history.details,
        attachments: history.attachments
      })) || []
    }));
    
    console.log(`✅ Transformed cases: ${transformedCases.length}`);
    
    // Validate each case has required fields
    const validation = transformedCases.map((caseItem, index) => {
      const issues = [];
      if (!caseItem.id) issues.push('missing id');
      if (!caseItem.caseReferenceNumber) issues.push('missing caseReferenceNumber');
      if (!caseItem.hospital) issues.push('missing hospital');
      if (!caseItem.department) issues.push('missing department');
      if (!caseItem.status) issues.push('missing status');
      if (!caseItem.country) issues.push('missing country');
      if (!Array.isArray(caseItem.surgerySetSelection)) issues.push('surgerySetSelection not array');
      if (!Array.isArray(caseItem.implantBox)) issues.push('implantBox not array');
      if (!Array.isArray(caseItem.statusHistory)) issues.push('statusHistory not array');
      
      return { index, issues };
    }).filter(v => v.issues.length > 0);
    
    if (validation.length > 0) {
      console.log('⚠️ Data validation issues:');
      validation.forEach(v => {
        console.log(`  Case ${v.index}: ${v.issues.join(', ')}`);
      });
    } else {
      console.log('✅ All cases passed validation');
    }
    
    return { success: true, data: transformedCases, count: transformedCases.length };
    
  } catch (error) {
    console.error('💥 Exception in getSupabaseCases:', error);
    return { success: false, data: [], error };
  }
}

// Test getCategorizedSets function exactly as in storage.ts
async function testGetCategorizedSets(country) {
  try {
    console.log(`\n🔧 Testing getCategorizedSets for country: ${country}`);
    
    const { data, error } = await supabase
      .from('categorized_sets')
      .select('*')
      .eq('country', country);
    
    if (error) {
      console.error('❌ Database Error:', error);
      return { success: false, data: {}, error };
    }
    
    console.log(`✅ Raw categorized sets: ${data?.length || 0} procedure types`);
    
    // Transform to expected format (like in supabaseCaseService.ts)
    const result = {};
    
    data.forEach(item => {
      result[item.procedure_type] = {
        surgerySets: item.surgery_sets || [],
        implantBoxes: item.implant_boxes || []
      };
    });
    
    console.log('✅ Transformed categorized sets:');
    Object.entries(result).forEach(([procedureType, sets]) => {
      console.log(`  ${procedureType}: ${sets.surgerySets.length} surgery sets, ${sets.implantBoxes.length} implant boxes`);
    });
    
    // Validate structure
    const validation = Object.entries(result).map(([procedureType, sets]) => {
      const issues = [];
      if (!Array.isArray(sets.surgerySets)) issues.push('surgerySets not array');
      if (!Array.isArray(sets.implantBoxes)) issues.push('implantBoxes not array');
      return { procedureType, issues };
    }).filter(v => v.issues.length > 0);
    
    if (validation.length > 0) {
      console.log('⚠️ Categorized sets validation issues:');
      validation.forEach(v => {
        console.log(`  ${v.procedureType}: ${v.issues.join(', ')}`);
      });
    } else {
      console.log('✅ All categorized sets passed validation');
    }
    
    return { success: true, data: result, count: Object.keys(result).length };
    
  } catch (error) {
    console.error('💥 Exception in getCategorizedSets:', error);
    return { success: false, data: {}, error };
  }
}

// Test user authentication and profiles
async function testUserProfiles() {
  try {
    console.log('\n👤 Testing User Profiles');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);
    
    if (error) {
      console.error('❌ Database Error:', error);
      return { success: false, data: [], error };
    }
    
    console.log(`✅ Found ${data?.length || 0} user profiles`);
    
    // Validate user structure
    const validation = data.map((user, index) => {
      const issues = [];
      if (!user.id) issues.push('missing id');
      if (!user.username) issues.push('missing username');
      if (!user.role) issues.push('missing role');
      if (!user.name) issues.push('missing name');
      if (!Array.isArray(user.departments)) issues.push('departments not array');
      if (!Array.isArray(user.countries)) issues.push('countries not array');
      
      return { index, username: user.username, issues };
    }).filter(v => v.issues.length > 0);
    
    if (validation.length > 0) {
      console.log('⚠️ User validation issues:');
      validation.forEach(v => {
        console.log(`  User ${v.username}: ${v.issues.join(', ')}`);
      });
    } else {
      console.log('✅ All users passed validation');
    }
    
    // Test roles distribution
    const roles = data.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Role distribution:', roles);
    
    return { success: true, data, count: data.length };
    
  } catch (error) {
    console.error('💥 Exception in testUserProfiles:', error);
    return { success: false, data: [], error };
  }
}

// Test case creation workflow
async function testCaseCreationWorkflow() {
  console.log('\n📝 Testing Case Creation Workflow');
  
  try {
    // Test case counter
    const { data: counterData, error: counterError } = await supabase
      .from('case_counters')
      .select('*')
      .eq('country', 'SG')
      .eq('year', new Date().getFullYear())
      .single();
    
    if (counterError && counterError.code !== 'PGRST116') {
      console.error('❌ Case counter error:', counterError);
    } else {
      console.log('✅ Case counter found:', counterData?.current_counter || 'not found');
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('💥 Exception in case creation workflow:', error);
    return { success: false, error };
  }
}

// Test potential edge cases and bugs
async function testEdgeCases() {
  console.log('\n🐛 Testing Edge Cases and Potential Bugs');
  
  const tests = [];
  
  // Test 1: Empty country filter
  try {
    const result = await testGetSupabaseCases('');
    tests.push({ name: 'Empty country filter', success: result.success });
  } catch (error) {
    tests.push({ name: 'Empty country filter', success: false, error: error.message });
  }
  
  // Test 2: Invalid country code
  try {
    const result = await testGetSupabaseCases('XX');
    tests.push({ name: 'Invalid country code', success: result.success, count: result.count });
  } catch (error) {
    tests.push({ name: 'Invalid country code', success: false, error: error.message });
  }
  
  // Test 3: Categorized sets for non-existent country
  try {
    const result = await testGetCategorizedSets('XX');
    tests.push({ name: 'Categorized sets for invalid country', success: result.success, count: result.count });
  } catch (error) {
    tests.push({ name: 'Categorized sets for invalid country', success: false, error: error.message });
  }
  
  // Test 4: Very large limit
  try {
    const { data, error } = await supabase
      .from('case_bookings')
      .select('id')
      .limit(1000);
    tests.push({ name: 'Large limit query', success: !error, count: data?.length });
  } catch (error) {
    tests.push({ name: 'Large limit query', success: false, error: error.message });
  }
  
  tests.forEach(test => {
    if (test.success) {
      console.log(`✅ ${test.name}: PASS${test.count !== undefined ? ` (${test.count} items)` : ''}`);
    } else {
      console.log(`❌ ${test.name}: FAIL${test.error ? ` - ${test.error}` : ''}`);
    }
  });
  
  return tests;
}

// Main test runner
async function runDeepFunctionalityTest() {
  console.log('🚀 Deep Functionality Test - Simulating Real Frontend Usage\n');
  console.log('='.repeat(80));
  
  const results = {
    casesAllCountries: await testGetSupabaseCases(),
    casesSG: await testGetSupabaseCases('SG'),
    casesMY: await testGetSupabaseCases('MY'),
    categorizedSetsSG: await testGetCategorizedSets('SG'),
    categorizedSetsMY: await testGetCategorizedSets('MY'),
    userProfiles: await testUserProfiles(),
    caseCreation: await testCaseCreationWorkflow(),
    edgeCases: await testEdgeCases()
  };
  
  console.log('\n📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(80));
  
  let totalTests = 0;
  let passedTests = 0;
  
  Object.entries(results).forEach(([testName, result]) => {
    if (Array.isArray(result)) {
      // Edge cases
      result.forEach(test => {
        totalTests++;
        if (test.success) passedTests++;
      });
    } else {
      totalTests++;
      if (result.success) passedTests++;
      
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const details = result.count !== undefined ? ` (${result.count} items)` : '';
      console.log(`${status} ${testName}${details}`);
      
      if (!result.success && result.error) {
        console.log(`    Error: ${result.error.message || result.error}`);
      }
    }
  });
  
  console.log('\n📈 FINAL RESULTS');
  console.log('='.repeat(40));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED - Application should work perfectly!');
  } else {
    console.log('\n⚠️ Some tests failed - Review issues above');
  }
  
  console.log('\n🔧 DETAILED ANALYSIS:');
  
  // Analyze specific potential issues
  if (results.casesAllCountries.success && results.casesAllCountries.count === 0) {
    console.log('⚠️ WARNING: No cases found in database - "View All Cases" will show empty list');
  }
  
  if (results.categorizedSetsSG.success && results.categorizedSetsSG.count === 0) {
    console.log('⚠️ WARNING: No categorized sets for SG - "Edit Sets" will be empty for Singapore users');
  }
  
  if (results.userProfiles.success && results.userProfiles.count === 0) {
    console.log('⚠️ WARNING: No user profiles found - Authentication may fail');
  }
  
  console.log('\n✨ If all tests passed, the three reported issues should be resolved:');
  console.log('   1. "View All Cases" should load without crashing');
  console.log('   2. Cases should appear in "Booking Calendar"'); 
  console.log('   3. "Edit Sets" should show surgery sets and implant boxes');
}

runDeepFunctionalityTest();