/**
 * Full Application Health Check
 * Comprehensive validation of all critical functionality
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let passed = 0;
let failed = 0;

function logTest(name, success, message) {
  if (success) {
    console.log(`✅ ${name}: ${message}`);
    passed++;
  } else {
    console.log(`❌ ${name}: ${message}`);
    failed++;
  }
}

async function checkDatabaseConnectivity() {
  console.log('\n📡 DATABASE CONNECTIVITY CHECK');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1).single();
    logTest('Database connection', !error, error ? error.message : 'Connected successfully');
  } catch (error) {
    logTest('Database connection', false, error.message);
  }
}

async function checkCriticalTables() {
  console.log('\n📋 CRITICAL TABLES CHECK');
  console.log('═══════════════════════════════════════════════════════════');

  const tables = ['profiles', 'doctors', 'doctor_procedures', 'surgery_sets', 'implant_boxes', 'departments'];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      logTest(`Table: ${table}`, !error, error ? error.message : `Accessible (${data?.length || 0} rows)`);
    } catch (error) {
      logTest(`Table: ${table}`, false, error.message);
    }
  }
}

async function checkAuthenticationFlow() {
  console.log('\n🔐 AUTHENTICATION FLOW CHECK');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // Check Admin user
    const { data: admin, error } = await supabase
      .from('profiles')
      .select('username, password_hash, role, enabled')
      .eq('username', 'Admin')
      .single();

    logTest('Admin user exists', !error && !!admin, error ? error.message : 'Found');
    logTest('Admin password correct', admin?.password_hash === 'Admin', `Password: ${admin?.password_hash}`);
    logTest('Admin enabled', admin?.enabled === true, `Enabled: ${admin?.enabled}`);

    // Check for other users
    const { data: users } = await supabase.from('profiles').select('username, role, enabled');
    logTest('User accounts', users && users.length > 0, `${users?.length || 0} users found`);

  } catch (error) {
    logTest('Authentication check', false, error.message);
  }
}

async function checkDoctorDataIntegrity() {
  console.log('\n👨‍⚕️ DOCTOR DATA INTEGRITY CHECK');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const { data: doctors, error } = await supabase
      .from('doctors')
      .select('id, name, is_active')
      .eq('is_active', true);

    logTest('Active doctors exist', !error && doctors && doctors.length > 0, `${doctors?.length || 0} active doctors`);

    // Check for "Dr. Dr." duplication
    const duplicates = doctors?.filter(d => d.name.startsWith('Dr. Dr.')) || [];
    logTest('No "Dr. Dr." duplication', duplicates.length === 0, duplicates.length === 0 ? 'Clean' : `${duplicates.length} issues`);

    // Check for empty names
    const emptyNames = doctors?.filter(d => !d.name || d.name.trim() === '') || [];
    logTest('No empty doctor names', emptyNames.length === 0, emptyNames.length === 0 ? 'All valid' : `${emptyNames.length} empty`);

  } catch (error) {
    logTest('Doctor data check', false, error.message);
  }
}

async function checkProcedureSetup() {
  console.log('\n🏥 PROCEDURE SETUP CHECK');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const { data: procedures, error } = await supabase
      .from('doctor_procedures')
      .select('id, procedure_type, doctor_id')
      .eq('is_active', true);

    logTest('Active procedures exist', !error && procedures && procedures.length > 0, `${procedures?.length || 0} procedures`);

    // Check for orphaned procedures (doctor doesn't exist)
    const { data: doctors } = await supabase.from('doctors').select('id');
    const doctorIds = new Set(doctors?.map(d => d.id));
    const orphaned = procedures?.filter(p => !doctorIds.has(p.doctor_id)) || [];
    logTest('No orphaned procedures', orphaned.length === 0, orphaned.length === 0 ? 'All linked' : `${orphaned.length} orphaned`);

  } catch (error) {
    logTest('Procedure setup check', false, error.message);
  }
}

async function checkSurgerySetsAndImplants() {
  console.log('\n🔧 SURGERY SETS & IMPLANT BOXES CHECK');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const { data: surgerySets, error: ssError } = await supabase
      .from('surgery_sets')
      .select('id, name, doctor_id')
      .eq('is_active', true);

    logTest('Active surgery sets', !ssError && surgerySets && surgerySets.length > 0, `${surgerySets?.length || 0} sets`);

    const { data: implantBoxes, error: ibError } = await supabase
      .from('implant_boxes')
      .select('id, name, doctor_id')
      .eq('is_active', true);

    logTest('Active implant boxes', !ibError && implantBoxes && implantBoxes.length > 0, `${implantBoxes?.length || 0} boxes`);

  } catch (error) {
    logTest('Surgery sets/implants check', false, error.message);
  }
}

function checkCriticalFiles() {
  console.log('\n📁 CRITICAL FILES CHECK');
  console.log('═══════════════════════════════════════════════════════════');

  const criticalFiles = [
    'src/App.tsx',
    'src/components/Login.tsx',
    'src/components/CaseBookingForm.tsx',
    'src/components/EditSets/ModernEditSets.tsx',
    'src/utils/auth.ts',
    'src/lib/supabase.ts',
    'package.json',
    '.env'
  ];

  criticalFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    const exists = fs.existsSync(filePath);
    logTest(`File: ${file}`, exists, exists ? 'Exists' : 'Missing');
  });
}

function checkEnvironmentVariables() {
  console.log('\n🔧 ENVIRONMENT VARIABLES CHECK');
  console.log('═══════════════════════════════════════════════════════════');

  const requiredEnvVars = [
    'REACT_APP_SUPABASE_URL',
    'REACT_APP_SUPABASE_ANON_KEY'
  ];

  requiredEnvVars.forEach(varName => {
    const exists = !!process.env[varName];
    logTest(`Env var: ${varName}`, exists, exists ? 'Set' : 'Missing');
  });
}

async function checkDependencies() {
  console.log('\n📦 DEPENDENCIES CHECK');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const packageJson = require('../package.json');
    const criticalDeps = [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      'typescript'
    ];

    criticalDeps.forEach(dep => {
      const hasDep = !!packageJson.dependencies[dep] || !!packageJson.devDependencies[dep];
      logTest(`Dependency: ${dep}`, hasDep, hasDep ? `v${packageJson.dependencies[dep] || packageJson.devDependencies[dep]}` : 'Missing');
    });

  } catch (error) {
    logTest('Dependencies check', false, error.message);
  }
}

async function main() {
  console.log('🔍 FULL APPLICATION HEALTH CHECK');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`⏰ Started: ${new Date().toLocaleTimeString()}\n`);

  await checkDatabaseConnectivity();
  await checkCriticalTables();
  await checkAuthenticationFlow();
  await checkDoctorDataIntegrity();
  await checkProcedureSetup();
  await checkSurgerySetsAndImplants();
  checkCriticalFiles();
  checkEnvironmentVariables();
  await checkDependencies();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log(`⏰ Completed: ${new Date().toLocaleTimeString()}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('🎉 ALL CHECKS PASSED! Application is healthy and ready.\n');
    console.log('✨ The application is:');
    console.log('   ✅ Connected to database');
    console.log('   ✅ All critical tables accessible');
    console.log('   ✅ Authentication configured');
    console.log('   ✅ Data integrity validated');
    console.log('   ✅ All critical files present');
    console.log('   ✅ Environment properly configured\n');
  } else {
    console.log(`⚠️  ${failed} CHECK(S) FAILED - Please review above.\n`);
    process.exit(1);
  }
}

main();
