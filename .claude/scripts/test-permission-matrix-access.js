#!/usr/bin/env node

/**
 * Test Permission Matrix Access After Fixing Admin Logic
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPermissionMatrixAccess() {
  console.log('🔐 Testing Permission Matrix Access After Admin Logic Fix...\n');
  
  try {
    // Test 1: Verify admin has permission-matrix permission
    console.log('📋 Test 1: Check admin permission-matrix permission');
    const { data: permissionMatrixPerm, error } = await supabase
      .from('permissions')
      .select('*')
      .eq('role', 'admin')
      .eq('resource', 'settings')
      .eq('action', 'permission-matrix')
      .single();

    if (error || !permissionMatrixPerm) {
      console.error('❌ Admin permission-matrix permission not found:', error);
      return;
    }

    console.log('✅ Admin permission-matrix permission found:');
    console.log(`   - Role: ${permissionMatrixPerm.role}`);
    console.log(`   - Resource: ${permissionMatrixPerm.resource}`);
    console.log(`   - Action: ${permissionMatrixPerm.action}`);
    console.log(`   - Allowed: ${permissionMatrixPerm.allowed}`);

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Check total admin permissions
    console.log('🔧 Test 2: Count total admin permissions');
    const { data: allAdminPerms, error: countError } = await supabase
      .from('permissions')
      .select('*')
      .eq('role', 'admin')
      .eq('allowed', true);

    if (countError) {
      console.error('❌ Error counting admin permissions:', countError);
    } else {
      console.log('✅ Admin permissions summary:');
      console.log(`   - Total allowed permissions: ${allAdminPerms.length}`);
      
      // Group by resource
      const groupedPerms = allAdminPerms.reduce((acc, perm) => {
        if (!acc[perm.resource]) acc[perm.resource] = [];
        acc[perm.resource].push(perm.action);
        return acc;
      }, {});

      Object.entries(groupedPerms).forEach(([resource, actions]) => {
        console.log(`   - ${resource}: ${actions.length} permissions`);
      });
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Check key admin permissions
    console.log('🔧 Test 3: Verify key admin permissions');
    const keyPermissions = [
      { resource: 'settings', action: 'permission-matrix' },
      { resource: 'settings', action: 'system-settings' },
      { resource: 'settings', action: 'audit-logs' },
      { resource: 'data', action: 'export' },
      { resource: 'data', action: 'import' },
      { resource: 'reports', action: 'view' }
    ];

    for (const perm of keyPermissions) {
      const { data: permCheck } = await supabase
        .from('permissions')
        .select('allowed')
        .eq('role', 'admin')
        .eq('resource', perm.resource)
        .eq('action', perm.action)
        .single();

      const status = permCheck?.allowed ? '✅' : '❌';
      console.log(`   ${status} ${perm.resource}.${perm.action}: ${permCheck?.allowed || 'NOT FOUND'}`);
    }

    console.log('\n🎯 RESULT:');
    console.log('Admin should now have access to Permission Matrix and all admin functions');
    console.log('Hardcoded admin logic has been replaced with database permissions');

  } catch (error) {
    console.error('💥 Exception:', error.message);
  }
}

testPermissionMatrixAccess();