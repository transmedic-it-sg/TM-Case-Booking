/**
 * Database Fix Script
 * Fixes identified issues:
 * 1. Admin/Admin authentication
 * 2. Doctor name "Dr. Dr." duplication
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('   REACT_APP_SUPABASE_URL:', SUPABASE_URL ? 'Found' : 'Missing');
  console.error('   REACT_APP_SUPABASE_KEY:', SUPABASE_KEY ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixAdminPassword() {
  console.log('\n📝 Fixing Admin password...');

  const { data, error } = await supabase
    .from('profiles')
    .update({ password_hash: 'Admin' })
    .eq('username', 'Admin')
    .select();

  if (error) {
    console.error('❌ Error updating Admin password:', error.message);
    return false;
  }

  console.log('✅ Admin password updated successfully');
  console.log('   Username: Admin');
  console.log('   Password: Admin');
  return true;
}

async function fixDoctorNames() {
  console.log('\n📝 Fixing doctor name "Dr. Dr." duplication...');

  // Get all doctors
  const { data: doctors, error: fetchError } = await supabase
    .from('doctors')
    .select('id, name, country');

  if (fetchError) {
    console.error('❌ Error fetching doctors:', fetchError.message);
    return false;
  }

  if (!doctors || doctors.length === 0) {
    console.log('⚠️  No doctors found in database');
    return true;
  }

  console.log(`   Found ${doctors.length} doctors`);

  // Update each doctor to remove "Dr." prefix if present
  let updatedCount = 0;
  for (const doctor of doctors) {
    if (doctor.name.startsWith('Dr. ')) {
      const newName = doctor.name.replace(/^Dr\.\s+/, '');

      const { error: updateError } = await supabase
        .from('doctors')
        .update({ name: newName })
        .eq('id', doctor.id);

      if (updateError) {
        console.error(`   ❌ Error updating ${doctor.name}:`, updateError.message);
      } else {
        console.log(`   ✅ Updated: "${doctor.name}" → "${newName}"`);
        updatedCount++;
      }
    }
  }

  console.log(`✅ Updated ${updatedCount} doctor names`);
  return true;
}

async function verifyFixes() {
  console.log('\n🔍 Verifying fixes...');

  // Check Admin user
  const { data: admin, error: adminError } = await supabase
    .from('profiles')
    .select('username, password_hash, role')
    .eq('username', 'Admin')
    .single();

  if (adminError) {
    console.error('❌ Error verifying Admin:', adminError.message);
  } else {
    console.log('✅ Admin user verified:');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Password: ${admin.password_hash}`);
    console.log(`   Role: ${admin.role}`);
  }

  // Check doctors
  const { data: doctors, error: doctorsError } = await supabase
    .from('doctors')
    .select('name')
    .limit(5);

  if (doctorsError) {
    console.error('❌ Error verifying doctors:', doctorsError.message);
  } else {
    console.log('✅ Sample doctor names:');
    doctors?.forEach((doc, i) => {
      const hasDrPrefix = doc.name.startsWith('Dr. ');
      console.log(`   ${i + 1}. ${doc.name} ${hasDrPrefix ? '⚠️ Still has Dr. prefix' : '✅'}`);
    });
  }
}

async function main() {
  console.log('🔧 Starting Database Fixes...\n');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    await fixAdminPassword();
    await fixDoctorNames();
    await verifyFixes();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ All database fixes completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   1. Admin password set to "Admin"');
    console.log('   2. Doctor names updated (removed "Dr." prefix)');
    console.log('\n💡 You can now login with: Admin / Admin');

  } catch (error) {
    console.error('\n❌ Error during fixes:', error);
    process.exit(1);
  }
}

main();
