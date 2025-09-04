/**
 * Fixed Authentication Service - Resolves 406 Errors
 * This service fixes the authentication issues by avoiding password comparison in SQL queries
 */

import { supabase } from '../lib/supabase';
import { User } from '../types';
import { ErrorHandler } from './errorHandler';

/**
 * FIXED Authentication - prevents 406 errors by avoiding password comparison in SQL
 */
export const authenticateSupabaseUser = async (username: string, password: string): Promise<User | null> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      try {
        // STEP 1: Get user data without password filtering (prevents 406 errors)
        // Make username case-insensitive using ilike
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', username)
          .eq('enabled', true);

        if (profileError) {
          console.error('Error fetching profiles:', profileError);
          throw profileError;
        }

        // STEP 2: Verify password locally (not in SQL query)
        if (profiles && profiles.length > 0) {
          const profile = profiles[0];
          
          // Local password verification (prevents 406 errors)
          let isValidPassword = false;
          if (profile.password_hash === password) {
            isValidPassword = true;
          }
          
          if (isValidPassword) {
            console.log(`✅ Authentication successful for user: ${username}`);
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
              email: profile.email || '',
              isTemporaryPassword: profile.is_temporary_password || false // Include temporary password flag
            };
          }
        }

        // STEP 3: Fallback to users table for legacy support
        // Make username case-insensitive using ilike
        const { data: users, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', username)
          .eq('enabled', true);

        if (userError) {
          console.error('Error fetching users:', userError);
          throw userError;
        }

        if (users && users.length > 0) {
          const user = users[0];
          
          // Local password verification for legacy users
          let isValidPassword = false;
          if (user.password_hash === password || user.password === password) {
            isValidPassword = true;
          }
          
          if (isValidPassword) {
            console.log(`✅ Legacy authentication successful for user: ${username}`);
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

        console.log(`❌ Authentication failed for user: ${username} - Invalid credentials`);
        return null; // Authentication failed

      } catch (error) {
        console.error('Authentication error:', error);
        throw error;
      }
    },
    {
      operation: 'User Authentication',
      userMessage: 'Authentication failed',
      showToast: false,
      showNotification: false,
      includeDetails: true,
      autoRetry: false,
      maxRetries: 1
    }
  );

  return result.success ? (result.data || null) : null;
};

const fixedAuthService = {
  authenticateSupabaseUser
};

export default fixedAuthService;