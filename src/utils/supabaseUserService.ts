import { supabase } from '../lib/supabase';
import { User } from '../types';
import { Role } from '../components/PermissionMatrix';

// Get all users from Supabase
export const getSupabaseUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    
    // Transform Supabase data to User type
    return data?.map(profile => ({
      id: profile.id,
      username: profile.username,
      password: '', // Don't expose password
      role: profile.role,
      name: profile.name,
      departments: profile.departments || [],
      countries: profile.countries || [],
      selectedCountry: profile.selected_country,
      enabled: profile.enabled !== undefined ? profile.enabled : true,
      email: profile.email || ''
    })) || [];
  } catch (error) {
    console.error('Error in getSupabaseUsers:', error);
    return [];
  }
};

// Add a new user to Supabase
export const addSupabaseUser = async (userData: Omit<User, 'id'>): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        username: userData.username,
        password: userData.password,
        name: userData.name,
        role: userData.role,
        departments: userData.departments || [],
        countries: userData.countries || [],
        selected_country: userData.selectedCountry,
        enabled: userData.enabled !== undefined ? userData.enabled : true,
        email: userData.email || ''
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding user:', error);
      return null;
    }
    
    // Transform to User type
    return {
      id: data.id,
      username: data.username,
      password: '', // Don't expose password
      role: data.role,
      name: data.name,
      departments: data.departments || [],
      countries: data.countries || [],
      selectedCountry: data.selected_country,
      enabled: data.enabled !== undefined ? data.enabled : true,
      email: data.email || '',
      passwordResetRequired: data.password_reset_required || false
    };
  } catch (error) {
    console.error('Error in addSupabaseUser:', error);
    return null;
  }
};

// Update a user in Supabase
export const updateSupabaseUser = async (userId: string, userData: Partial<User>): Promise<User | null> => {
  try {
    // Separate profile updates from auth updates
    const profileUpdateData: any = {};
    
    if (userData.username) profileUpdateData.username = userData.username;
    if (userData.name) profileUpdateData.name = userData.name;
    if (userData.role) profileUpdateData.role = userData.role;
    if (userData.departments) profileUpdateData.departments = userData.departments;
    if (userData.countries) profileUpdateData.countries = userData.countries;
    if (userData.selectedCountry) profileUpdateData.selected_country = userData.selectedCountry;
    if (userData.enabled !== undefined) profileUpdateData.enabled = userData.enabled;
    if (userData.email) profileUpdateData.email = userData.email;
    
    // Handle password update separately through Supabase Auth (admin access required)
    if (userData.password) {
      console.log('🔐 Updating user password through Supabase Auth');
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        password: userData.password
      });
      
      if (authError) {
        console.error('Error updating user password:', authError);
        // Don't fail the entire operation if password update fails
        console.warn('Password update failed, but continuing with profile update');
      } else {
        console.log('✅ Password updated successfully');
      }
    }
    
    // Update profile data (without password)
    const { data, error } = await supabase
      .from('profiles')
      .update(profileUpdateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      return null;
    }
    
    // Transform to User type
    return {
      id: data.id,
      username: data.username,
      password: '', // Don't expose password
      role: data.role,
      name: data.name,
      departments: data.departments || [],
      countries: data.countries || [],
      selectedCountry: data.selected_country,
      enabled: data.enabled !== undefined ? data.enabled : true,
      email: data.email || '',
      passwordResetRequired: data.password_reset_required || false
    };
  } catch (error) {
    console.error('Error in updateSupabaseUser:', error);
    return null;
  }
};

// Reset user password in Supabase
export const resetSupabaseUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
  try {
    console.log('🔐 Resetting user password through Supabase Auth');
    
    // Update password through Supabase Auth (admin access required)
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });
    
    if (authError) {
      console.error('Error resetting password through auth:', authError);
      return false;
    }
    
    // Update profile to set password_reset_required flag
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        password_reset_required: true, // Flag to force password change on next login
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (profileError) {
      console.error('Error updating profile after password reset:', profileError);
      // Don't return false here since password was already updated successfully
      console.warn('Password reset succeeded but profile flag update failed');
    }
    
    console.log('✅ Password reset successfully');
    return true;
  } catch (error) {
    console.error('Error in resetSupabaseUserPassword:', error);
    return false;
  }
};

// Delete a user from Supabase
export const deleteSupabaseUser = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (error) {
      console.error('Error deleting user:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteSupabaseUser:', error);
    return false;
  }
};

// Toggle user enabled status
export const toggleUserEnabled = async (userId: string, enabled: boolean): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ enabled })
      .eq('id', userId);
    
    if (error) {
      console.error('Error toggling user enabled status:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in toggleUserEnabled:', error);
    return false;
  }
};

// Check if username is available
export const checkUsernameAvailable = async (username: string, excludeUserId?: string): Promise<boolean> => {
  try {
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('username', username);
    
    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
    
    return data.length === 0;
  } catch (error) {
    console.error('Error in checkUsernameAvailable:', error);
    return false;
  }
};

// Get unique roles from the database
export const getSupabaseRoles = async (): Promise<Role[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .not('role', 'is', null);
    
    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
    
    // Get unique roles and convert to Role objects
    const roleSet = new Set(data.map(profile => profile.role));
    const uniqueRoles = Array.from(roleSet);
    
    const roleColors: { [key: string]: string } = {
      'admin': '#e74c3c',
      'operations': '#3498db',
      'operations-manager': '#2980b9',
      'sales': '#27ae60',
      'sales-manager': '#229954',
      'driver': '#f39c12',
      'it': '#9b59b6'
    };
    
    return uniqueRoles.map(role => ({
      id: role,
      name: role,
      displayName: role.charAt(0).toUpperCase() + role.slice(1).replace('-', ' '),
      description: `${role} role`,
      color: roleColors[role] || '#95a5a6'
    }));
  } catch (error) {
    console.error('Error in getSupabaseRoles:', error);
    return [];
  }
};