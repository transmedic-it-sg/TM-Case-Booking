/**
 * Comprehensive Test Script for All Fixes
 * Tests:
 * 1. Admin/Admin login
 * 2. Doctor name display (no "Dr. Dr.")
 * 3. Database integrity
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let passedTests = 0;
let failedTests = 0;

function logTest(name, passed, message) {
  if (passed) {
    console.log(`✅ ${name}: ${message}`);
    passedTests++;
  } else {
    console.log(`❌ ${name}: ${message}`);
    failedTests++;
  }
}

async function testAdminLogin() {
  console.log('\n📋 Test 1: Admin/Admin Authentication');
  console.log('══════════════════════════════════════');

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, password_hash, role')
      .eq('username', 'Admin')
      .single();

    if (error) throw error;

    logTest(
      'Admin user exists',
      !!data,
      data ? `Found user with role: ${data.role}` : 'Not found'
    );

    logTest(
      'Admin password is correct',
      data?.password_hash === 'Admin',
      `Password: ${data?.password_hash === 'Admin' ? 'Admin ✓' : data?.password_hash + ' ✗'}`
    );

  } catch (error) {
    logTest('Admin user query', false, error.message);
  }
}

async function testDoctorNames() {
  console.log('\n📋 Test 2: Doctor Name Format (No "Dr. Dr.")');
  console.log('════════════════════════════════════════════════');

  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('id, name, country')
      .eq('is_active', true)
      .limit(10);

    if (error) throw error;

    logTest(
      'Doctors query successful',
      !!data,
      `Found ${data?.length || 0} active doctors`
    );

    if (data && data.length > 0) {
      const doctorsWithDrPrefix = data.filter(d => d.name.startsWith('Dr.'));

      logTest(
        'No doctors with "Dr." prefix',
        doctorsWithDrPrefix.length === 0,
        doctorsWithDrPrefix.length === 0
          ? 'All names are clean'
          : `Found ${doctorsWithDrPrefix.length} doctors with "Dr." prefix: ${doctorsWithDrPrefix.map(d => d.name).join(', ')}`
      );

      // Sample doctor names
      console.log('\n   Sample doctor names:');
      data.slice(0, 5).forEach((d, i) => {
        console.log(`     ${i + 1}. ${d.name} (${d.country})`);
      });
    }

  } catch (error) {
    logTest('Doctors query', false, error.message);
  }
}

async function testDatabaseIntegrity() {
  console.log('\n📋 Test 3: Database Integrity');
  console.log('═════════════════════════════');

  try {
    // Test profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, role')
      .limit(1);

    logTest(
      'Profiles table accessible',
      !profilesError && !!profiles,
      profilesError ? profilesError.message : `${profiles?.length || 0} profiles found`
    );

    // Test doctors table
    const { data: doctors, error: doctorsError } = await supabase
      .from('doctors')
      .select('id')
      .limit(1);

    logTest(
      'Doctors table accessible',
      !doctorsError && !!doctors,
      doctorsError ? doctorsError.message : `Table accessible`
    );

    // Test surgery_sets table
    const { data: surgerySets, error: surgerySetsError } = await supabase
      .from('surgery_sets')
      .select('id')
      .limit(1);

    logTest(
      'Surgery sets table accessible',
      !surgerySetsError && !!surgerySets,
      surgerySetsError ? surgerySetsError.message : `Table accessible`
    );

    // Test implant_boxes table
    const { data: implantBoxes, error: implantBoxesError } = await supabase
      .from('implant_boxes')
      .select('id')
      .limit(1);

    logTest(
      'Implant boxes table accessible',
      !implantBoxesError && !!implantBoxes,
      implantBoxesError ? implantBoxesError.message : `Table accessible`
    );

    // Test doctor_procedures table
    const { data: procedures, error: proceduresError } = await supabase
      .from('doctor_procedures')
      .select('id')
      .limit(1);

    logTest(
      'Doctor procedures table accessible',
      !proceduresError && !!procedures,
      proceduresError ? proceduresError.message : `Table accessible`
    );

  } catch (error) {
    logTest('Database integrity check', false, error.message);
  }
}

async function testEditSetsData() {
  console.log('\n📋 Test 4: Edit Sets Data Validation');
  console.log('═════════════════════════════════════');

  try {
    // Test doctor-procedure relationships
    const { data: doctorProcs, error: dpError } = await supabase
      .from('doctor_procedures')
      .select('id, procedure_type, doctor_id')
      .eq('is_active', true)
      .limit(5);

    logTest(
      'Active doctor procedures exist',
      !dpError && doctorProcs && doctorProcs.length > 0,
      dpError ? dpError.message : `Found ${doctorProcs?.length || 0} active procedures`
    );

    // Test surgery sets
    const { data: surgSets, error: ssError } = await supabase
      .from('surgery_sets')
      .select('id, name')
      .eq('is_active', true)
      .limit(5);

    logTest(
      'Active surgery sets exist',
      !ssError && surgSets && surgSets.length > 0,
      ssError ? ssError.message : `Found ${surgSets?.length || 0} active sets`
    );

    // Test implant boxes
    const { data: implBoxes, error: ibError } = await supabase
      .from('implant_boxes')
      .select('id, name')
      .eq('is_active', true)
      .limit(5);

    logTest(
      'Active implant boxes exist',
      !ibError && implBoxes && implBoxes.length > 0,
      ibError ? ibError.message : `Found ${implBoxes?.length || 0} active boxes`
    );

  } catch (error) {
    logTest('Edit sets data validation', false, error.message);
  }
}

async function main() {
  console.log('🧪 TM Case Booking - Comprehensive Test Suite\n');
  console.log('═══════════════════════════════════════════════════════════');

  await testAdminLogin();
  await testDoctorNames();
  await testDatabaseIntegrity();
  await testEditSetsData();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 Test Results Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failedTests === 0) {
    console.log('🎉 All tests passed! Application is ready for use.\n');
    console.log('✨ You can now:');
    console.log('   1. Login with: Admin / Admin');
    console.log('   2. Navigate to Edit Sets to manage data');
    console.log('   3. Edit/Delete surgery sets and implant boxes\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

main();
