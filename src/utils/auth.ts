import { User } from '../types';
import { SUPPORTED_COUNTRIES } from './countryUtils';
import { 
  getSupabaseUsers, 
  addSupabaseUser,
  authenticateSupabaseUser
} from './supabaseUserService';

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
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const users: User[] = JSON.parse(stored);
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
    const user = await authenticateSupabaseUser(username, password);
    return user;
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
      // Fallback to users table
      const { data: userExistsData, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (!userCheckError && userExistsData) {
        userExists = true;
      }
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

export const getCurrentUserFromStorage = (): User | null => {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
};

export const saveCurrentUserToStorage = (user: User): void => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

export const clearCurrentUserFromStorage = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY);
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
      // If no users in Supabase, check localStorage and migrate
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        console.log('Migrating users from localStorage to Supabase...');
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
    console.error('Error getting users, falling back to localStorage:', error);
    // Ensure localStorage has default users
    const localUsers = getUsersFromLocalStorage();
    console.log('Fallback: created/loaded localStorage users:', localUsers.length);
    return localUsers;
  }
};

// Backup function to get users from localStorage
const getUsersFromLocalStorage = (): User[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const users = JSON.parse(stored);
    return users.map((user: any) => ({
      ...user,
      countries: user.countries || [],
      departments: user.departments || (user.department ? [user.department] : []),
      enabled: user.enabled !== undefined ? user.enabled : true // Default to enabled for backwards compatibility
    }));
  }
  
  const defaultUsers: User[] = [
    {
      id: '97a7414a-0edc-4623-96de-7a93004eb7a7',
      username: 'Admin',
      password: 'Admin',
      role: 'admin',
      name: 'System Administrator',
      departments: [],
      countries: [...SUPPORTED_COUNTRIES],
      enabled: true
    }
  ];
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUsers));
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
    console.error('Error adding user to Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const users = getUsersFromLocalStorage();
    const newUser: User = {
      ...user,
      id: Date.now().toString()
    };
    
    users.push(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    return newUser;
  }
};

export const authenticate = async (username: string, password: string, country: string): Promise<{ user: User | null; error?: string }> => {
  try {
    let user = await authenticateUser(username, password);
    
    // If Supabase authentication fails, try localStorage fallback
    if (!user) {
      console.log('Supabase authentication failed, trying localStorage fallback...');
      
      // Ensure localStorage has users by calling getUsers (which creates defaults if needed)
      await getUsers();
      
      const localUsers = getUsersFromLocalStorage();
      console.log('Available local users:', localUsers.map(u => ({ username: u.username, enabled: u.enabled })));
      console.log('Looking for username:', username, 'password:', password);
      
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
      
      // Save to localStorage for backward compatibility
      saveCurrentUserToStorage(userWithCountry);
      
      return { user: userWithCountry };
    } else {
      return { user: null, error: "Your account is not assigned to the selected country" };
    }
  } catch (error) {
    console.error('Error authenticating user:', error);
    return { user: null, error: "Authentication failed. Please try again." };
  }
};

export const getCurrentUser = (): User | null => {
  return getCurrentUserFromStorage();
};

export const logout = async (): Promise<void> => {
  try {
    // Get current session token if exists
    const sessionToken = localStorage.getItem('session-token');
    if (sessionToken) {
      await deleteSession(sessionToken);
      localStorage.removeItem('session-token');
    }
    
    // Clear localStorage session
    clearCurrentUserFromStorage();
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
export const getUserEmailSync = (identifier: string): string | null => {
  const users = getUsersFromLocalStorage();
  const user = users.find(u => 
    u.username.toLowerCase() === identifier.toLowerCase() || 
    u.name.toLowerCase() === identifier.toLowerCase()
  );
  return user?.email || null;
};