import { supabase } from '../lib/supabase';
import { Permission } from '../components/PermissionMatrix';
import { getAllPermissions } from '../data/permissionMatrixData';

// Create permissions table if it doesn't exist (this should be in your schema)
export const initializePermissionsTable = async (): Promise<void> => {
  try {
    // Check if the table exists by trying to select from it
    const { error } = await supabase
      .from('permissions')
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      console.log('Permissions table does not exist, creating it...');
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
      console.log('No permissions in database, initializing with defaults');
      return getAllPermissions();
    }
    
    // Transform Supabase data to Permission type
    // New schema uses: role, resource, action, allowed
    return data.map(perm => ({
      roleId: perm.role,
      actionId: `${perm.resource}-${perm.action}`, // Combine resource and action
      allowed: perm.allowed
    }));
  } catch (error) {
    console.error('Error fetching permissions from Supabase:', error);
    return getAllPermissions();
  }
};

// Save permissions to Supabase
export const saveSupabasePermissions = async (permissions: Permission[]): Promise<boolean> => {
  try {
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
    const permissionsData = permissions.map(perm => {
      const [resource, action] = perm.actionId.split('-');
      return {
        role: perm.roleId,
        resource: resource,
        action: action,
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
    const [resource, action] = actionId.split('-');
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
    const [resource, action] = actionId.split('-');
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
      actionId: `${perm.resource}-${perm.action}`,
      allowed: perm.allowed
    })) || [];
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return getAllPermissions().filter(p => p.roleId === roleId && p.allowed);
  }
};