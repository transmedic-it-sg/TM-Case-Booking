import { User } from '../types';
import { SUPPORTED_COUNTRIES } from './countryUtils';
import {
  getSupabaseUsers,
  addSupabaseUser,
  authenticateSupabaseUser
} from './supabaseUserService';
import { SafeStorage, StorageMigration } from './secureDataManager';

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
  // Migrate localStorage data to secure storage first
  await StorageMigration.migrateFromLocalStorage([STORAGE_KEY]);

  const stored = await SafeStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const users: User[] = Array.isArray(stored) ? stored : JSON.parse(stored);
      for (const user of users) {
        await addSupabaseUser(user);
      }
      console.log('Successfully migrated users to Supabase');
    } catch (error) {
      console.error('Failed to migrate users:', error);
    }
  }
};

export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
  try {
    // Use the new authentication function that checks both tables
    const result = await authenticateSupabaseUser(username, password);
    if (result.success && result.user) {
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
        enabled: result.user.enabled
      };
    }
    return null;
  } catch (error) {
    console.error('Authentication error:', error);
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
      console.warn('User not found in either profiles or users table, skipping session creation:', userId);
      // Use sessionStorage as fallback
      sessionStorage.setItem('session-token', `session-${userId}-${Date.now()}`);
      return;
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
        user_id: userId,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      console.error('Failed to create database session:', error);
      // Fallback to sessionStorage for backward compatibility
      sessionStorage.setItem('session-token', `session-${userId}-${Date.now()}`);
      return;
    }

    // Store session token in browser for quick access
    sessionStorage.setItem('session-token', sessionToken);
  } catch (error) {
    console.error('Error creating session:', error);
    // Fallback to simple session management
    sessionStorage.setItem('session-token', `session-${userId}-${Date.now()}`);
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
        console.error('Failed to delete database session:', error);
      }
    }

    // Always remove from browser storage
    sessionStorage.removeItem('session-token');
  } catch (error) {
    console.error('Error deleting session:', error);
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
    console.error('Error validating session:', error);
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
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete user sessions:', error);
    }
  } catch (error) {
    console.error('Error deleting user sessions:', error);
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
        console.log('Migrating users from secure storage to Supabase...');
        await migrateUsersFromLocalStorage();
        return await getSupabaseUsers();
      }

      // Create default admin user if none exist
      const defaultUser: Omit<User, 'id'> = {
        username: 'Admin',
        password: 'Admin',
        role: 'admin',
        name: 'System Administrator',
        departments: [],
        countries: [...SUPPORTED_COUNTRIES],
        enabled: true
      };

      const createdUser = await addSupabaseUser(defaultUser);
      return createdUser ? [createdUser] : [];
    }
  } catch (error) {
    console.error('Error getting users, falling back to secure storage:', error);
    // Ensure secure storage has default users
    const localUsers = await getUsersFromSecureStorage();
    console.log('Fallback: created/loaded secure storage users:', localUsers.length);
    return localUsers;
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

  // SECURITY: Default admin with temporary password - must be changed on first login
  const defaultUsers: User[] = [
    {
      id: '97a7414a-0edc-4623-96de-7a93004eb7a7',
      username: 'admin',
      password: 'TempAdmin123!',  // Temporary strong password
      role: 'admin',
      name: 'System Administrator',
      departments: [],
      countries: [...SUPPORTED_COUNTRIES],
      enabled: true,
      isTemporaryPassword: true  // Force password change on first login
    }
  ];

  await SafeStorage.setItem(STORAGE_KEY, defaultUsers, {
    tags: ['user-data', 'admin'],
    ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  return defaultUsers;
};

export const addUser = async (user: Omit<User, 'id'>): Promise<User> => {
  try {
    const result = await addSupabaseUser(user);
    if (result) {
      return result;
    }
    throw new Error('Failed to create user in Supabase');
  } catch (error) {
    console.error('Error adding user to Supabase, falling back to secure storage:', error);
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

export const authenticate = async (username: string, password: string, country: string): Promise<{ user: User | null; error?: string }> => {
  try {
    let user = await authenticateUser(username, password);

    // If Supabase authentication fails, try secure storage fallback
    if (!user) {
      console.log('Supabase authentication failed, trying secure storage fallback...');

      // Ensure secure storage has users by calling getUsers (which creates defaults if needed)
      await getUsers();

      const localUsers = await getUsersFromSecureStorage();
      console.log('Available local users:', localUsers.map((u: any) => ({ username: u.username, enabled: u.enabled })));
      console.log('Looking for username:', username); // Password removed for security

      const matchedUser = localUsers.find(u =>
        u.username.toLowerCase() === username.toLowerCase() &&
        u.password === password &&
        u.enabled !== false
      );

      if (matchedUser) {
        user = matchedUser;
        console.log('LocalStorage authentication successful for:', username);
      } else {
        console.log('LocalStorage authentication failed - no matching user found');
      }
    }

    if (!user) {
      return { user: null, error: "Invalid username or password" };
    }

    // Check if user account is enabled (default to true for backwards compatibility)
    if (user.enabled === false) {
      return { user: null, error: "Your account has been disabled. Please contact your administrator." };
    }

    // Check if user has access to the selected country
    if (user.role === 'admin' || (user.countries && user.countries.includes(country))) {
      const userWithCountry = { ...user, selectedCountry: country };

      // Implement single session enforcement - delete all existing sessions for this user
      try {
        await deleteAllUserSessions(user.id);
      } catch (sessionError) {
        console.warn('Failed to delete existing user sessions:', sessionError);
      }

      // Try to create new session in Supabase (optional, fallback to localStorage if fails)
      try {
        await createSession(user.id);
      } catch (sessionError) {
        console.warn('Failed to create Supabase session, continuing with localStorage:', sessionError);
      }

      // Save to secure storage for session management
      await saveCurrentUserToStorage(userWithCountry);

      return { user: userWithCountry };
    } else {
      return { user: null, error: "Your account is not assigned to the selected country" };
    }
  } catch (error) {
    console.error('Error authenticating user:', error);
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
    console.error('Error during logout:', error);
    // Still clear localStorage even if Supabase logout fails
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
    console.error('Error getting user email:', error);
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
    console.error('Error getting user email:', error);
    return null;
  }
};