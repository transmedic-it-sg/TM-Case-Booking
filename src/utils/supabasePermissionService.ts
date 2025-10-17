import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Permission } from '../components/PermissionMatrix';
import { getAllPermissions } from '../data/permissionMatrixData';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';

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
      
      // CRITICAL FIX: Create proper actionId format that matches Permission Matrix expectations
      // Map database format (resource-action) to frontend actionId format
      const dbActionId = `${resource}-${action}`;
      let actionId: string;
      
      // Comprehensive mapping from database format to frontend format
      const actionMapping: Record<string, string> = {
        // Case Management
        'case-create': 'create-case',
        'case-view': 'view-cases', 
        'case-amend': 'amend-case',
        'case-amend-case': 'amend-case', // Handle duplicate format
        'case-delete': 'delete-case',
        'case-update': 'update-case-status',
        'case-update-status': 'update-case-status',
        'case-cancel': 'cancel-case',
        'case_bookings-create': 'create-case',
        'case_bookings-view': 'view-cases',
        'case_bookings-amend': 'amend-case',
        'case_bookings-edit': 'amend-case',
        'case_bookings-delete': 'delete-case',
        'case_bookings-cancel': 'cancel-case',
        
        // Calendar
        'calendar-booking': 'booking-calendar',
        
        // User Management  
        'user-create': 'create-user',
        'user-edit': 'edit-user',
        'user-delete': 'delete-user',
        'user-view': 'view-users',
        'user-enable-disable': 'enable-disable-user',
        'user-reset-password': 'reset-password',
        'user-manage': 'manage-users',
        'users-manage': 'manage-users',
        
        // Status Updates
        'status-process-order': 'process-order',
        'status-order-processed': 'order-processed', 
        'status-sales-approval': 'sales-approval',
        'status-pending-delivery-hospital': 'pending-delivery-hospital',
        'status-delivered-hospital': 'delivered-hospital',
        'status-case-completed': 'case-completed',
        'status-pending-delivery-office': 'pending-delivery-office',
        'status-delivered-office': 'delivered-office',
        'status-to-be-billed': 'to-be-billed',
        'status-case-closed': 'case-closed',
        
        // Settings
        'settings-system-settings': 'system-settings',
        'settings-email-config': 'email-config',
        'settings-code-table-setup': 'code-table-setup',
        'settings-permission-matrix': 'permission-matrix',
        'settings-audit-logs': 'audit-logs',
        'system_settings-manage': 'system-settings',
        
        // Data Operations
        'data-export': 'export-data',
        'data-import': 'import-data', 
        'reports-view': 'view-reports',
        'reports-export': 'export-reports',
        
        // Management Operations
        'doctors-edit': 'manage-doctors',
        'doctors-manage': 'manage-doctors',
        'procedures-edit': 'manage-procedure-types',
        'procedures-manage': 'manage-procedure-types',
        'surgery-implants-edit': 'manage-surgery-implants',
        'surgery-implants-manage': 'manage-surgery-implants',
        'edit-sets': 'edit-sets',
        'attachments-manage': 'manage-attachments',
        'files-upload': 'upload-files',
        'files-download': 'download-files',
        'files-delete': 'delete-files',
        'email_notifications-manage': 'manage-email-notifications',
        'permissions-manage': 'manage-permissions',
        
        // Legacy mappings for inconsistent database format
        'create-case': 'create-case',
        'create-user': 'create-user', 
        'edit-user': 'edit-user',
        'edit-countries': 'edit-countries',
        'view-cases': 'view-cases',
        'view-users': 'view-users', 
        'delete-case': 'delete-case',
        'update-case': 'update-case-status',
        'amend-case': 'amend-case',
        'reset-password': 'reset-password',
        'enable-disable': 'enable-disable-user'
      };
      
      // Use mapping if available, otherwise construct default format
      actionId = actionMapping[dbActionId] || `${resource}-${action}`;
      
      return {
        roleId: perm.role,
        actionId: actionId,
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
      .neq('id', ''); // Delete all rows where id is not empty string (safe for UUID)

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
    console.log('🔧 UPDATE SUPABASE PERMISSION - Starting update:', {
      roleId,
      actionId,
      allowed,
      timestamp: new Date().toISOString()
    });
    
    // First check if the permission exists
    const parsed = parseActionId(actionId);
    if (!parsed) {
      console.error('❌ UPDATE SUPABASE PERMISSION - Failed to parse actionId:', actionId);
      return false;
    }
    
    const { resource, action } = parsed;
    
    console.log('🔧 UPDATE SUPABASE PERMISSION - Parsed actionId:', {
      actionId,
      resource,
      action,
      roleId
    });
    
    const { data: existing, error: checkError } = await supabase
      .from('permissions')
      .select('id')
      .eq('role', roleId)
      .eq('resource', resource)
      .eq('action', action);

    // Handle the array result - check if any rows exist
    if (checkError) {
      console.error('❌ UPDATE SUPABASE PERMISSION - Error checking existing permission:', checkError);
      return false;
    }
    
    const hasExisting = existing && existing.length > 0;
    
    console.log('🔧 UPDATE SUPABASE PERMISSION - Existing permission check:', {
      hasExisting,
      existingCount: existing?.length || 0,
      existingIds: existing?.map(e => e.id) || []
    });

    if (hasExisting) {
      // Update existing permission
      console.log('🔧 UPDATE SUPABASE PERMISSION - Updating existing permission...');
      const { error: updateError } = await supabase
        .from('permissions')
        .update({ allowed: allowed })
        .eq('role', roleId)
        .eq('resource', resource)
        .eq('action', action);

      if (updateError) {
        console.error('❌ UPDATE SUPABASE PERMISSION - Update failed:', updateError);
        return false;
      }
      console.log('✅ UPDATE SUPABASE PERMISSION - Update successful');
    } else {
      // Insert new permission
      console.log('🔧 UPDATE SUPABASE PERMISSION - Inserting new permission...');
      const { error: insertError } = await supabase
        .from('permissions')
        .insert({
          role: roleId,
          resource: resource,
          action: action,
          allowed: allowed
        });

      if (insertError) {
        console.error('❌ UPDATE SUPABASE PERMISSION - Insert failed:', insertError);
        return false;
      }
      console.log('✅ UPDATE SUPABASE PERMISSION - Insert successful');
    }

    return true;
  } catch (error) {
    console.error('❌ UPDATE SUPABASE PERMISSION - Unexpected error:', error);
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

    return data?.map(perm => {
      // CRITICAL FIX: Convert database format to frontend actionId format
      const dbActionId = `${perm.resource}-${perm.action}`;
      let frontendActionId = dbActionId;
      
      // Map specific database combinations to frontend actionId format
      const actionMapping: Record<string, string> = {
        'case-create': 'create-case',
        'case-view': 'view-cases',
        'case-amend': 'amend-case',
        'case-delete': 'delete-case',
        'case-update-status': 'update-case-status',
        'case-cancel': 'cancel-case',
        'calendar-booking': 'booking-calendar',
        'user-create': 'create-user',
        'user-edit': 'edit-user',
        'user-delete': 'delete-user',
        'user-view': 'view-users',
        'user-enable-disable': 'enable-disable-user',
        'user-reset-password': 'reset-password',
        'countries-edit': 'edit-countries',
        'tables-global': 'global-tables',
        'settings-system': 'system-settings',
        'settings-email-config': 'email-config',
        'settings-code-table-setup': 'code-table-setup',
        'settings-permission-matrix': 'permission-matrix',
        'logs-audit': 'audit-logs',
        'data-export': 'export-data',
        'data-import': 'import-data',
        'reports-view': 'view-reports'
      };
      
      // Use mapping if available, otherwise use database format
      frontendActionId = actionMapping[dbActionId] || dbActionId;
      
      return {
        roleId: perm.role,
        actionId: frontendActionId,
        allowed: perm.allowed
      };
    }) || [];
  } catch (error) {
    return getAllPermissions().filter(p => p.roleId === roleId && p.allowed);
  }
};
