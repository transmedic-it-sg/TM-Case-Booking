#!/usr/bin/env node

/**
 * Debug Live Application Issue
 * Check what's happening in the actual live application with admin permissions
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLiveIssue() {
  console.log('🔥 DEBUGGING LIVE APPLICATION ISSUE');
  console.log('=====================================\n');
  
  try {
    // 1. Check if the admin user exists and what their exact details are
    console.log('1. 👤 CHECKING ADMIN USER DETAILS:');
    const { data: adminUsers, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin');
    
    if (userError) {
      console.error('❌ Error fetching admin users:', userError);
      return;
    }
    
    if (!adminUsers || adminUsers.length === 0) {
      console.log('❌ NO ADMIN USERS FOUND IN PROFILES TABLE!');
      return;
    }
    
    console.log(`✅ Found ${adminUsers.length} admin user(s):`);
    adminUsers.forEach(user => {
      console.log(`   📋 Username: ${user.username}`);
      console.log(`   📋 Name: ${user.name}`);
      console.log(`   📋 Email: ${user.email}`);
      console.log(`   📋 Role: ${user.role}`);
      console.log(`   📋 Enabled: ${user.enabled}`);
      console.log(`   📋 ID: ${user.id}`);
      console.log('   ' + '-'.repeat(40));
    });
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. Check the exact permissions for admin role in the database
    console.log('2. 🔐 CHECKING ADMIN PERMISSIONS IN DATABASE:');
    const { data: rawPermissions, error: permError } = await supabase
      .from('permissions')
      .select('role, resource, action, allowed')
      .eq('role', 'admin')
      .eq('allowed', true)
      .order('resource')
      .order('action');
    
    if (permError) {
      console.error('❌ Error fetching permissions:', permError);
      return;
    }
    
    console.log(`✅ Found ${rawPermissions.length} admin permissions:`);
    
    // Group by resource for better readability
    const groupedPerms = rawPermissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) acc[perm.resource] = [];
      acc[perm.resource].push(perm.action);
      return acc;
    }, {});
    
    Object.entries(groupedPerms).forEach(([resource, actions]) => {
      console.log(`   🔹 ${resource}: ${actions.join(', ')}`);
    });
    
    // Check specifically for the problematic permissions
    const criticalPerms = rawPermissions.filter(p => 
      ['email-config', 'permission-matrix', 'system-settings', 'audit-logs'].includes(p.action) ||
      (p.resource === 'settings' && ['email-config', 'permission-matrix', 'system-settings', 'audit-logs'].includes(p.action))
    );
    
    console.log(`\n🎯 CRITICAL PERMISSIONS (${criticalPerms.length}):`);
    criticalPerms.forEach(perm => {
      console.log(`   ✅ ${perm.resource}.${perm.action} = ${perm.allowed}`);
    });
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. Test the actual transformation that happens in the app
    console.log('3. 🔄 TESTING PERMISSION TRANSFORMATION:');
    
    // Import and use the actual getSupabasePermissions logic
    console.log('   Loading permissions using actual app logic...');
    
    // Check if the getSupabasePermissions function is working correctly
    const testPermissions = rawPermissions.map(perm => {
      const resource = perm.resource || 'unknown';
      const action = perm.action || 'unknown';
      
      let actionId;
      
      // Use the EXACT logic from supabasePermissionService.ts
      if (resource === 'settings' && action === 'system') {
        actionId = 'system-settings';
      } else if (resource === 'settings' && action === 'system-settings') {
        actionId = 'system-settings';
      } else if (resource === 'settings' && action === 'email-config') {
        actionId = 'email-config';
      } else if (resource === 'settings' && action === 'code-table-setup') {
        actionId = 'code-table-setup';
      } else if (resource === 'logs' && action === 'audit') {
        actionId = 'audit-logs';
      } else if (resource === 'settings' && action === 'audit-logs') {
        actionId = 'audit-logs';
      } else if (resource === 'settings' && action === 'permission-matrix') {
        actionId = 'permission-matrix';
      } else {
        // Fallback - this is where issues might occur
        console.log(`   ⚠️  Using fallback for ${resource}.${action}`);
        actionId = `${resource}-${action}`;
      }
      
      return {
        roleId: perm.role,
        actionId: actionId,
        allowed: perm.allowed,
        originalResource: resource,
        originalAction: action
      };
    });
    
    // Check the critical permissions after transformation
    const transformedCritical = testPermissions.filter(p => 
      ['email-config', 'permission-matrix', 'system-settings', 'audit-logs'].includes(p.actionId)
    );
    
    console.log(`   ✅ After transformation, found ${transformedCritical.length} critical permissions:`);
    transformedCritical.forEach(perm => {
      console.log(`   🔄 ${perm.originalResource}.${perm.originalAction} → ${perm.actionId} = ${perm.allowed}`);
    });
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 4. Test the hasPermission function logic
    console.log('4. 🧪 TESTING hasPermission FUNCTION:');
    
    function testHasPermission(roleId, actionId, permissions) {
      const permission = permissions.find(p => p.roleId === roleId && p.actionId === actionId);
      const result = permission?.allowed || false;
      
      console.log(`   🔍 hasPermission('${roleId}', '${actionId}') = ${result}`);
      if (permission) {
        console.log(`     ✅ Found permission: ${permission.originalResource}.${permission.originalAction} → ${permission.actionId}`);
      } else {
        console.log(`     ❌ Permission not found`);
        // Show what permissions ARE available for this role
        const rolePerms = permissions.filter(p => p.roleId === roleId).map(p => p.actionId);
        console.log(`     📋 Available permissions for ${roleId}: ${rolePerms.slice(0, 10).join(', ')}${rolePerms.length > 10 ? '...' : ''}`);
      }
      
      return result;
    }
    
    // Test the specific permissions causing issues
    const testCases = [
      { role: 'admin', action: 'email-config' },
      { role: 'admin', action: 'permission-matrix' },
      { role: 'admin', action: 'system-settings' },
      { role: 'admin', action: 'audit-logs' }
    ];
    
    testCases.forEach(test => {
      testHasPermission(test.role, test.action, testPermissions);
    });
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 5. Check if there's a permission cache issue
    console.log('5. 🔄 CHECKING FOR POTENTIAL CACHE ISSUES:');
    
    // Check if permissions are being retrieved multiple times with different results
    const uniqueActions = [...new Set(testPermissions.map(p => p.actionId))];
    console.log(`   📊 Total unique actionIds after transformation: ${uniqueActions.length}`);
    
    // Look for duplicates or inconsistencies
    const actionCounts = testPermissions.reduce((acc, perm) => {
      acc[perm.actionId] = (acc[perm.actionId] || 0) + 1;
      return acc;
    }, {});
    
    const duplicates = Object.entries(actionCounts).filter(([action, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log(`   ⚠️  Found duplicate actionIds:`);
      duplicates.forEach(([action, count]) => {
        console.log(`     - ${action}: ${count} occurrences`);
      });
    } else {
      console.log(`   ✅ No duplicate actionIds found`);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 6. Final diagnosis
    console.log('6. 🎯 DIAGNOSIS & NEXT STEPS:');
    
    const hasEmailConfig = transformedCritical.some(p => p.actionId === 'email-config' && p.allowed);
    const hasPermissionMatrix = transformedCritical.some(p => p.actionId === 'permission-matrix' && p.allowed);
    const hasSystemSettings = transformedCritical.some(p => p.actionId === 'system-settings' && p.allowed);
    const hasAuditLogs = transformedCritical.some(p => p.actionId === 'audit-logs' && p.allowed);
    
    if (hasEmailConfig && hasPermissionMatrix && hasSystemSettings && hasAuditLogs) {
      console.log('✅ All critical permissions are present in the database and transform correctly');
      console.log('❓ The issue is likely:');
      console.log('   1. Permission cache not refreshing in the browser');
      console.log('   2. User session not loading the correct role');
      console.log('   3. Frontend hasPermission function not being called correctly');
      console.log('   4. Race condition between user loading and permission loading');
      console.log('');
      console.log('🔧 RECOMMENDED NEXT STEPS:');
      console.log('   1. Clear browser cache and localStorage completely');
      console.log('   2. Check browser console for permission-related errors');
      console.log('   3. Verify user role is being retrieved correctly in UserService');
      console.log('   4. Check if permission cache is being initialized on login');
    } else {
      console.log('❌ Missing critical permissions in database:');
      console.log(`   - email-config: ${hasEmailConfig ? '✅' : '❌'}`);
      console.log(`   - permission-matrix: ${hasPermissionMatrix ? '✅' : '❌'}`);
      console.log(`   - system-settings: ${hasSystemSettings ? '✅' : '❌'}`);
      console.log(`   - audit-logs: ${hasAuditLogs ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error('💥 DEBUGGING FAILED:', error);
  }
}

debugLiveIssue();