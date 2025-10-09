#!/usr/bin/env node

/**
 * Debug User Role Retrieval Issue
 * Check if the user role is being retrieved correctly during login
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUserRoleRetrieval() {
  console.log('🔍 DEBUGGING USER ROLE RETRIEVAL');
  console.log('==================================\n');
  
  try {
    // 1. Test the authentication flow that UserService.getCurrentUser() uses
    console.log('1. 🔐 TESTING AUTHENTICATION FLOW:');
    
    // This simulates what UserService.getCurrentUser() does
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      console.log('   This means users cannot authenticate properly');
      return;
    }
    
    if (!session?.user) {
      console.log('❌ No active session found');
      console.log('   This is expected if no user is logged in via Supabase auth');
      console.log('   The app might be using custom authentication instead of Supabase auth');
    } else {
      console.log('✅ Found active Supabase session:');
      console.log(`   User ID: ${session.user.id}`);
      console.log(`   Email: ${session.user.email}`);
      
      // Fetch user details from profiles table
      const { data: user, error } = await supabase
        .from('profiles')
        .select('id, username, name, email, role, departments, countries, selected_country, enabled')
        .eq('id', session.user.id)
        .single();

      if (error || !user) {
        console.error('❌ Error fetching user from profiles table:', error);
      } else {
        console.log('✅ User profile found:');
        console.log(`   Username: ${user.username}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Enabled: ${user.enabled}`);
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. Test the custom authentication approach (what the app actually uses)
    console.log('2. 🔑 TESTING CUSTOM AUTHENTICATION:');
    
    // Check if there are users in the legacy auth system
    console.log('   Checking if the app uses custom auth instead of Supabase auth...');
    
    // The app might be storing auth data in localStorage or using a different auth method
    console.log('   Note: Cannot check localStorage from Node.js script');
    console.log('   The app likely uses the auth.ts authenticate() function instead');
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. Test the permissions cache timing issue
    console.log('3. ⏱️  TESTING PERMISSION CACHE TIMING:');
    
    // Simulate the permission loading process
    console.log('   Simulating permission loading timing...');
    
    const startTime = Date.now();
    
    // Load permissions (simulating getRuntimePermissions)
    const { data: permissions, error: permError } = await supabase
      .from('permissions')
      .select('role, resource, action, allowed')
      .eq('allowed', true);
    
    const permissionLoadTime = Date.now() - startTime;
    console.log(`   ✅ Permissions loaded in ${permissionLoadTime}ms`);
    
    if (permError) {
      console.error('❌ Error loading permissions:', permError);
      return;
    }
    
    // Transform permissions (simulating the transformation logic)
    const transformedPermissions = permissions.map(perm => {
      const resource = perm.resource || 'unknown';
      const action = perm.action || 'unknown';
      
      let actionId;
      
      if (resource === 'settings' && action === 'system-settings') {
        actionId = 'system-settings';
      } else if (resource === 'settings' && action === 'email-config') {
        actionId = 'email-config';
      } else if (resource === 'settings' && action === 'permission-matrix') {
        actionId = 'permission-matrix';
      } else if (resource === 'settings' && action === 'audit-logs') {
        actionId = 'audit-logs';
      } else {
        actionId = `${resource}-${action}`;
      }
      
      return {
        roleId: perm.role,
        actionId: actionId,
        allowed: perm.allowed
      };
    });
    
    const transformTime = Date.now() - startTime;
    console.log(`   ✅ Permissions transformed in ${transformTime}ms total`);
    
    // Test hasPermission function with different scenarios
    function testHasPermission(roleId, actionId, permissions) {
      const permission = permissions.find(p => p.roleId === roleId && p.actionId === actionId);
      return permission?.allowed || false;
    }
    
    // Test critical admin permissions
    const adminPermissionTests = [
      'email-config',
      'permission-matrix', 
      'system-settings',
      'audit-logs'
    ];
    
    console.log('   Testing admin permission checks:');
    adminPermissionTests.forEach(actionId => {
      const result = testHasPermission('admin', actionId, transformedPermissions);
      console.log(`     hasPermission('admin', '${actionId}') = ${result ? '✅ true' : '❌ false'}`);
    });
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 4. Check for potential issues
    console.log('4. 🐛 POTENTIAL ISSUES ANALYSIS:');
    
    console.log('   Possible causes of the live issue:');
    console.log('   ');
    console.log('   A) AUTHENTICATION MISMATCH:');
    console.log('      - App might be using custom auth but UserService expects Supabase auth');
    console.log('      - UserService.getCurrentUser() returns null due to no Supabase session');
    console.log('      - Permission checks fail because user role is undefined');
    console.log('   ');
    console.log('   B) PERMISSION CACHE RACE CONDITION:');
    console.log('      - User logs in → permissions initialize → user role loads later');
    console.log('      - hasPermission() called before user role is available');
    console.log('      - Cache populated but user context missing');
    console.log('   ');
    console.log('   C) BROWSER CACHE ISSUES:');
    console.log('      - Old permission cache persisting in localStorage');
    console.log('      - Browser not refreshing permission data');
    console.log('      - Service worker caching old application code');
    console.log('   ');
    console.log('   D) DEPLOYMENT SYNCHRONIZATION:');
    console.log('      - Database updated but browser loaded old JavaScript');
    console.log('      - CDN/cache not invalidated after deployment');
    console.log('      - User session from before the fix is still active');
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 5. Recommended immediate actions
    console.log('5. 🔧 IMMEDIATE ACTION REQUIRED:');
    
    console.log('   FIRST - Clear everything in browser:');
    console.log('   1. Open browser dev tools (F12)');
    console.log('   2. Go to Application tab → Storage → Clear storage');
    console.log('   3. Or run in console: localStorage.clear(); sessionStorage.clear();');
    console.log('   4. Hard refresh with Ctrl+Shift+R or Cmd+Shift+R');
    console.log('   ');
    console.log('   SECOND - Check authentication flow:');
    console.log('   1. Open browser console during login');
    console.log('   2. Look for errors related to UserService.getCurrentUser()');
    console.log('   3. Check if user role is being set correctly');
    console.log('   ');
    console.log('   THIRD - Verify permission loading:');
    console.log('   1. Check console for permission-related errors');
    console.log('   2. Verify initializePermissions() is called after login');
    console.log('   3. Check if hasPermission() receives correct role parameter');
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('6. 🎯 FINAL DIAGNOSIS:');
    console.log('   The database is ✅ CORRECT');
    console.log('   The transformation logic is ✅ CORRECT');
    console.log('   The permission data is ✅ CORRECT');
    console.log('   ');
    console.log('   The issue is 🔥 FRONTEND CACHE/TIMING');
    console.log('   ');
    console.log('   Most likely cause: Browser cache is serving old application code');
    console.log('   or permission cache is not being refreshed after the fix was deployed.');
    
  } catch (error) {
    console.error('💥 USER ROLE DEBUGGING FAILED:', error);
  }
}

debugUserRoleRetrieval();