#!/usr/bin/env node

/**
 * Debug Admin Permission Issues
 * Check what's happening with admin email-config permissions
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAdminPermissions() {
  console.log('🔍 DEBUGGING ADMIN PERMISSION ISSUES');
  console.log('=====================================\n');
  
  try {
    // 1. Check admin users in database
    console.log('1. 👤 CHECKING ADMIN USERS IN DATABASE:');
    const { data: adminUsers, error: userError } = await supabase
      .from('profiles')
      .select('id, username, name, role, email')
      .eq('role', 'admin');
    
    if (userError) {
      console.error('❌ Error fetching admin users:', userError);
      return;
    }
    
    if (!adminUsers || adminUsers.length === 0) {
      console.log('❌ NO ADMIN USERS FOUND IN DATABASE!');
      return;
    }
    
    console.log(`✅ Found ${adminUsers.length} admin user(s):`);
    adminUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.name}) - ${user.email}`);
    });
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. Check email-config permission for admin role
    console.log('2. 🔐 CHECKING EMAIL-CONFIG PERMISSION FOR ADMIN:');
    const { data: emailConfigPerm, error: permError } = await supabase
      .from('permissions')
      .select('*')
      .eq('role', 'admin')
      .eq('resource', 'settings')
      .eq('action', 'email-config');
    
    if (permError) {
      console.error('❌ Error checking email-config permission:', permError);
    } else if (!emailConfigPerm || emailConfigPerm.length === 0) {
      console.log('❌ NO EMAIL-CONFIG PERMISSION FOUND FOR ADMIN!');
      console.log('   This is the root cause of the access denied issue.');
      
      // Try to add it
      console.log('\n🔧 ATTEMPTING TO ADD MISSING PERMISSION...');
      const { error: insertError } = await supabase
        .from('permissions')
        .insert({
          role: 'admin',
          resource: 'settings',
          action: 'email-config',
          allowed: true
        });
      
      if (insertError) {
        console.error('❌ Failed to add permission:', insertError);
      } else {
        console.log('✅ Successfully added email-config permission for admin');
      }
    } else {
      console.log('✅ Email-config permission found for admin:');
      emailConfigPerm.forEach(perm => {
        console.log(`   - Role: ${perm.role}, Resource: ${perm.resource}, Action: ${perm.action}, Allowed: ${perm.allowed}`);
      });
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. Check all admin permissions
    console.log('3. 📋 ALL ADMIN PERMISSIONS IN DATABASE:');
    const { data: allAdminPerms, error: allPermError } = await supabase
      .from('permissions')
      .select('resource, action, allowed')
      .eq('role', 'admin')
      .eq('allowed', true)
      .order('resource')
      .order('action');
    
    if (allPermError) {
      console.error('❌ Error fetching all admin permissions:', allPermError);
    } else {
      console.log(`✅ Admin has ${allAdminPerms.length} allowed permissions:`);
      
      // Group by resource
      const grouped = allAdminPerms.reduce((acc, perm) => {
        if (!acc[perm.resource]) acc[perm.resource] = [];
        acc[perm.resource].push(perm.action);
        return acc;
      }, {});
      
      Object.entries(grouped).forEach(([resource, actions]) => {
        console.log(`   🔹 ${resource}: ${actions.join(', ')}`);
      });
      
      // Check specifically for settings permissions
      const settingsPerms = allAdminPerms.filter(p => p.resource === 'settings');
      console.log(`\n🔹 Settings permissions (${settingsPerms.length}):`);
      settingsPerms.forEach(perm => {
        console.log(`     - ${perm.action}`);
      });
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 4. Test permission mapping
    console.log('4. 🔄 TESTING PERMISSION MAPPING:');
    
    // Check if the issue is in the mapping logic
    const testMappings = [
      'email-config',
      'settings.email-config',
      'system-settings',
      'permission-matrix'
    ];
    
    for (const actionId of testMappings) {
      console.log(`Testing permission check for: "${actionId}"`);
      
      // Check various combinations
      const checks = [
        { role: 'admin', resource: 'settings', action: 'email-config' },
        { role: 'admin', resource: 'settings', action: actionId },
        { role: 'admin', resource: actionId.split('.')[0] || 'settings', action: actionId.split('.')[1] || actionId }
      ];
      
      for (const check of checks) {
        const { data: checkResult } = await supabase
          .from('permissions')
          .select('allowed')
          .eq('role', check.role)
          .eq('resource', check.resource)
          .eq('action', check.action)
          .single();
        
        if (checkResult) {
          console.log(`   ✅ Found: ${check.role}.${check.resource}.${check.action} = ${checkResult.allowed}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 5. Final recommendation
    console.log('5. 🎯 RECOMMENDATIONS:');
    
    const hasEmailConfig = allAdminPerms?.some(p => p.resource === 'settings' && p.action === 'email-config');
    
    if (!hasEmailConfig) {
      console.log('❌ ISSUE IDENTIFIED: Admin missing email-config permission');
      console.log('   Solution: Add the permission to the database');
    } else {
      console.log('✅ Admin has email-config permission in database');
      console.log('❓ Issue may be in the frontend permission checking logic');
      console.log('   - Check permission cache refresh timing');
      console.log('   - Check frontend permission mapping logic');
      console.log('   - Check for race conditions in permission loading');
    }
    
  } catch (error) {
    console.error('💥 DEBUGGING FAILED:', error);
  }
}

debugAdminPermissions();