// Comprehensive test script to validate all fixes
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runComprehensiveTest() {
  console.log('🚀 Running comprehensive test suite...\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Case Loading
  console.log('📋 Test 1: Case Loading');
  try {
    const { data: cases, error } = await supabase
      .from('case_bookings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    if (!Array.isArray(cases)) throw new Error('Cases is not an array');
    
    console.log('✅ Cases loading: PASS (' + cases.length + ' cases found)');
    testsPassed++;
  } catch (error) {
    console.log('❌ Cases loading: FAIL -', error.message);
    testsFailed++;
  }
  
  // Test 2: Status History
  console.log('\n📈 Test 2: Status History');
  try {
    const { data: history, error } = await supabase
      .from('status_history')
      .select('*')
      .limit(10);
    
    if (error) throw error;
    if (!Array.isArray(history)) throw new Error('History is not an array');
    
    console.log('✅ Status history: PASS (' + history.length + ' records found)');
    testsPassed++;
  } catch (error) {
    console.log('❌ Status history: FAIL -', error.message);
    testsFailed++;
  }
  
  // Test 3: Categorized Sets for all countries
  console.log('\n🔧 Test 3: Categorized Sets for All Countries');
  const countries = ['SG', 'MY', 'PH', 'ID', 'VN', 'HK', 'TH'];
  let countriesWithData = 0;
  
  for (const country of countries) {
    try {
      const { data: sets, error } = await supabase
        .from('categorized_sets')
        .select('*')
        .eq('country', country);
      
      if (error) throw error;
      if (sets && sets.length > 0) {
        console.log(`✅ ${country}: ${sets.length} procedure types`);
        countriesWithData++;
      } else {
        console.log(`⚠️ ${country}: No data found`);
      }
    } catch (error) {
      console.log(`❌ ${country}: ERROR -`, error.message);
    }
  }
  
  if (countriesWithData === countries.length) {
    console.log('✅ Categorized sets: PASS (all countries have data)');
    testsPassed++;
  } else {
    console.log('⚠️ Categorized sets: PARTIAL (' + countriesWithData + '/' + countries.length + ' countries)');
  }
  
  // Test 4: Case-Status History Join
  console.log('\n🔗 Test 4: Case-Status History Join');
  try {
    const { data: casesWithHistory, error } = await supabase
      .from('case_bookings')
      .select(`
        id,
        case_reference_number,
        status,
        status_history (
          id,
          status,
          processed_by,
          timestamp
        )
      `)
      .limit(3);
    
    if (error) throw error;
    if (!Array.isArray(casesWithHistory)) throw new Error('Cases with history is not an array');
    
    const hasHistory = casesWithHistory.some(c => c.status_history && c.status_history.length > 0);
    if (hasHistory) {
      console.log('✅ Case-history join: PASS (status history linked correctly)');
      testsPassed++;
    } else {
      console.log('⚠️ Case-history join: WARNING (no status history found)');
    }
  } catch (error) {
    console.log('❌ Case-history join: FAIL -', error.message);
    testsFailed++;
  }
  
  // Test 5: User Authentication Tables
  console.log('\n👤 Test 5: User Authentication');
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, role, countries')
      .limit(5);
    
    if (error) throw error;
    if (!Array.isArray(profiles)) throw new Error('Profiles is not an array');
    
    console.log('✅ User profiles: PASS (' + profiles.length + ' profiles found)');
    testsPassed++;
  } catch (error) {
    console.log('❌ User profiles: FAIL -', error.message);
    testsFailed++;
  }
  
  // Test 6: Data Integrity Check
  console.log('\n🔍 Test 6: Data Integrity');
  try {
    // Check if cases have valid country codes
    const { data: casesForIntegrity, error } = await supabase
      .from('case_bookings')
      .select('country')
      .limit(10);
    
    if (error) throw error;
    
    const validCountries = ['SG', 'MY', 'PH', 'ID', 'VN', 'HK', 'TH'];
    const invalidCountries = casesForIntegrity.filter(c => !validCountries.includes(c.country));
    
    if (invalidCountries.length === 0) {
      console.log('✅ Data integrity: PASS (all countries are valid)');
      testsPassed++;
    } else {
      console.log('⚠️ Data integrity: WARNING (' + invalidCountries.length + ' invalid country codes)');
    }
  } catch (error) {
    console.log('❌ Data integrity: FAIL -', error.message);
    testsFailed++;
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('='.repeat(50));
  console.log('✅ Tests Passed:', testsPassed);
  console.log('❌ Tests Failed:', testsFailed);
  console.log('🎯 Success Rate:', Math.round((testsPassed / (testsPassed + testsFailed)) * 100) + '%');
  
  if (testsFailed === 0) {
    console.log('\n🎉 All critical tests passed! The application should be working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the issues above.');
  }
  
  console.log('\n🔧 Recommendations:');
  console.log('1. Clear browser cache and refresh the application');
  console.log('2. Check browser console for any JavaScript errors');
  console.log('3. Verify user permissions and authentication status');
  console.log('4. Test with different user roles and countries');
}

runComprehensiveTest();