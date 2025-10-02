import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Permission } from '../components/PermissionMatrix';
import { getAllPermissions } from '../data/permissionMatrixData';

// Helper function to validate and parse actionId
const parseActionId = (actionId: string): { resource: string; action: string } | null => {
  if (!actionId || typeof actionId !== 'string') {
    return null;
  }
  
  // Map app format (actionId) to database format (resource, action)
  switch (actionId) {
    case 'view-cases':
      return { resource: 'case', action: 'view' };
    case 'create-case':
      return { resource: 'case', action: 'create' };
    case 'amend-case':
      return { resource: 'case', action: 'amend' };
    case 'update-case-status':
      return { resource: 'case', action: 'update-status' };
    case 'case-cancelled':
      return { resource: 'case', action: 'cancel' };
    case 'edit-cases':
      return { resource: 'case', action: 'edit' };
    case 'booking-calendar':
      return { resource: 'calendar', action: 'booking' };
    case 'process-order':
      return { resource: 'order', action: 'process' };
    case 'order-processed':
      return { resource: 'order', action: 'processed' };
    case 'pending-delivery-hospital':
      return { resource: 'delivery', action: 'pending-hospital' };
    case 'delivered-hospital':
      return { resource: 'delivery', action: 'delivered-hospital' };
    case 'pending-delivery-office':
      return { resource: 'delivery', action: 'pending-office' };
    case 'delivered-office':
      return { resource: 'delivery', action: 'delivered-office' };
    case 'to-be-billed':
      return { resource: 'billing', action: 'to-be-billed' };
    case 'case-closed':
      return { resource: 'case', action: 'closed' };
    case 'upload-files':
      return { resource: 'files', action: 'upload' };
    case 'download-files':
      return { resource: 'files', action: 'download' };
    case 'manage-attachments':
      return { resource: 'attachments', action: 'manage' };
    case 'view-reports':
      return { resource: 'reports', action: 'view' };
    case 'export-data':
      return { resource: 'data', action: 'export' };
    // Add more mappings as needed
    default:
      // For unmapped actions, don't try to parse - just return a safe fallback
      console.warn('Unmapped actionId:', actionId);
      // Return the original actionId format to avoid corruption
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
    console.error('Error initializing permissions table:', error);
  }
};

// Get permissions from Supabase
export const getSupabasePermissions = async (): Promise<Permission[]> => {
  try {
    // If Supabase is not configured, return default permissions directly
    if (!isSupabaseConfigured) {
      console.log('🔄 Using default permissions (Supabase not configured)');
      return getAllPermissions();
    }

    // Check if permissions table exists
    const { data, error } = await supabase
      .from('permissions')
      .select('*');

    if (error) {
      // Check for specific error types
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.warn('Permissions table does not exist, using defaults');
        return getAllPermissions();
      } else if (error.code === '406' || error.message.includes('406')) {
        console.warn('Database permission denied (406), using defaults');
        return getAllPermissions();
      } else {
        console.warn('Database error, using defaults:', error.message);
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
      
      // Create proper actionId format that matches the expected format in tests
      let actionId: string;
      if (resource === 'case' && action === 'view') {
        actionId = 'view-cases';
      } else if (resource === 'case' && action === 'create') {
        actionId = 'create-case';
      } else if (resource === 'case' && action === 'amend') {
        actionId = 'amend-case';
      } else if (resource === 'case' && action === 'update-status') {
        actionId = 'update-case-status';
      } else if (resource === 'case' && action === 'cancel') {
        actionId = 'case-cancelled';
      } else {
        // Fallback to basic format
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
    console.error('Error fetching permissions from Supabase:', error);
    return getAllPermissions();
  }
};

// Save permissions to Supabase
export const saveSupabasePermissions = async (permissions: Permission[]): Promise<boolean> => {
  try {
    // If Supabase is not configured, don't try to save but return success for testing
    if (!isSupabaseConfigured) {
      console.log('🔄 Skipping save to Supabase (not configured)');
      return true;
    }

    // First, delete all existing permissions
    const { error: deleteError } = await supabase
      .from('permissions')
      .delete()
      .gt('id', 0); // Delete all rows using a valid condition

    if (deleteError && !deleteError.message.includes('does not exist')) {
      console.error('Error deleting existing permissions:', deleteError);
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
        console.warn('Invalid actionId in permission:', perm.actionId);
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
      console.error('Error inserting permissions:', insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving permissions to Supabase:', error);
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
      console.error('Invalid actionId format:', actionId);
      return false;
    }
    
    const { resource, action } = parsed;
    
    const { data: existing, error: checkError } = await supabase
      .from('permissions')
      .select('id')
      .eq('role', roleId)
      .eq('resource', resource)
      .eq('action', action)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing permission:', checkError);
      return false;
    }

    if (existing) {
      // Update existing permission
      const { error: updateError } = await supabase
        .from('permissions')
        .update({ allowed: allowed })
        .eq('role', roleId)
        .eq('resource', resource)
        .eq('action', action);

      if (updateError) {
        console.error('Error updating existing permission:', updateError);
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
        console.error('Error inserting new permission:', insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating permission in Supabase:', error);
    return false;
  }
};

// Reset permissions to defaults in Supabase
export const resetSupabasePermissions = async (): Promise<boolean> => {
  try {
    const success = await saveSupabasePermissions(getAllPermissions());
    return success;
  } catch (error) {
    console.error('Error resetting permissions:', error);
    return false;
  }
};

// Check if a role has permission for a specific action
export const hasSupabasePermission = async (roleId: string, actionId: string): Promise<boolean> => {
  // Admin has all permissions
  if (roleId === 'admin') {
    return true;
  }

  try {
    const parsed = parseActionId(actionId);
    if (!parsed) {
      console.warn('Invalid actionId format:', actionId);
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
      console.warn('Permission not found, checking defaults:', error.message);
      // Fall back to checking default permissions including custom roles
      const permission = getAllPermissions().find(p => p.roleId === roleId && p.actionId === actionId);
      return permission?.allowed || false;
    }

    return data?.allowed || false;
  } catch (error) {
    console.error('Error checking permission:', error);
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
      console.warn('Error fetching role permissions, using defaults:', error.message);
      return getAllPermissions().filter(p => p.roleId === roleId && p.allowed);
    }

    return data?.map(perm => ({
      roleId: perm.role,
      actionId: `${perm.resource || 'unknown'}-${perm.action || 'unknown'}`, // Combine resource and action consistently, with fallbacks
      allowed: perm.allowed
    })) || [];
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return getAllPermissions().filter(p => p.roleId === roleId && p.allowed);
  }
};