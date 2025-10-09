#!/usr/bin/env node

/**
 * Complete Admin Permissions Setup
 * Ensures admin has all necessary permissions in database
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupCompleteAdminPermissions() {
  console.log('🔧 Setting up complete admin permissions...\n');
  
  // Complete list of admin permissions based on PERMISSION_ACTIONS
  const adminPermissions = [
    // Case Management
    { resource: 'case', action: 'create' },
    { resource: 'case', action: 'view' },
    { resource: 'case', action: 'amend' },
    { resource: 'case', action: 'delete' },
    { resource: 'case', action: 'update-status' },
    { resource: 'case', action: 'cancel' },
    { resource: 'doctors', action: 'manage' },
    { resource: 'procedures', action: 'manage' },
    { resource: 'surgery-implants', action: 'manage' },
    { resource: 'sets', action: 'edit' },
    { resource: 'calendar', action: 'booking' },

    // Status Transitions (all of them)
    { resource: 'status', action: 'process-order' },
    { resource: 'status', action: 'order-processed' },
    { resource: 'status', action: 'sales-approval' },
    { resource: 'status', action: 'pending-delivery-hospital' },
    { resource: 'status', action: 'delivered-hospital' },
    { resource: 'status', action: 'case-completed' },
    { resource: 'status', action: 'pending-delivery-office' },
    { resource: 'status', action: 'delivered-office' },
    { resource: 'status', action: 'to-be-billed' },
    { resource: 'status', action: 'case-closed' },

    // User Management
    { resource: 'user', action: 'create' },
    { resource: 'user', action: 'edit' },
    { resource: 'user', action: 'delete' },
    { resource: 'user', action: 'view' },
    { resource: 'user', action: 'enable-disable' },
    { resource: 'user', action: 'reset-password' },
    { resource: 'user', action: 'edit-countries' },
    { resource: 'global', action: 'tables' },

    // System Settings
    { resource: 'settings', action: 'system-settings' },
    { resource: 'settings', action: 'email-config' },
    { resource: 'settings', action: 'code-table-setup' },
    { resource: 'settings', action: 'audit-logs' },
    { resource: 'settings', action: 'permission-matrix' },

    // Data Operations
    { resource: 'data', action: 'export' },
    { resource: 'data', action: 'import' },
    { resource: 'reports', action: 'view' },

    // File Operations
    { resource: 'files', action: 'upload' },
    { resource: 'files', action: 'download' },
    { resource: 'files', action: 'delete' },
    { resource: 'attachments', action: 'manage' }
  ];

  let added = 0;
  let existing = 0;
  const errors = [];

  for (const perm of adminPermissions) {
    try {
      // Check if permission already exists
      const { data: existingPerm } = await supabase
        .from('permissions')
        .select('id')
        .eq('role', 'admin')
        .eq('resource', perm.resource)
        .eq('action', perm.action)
        .single();

      if (existingPerm) {
        existing++;
        continue;
      }

      // Add the permission
      const { error } = await supabase
        .from('permissions')
        .insert({
          role: 'admin',
          resource: perm.resource,
          action: perm.action,
          allowed: true
        });

      if (error) {
        errors.push(`${perm.resource}.${perm.action}: ${error.message}`);
      } else {
        added++;
        console.log(`✅ Added: admin.${perm.resource}.${perm.action}`);
      }

    } catch (error) {
      errors.push(`${perm.resource}.${perm.action}: ${error.message}`);
    }
  }

  console.log(`\n📊 SUMMARY:`);
  console.log(`   - Added: ${added} permissions`);
  console.log(`   - Already existed: ${existing} permissions`);
  console.log(`   - Errors: ${errors.length} permissions`);

  if (errors.length > 0) {
    console.log(`\n❌ ERRORS:`);
    errors.forEach(error => console.log(`   - ${error}`));
  }

  // Final verification
  const { data: finalCount } = await supabase
    .from('permissions')
    .select('*', { count: 'exact' })
    .eq('role', 'admin')
    .eq('allowed', true);

  console.log(`\n🎯 FINAL RESULT:`);
  console.log(`   - Total admin permissions: ${finalCount?.length || 0}`);
  console.log(`   - Admin should now have access to all system functions`);
}

setupCompleteAdminPermissions();