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

import { User } from '../types';
import { SUPPORTED_COUNTRIES } from './countryUtils';
import {
  getSupabaseUsers,
  addSupabaseUser,
  authenticateSupabaseUser
} from './supabaseUserService';
import { SafeStorage, StorageMigration } from './secureDataManager';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';

const STORAGE_KEY = 'case-booking-users';
const CURRENT_USER_KEY = 'current-user';

// Simple auth functions - replace deleted supabaseAuthService functions
export const checkUsersExist = async (): Promise<boolean> => {
  try {
    const users = await getSupabaseUsers();
    return users.length > 0;
  } catch (error) {
    return false;
  }
};

export const migrateUsersFromLocalStorage = async (): Promise<void> => {
  // NO-OP: No localStorage migration needed
  // All data is stored in Supabase
};

export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
  try {
    // Use the new authentication function that checks both tables
    const result = await authenticateSupabaseUser(username, password);
    if ((result.success || result.requiresPasswordChange) && result.user) {
      // Convert AuthUser to User format
      return {
        id: result.user.id,
        username: result.user.username,
        password: '', // Never return password
        role: result.user.role,
        name: result.user.name,
        departments: result.user.departments,
        countries: result.user.countries,
        selectedCountry: result.user.selectedCountry,
        enabled: result.user.enabled,
        email: result.user.email || '', // Add email field
        isTemporaryPassword: result.user.isTemporaryPassword || false
      };
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const createSession = async (userId: string): Promise<void> => {
  try {
    // Import supabase dynamically to avoid circular dependencies
    const { supabase } = await import('../lib/supabase');

    // First verify that the user exists in profiles table (primary) or users table (fallback)
    let userExists = false;

    // Check profiles table first
    const { data: profileExists, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!profileError && profileExists) {
      userExists = true;
    } else {
      // No fallback needed - all users are in profiles table
    }

    if (!userExists) {
      throw new Error('User not found - session creation failed');
    }

    // Generate secure session token
    const sessionToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store in database
    const { error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId, // ⚠️ user_id (userId) FK - NOT userid
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      throw new Error('Database session creation failed');
    }

    // Session stored in database only - no browser storage
  } catch (error) {
    throw error; // Let calling code handle the error
  }
};

export const deleteSession = async (sessionToken?: string): Promise<void> => {
  try {
    const token = sessionToken || sessionStorage.getItem('session-token');

    if (token) {
      // Import supabase dynamically to avoid circular dependencies
      const { supabase } = await import('../lib/supabase');

      // Remove from database
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('session_token', token);

      if (error) {
        // Failed to delete database session
      }
    }

    // Always remove from browser storage
    sessionStorage.removeItem('session-token');
  } catch (error) {
    // Always remove from browser storage even if database operation fails
    sessionStorage.removeItem('session-token');
  }
};

export const validateSession = async (sessionToken?: string): Promise<boolean> => {
  try {
    const token = sessionToken || sessionStorage.getItem('session-token');
    if (!token) return false;

    const { supabase } = await import('../lib/supabase');

    // Check if session exists and is not expired
    const { data, error } = await supabase
      .from('user_sessions')
      .select('expires_at, user_id')
      .eq('session_token', token)
      .single();

    if (error || !data) {
      // Session not found in database, remove from browser
      sessionStorage.removeItem('session-token');
      return false;
    }

    // Check if session is expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt <= new Date()) {
      // Session expired, clean up
      await deleteSession(token);
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const deleteAllUserSessions = async (userId: string): Promise<void> => {
  try {
    const { supabase } = await import('../lib/supabase');

    // Delete all sessions for this user
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId); // ⚠️ user_id (userId) FK - NOT userid

    if (error) {
      // Failed to delete user sessions
    }
  } catch (error) {
    // Error deleting user sessions
  }
};

export const getCurrentUserFromStorage = async (): Promise<User | null> => {
  try {
    const stored = await SafeStorage.getItem(CURRENT_USER_KEY);
    return stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : null;
  } catch (error) {
    return null;
  }
};

export const saveCurrentUserToStorage = async (user: User): Promise<void> => {
  await SafeStorage.setItem(CURRENT_USER_KEY, user, {
    tags: ['user-data', 'session'],
    ttl: 24 * 60 * 60 * 1000 // 24 hours
  });
};

export const clearCurrentUserFromStorage = async (): Promise<void> => {
  await SafeStorage.removeItem(CURRENT_USER_KEY);
  sessionStorage.removeItem('session-token');
};

export const getUsers = async (): Promise<User[]> => {
  try {
    // Check if users exist in Supabase
    const usersExist = await checkUsersExist();

    if (usersExist) {
      // Get users from Supabase
      return await getSupabaseUsers();
    } else {
      // If no users in Supabase, check secure storage and migrate
      const stored = await SafeStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Migrating users from secure storage to Supabase
        await migrateUsersFromLocalStorage();
        return await getSupabaseUsers();
      }

      // No fallback to default users - return empty array if no users exist
      return [];
    }
  } catch (error) {
    // Error getting users, no fallback - return empty array
    return [];
  }
};

// Backup function to get users from secure storage
const getUsersFromSecureStorage = async (): Promise<User[]> => {
  const stored = await SafeStorage.getItem(STORAGE_KEY);
  if (stored) {
    const users = Array.isArray(stored) ? stored : JSON.parse(stored);
    return users.map((user: any) => ({
      ...user,
      countries: user.countries || [],
      departments: user.departments || (user.department ? [user.department] : []),
      enabled: user.enabled !== undefined ? user.enabled : true // Default to enabled for backwards compatibility
    }));
  }

  // No fallback to default users - return empty array if no users exist
  return [];
};

export const addUser = async (user: Omit<User, 'id'>): Promise<User> => {
  try {
    const result = await addSupabaseUser(user);
    if (result) {
      return result;
    }
    throw new Error('Failed to create user in Supabase');
  } catch (error) {
    // Error adding user to Supabase, falling back to secure storage
    // Fallback to secure storage
    const users = await getUsersFromSecureStorage();
    const newUser: User = {
      ...user,
      id: Date.now().toString()
    };

    users.push(newUser);
    await SafeStorage.setItem(STORAGE_KEY, users, {
      tags: ['user-data'],
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    return newUser;
  }
};

export const authenticate = async (username: string, password: string, country: string): Promise<{ user: User | null; error?: string; requiresPasswordChange?: boolean; temporaryUser?: User }> => {
  try {
    let user = await authenticateUser(username, password);

    // No fallback to secure storage - only use Supabase authentication

    if (!user) {
      return { user: null, error: "Invalid username or password" };
    }

    // Check if user account is enabled (default to true for backwards compatibility)
    if (user.enabled === false) {
      return { user: null, error: "Your account has been disabled. Please contact your administrator." };
    }

    // CRITICAL FIX: Check if user has temporary password that must be changed
    if (user.isTemporaryPassword) {
      return { 
        user: null, 
        error: "TEMPORARY_PASSWORD_CHANGE_REQUIRED",
        requiresPasswordChange: true,
        temporaryUser: user
      };
    }

    // Check if user has access to the selected country
    if (user.role === 'admin' || (user.countries && user.countries.includes(country))) {
      const userWithCountry = { ...user, selectedCountry: country };

      // Implement single session enforcement - delete all existing sessions for this user
      try {
        await deleteAllUserSessions(user.id);
      } catch (sessionError) {
        // Failed to delete existing user sessions
      }

      // Try to create new session in Supabase
      try {
        await createSession(user.id);
      } catch (sessionError) {
        // Failed to create Supabase session, continuing with sessionStorage only
      }

      // Save to secure storage for session management
      await saveCurrentUserToStorage(userWithCountry);

      return { user: userWithCountry };
    } else {
      return { user: null, error: "Your account is not assigned to the selected country" };
    }
  } catch (error) {
    return { user: null, error: "Authentication failed. Please try again." };
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  const user = await getCurrentUserFromStorage();
  return user;
};

/**
 * Synchronous version for backward compatibility with existing components
 * Returns cached user from UserService or null
 */
export const getCurrentUserSync = (): User | null => {
  const { getCurrentUserSync } = require('../services/userService');
  return getCurrentUserSync();
};

export const logout = async (): Promise<void> => {
  try {
    // Get current session token if exists
    const sessionToken = await SafeStorage.getItem('session-token');
    if (sessionToken) {
      await deleteSession(sessionToken);
      await SafeStorage.removeItem('session-token');
    }

    // Clear secure storage session
    await clearCurrentUserFromStorage();
  } catch (error) {
    // Still clear secure storage even if Supabase logout fails
    clearCurrentUserFromStorage();
  }
};

export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

/**
 * Get user email by username/name
 * @param identifier - Username or full name of the user
 * @returns User email if found, null otherwise
 */
export const getUserEmail = async (identifier: string): Promise<string | null> => {
  try {
    const users = await getUsers();
    const user = users.find(u =>
      u.username.toLowerCase() === identifier.toLowerCase() ||
      u.name.toLowerCase() === identifier.toLowerCase()
    );
    return user?.email || null;
  } catch (error) {
    return null;
  }
};

// Synchronous version for backward compatibility
export const getUserEmailSync = async (identifier: string): Promise<string | null> => {
  try {
    const users = await getUsers();
    const user = users.find(u =>
      u.username.toLowerCase() === identifier.toLowerCase() ||
      u.name.toLowerCase() === identifier.toLowerCase()
    );
    return user?.email || null;
  } catch (error) {
    return null;
  }
};