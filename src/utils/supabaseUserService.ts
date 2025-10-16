/**
 * ⚠️ CRITICAL: Uses comprehensive field mappings to prevent database field naming issues
 * 
 * FIELD MAPPING RULES:
 * - Database fields: snake_case (e.g., date_of_surgery, case_booking_id)
 * - TypeScript interfaces: camelCase (e.g., dateOfSurgery, caseBookingId)
 * - ALWAYS use fieldMappings.ts utility instead of hardcoded field names
 * 
 * NEVER use: case_date → USE: date_of_surgery
 * NEVER use: procedure → USE: procedure_type
 * NEVER use: caseId → USE: case_booking_id
 */

import { supabase } from '../lib/supabase';
import { User } from '../types';
import { Role } from '../components/PermissionMatrix';
import { ErrorHandler } from './errorHandler';
import { hashPassword, generateSecurePassword } from './passwordSecurity';

// FIXED: Import the secure authentication service to resolve 406 errors
import { authenticateSupabaseUser as fixedAuthenticateSupabaseUser } from './fixedAuthService';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';

// Main authentication function - USES FIXED SERVICE (no more 406 errors)
export const authenticateSupabaseUser = fixedAuthenticateSupabaseUser;

// Get all users from profiles table
export const getAllSupabaseUsers = async (): Promise<User[]> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      // Get users from profiles table
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('username');

      let allUsers: User[] = [];

      if (!profilesError && profilesData) {
        allUsers = profilesData.map((profile: any) => ({
          id: profile.id,
          username: profile.username,
          password: '', // Never expose password
          role: profile.role,
          name: profile.name,
          departments: profile.departments || [],
          countries: profile.countries || [],
          selectedCountry: profile.selected_country,
          enabled: profile.enabled,
          email: profile.email,
          isTemporaryPassword: profile.is_temporary_password || false
        }));
      }

      // Users table removed - all users are now in profiles table only
      if (profilesError) {
        throw profilesError;
      }

      return allUsers;
    },
    {
      operation: 'Get All Users',
      userMessage: 'Failed to fetch users',
      showToast: true,
      showNotification: false,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 3
    }
  );

  return result.success ? result.data || [] : [];
};

// Get user by ID
export const getUserById = async (userId: string): Promise<User | null> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      // Try profiles table first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profileError && profileData) {
        return {
          id: profileData.id,
          username: profileData.username,
          password: '', // Never expose password
          role: profileData.role,
          name: profileData.name,
          departments: profileData.departments || [],
          countries: profileData.countries || [],
          selectedCountry: profileData.selected_country,
          enabled: profileData.enabled,
          email: profileData.email,
          isTemporaryPassword: profileData.is_temporary_password || false
        };
      }

      // No fallback needed - all users are in profiles table only
      if (profileError) {
        throw profileError;
      }

      return null;
    },
    {
      operation: 'Get User By ID',
      userMessage: 'Failed to fetch user',
      showToast: false,
      showNotification: false,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 2
    }
  );

  return result.success ? (result.data || null) : null;
};

// Add new user
export const addSupabaseUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  // CRITICAL FIX: User creation should NOT use retries as it's not idempotent
  // Each retry attempts to create the same user again, causing 409 conflicts
  try {
    // SECURITY: Hash password before storing in database
    const hashedPassword = await hashPassword(userData.password);
    
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        username: userData.username,
        password_hash: hashedPassword, // Now properly hashed
        role: userData.role,
        name: userData.name,
        departments: userData.departments,
        countries: userData.countries,
        selected_country: userData.selectedCountry, // ⚠️ selected_country (selectedCountry)
        enabled: userData.enabled,
        email: userData.email,
        is_temporary_password: false // New users set their own password
      }])
      .select()
      .single();

    // Handle 409 Conflict specifically - user already exists
    if (error?.code === 'PGRST116' || error?.code === '23505' || error?.message?.includes('409')) {
      throw new Error('A user with this username or email already exists. Please use different values.');
    }
    
    if (error) {
      // Provide specific error message for other database errors
      if (error.message?.includes('duplicate') || error.message?.includes('already exists')) { 
        throw new Error('A user with this username or email already exists. Please use different values.');
      }
      throw error;
    }

    if (!data) {
      throw new Error('Failed to create user. Please check all required fields are filled correctly.');
    }

    return {
      id: data.id,
      username: data.username,
      password: '', // Never expose password
      role: data.role,
      name: data.name,
      departments: data.departments || [],
      countries: data.countries || [],
      selectedCountry: data.selected_country,
      enabled: data.enabled,
      email: data.email
    };
  } catch (error) {
    // Log the error and provide user-friendly message
    console.error('Failed to create user:', error);
    
    if (error instanceof Error) {
      throw error; // Re-throw with original message
    }
    
    throw new Error('Failed to create user. Please try again.');
  }
};

// Update user
export const updateSupabaseUser = async (userId: string, userData: Partial<User>): Promise<boolean> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      const updateData: any = {};

      if (userData.username) updateData.username = userData.username;
      if (userData.password) {
        // SECURITY: Hash password before storing in database
        updateData.password_hash = await hashPassword(userData.password);
        updateData.is_temporary_password = false; // User has set their own password
        updateData.password_changed_at = new Date().toISOString();
      }
      if (userData.role) updateData.role = userData.role;
      if (userData.name) updateData.name = userData.name;
      if (userData.departments) updateData.departments = userData.departments;
      if (userData.countries) updateData.countries = userData.countries;
      if (userData.selectedCountry) updateData.selected_country = userData.selectedCountry;
      if (userData.enabled !== undefined) updateData.enabled = userData.enabled;
      if (userData.email !== undefined) updateData.email = userData.email;

      updateData.updated_at = new Date().toISOString();

      // Try profiles table first
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (profileError) {
        // Try users table as fallback with correct column mapping
        const usersUpdateData: any = {};
        if (updateData.username) usersUpdateData.username = updateData.username;
        if (updateData.password_hash) usersUpdateData.password = updateData.password_hash; // Map to 'password' column
        if (updateData.role) usersUpdateData.role = updateData.role;
        if (updateData.name) usersUpdateData.name = updateData.name;
        if (updateData.departments) usersUpdateData.departments = updateData.departments;
        if (updateData.countries) usersUpdateData.countries = updateData.countries;
        if (updateData.selected_country) usersUpdateData.selected_country = updateData.selected_country;
        if (updateData.enabled !== undefined) usersUpdateData.enabled = updateData.enabled;
        usersUpdateData.updated_at = updateData.updated_at;

        const { error: userError } = await supabase
          .from('profiles')
          .update(usersUpdateData)
          .eq('id', userId);

        if (userError) throw userError;
      }

      return true;
    },
    {
      operation: 'Update User',
      userMessage: 'Failed to update user',
      showToast: true,
      showNotification: true,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 3
    }
  );

  return result.success;
};

// Delete user
export const deleteSupabaseUser = async (userId: string): Promise<boolean> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      return true;
    },
    {
      operation: 'Delete User',
      userMessage: 'Failed to delete user',
      showToast: true,
      showNotification: true,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 2
    }
  );

  return result.success;
};

// Reset user password
export const resetSupabaseUserPassword = async (userId: string, newPassword?: string): Promise<boolean> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      // Generate a secure temporary password if none provided
      const tempPassword = newPassword || generateSecurePassword(12);
      
      // SECURITY: Hash the temporary password before storing
      const hashedPassword = await hashPassword(tempPassword);
      
      // Update profiles table with temporary password flag
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          password_hash: hashedPassword, // Now properly hashed
          is_temporary_password: true, // Mark as temporary - user must change on next login
          password_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString() // ⚠️ updated_at (updatedAt)
        })
        .eq('id', userId);

      if (profileError) {
        throw profileError;
      }

      return true;
    },
    {
      operation: 'Reset User Password',
      userMessage: 'Failed to reset password',
      showToast: true,
      showNotification: true,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 3
    }
  );

  return result.success;
};

export const updateSupabaseUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      // SECURITY: Hash the new password before storing
      const hashedPassword = await hashPassword(newPassword);
      
      // Update profiles table - clear temporary password flag and update password
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          password_hash: hashedPassword, // Now properly hashed
          is_temporary_password: false, // Clear temporary flag
          password_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        throw profileError;
      }

      return true;
    },
    {
      operation: 'Update User Password',
      userMessage: 'Failed to update password',
      showToast: true,
      showNotification: true,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 3
    }
  );

  return result.success;
};

// Compatibility aliases - will be added after function definitions

// Get available roles
export const getAvailableRoles = async (): Promise<Role[]> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      // Roles are stored in code_tables (NOT in separate 'roles' table)
      const { data, error } = await supabase
        .from('code_tables')
        .select('*')
        .eq('table_type', 'user_roles')
        .eq('is_active', true) // ⚠️ is_active (isActive)
        .order('display_name');

      if (error) throw error;

      return data?.map((role: any) => ({
        id: role.code,
        name: role.code,
        displayName: role.display_name,
        description: role.display_name,
        color: '#007bff'
      })) || [];
    },
    {
      operation: 'Get Available Roles',
      userMessage: 'Failed to fetch user roles',
      showToast: false,
      showNotification: false,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 2
    }
  );

  // Fallback to hardcoded roles if database fails
  if (!result.success || !result.data || result.data.length === 0) {
    return [
      { id: 'admin', name: 'admin', displayName: 'Admin', description: 'System Administrator', color: '#e74c3c' },
      { id: 'operations', name: 'operations', displayName: 'Operations', description: 'Operations Team', color: '#3498db' },
      { id: 'sales', name: 'sales', displayName: 'Sales', description: 'Sales Team', color: '#27ae60' },
      { id: 'driver', name: 'driver', displayName: 'Driver', description: 'Delivery Driver', color: '#f39c12' },
      { id: 'it', name: 'it', displayName: 'IT', description: 'IT Support', color: '#9b59b6' }
    ];
  }

  return result.data!;
};

// Toggle user enabled status
export const toggleUserEnabled = async (userId: string, enabled: boolean): Promise<boolean> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      return true;
    },
    {
      operation: 'Toggle User Status',
      userMessage: 'Failed to update user status',
      showToast: true,
      showNotification: true,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 2
    }
  );

  return result.success;
};

// Check if username is available
export const checkUsernameAvailable = async (username: string, excludeUserId?: User): Promise<boolean> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      let query = supabase
        .from('profiles')
        .select('id')
        .eq('username', username);

      if (excludeUserId && excludeUserId.id) {
        query = query.neq('id', excludeUserId.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Username is available if no records found
      return !data || data.length === 0;
    },
    {
      operation: 'Check Username Availability',
      userMessage: 'Failed to check username availability',
      showToast: false,
      showNotification: false,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 2
    }
  );

  return result.success ? (result.data ?? false) : false;
};

// Compatibility aliases for legacy code
export const getSupabaseUsers = getAllSupabaseUsers;
export const getSupabaseRoles = getAvailableRoles;