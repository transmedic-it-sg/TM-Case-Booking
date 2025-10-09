#!/usr/bin/env node

/**
 * Test Admin Permission Matrix Access
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminPermissions() {
  console.log('🔐 Testing Admin Permission Matrix Access...\n');
  
  try {
    // Test 1: Check if admin user exists and has admin role
    console.log('📋 Test 1: Verify admin user and role');
    const { data: adminUser, error: userError } = await supabase
      .from('profiles')
      .select('username, role, enabled')
      .eq('username', 'Admin')
      .single();

    if (userError || !adminUser) {
      console.error('❌ Admin user not found:', userError);
      return;
    }

    console.log('✅ Admin user found:');
    console.log(`   - Username: ${adminUser.username}`);
    console.log(`   - Role: ${adminUser.role}`);
    console.log(`   - Enabled: ${adminUser.enabled}`);

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Check permission-matrix permission in database
    console.log('🔧 Test 2: Check permission-matrix permission in database');
    const { data: permissions, error: permError } = await supabase
      .from('permissions')
      .select('*')
      .eq('action', 'permission-matrix');

    if (permError) {
      console.error('❌ Error checking permissions:', permError);
    } else {
      console.log('✅ Permission-matrix permissions in database:');
      if (permissions.length === 0) {
        console.log('   - No permission-matrix permissions found in database');
        console.log('   - This is expected - admin hardcoded logic should handle this');
      } else {
        permissions.forEach(perm => {
          console.log(`   - Role: ${perm.role}, Action: ${perm.action}, Allowed: ${perm.allowed}`);
        });
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Check all permissions for admin role
    console.log('🔧 Test 3: Check all permissions for admin role');
    const { data: adminPermissions, error: adminPermError } = await supabase
      .from('permissions')
      .select('*')
      .eq('role', 'admin');

    if (adminPermError) {
      console.error('❌ Error checking admin permissions:', adminPermError);
    } else {
      console.log('✅ Admin permissions in database:');
      if (adminPermissions.length === 0) {
        console.log('   - No admin permissions found in database');
        console.log('   - This is expected - admin should have hardcoded access to everything');
      } else {
        console.log(`   - Found ${adminPermissions.length} admin permissions:`);
        adminPermissions.forEach(perm => {
          console.log(`     * ${perm.action}: ${perm.allowed}`);
        });
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Check system permission actions
    console.log('🔧 Test 4: Check what system permission actions exist');
    const { data: allSystemActions, error: actionsError } = await supabase
      .from('permissions')
      .select('action')
      .like('action', '%system%')
      .or('action.like.%permission%,action.like.%matrix%,action.like.%admin%');

    if (actionsError) {
      console.error('❌ Error checking system actions:', actionsError);
    } else {
      console.log('✅ System-related permission actions in database:');
      const uniqueActions = [...new Set(allSystemActions.map(a => a.action))];
      if (uniqueActions.length === 0) {
        console.log('   - No system-related actions found');
      } else {
        uniqueActions.forEach(action => {
          console.log(`   - ${action}`);
        });
      }
    }

    console.log('\n🎯 DIAGNOSIS:');
    console.log('If admin has no permissions in database but has role="admin",');
    console.log('then the issue is likely in the JavaScript hasPermission function');
    console.log('not properly implementing the hardcoded admin logic.');

  } catch (error) {
    console.error('💥 Exception:', error.message);
  }
}

testAdminPermissions();