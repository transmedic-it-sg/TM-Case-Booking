import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User } from '../types';

// User interface for Supabase
interface SupabaseUser {
  id: string;
  username: string;
  password: string;
  role: string;
  name: string;
  departments: string[];
  countries: string[];
  selected_country?: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

// Session interface is defined but used in function parameters

// ================================================
// USER MANAGEMENT FUNCTIONS
// ================================================

/**
 * Get all users from Supabase
 */
export const getSupabaseUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
    
    // Transform Supabase data to User interface
    return data.map(user => ({
      id: user.id,
      username: user.username,
      password: user.password,
      role: user.role as User['role'],
      name: user.name,
      departments: user.departments || [],
      countries: user.countries || [],
      selectedCountry: user.selected_country,
      enabled: user.enabled
    }));
  } catch (error) {
    console.error('Error in getSupabaseUsers:', error);
    throw error;
  }
};

/**
 * Add a new user to Supabase
 */
export const addSupabaseUser = async (user: Omit<User, 'id'>): Promise<User> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        username: user.username,
        password: user.password,
        role: user.role,
        name: user.name,
        departments: user.departments || [],
        countries: user.countries || [],
        selected_country: user.selectedCountry,
        enabled: user.enabled !== undefined ? user.enabled : true
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding user:', error);
      throw error;
    }
    
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      role: data.role as User['role'],
      name: data.name,
      departments: data.departments || [],
      countries: data.countries || [],
      selectedCountry: data.selected_country,
      enabled: data.enabled
    };
  } catch (error) {
    console.error('Error in addSupabaseUser:', error);
    throw error;
  }
};

/**
 * Update a user in Supabase
 */
export const updateSupabaseUser = async (userId: string, user: Partial<User>): Promise<User> => {
  try {
    const updateData: Partial<SupabaseUser> = {};
    
    if (user.username) updateData.username = user.username;
    if (user.password) updateData.password = user.password;
    if (user.role) updateData.role = user.role;
    if (user.name) updateData.name = user.name;
    if (user.departments) updateData.departments = user.departments;
    if (user.countries) updateData.countries = user.countries;
    if (user.selectedCountry) updateData.selected_country = user.selectedCountry;
    if (user.enabled !== undefined) updateData.enabled = user.enabled;
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
    
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      role: data.role as User['role'],
      name: data.name,
      departments: data.departments || [],
      countries: data.countries || [],
      selectedCountry: data.selected_country,
      enabled: data.enabled
    };
  } catch (error) {
    console.error('Error in updateSupabaseUser:', error);
    throw error;
  }
};

/**
 * Delete a user from Supabase
 */
export const deleteSupabaseUser = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteSupabaseUser:', error);
    throw error;
  }
};

/**
 * Toggle user enabled status
 */
export const toggleUserEnabled = async (userId: string): Promise<User> => {
  try {
    // First get current user
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('enabled')
      .eq('id', userId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      throw fetchError;
    }
    
    // Toggle enabled status
    const { data, error } = await supabase
      .from('users')
      .update({ enabled: !currentUser.enabled })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error toggling user enabled:', error);
      throw error;
    }
    
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      role: data.role as User['role'],
      name: data.name,
      departments: data.departments || [],
      countries: data.countries || [],
      selectedCountry: data.selected_country,
      enabled: data.enabled
    };
  } catch (error) {
    console.error('Error in toggleUserEnabled:', error);
    throw error;
  }
};

/**
 * Check if username is available
 */
export const checkUsernameAvailable = async (username: string, excludeUserId?: string): Promise<boolean> => {
  try {
    let query = supabase
      .from('users')
      .select('id')
      .eq('username', username);
    
    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error checking username:', error);
      throw error;
    }
    
    return data.length === 0;
  } catch (error) {
    console.error('Error in checkUsernameAvailable:', error);
    throw error;
  }
};

// ================================================
// AUTHENTICATION FUNCTIONS
// ================================================

/**
 * Authenticate user with username and password
 * Username is case-insensitive, password is case-sensitive
 */
export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
  try {
    // If Supabase is not configured, return null to trigger localStorage fallback
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, skipping database authentication');
      return null;
    }

    // First, find user by case-insensitive username
    const { data: users, error: searchError } = await supabase
      .from('users')
      .select('*')
      .eq('enabled', true);
    
    if (searchError) {
      console.error('Authentication search error:', searchError);
      return null;
    }
    
    // Find user with username and password match
    // First try exact username match
    let matchedUser = users.find(user => 
      user.username === username && user.password === password
    );
    
    // If no exact match, try case-insensitive username with exact password
    if (!matchedUser) {
      matchedUser = users.find(user => 
        user.username.toLowerCase() === username.toLowerCase() && 
        user.password === password
      );
    }
    
    if (!matchedUser) {
      console.log('No user found with username and password combination:', username);
      return null;
    }
    
    console.log('Authentication successful for user:', matchedUser.username);
    return {
      id: matchedUser.id,
      username: matchedUser.username,
      password: matchedUser.password,
      role: matchedUser.role as User['role'],
      name: matchedUser.name,
      departments: matchedUser.departments || [],
      countries: matchedUser.countries || [],
      selectedCountry: matchedUser.selected_country,
      enabled: matchedUser.enabled
    };
  } catch (error) {
    console.error('Error in authenticateUser:', error);
    return null;
  }
};

/**
 * Create a session for authenticated user
 */
export const createSession = async (userId: string): Promise<string> => {
  try {
    // If Supabase is not configured, return a fake session token
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, creating local session token');
      const fakeToken = `local_session_${Date.now()}`;
      localStorage.setItem('session-token', fakeToken);
      return fakeToken;
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const { error } = await supabase
      .from('user_sessions')
      .insert([{
        user_id: userId,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      }]);
    
    if (error) {
      console.error('Error creating session:', error);
      throw error;
    }
    
    return sessionToken;
  } catch (error) {
    console.error('Error in createSession:', error);
    throw error;
  }
};

/**
 * Validate session token
 */
export const validateSession = async (sessionToken: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select(`
        *,
        users (*)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error) {
      console.error('Session validation error:', error);
      return null;
    }
    
    const user = data.users as SupabaseUser;
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      role: user.role as User['role'],
      name: user.name,
      departments: user.departments || [],
      countries: user.countries || [],
      selectedCountry: user.selected_country,
      enabled: user.enabled
    };
  } catch (error) {
    console.error('Error in validateSession:', error);
    return null;
  }
};

/**
 * Delete session (logout)
 */
export const deleteSession = async (sessionToken: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('session_token', sessionToken);
    
    if (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteSession:', error);
    throw error;
  }
};

/**
 * Clean up expired sessions
 */
export const cleanupExpiredSessions = async (): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) {
      console.error('Error cleaning up sessions:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in cleanupExpiredSessions:', error);
    throw error;
  }
};

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Generate a secure session token
 */
function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get current user from localStorage session (backward compatibility)
 */
export const getCurrentUserFromStorage = (): User | null => {
  try {
    const sessionData = localStorage.getItem('case-booking-session');
    if (!sessionData) return null;
    
    const user = JSON.parse(sessionData);
    return user;
  } catch (error) {
    console.error('Error getting current user from storage:', error);
    return null;
  }
};

/**
 * Save current user to localStorage session (backward compatibility)
 */
export const saveCurrentUserToStorage = (user: User): void => {
  try {
    localStorage.setItem('case-booking-session', JSON.stringify(user));
  } catch (error) {
    console.error('Error saving current user to storage:', error);
  }
};

/**
 * Clear current user from localStorage
 */
export const clearCurrentUserFromStorage = (): void => {
  try {
    localStorage.removeItem('case-booking-session');
  } catch (error) {
    console.error('Error clearing current user from storage:', error);
  }
};

// ================================================
// MIGRATION HELPERS
// ================================================

/**
 * Migrate users from localStorage to Supabase
 */
export const migrateUsersFromLocalStorage = async (): Promise<void> => {
  try {
    const localUsers = localStorage.getItem('case-booking-users');
    if (!localUsers) return;
    
    const users = JSON.parse(localUsers);
    
    for (const user of users) {
      try {
        await addSupabaseUser(user);
        console.log(`Migrated user: ${user.username}`);
      } catch (error) {
        console.error(`Error migrating user ${user.username}:`, error);
      }
    }
    
    console.log('User migration completed');
  } catch (error) {
    console.error('Error in user migration:', error);
  }
};

/**
 * Check if users exist in Supabase
 */
export const checkUsersExist = async (): Promise<boolean> => {
  try {
    // If Supabase is not configured, return false to trigger localStorage fallback
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, assuming no users exist in database');
      return false;
    }

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error checking users exist:', error);
      return false;
    }
    
    return data.length > 0;
  } catch (error) {
    console.error('Error in checkUsersExist:', error);
    return false;
  }
};