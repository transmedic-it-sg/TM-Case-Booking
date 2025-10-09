#!/usr/bin/env node

/**
 * Debug Permission Flow Issues
 * Check what's happening in the actual permission checking process
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Mimic the exact permission transformation logic from supabasePermissionService.ts
 */
function transformSupabaseToPermissions(data) {
  return data.map(perm => {
    // If the data already has actionId field (mock test data), use it directly
    if (perm.actionId) {
      return {
        roleId: perm.roleId || perm.role,
        actionId: perm.actionId,
        allowed: perm.allowed
      };
    }
    
    // Otherwise, handle database format with resource + action fields
    const resource = perm.resource || 'unknown';
    const action = perm.action || 'unknown';
    
    // CRITICAL: Create proper actionId format that matches PERMISSION_ACTIONS
    let actionId;
    
    // System Settings (most relevant for our debug)
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
      // Generic fallback - just join with hyphen
      actionId = `${resource}-${action}`;
      console.log(`⚠️  Using generic transformation: ${resource}.${action} → ${actionId}`);
    }
    
    return {
      roleId: perm.role,
      actionId: actionId,
      allowed: perm.allowed
    };
  });
}

/**
 * Mimic the exact hasPermission logic from permissions.ts
 */
function hasPermission(roleId, actionId, permissions) {
  const permission = permissions.find(p => p.roleId === roleId && p.actionId === actionId);
  const result = permission?.allowed || false;
  
  console.log(`🔍 Permission Check: ${roleId}.${actionId}`);
  console.log(`   📋 Found permission: ${permission ? 'YES' : 'NO'}`);
  if (permission) {
    console.log(`   ✅ Allowed: ${permission.allowed}`);
  }
  console.log(`   🎯 Result: ${result}`);
  
  return result;
}

async function debugPermissionFlow() {
  console.log('🔍 DEBUGGING PERMISSION FLOW');
  console.log('===============================\n');
  
  try {
    // 1. Get admin permissions from database (raw)
    console.log('1. 📥 RAW DATABASE PERMISSIONS FOR ADMIN:');
    const { data: rawPermissions, error: rawError } = await supabase
      .from('permissions')
      .select('role, resource, action, allowed')
      .eq('role', 'admin')
      .eq('allowed', true);
    
    if (rawError) {
      console.error('❌ Error fetching raw permissions:', rawError);
      return;
    }
    
    console.log(`✅ Found ${rawPermissions.length} raw admin permissions:`);
    rawPermissions.forEach(perm => {
      console.log(`   - ${perm.role}.${perm.resource}.${perm.action} = ${perm.allowed}`);
    });
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. Transform permissions using the same logic as the app
    console.log('2. 🔄 TRANSFORMED PERMISSIONS:');
    const transformedPermissions = transformSupabaseToPermissions(rawPermissions);
    
    console.log(`✅ Transformed to ${transformedPermissions.length} permissions:`);
    transformedPermissions.forEach(perm => {
      console.log(`   - ${perm.roleId}.${perm.actionId} = ${perm.allowed}`);
    });
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. Test specific permission checks
    console.log('3. 🧪 TESTING SPECIFIC PERMISSION CHECKS:');
    
    const testCases = [
      { role: 'admin', action: 'email-config' },
      { role: 'admin', action: 'permission-matrix' },
      { role: 'admin', action: 'system-settings' },
      { role: 'admin', action: 'audit-logs' }
    ];
    
    testCases.forEach(test => {
      console.log(`\n🔍 Testing: ${test.role} trying to access ${test.action}`);
      const result = hasPermission(test.role, test.action, transformedPermissions);
      console.log(`   🎯 Final Result: ${result ? '✅ ALLOWED' : '❌ DENIED'}`);
    });
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 4. Check if any permissions are missing the expected format
    console.log('4. 🔎 CHECKING FOR TRANSFORMATION ISSUES:');
    
    const expectedActions = ['email-config', 'permission-matrix', 'system-settings', 'audit-logs'];
    const actualActions = transformedPermissions
      .filter(p => p.roleId === 'admin')
      .map(p => p.actionId);
    
    console.log(`✅ Expected actions: ${expectedActions.join(', ')}`);
    console.log(`✅ Actual actions: ${actualActions.join(', ')}`);
    
    expectedActions.forEach(action => {
      const found = actualActions.includes(action);
      console.log(`   ${found ? '✅' : '❌'} ${action}: ${found ? 'FOUND' : 'MISSING'}`);
    });
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 5. Final recommendations
    console.log('5. 🎯 DIAGNOSIS:');
    
    const emailConfigExists = transformedPermissions.some(p => 
      p.roleId === 'admin' && p.actionId === 'email-config' && p.allowed
    );
    
    if (emailConfigExists) {
      console.log('✅ Admin has email-config permission after transformation');
      console.log('❓ Issue must be in:');
      console.log('   - Permission cache not refreshing properly');
      console.log('   - User role not being retrieved correctly');
      console.log('   - Permission check timing/race conditions');
      console.log('   - Frontend component not calling hasPermission correctly');
    } else {
      console.log('❌ Admin missing email-config permission after transformation');
      console.log('   - Check database has correct permission');
      console.log('   - Check transformation logic');
    }
    
  } catch (error) {
    console.error('💥 DEBUGGING FAILED:', error);
  }
}

debugPermissionFlow();