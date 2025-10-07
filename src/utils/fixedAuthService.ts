/**
 * Fixed Auth Service - Enhanced authentication service
 * Provides secure authentication with improved error handling
 */

import { supabase } from '../lib/supabase';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  name: string;
  email?: string;
  countries: string[];
  departments: string[];
  selectedCountry: string;
  enabled: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  requiresPasswordChange?: boolean;
}

class FixedAuthService {
  private currentUser: AuthUser | null = null;
  private sessionToken: string | null = null;

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const { username, password } = credentials;

      if (!username || !password) {
        return {
          success: false,
          error: 'Username and password are required'
        };
      }

      // Simple username and password verification - no RLS dependency
      // Use ilike for case-insensitive username search as requested
      const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', username)
        .single();

      if (error || !user) {
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      // Simple password verification - direct comparison with stored password
      if (password !== user.password_hash) {
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      // Check if user is enabled (if not set, default to true)
      if (user.enabled === false) {
        return {
          success: false,
          error: 'Account is disabled'
        };
      }

      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        countries: user.countries || [],
        departments: user.departments || [],
        selectedCountry: user.selected_country || user.countries?.[0] || '',
        enabled: user.enabled !== false
      };

      this.currentUser = authUser;

      // Store in sessionStorage for session persistence
      sessionStorage.setItem('currentUser', JSON.stringify(authUser));

      return {
        success: true,
        user: authUser
      };

    } catch (error) {
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  async logout(): Promise<void> {
    // Simple logout - just clear local state
    this.currentUser = null;
    this.sessionToken = null;

    // Clear session storage
    sessionStorage.removeItem('currentUser');
  }

  getCurrentUser(): AuthUser | null {
    if (this.currentUser) {
      return this.currentUser;
    }

    // Try to restore from sessionStorage
    try {
      const stored = sessionStorage.getItem('currentUser');
      if (stored) {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      }
    } catch (error) {
    }

    return null;
  }

  async validateSession(): Promise<boolean> {
    // Simple session validation - just check if user exists in sessionStorage
    const user = this.getCurrentUser();
    return user !== null;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<AuthResult> {
    const user = this.getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    try {
      // Simple password update in profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          password_hash: newPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        return {
          success: false,
          error: 'Failed to update password'
        };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: 'Password change failed'
      };
    }
  }
}

// Export individual functions for backward compatibility
const service = new FixedAuthService();

export const authenticateSupabaseUser = async (username: string, password: string) => {
  const result = await service.login({ username, password });
  return {
    success: result.success,
    user: result.user,
    error: result.error
  };
};

export { service as fixedAuthService };
export default service;