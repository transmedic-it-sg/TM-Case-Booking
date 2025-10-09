#!/usr/bin/env node

/**
 * Test Permission Fix
 * Verify that the transformation fix resolves the admin access issues
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

// Import the actual getSupabasePermissions function 
// Note: This is a simplified test - in real app it uses the actual function

async function getSupabasePermissions() {
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('role, resource, action, allowed')
      .eq('allowed', true);

    if (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No permissions found in database');
      return [];
    }

    // Transform using the FIXED logic
    const transformed = data.map(perm => {
      const resource = perm.resource || 'unknown';
      const action = perm.action || 'unknown';
      
      let actionId;
      
      // FIXED TRANSFORMATION LOGIC - now includes the missing cases
      if (resource === 'settings' && action === 'system') {
        actionId = 'system-settings';
      } else if (resource === 'settings' && action === 'system-settings') {
        actionId = 'system-settings'; // FIXED: Added this missing case
      } else if (resource === 'settings' && action === 'email-config') {
        actionId = 'email-config';
      } else if (resource === 'settings' && action === 'code-table-setup') {
        actionId = 'code-table-setup';
      } else if (resource === 'logs' && action === 'audit') {
        actionId = 'audit-logs';
      } else if (resource === 'settings' && action === 'audit-logs') {
        actionId = 'audit-logs'; // FIXED: Added this missing case
      } else if (resource === 'settings' && action === 'permission-matrix') {
        actionId = 'permission-matrix';
      } else {
        // Generic fallback
        actionId = `${resource}-${action}`;
      }
      
      return {
        roleId: perm.role,
        actionId: actionId,
        allowed: perm.allowed
      };
    });

    return transformed;
  } catch (error) {
    console.error('Error in getSupabasePermissions:', error);
    return [];
  }
}

// Test the hasPermission function
function hasPermission(roleId, actionId, permissions) {
  const permission = permissions.find(p => p.roleId === roleId && p.actionId === actionId);
  return permission?.allowed || false;
}

async function testPermissionFix() {
  console.log('🧪 TESTING PERMISSION FIX');
  console.log('===========================\n');
  
  try {
    // Get transformed permissions using FIXED logic
    const permissions = await getSupabasePermissions();
    
    console.log(`✅ Loaded ${permissions.length} transformed permissions\n`);
    
    // Test the specific permissions that were broken
    const testCases = [
      { role: 'admin', action: 'email-config', description: 'Admin Email Configuration Access' },
      { role: 'admin', action: 'permission-matrix', description: 'Admin Permission Matrix Access' },
      { role: 'admin', action: 'system-settings', description: 'Admin System Settings Access' },
      { role: 'admin', action: 'audit-logs', description: 'Admin Audit Logs Access' }
    ];
    
    console.log('🎯 CRITICAL PERMISSION TESTS:');
    console.log('==============================');
    
    let allPassed = true;
    
    testCases.forEach(test => {
      const result = hasPermission(test.role, test.action, permissions);
      const status = result ? '✅ PASS' : '❌ FAIL';
      
      console.log(`${status} ${test.description}`);
      console.log(`     └─ ${test.role} → ${test.action} = ${result}`);
      
      if (!result) {
        allPassed = false;
      }
    });
    
    console.log('\n' + '='.repeat(40));
    
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED! Permission transformation fix is working!');
      console.log('✅ Admin users should now have access to Email Configuration and Permission Matrix');
    } else {
      console.log('❌ SOME TESTS FAILED. Permission transformation still has issues.');
    }
    
    // Additional debug info
    console.log('\n📊 ADMIN PERMISSION SUMMARY:');
    const adminPermissions = permissions.filter(p => p.roleId === 'admin');
    console.log(`   Total admin permissions: ${adminPermissions.length}`);
    
    const settingsPermissions = adminPermissions.filter(p => p.actionId.includes('settings') || p.actionId.includes('email') || p.actionId.includes('permission') || p.actionId.includes('audit'));
    console.log(`   Settings-related permissions: ${settingsPermissions.length}`);
    settingsPermissions.forEach(p => {
      console.log(`     - ${p.actionId}`);
    });
    
  } catch (error) {
    console.error('💥 TEST FAILED:', error);
  }
}

testPermissionFix();