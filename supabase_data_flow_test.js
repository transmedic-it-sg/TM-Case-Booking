/**
 * Comprehensive Supabase Data Flow Test
 * This test verifies that all data operations (create, read, update, delete) work correctly with Supabase
 */

const { createClient } = require('@supabase/supabase-js');

// Mock Supabase client for testing
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || 'https://example.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY || 'example-key'
);

// Test data
const testCase = {
  hospital: 'Test Hospital',
  department: 'Test Department',
  date_of_surgery: '2024-01-15',
  procedure_type: 'Knee',
  procedure_name: 'Test Knee Surgery',
  doctor_name: 'Dr. Test',
  time_of_procedure: '10:00',
  surgery_set_selection: ['Set A', 'Set B'],
  implant_box: ['Box 1', 'Box 2'],
  special_instruction: 'Test instructions',
  status: 'Case Booked',
  submitted_by: 'test-user',
  country: 'SG'
};

const testAmendment = {
  hospital: 'Amended Hospital',
  department: 'Amended Department',
  amendmentReason: 'Test amendment reason'
};

/**
 * Test 1: Case Creation
 */
async function testCaseCreation() {
  console.log('🧪 Testing Case Creation...');
  
  try {
    // Test the case creation flow
    const { data, error } = await supabase
      .from('case_bookings')
      .insert([testCase])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Case creation failed:', error);
      return null;
    }
    
    console.log('✅ Case created successfully:', data.case_reference_number);
    return data.id;
  } catch (error) {
    console.error('❌ Case creation error:', error);
    return null;
  }
}

/**
 * Test 2: Case Retrieval
 */
async function testCaseRetrieval(caseId) {
  console.log('🧪 Testing Case Retrieval...');
  
  try {
    const { data, error } = await supabase
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
        ),
        amendment_history (
          id,
          amended_by,
          timestamp,
          reason,
          changes
        )
      `)
      .eq('id', caseId)
      .single();
    
    if (error) {
      console.error('❌ Case retrieval failed:', error);
      return false;
    }
    
    console.log('✅ Case retrieved successfully');
    console.log('  - Hospital:', data.hospital);
    console.log('  - Status:', data.status);
    console.log('  - Status History Count:', data.status_history?.length || 0);
    console.log('  - Amendment History Count:', data.amendment_history?.length || 0);
    
    return true;
  } catch (error) {
    console.error('❌ Case retrieval error:', error);
    return false;
  }
}

/**
 * Test 3: Status Update
 */
async function testStatusUpdate(caseId) {
  console.log('🧪 Testing Status Update...');
  
  try {
    // Update case status
    const { error: updateError } = await supabase
      .from('case_bookings')
      .update({ 
        status: 'Order Preparation',
        updated_at: new Date().toISOString()
      })
      .eq('id', caseId);
    
    if (updateError) {
      console.error('❌ Status update failed:', updateError);
      return false;
    }
    
    // Add status history entry
    const { error: historyError } = await supabase
      .from('status_history')
      .insert([{
        case_id: caseId,
        status: 'Order Preparation',
        processed_by: 'test-user',
        timestamp: new Date().toISOString(),
        details: 'Test status change'
      }]);
    
    if (historyError) {
      console.error('❌ Status history creation failed:', historyError);
      return false;
    }
    
    console.log('✅ Status updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Status update error:', error);
    return false;
  }
}

/**
 * Test 4: Case Amendment
 */
async function testCaseAmendment(caseId) {
  console.log('🧪 Testing Case Amendment...');
  
  try {
    // First, get current case data
    const { data: currentCase, error: fetchError } = await supabase
      .from('case_bookings')
      .select('*')
      .eq('id', caseId)
      .single();
    
    if (fetchError) {
      console.error('❌ Case fetch for amendment failed:', fetchError);
      return false;
    }
    
    // Update case with amendments
    const { error: updateError } = await supabase
      .from('case_bookings')
      .update({
        hospital: testAmendment.hospital,
        department: testAmendment.department,
        is_amended: true,
        amended_by: 'test-user',
        amended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', caseId);
    
    if (updateError) {
      console.error('❌ Case amendment failed:', updateError);
      return false;
    }
    
    // Create amendment history
    const changes = [
      {
        field: 'Hospital',
        oldValue: currentCase.hospital,
        newValue: testAmendment.hospital
      },
      {
        field: 'Department',
        oldValue: currentCase.department,
        newValue: testAmendment.department
      }
    ];
    
    const { error: historyError } = await supabase
      .from('amendment_history')
      .insert([{
        case_id: caseId,
        amended_by: 'test-user',
        timestamp: new Date().toISOString(),
        reason: testAmendment.amendmentReason,
        changes: changes
      }]);
    
    if (historyError) {
      console.error('❌ Amendment history creation failed:', historyError);
      return false;
    }
    
    console.log('✅ Case amended successfully');
    return true;
  } catch (error) {
    console.error('❌ Case amendment error:', error);
    return false;
  }
}

/**
 * Test 5: Data Verification After Amendment
 */
async function testDataVerification(caseId) {
  console.log('🧪 Testing Data Verification After Amendment...');
  
  try {
    const { data, error } = await supabase
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
        ),
        amendment_history (
          id,
          amended_by,
          timestamp,
          reason,
          changes
        )
      `)
      .eq('id', caseId)
      .single();
    
    if (error) {
      console.error('❌ Data verification failed:', error);
      return false;
    }
    
    // Verify the data
    const isHospitalCorrect = data.hospital === testAmendment.hospital;
    const isDepartmentCorrect = data.department === testAmendment.department;
    const isAmendedFlagSet = data.is_amended === true;
    const hasAmendmentHistory = data.amendment_history && data.amendment_history.length > 0;
    const hasStatusHistory = data.status_history && data.status_history.length > 0;
    
    console.log('  - Hospital Updated:', isHospitalCorrect ? '✅' : '❌', data.hospital);
    console.log('  - Department Updated:', isDepartmentCorrect ? '✅' : '❌', data.department);
    console.log('  - Amended Flag Set:', isAmendedFlagSet ? '✅' : '❌');
    console.log('  - Amendment History Created:', hasAmendmentHistory ? '✅' : '❌');
    console.log('  - Status History Exists:', hasStatusHistory ? '✅' : '❌');
    
    const allTestsPassed = isHospitalCorrect && isDepartmentCorrect && isAmendedFlagSet && hasAmendmentHistory && hasStatusHistory;
    
    if (allTestsPassed) {
      console.log('✅ All data verification tests passed');
    } else {
      console.log('❌ Some data verification tests failed');
    }
    
    return allTestsPassed;
  } catch (error) {
    console.error('❌ Data verification error:', error);
    return false;
  }
}

/**
 * Test 6: Global Tables Initialization
 */
async function testGlobalTables() {
  console.log('🧪 Testing Global Tables...');
  
  try {
    // Check if countries table exists
    const { data, error } = await supabase
      .from('code_tables')
      .select('*')
      .eq('table_type', 'countries')
      .eq('country', 'GLB')
      .eq('is_active', true);
    
    if (error) {
      console.error('❌ Global tables query failed:', error);
      return false;
    }
    
    console.log('✅ Global tables query successful');
    console.log('  - Countries found:', data ? data.length : 0);
    
    // If no countries found, initialize them
    if (!data || data.length === 0) {
      console.log('🔄 Initializing default countries...');
      
      const defaultCountries = [
        'Singapore', 'Malaysia', 'Philippines', 'Indonesia', 
        'Vietnam', 'Hong Kong', 'Thailand', 'Global'
      ];
      
      const countryData = defaultCountries.map(country => ({
        country: 'GLB',
        table_type: 'countries',
        code: country.substring(0, 3).toUpperCase(),
        display_name: country,
        is_active: true
      }));
      
      const { error: insertError } = await supabase
        .from('code_tables')
        .insert(countryData);
      
      if (insertError) {
        console.error('❌ Countries initialization failed:', insertError);
        return false;
      }
      
      console.log('✅ Default countries initialized');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Global tables test error:', error);
    return false;
  }
}

/**
 * Test 7: Cleanup
 */
async function testCleanup(caseId) {
  console.log('🧪 Cleaning up test data...');
  
  try {
    // Delete status history
    await supabase
      .from('status_history')
      .delete()
      .eq('case_id', caseId);
    
    // Delete amendment history
    await supabase
      .from('amendment_history')
      .delete()
      .eq('case_id', caseId);
    
    // Delete case
    const { error } = await supabase
      .from('case_bookings')
      .delete()
      .eq('id', caseId);
    
    if (error) {
      console.error('❌ Cleanup failed:', error);
      return false;
    }
    
    console.log('✅ Test data cleaned up successfully');
    return true;
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return false;
  }
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Supabase Data Flow Test\n');
  
  let testsPassed = 0;
  let totalTests = 7;
  
  // Test 1: Case Creation
  const caseId = await testCaseCreation();
  if (caseId) testsPassed++;
  
  if (!caseId) {
    console.log('❌ Cannot continue tests without a valid case ID');
    return;
  }
  
  // Test 2: Case Retrieval
  if (await testCaseRetrieval(caseId)) testsPassed++;
  
  // Test 3: Status Update
  if (await testStatusUpdate(caseId)) testsPassed++;
  
  // Test 4: Case Amendment
  if (await testCaseAmendment(caseId)) testsPassed++;
  
  // Test 5: Data Verification
  if (await testDataVerification(caseId)) testsPassed++;
  
  // Test 6: Global Tables
  if (await testGlobalTables()) testsPassed++;
  
  // Test 7: Cleanup
  if (await testCleanup(caseId)) testsPassed++;
  
  // Results
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${testsPassed}/${totalTests} tests passed`);
  
  if (testsPassed === totalTests) {
    console.log('🎉 All tests passed! Supabase data flow is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
  
  console.log('='.repeat(50));
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testCaseCreation,
  testCaseRetrieval,
  testStatusUpdate,
  testCaseAmendment,
  testDataVerification,
  testGlobalTables,
  testCleanup
};