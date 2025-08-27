/**
 * Secure Authentication Service
 * Fixes 406 errors and implements proper password hashing
 */

import { supabase } from '../lib/supabase';
import { User } from '../types';
import bcrypt from 'bcryptjs';

/**
 * Hash password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Verify password against hash
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

/**
 * SECURE Authentication - fixes 406 errors
 * This method gets users first, then verifies passwords locally to avoid RLS issues
 */
export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
  try {
    // Get user data without password filtering to avoid 406 errors
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .eq('enabled', true);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      throw profileError;
    }

    if (profiles && profiles.length > 0) {
      const profile = profiles[0];
      
      // Verify password hash locally (not in SQL query)
      const isValidPassword = await verifyPassword(password, profile.password_hash);
      
      if (isValidPassword) {
        return {
          id: profile.id,
          username: profile.username,
          password: '', // Never expose password
          role: profile.role,
          name: profile.name,
          departments: profile.departments || [],
          countries: profile.countries || [],
          selectedCountry: profile.selected_country,
          enabled: profile.enabled,
          email: profile.email || ''
        };
      }
    }

    // Fallback to users table for legacy support
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('enabled', true);

    if (userError) {
      console.error('Error fetching users:', userError);
      throw userError;
    }

    if (users && users.length > 0) {
      const user = users[0];
      
      // For legacy users table, password might be plain text (SECURITY ISSUE!)
      // We should migrate these to hashed passwords
      let isValidPassword = false;
      
      if (user.password_hash) {
        // User has hashed password
        isValidPassword = await verifyPassword(password, user.password_hash);
      } else if (user.password === password) {
        // Legacy plain text password (INSECURE!)
        isValidPassword = true;
        
        // Immediately update to hashed password
        const hashedPassword = await hashPassword(password);
        await supabase
          .from('users')
          .update({ 
            password_hash: hashedPassword,
            password: null // Remove plain text password
          })
          .eq('id', user.id);
        
        console.warn(`Migrated plain text password to hash for user: ${username}`);
      }
      
      if (isValidPassword) {
        return {
          id: user.id,
          username: user.username,
          password: '', // Never expose password
          role: user.role,
          name: user.name || user.username,
          departments: user.departments || [],
          countries: user.countries || [],
          selectedCountry: user.selected_country || user.selectedCountry,
          enabled: user.enabled,
          email: user.email || ''
        };
      }
    }

    return null; // Authentication failed
    
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

/**
 * Create new user with hashed password
 */
export const createUser = async (userData: {
  username: string;
  password: string;
  role: string;
  name: string;
  departments: string[];
  countries: string[];
  email?: string;
}): Promise<User> => {
  const hashedPassword = await hashPassword(userData.password);
  
  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      username: userData.username,
      password_hash: hashedPassword,
      role: userData.role,
      name: userData.name,
      departments: userData.departments,
      countries: userData.countries,
      email: userData.email,
      enabled: true,
      selected_country: userData.countries[0] || null
    }])
    .select()
    .single();

  if (error) throw error;

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
    email: data.email || ''
  };
};

/**
 * Update user password
 */
export const updateUserPassword = async (userId: string, newPassword: string): Promise<void> => {
  const hashedPassword = await hashPassword(newPassword);
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      password_hash: hashedPassword,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) throw error;
};

/**
 * Migrate all plain text passwords to hashed passwords
 * Should be run as a one-time migration
 */
export const migratePasswordsToHash = async (): Promise<void> => {
  try {
    console.log('Starting password migration...');
    
    // Get all users with plain text passwords
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .not('password', 'is', null)
      .is('password_hash', null);

    if (error) throw error;

    if (!users || users.length === 0) {
      console.log('No plain text passwords found to migrate');
      return;
    }

    console.log(`Found ${users.length} users with plain text passwords`);

    for (const user of users) {
      try {
        const hashedPassword = await hashPassword(user.password);
        
        await supabase
          .from('users')
          .update({ 
            password_hash: hashedPassword,
            password: null // Remove plain text password
          })
          .eq('id', user.id);
        
        console.log(`Migrated password for user: ${user.username}`);
      } catch (userError) {
        console.error(`Failed to migrate password for user ${user.username}:`, userError);
      }
    }

    console.log('Password migration completed');
  } catch (error) {
    console.error('Password migration failed:', error);
    throw error;
  }
};

export default {
  authenticateUser,
  createUser,
  updateUserPassword,
  hashPassword,
  verifyPassword,
  migratePasswordsToHash
};