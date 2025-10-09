#!/usr/bin/env node

/**
 * Test User Management Service Functions
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserManagement() {
  console.log('🧪 Testing User Management Functions...\n');
  
  // Test 1: Get all users
  console.log('📋 Test 1: Get All Users');
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, username, name, role, enabled, email, is_temporary_password')
      .order('username');

    if (error) {
      console.error('❌ Failed to get users:', error);
    } else {
      console.log('✅ Successfully retrieved users:', users.length);
      users.forEach(user => {
        console.log(`   - ${user.username} (${user.name}) - ${user.role} - ${user.enabled ? 'Enabled' : 'Disabled'}`);
      });
    }
  } catch (error) {
    console.error('💥 Exception getting users:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Update user (similar to what user management does)
  console.log('🔧 Test 2: Update User Profile');
  const testUserId = '58ed0cd2-5fcc-4d02-97bd-93777d9863d4'; // Sophia Tay
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', testUserId)
      .select();

    if (error) {
      console.error('❌ Failed to update user:', error);
    } else {
      console.log('✅ Successfully updated user profile');
      console.log('   Updated at:', data[0]?.updated_at);
    }
  } catch (error) {
    console.error('💥 Exception updating user:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Toggle user enabled status
  console.log('🔄 Test 3: Toggle User Status');
  
  try {
    // First get current status
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('enabled')
      .eq('id', testUserId)
      .single();

    const newStatus = !currentUser.enabled;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        enabled: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', testUserId)
      .select();

    if (error) {
      console.error('❌ Failed to toggle user status:', error);
    } else {
      console.log('✅ Successfully toggled user status');
      console.log(`   Status changed to: ${newStatus ? 'Enabled' : 'Disabled'}`);
      
      // Toggle back
      await supabase
        .from('profiles')
        .update({
          enabled: currentUser.enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', testUserId);
      console.log('   ↩️ Reverted status back to original');
    }
  } catch (error) {
    console.error('💥 Exception toggling status:', error.message);
  }

  console.log('\n🎉 User Management Tests Complete!');
}

testUserManagement();