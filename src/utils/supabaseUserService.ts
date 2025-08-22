import { supabase } from '../lib/supabase';
import { User } from '../types';
import { Role } from '../components/PermissionMatrix';
import { ErrorHandler } from './errorHandler';

// Get all users from Supabase
export const getSupabaseUsers = async (): Promise<User[]> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      
      if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
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
    },
    {
      operation: 'Load Users',
      userMessage: 'Failed to load user list from database',
      showToast: true,
      showNotification: false,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 3
    }
  );

  return result.success && result.data ? result.data : [];
};

// Add a new user to Supabase
export const addSupabaseUser = async (userData: Omit<User, 'id'>): Promise<User | null> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
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
        throw new Error(`Failed to add user: ${error.message}`);
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
    },
    {
      operation: 'Add User',
      userMessage: `Failed to add user "${userData.name}" to the database`,
      showToast: true,
      showNotification: true,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 3
    }
  );

  return result.success && result.data ? result.data : null;
};

// Update a user in Supabase
export const updateSupabaseUser = async (userId: string, userData: Partial<User>): Promise<User | null> => {
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
    
    // Handle password update by updating password_hash field
    if (userData.password) {
      profileUpdateData.password_hash = userData.password;
    }
    
    // Update profile data (without password)
    const profileResult = await ErrorHandler.executeWithRetry(
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .update(profileUpdateData)
          .eq('id', userId)
          .select()
          .single();
        
        if (error) {
          throw new Error(`Failed to update user profile: ${error.message}`);
        }
        
        return data;
      },
      {
        operation: 'Update User Profile',
        userMessage: 'Failed to update user profile in database',
        showToast: true,
        showNotification: true,
        includeDetails: true,
        autoRetry: true,
        maxRetries: 3
      }
    );
    
    if (!profileResult.success) {
      return null;
    }
    
    const data = profileResult.data;
    
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
};

// Reset user password in Supabase
export const resetSupabaseUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
  const passwordResult = await ErrorHandler.executeWithRetry(
    async () => {
      // Get user details
      const { data: user } = await supabase
        .from('profiles')
        .select('username, name')
        .eq('id', userId)
        .single();
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update the password_hash field with the new password (plain text for now)
      // In a real system, this would be hashed, but for simplicity we'll use plain text
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          password_hash: newPassword, // Store the new password
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (profileError) {
        throw new Error(`Failed to update password: ${profileError.message}`);
      }
      
      return { userName: user.name, username: user.username, newPassword };
    },
    {
      operation: 'Reset User Password',
      userMessage: `Password reset successfully for user.`,
      showToast: true,
      showNotification: true,
      includeDetails: false,
      autoRetry: true,
      maxRetries: 3
    }
  );

  if (passwordResult.success && passwordResult.data) {
    // Show the new password to admin
    window.dispatchEvent(new CustomEvent('showToast', {
      detail: { 
        type: 'success', 
        message: `Password Reset Complete\n\nUser: ${passwordResult.data.userName}\nUsername: ${passwordResult.data.username}\nNew Password: ${passwordResult.data.newPassword}\n\nThe user can now login with this new password.` 
      }
    }));
  }

  return passwordResult.success;
};

// Delete a user from Supabase
export const deleteSupabaseUser = async (userId: string): Promise<boolean> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (error) {
        throw new Error(`Failed to delete user: ${error.message}`);
      }
      
      return true;
    },
    {
      operation: 'Delete User',
      userMessage: 'Failed to delete user from database',
      showToast: true,
      showNotification: true,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 3
    }
  );

  return result.success;
};

// Toggle user enabled status
export const toggleUserEnabled = async (userId: string, enabled: boolean): Promise<boolean> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ enabled })
        .eq('id', userId);
      
      if (error) {
        throw new Error(`Failed to ${enabled ? 'enable' : 'disable'} user: ${error.message}`);
      }
      
      return true;
    },
    {
      operation: enabled ? 'Enable User' : 'Disable User',
      userMessage: `Failed to ${enabled ? 'enable' : 'disable'} user`,
      showToast: true,
      showNotification: false,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 3
    }
  );

  return result.success;
};

// Check if username is available
export const checkUsernameAvailable = async (username: string, excludeUserId?: string): Promise<boolean> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      let query = supabase
        .from('profiles')
        .select('id')
        .eq('username', username);
      
      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to check username availability: ${error.message}`);
      }
      
      return data.length === 0;
    },
    {
      operation: 'Check Username',
      userMessage: 'Failed to validate username availability',
      showToast: true,
      showNotification: false,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 3
    }
  );

  return result.success && result.data !== undefined ? result.data : false;
};

// Get unique roles from the database
export const getSupabaseRoles = async (): Promise<Role[]> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .not('role', 'is', null);
      
      if (error) {
        throw new Error(`Failed to fetch roles: ${error.message}`);
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
    },
    {
      operation: 'Load Roles',
      userMessage: 'Failed to load user roles from database',
      showToast: false, // Don't show toast for background role loading
      showNotification: false,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 3
    }
  );

  return result.success && result.data ? result.data : [];
};