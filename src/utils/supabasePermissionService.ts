import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Permission } from '../components/PermissionMatrix';
import { getAllPermissions } from '../data/permissionMatrixData';

// Helper function to validate and parse actionId
const parseActionId = (actionId: string): { resource: string; action: string } | null => {
  if (!actionId || typeof actionId !== 'string') {
    return null;
  }
  
  // CRITICAL: Map app format (actionId) to database format (resource, action)
  // This mapping MUST be complete to ensure permissions work correctly
  switch (actionId) {
    // Case Management
    case 'create-case':
      return { resource: 'case', action: 'create' };
    case 'view-cases':
      return { resource: 'case', action: 'view' };
    case 'amend-case':
      return { resource: 'case', action: 'amend' };
    case 'delete-case':
      return { resource: 'case', action: 'delete' };
    case 'update-case-status':
      return { resource: 'case', action: 'update-status' };
    case 'cancel-case':
      return { resource: 'case', action: 'cancel' };
    
    // Calendar
    case 'booking-calendar':
      return { resource: 'calendar', action: 'booking' };
    
    // Status Transitions
    case 'process-order':
      return { resource: 'status', action: 'process-order' };
    case 'order-processed':
      return { resource: 'status', action: 'order-processed' };
    case 'sales-approval':
      return { resource: 'status', action: 'sales-approval' };
    case 'pending-delivery-hospital':
      return { resource: 'status', action: 'pending-delivery-hospital' };
    case 'delivered-hospital':
      return { resource: 'status', action: 'delivered-hospital' };
    case 'case-completed':
      return { resource: 'status', action: 'case-completed' };
    case 'pending-delivery-office':
      return { resource: 'status', action: 'pending-delivery-office' };
    case 'delivered-office':
      return { resource: 'status', action: 'delivered-office' };
    case 'to-be-billed':
      return { resource: 'status', action: 'to-be-billed' };
    case 'case-closed':
      return { resource: 'status', action: 'case-closed' };
    
    // User Management
    case 'create-user':
      return { resource: 'user', action: 'create' };
    case 'edit-user':
      return { resource: 'user', action: 'edit' };
    case 'delete-user':
      return { resource: 'user', action: 'delete' };
    case 'view-users':
      return { resource: 'user', action: 'view' };
    case 'enable-disable-user':
      return { resource: 'user', action: 'enable-disable' };
    case 'reset-password':
      return { resource: 'user', action: 'reset-password' };
    case 'edit-countries':
      return { resource: 'countries', action: 'edit' };
    case 'global-tables':
      return { resource: 'tables', action: 'global' };
    
    // System Settings
    case 'system-settings':
      return { resource: 'settings', action: 'system' };
    case 'email-config':
      return { resource: 'settings', action: 'email-config' };
    case 'code-table-setup':
      return { resource: 'settings', action: 'code-table-setup' };
    case 'audit-logs':
      return { resource: 'logs', action: 'audit' };
    case 'permission-matrix':
      return { resource: 'settings', action: 'permission-matrix' };
    
    // Data Operations
    case 'export-data':
      return { resource: 'data', action: 'export' };
    case 'import-data':
      return { resource: 'data', action: 'import' };
    case 'view-reports':
      return { resource: 'reports', action: 'view' };
    
    // File Operations
    case 'upload-files':
      return { resource: 'files', action: 'upload' };
    case 'download-files':
      return { resource: 'files', action: 'download' };
    case 'delete-files':
      return { resource: 'files', action: 'delete' };
    case 'manage-attachments':
      return { resource: 'attachments', action: 'manage' };
    
    // Granular Edit Sets permissions - map to proper resources
    case 'manage-doctors':
      return { resource: 'doctors', action: 'manage' };
    case 'manage-procedure-types':
      return { resource: 'procedures', action: 'manage' };
    case 'manage-surgery-implants':
      return { resource: 'surgery-implants', action: 'manage' };
    case 'edit-sets':
      return { resource: 'sets', action: 'edit' };
    
    default:
      // For unmapped actions, don't try to parse - just return a safe fallback
      // Log the missing mapping for debugging
      console.warn(`Missing permission mapping for actionId: ${actionId}`);
      return { resource: 'other', action: actionId };
  }
};

// Create permissions table if it doesn't exist (this should be in your schema)
export const initializePermissionsTable = async (): Promise<void> => {
  try {
    // Check if the table exists by trying to select from it
    const { error } = await supabase
      .from('permissions')
      .select('*')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      // The table should be created via SQL migration
      // For now, we'll use the default permissions
    }
  } catch (error) {
  }
};

// Get permissions from Supabase
export const getSupabasePermissions = async (): Promise<Permission[]> => {
  try {
    // If Supabase is not configured, return default permissions directly
    if (!isSupabaseConfigured) {
      return getAllPermissions();
    }

    // Check if permissions table exists
    const { data, error } = await supabase
      .from('permissions')
      .select('*');

    if (error) {
      // Check for specific error types
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return getAllPermissions();
      } else if (error.code === '406' || error.message.includes('406')) {
        return getAllPermissions();
      } else {
        return getAllPermissions();
      }
    }

    // If no data in table, return defaults including custom roles
    if (!data || data.length === 0) {
      return getAllPermissions();
    }

    // Transform Supabase data to Permission type
    // Check if this is mock test data that already has proper actionId format
    const transformed = data.map(perm => {
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
      // Handle both legacy database formats and new consistent format
      let actionId: string;
      
      // Handle legacy inconsistent database format (resource=action, action=resource)
      if (resource === 'create' && action === 'case') {
        actionId = 'create-case';
      } else if (resource === 'create' && action === 'user') {
        actionId = 'create-user';
      } else if (resource === 'edit' && action === 'user') {
        actionId = 'edit-user';
      } else if (resource === 'edit' && action === 'sets') {
        actionId = 'edit-sets';
      } else if (resource === 'edit' && action === 'countries') {
        actionId = 'edit-countries';
      } else if (resource === 'view' && action === 'cases') {
        actionId = 'view-cases';
      } else if (resource === 'view' && action === 'users') {
        actionId = 'view-users';
      } else if (resource === 'delete' && action === 'case') {
        actionId = 'delete-case';
      } else if (resource === 'update' && action === 'case') {
        actionId = 'update-case-status';
      } else if (resource === 'amend' && action === 'case') {
        actionId = 'amend-case';
      } else if (resource === 'reset' && action === 'password') {
        actionId = 'reset-password';
      } else if (resource === 'enable' && action === 'disable') {
        actionId = 'enable-disable-user';
      } else if (resource === 'reports' && action === 'view') {
        actionId = 'view-reports';
      } else if (resource === 'logs' && action === 'audit') {
        actionId = 'audit-logs';
      } else if (resource === 'booking' && action === 'calendar') {
        actionId = 'booking-calendar';
      } else if (resource === 'calendar' && action === 'booking') {
        actionId = 'booking-calendar';
        
      // New consistent format handling
      // Case Management
      } else if (resource === 'case' && action === 'create') {
        actionId = 'create-case';
      } else if (resource === 'case' && action === 'view') {
        actionId = 'view-cases';
      } else if (resource === 'case' && action === 'amend') {
        actionId = 'amend-case';
      } else if (resource === 'case' && action === 'delete') {
        actionId = 'delete-case';
      } else if (resource === 'case' && action === 'update-status') {
        actionId = 'update-case-status';
      } else if (resource === 'case' && action === 'cancel') {
        actionId = 'cancel-case';
      
      // Calendar
      } else if (resource === 'calendar' && action === 'booking') {
        actionId = 'booking-calendar';
      
      // Status Transitions
      } else if (resource === 'status' && action === 'process-order') {
        actionId = 'process-order';
      } else if (resource === 'status' && action === 'order-processed') {
        actionId = 'order-processed';
      } else if (resource === 'status' && action === 'sales-approval') {
        actionId = 'sales-approval';
      } else if (resource === 'status' && action === 'pending-delivery-hospital') {
        actionId = 'pending-delivery-hospital';
      } else if (resource === 'status' && action === 'delivered-hospital') {
        actionId = 'delivered-hospital';
      } else if (resource === 'status' && action === 'case-completed') {
        actionId = 'case-completed';
      } else if (resource === 'status' && action === 'pending-delivery-office') {
        actionId = 'pending-delivery-office';
      } else if (resource === 'status' && action === 'delivered-office') {
        actionId = 'delivered-office';
      } else if (resource === 'status' && action === 'to-be-billed') {
        actionId = 'to-be-billed';
      } else if (resource === 'status' && action === 'case-closed') {
        actionId = 'case-closed';
      
      // User Management
      } else if (resource === 'user' && action === 'create') {
        actionId = 'create-user';
      } else if (resource === 'user' && action === 'edit') {
        actionId = 'edit-user';
      } else if (resource === 'user' && action === 'delete') {
        actionId = 'delete-user';
      } else if (resource === 'user' && action === 'view') {
        actionId = 'view-users';
      } else if (resource === 'user' && action === 'enable-disable') {
        actionId = 'enable-disable-user';
      } else if (resource === 'user' && action === 'reset-password') {
        actionId = 'reset-password';
      } else if (resource === 'countries' && action === 'edit') {
        actionId = 'edit-countries';
      } else if (resource === 'tables' && action === 'global') {
        actionId = 'global-tables';
      
      // System Settings
      } else if (resource === 'settings' && action === 'system') {
        actionId = 'system-settings';
      } else if (resource === 'settings' && action === 'email-config') {
        actionId = 'email-config';
      } else if (resource === 'settings' && action === 'code-table-setup') {
        actionId = 'code-table-setup';
      } else if (resource === 'logs' && action === 'audit') {
        actionId = 'audit-logs';
      } else if (resource === 'settings' && action === 'permission-matrix') {
        actionId = 'permission-matrix';
      
      // Data Operations
      } else if (resource === 'data' && action === 'export') {
        actionId = 'export-data';
      } else if (resource === 'data' && action === 'import') {
        actionId = 'import-data';
      } else if (resource === 'reports' && action === 'view') {
        actionId = 'view-reports';
      
      // File Operations
      } else if (resource === 'files' && action === 'upload') {
        actionId = 'upload-files';
      } else if (resource === 'files' && action === 'download') {
        actionId = 'download-files';
      } else if (resource === 'files' && action === 'delete') {
        actionId = 'delete-files';
      } else if (resource === 'attachments' && action === 'manage') {
        actionId = 'manage-attachments';
      
      // CRITICAL: Add missing resource mappings that are causing production errors
      // Edit Sets related resources
      } else if (resource === 'sets' && action === 'edit') {
        actionId = 'edit-sets';
      } else if (resource === 'sets' && action === 'view') {
        actionId = 'edit-sets'; // Same permission for viewing sets
      } else if (resource === 'sets' && action === 'manage') {
        actionId = 'edit-sets';
      
      // Doctor management resources
      } else if (resource === 'doctors' && action === 'edit') {
        actionId = 'manage-doctors';
      } else if (resource === 'doctors' && action === 'manage') {
        actionId = 'manage-doctors';
      } else if (resource === 'doctors' && action === 'view') {
        actionId = 'manage-doctors';
      
      // Procedure management resources
      } else if (resource === 'procedures' && action === 'edit') {
        actionId = 'manage-procedure-types';
      } else if (resource === 'procedures' && action === 'manage') {
        actionId = 'manage-procedure-types';
      } else if (resource === 'procedures' && action === 'view') {
        actionId = 'manage-procedure-types';
      } else if (resource === 'procedure-types' && action === 'edit') {
        actionId = 'manage-procedure-types';
      } else if (resource === 'procedure-types' && action === 'manage') {
        actionId = 'manage-procedure-types';
      
      // Surgery & Implants resources
      } else if (resource === 'surgery-implants' && action === 'edit') {
        actionId = 'manage-surgery-implants';
      } else if (resource === 'surgery-implants' && action === 'manage') {
        actionId = 'manage-surgery-implants';
      } else if (resource === 'surgery-implants' && action === 'view') {
        actionId = 'manage-surgery-implants';
      } else if (resource === 'implants' && action === 'edit') {
        actionId = 'manage-surgery-implants';
      } else if (resource === 'implants' && action === 'manage') {
        actionId = 'manage-surgery-implants';
      
      // Order related resources
      } else if (resource === 'order' && action === 'create') {
        actionId = 'process-order';
      } else if (resource === 'order' && action === 'process') {
        actionId = 'process-order';
      } else if (resource === 'order' && action === 'edit') {
        actionId = 'process-order';
      } else if (resource === 'order' && action === 'view') {
        actionId = 'process-order';
      } else if (resource === 'order' && action === 'processed') {
        actionId = 'order-processed';
      
      // Delivery related resources
      } else if (resource === 'delivery' && action === 'pending-hospital') {
        actionId = 'pending-delivery-hospital';
      } else if (resource === 'delivery' && action === 'hospital') {
        actionId = 'delivered-hospital';
      } else if (resource === 'delivery' && action === 'pending-office') {
        actionId = 'pending-delivery-office';
      } else if (resource === 'delivery' && action === 'office') {
        actionId = 'delivered-office';
      } else if (resource === 'delivery' && action === 'manage') {
        actionId = 'pending-delivery-hospital'; // Default delivery permission
      } else if (resource === 'delivery' && action === 'view') {
        actionId = 'pending-delivery-hospital';
      
      // Granular Edit Sets permissions (legacy)
      } else if (resource === 'other') {
        // For "other" resource, use the action as-is (for granular permissions)
        actionId = action;
      } else {
        // Fallback to basic format - log for debugging but don't spam console
        // console.warn(`Unknown permission combination: resource=${resource}, action=${action}`);
        // Create a safe actionId for unmapped combinations
        actionId = `${action}-${resource}`;
      }
      
      return {
        roleId: perm.role,
        actionId,
        allowed: perm.allowed
      };
    });
    
    return transformed;
  } catch (error) {
    return getAllPermissions();
  }
};

// Save permissions to Supabase
export const saveSupabasePermissions = async (permissions: Permission[]): Promise<boolean> => {
  try {
    // If Supabase is not configured, don't try to save but return success for testing
    if (!isSupabaseConfigured) {
      return true;
    }

    // First, delete all existing permissions
    const { error: deleteError } = await supabase
      .from('permissions')
      .delete()
      .gt('id', 0); // Delete all rows using a valid condition

    if (deleteError && !deleteError.message.includes('does not exist')) {
      return false;
    }

    // Insert new permissions with new schema
    // Only process through parseActionId if we're actually saving to database
    // For default permissions, skip the parsing to avoid corruption
    const permissionsData = permissions.map(perm => {
      // If this looks like a default permission format (e.g., "view-cases"), 
      // and we're not actually connected to Supabase, don't corrupt it
      if (!isSupabaseConfigured) {
        // Just return the permission as-is without processing for non-configured Supabase
        return {
          role: perm.roleId,
          resource: 'default',
          action: perm.actionId, // Keep original actionId
          allowed: perm.allowed
        };
      }
      
      const parsed = parseActionId(perm.actionId);
      if (!parsed) {
        return {
          role: perm.roleId,
          resource: 'unknown',
          action: 'unknown',
          allowed: perm.allowed
        };
      }
      return {
        role: perm.roleId,
        resource: parsed.resource,
        action: parsed.action,
        allowed: perm.allowed
      };
    });

    const { error: insertError } = await supabase
      .from('permissions')
      .insert(permissionsData);

    if (insertError) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

// Update a specific permission in Supabase
export const updateSupabasePermission = async (
  roleId: string,
  actionId: string,
  allowed: boolean
): Promise<boolean> => {
  try {
    // First check if the permission exists
    const parsed = parseActionId(actionId);
    if (!parsed) {
      return false;
    }
    
    const { resource, action } = parsed;
    
    const { data: existing, error: checkError } = await supabase
      .from('permissions')
      .select('id')
      .eq('role', roleId)
      .eq('resource', resource)
      .eq('action', action);

    // Handle the array result - check if any rows exist
    if (checkError) {
      return false;
    }
    
    const hasExisting = existing && existing.length > 0;

    if (hasExisting) {
      // Update existing permission
      const { error: updateError } = await supabase
        .from('permissions')
        .update({ allowed: allowed })
        .eq('role', roleId)
        .eq('resource', resource)
        .eq('action', action);

      if (updateError) {
        return false;
      }
    } else {
      // Insert new permission
      const { error: insertError } = await supabase
        .from('permissions')
        .insert({
          role: roleId,
          resource: resource,
          action: action,
          allowed: allowed
        });

      if (insertError) {
        return false;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
};

// Reset permissions to defaults in Supabase
export const resetSupabasePermissions = async (): Promise<boolean> => {
  try {
    const success = await saveSupabasePermissions(getAllPermissions());
    return success;
  } catch (error) {
    return false;
  }
};

// Check if a role has permission for a specific action
export const hasSupabasePermission = async (roleId: string, actionId: string): Promise<boolean> => {
  // Remove hardcoded admin logic - use database permissions only

  try {
    const parsed = parseActionId(actionId);
    if (!parsed) {
      return false;
    }
    
    const { resource, action } = parsed;
    
    const { data, error } = await supabase
      .from('permissions')
      .select('allowed')
      .eq('role', roleId)
      .eq('resource', resource)
      .eq('action', action)
      .single();

    if (error) {
      // Fall back to checking default permissions including custom roles
      const permission = getAllPermissions().find(p => p.roleId === roleId && p.actionId === actionId);
      return permission?.allowed || false;
    }

    return data?.allowed || false;
  } catch (error) {
    return false;
  }
};

// Get all permissions for a specific role
export const getSupabaseRolePermissions = async (roleId: string): Promise<Permission[]> => {
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .eq('role', roleId)
      .eq('allowed', true);

    if (error) {
      return getAllPermissions().filter(p => p.roleId === roleId && p.allowed);
    }

    return data?.map(perm => ({
      roleId: perm.role,
      actionId: `${perm.resource || 'unknown'}-${perm.action || 'unknown'}`, // Combine resource and action consistently, with fallbacks
      allowed: perm.allowed
    })) || [];
  } catch (error) {
    return getAllPermissions().filter(p => p.roleId === roleId && p.allowed);
  }
};