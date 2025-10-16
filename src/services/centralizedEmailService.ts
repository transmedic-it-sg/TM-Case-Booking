/**
 * Centralized Email Service - Admin-based system authentication
 * Replaces individual user OAuth tokens with centralized admin credentials
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { AuthTokens } from '../utils/simplifiedOAuth';

export interface AdminEmailCredentials {
  provider: 'microsoft' | 'google';
  clientId: string;
  tenantId?: string; // For Microsoft
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  fromEmail: string;
  fromName: string;
}

export interface CentralizedEmailConfig {
  country: string;
  adminCredentials: AdminEmailCredentials;
  isActive: boolean;
  lastUpdated: string;
  updatedBy: string;
}

class CentralizedEmailService {
  private readonly ADMIN_EMAIL_CONFIG_KEY = 'admin_email_config';

  /**
   * Get global admin email configuration (not country-specific)
   * Email auth is application-wide, only notification rules are per-country
   */
  async getAdminEmailConfig(country?: string): Promise<AdminEmailCredentials | null> {
    try {
      // First try global config (new approach)
      let { data, error } = await supabase
        .from('global_email_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      
      // Fallback to country-specific for backward compatibility (will be removed)
      if (!data && country) {
        const countryResult = await supabase
          .from('admin_email_configs')
          .select('*')
          .eq('country', country)
          .maybeSingle();
        data = countryResult.data;
        error = countryResult.error;
      }

      if (error) {
        console.log(`📧 ADMIN CONFIG DEBUG - No global admin email config exists yet`);
        return null;
      }

      if (!data) {
        console.log(`📧 ADMIN CONFIG DEBUG - Empty global admin email config`);
        return null;
      }

      const credentials: AdminEmailCredentials = {
        provider: data.provider as 'microsoft' | 'google',
        clientId: data.client_id,
        tenantId: data.tenant_id,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
        fromEmail: data.from_email,
        fromName: data.from_name
      };

      console.log(`📧 ADMIN CONFIG DEBUG - Found global admin email config`, {
        provider: credentials.provider,
        hasFromEmail: !!credentials.fromEmail,
        tokenExpires: new Date(credentials.expiresAt).toISOString()
      });
      
      return credentials;
    } catch (error) {
      console.log(`📧 ADMIN CONFIG DEBUG - Global admin email config not available:`, error);
      return null;
    }
  }

  /**
   * Store global admin email configuration (not country-specific)
   * Only accessible by admin users
   */
  async setAdminEmailConfig(
    credentials: AdminEmailCredentials,
    updatedBy: string,
    country?: string // Optional, for backward compatibility
  ): Promise<boolean> {
    try {
      // Store in global config table
      const { error } = await supabase
        .from('global_email_config')
        .upsert({
          provider: credentials.provider,
          client_id: credentials.clientId,
          tenant_id: credentials.tenantId,
          access_token: credentials.accessToken,
          refresh_token: credentials.refreshToken,
          expires_at: credentials.expiresAt,
          from_email: credentials.fromEmail,
          from_name: credentials.fromName,
          created_by: updatedBy,
          is_active: true,
          updated_at: new Date().toISOString()
        });

      if (error) {
        logger.error(`Failed to store global admin email config:`, error);
        return false;
      }

      logger.info(`Global admin email config stored successfully`);
      return true;
    } catch (error) {
      logger.error(`Error storing global admin email config:`, error);
      return false;
    }
  }

  /**
   * Send email using admin credentials via Edge Function
   */
  async sendEmail(
    country: string,
    emailData: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      body: string;
      replyTo?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get admin credentials for the country
      const adminCredentials = await this.getAdminEmailConfig(country);
      if (!adminCredentials) {
        return {
          success: false,
          error: `No admin email configuration found for country: ${country}`
        };
      }

      // Check if token is expired and needs refresh
      if (this.isTokenExpired(adminCredentials)) {
        const refreshedCredentials = await this.refreshAdminToken(country, adminCredentials);
        if (!refreshedCredentials) {
          return {
            success: false,
            error: `Failed to refresh admin email token for country: ${country}`
          };
        }
        adminCredentials.accessToken = refreshedCredentials.accessToken;
        adminCredentials.expiresAt = refreshedCredentials.expiresAt;
      }

      // Prepare email payload for Edge Function
      const emailPayload = {
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        body: emailData.body,
        fromEmail: adminCredentials.fromEmail,
        fromName: adminCredentials.fromName,
        accessToken: adminCredentials.accessToken,
        provider: adminCredentials.provider
      };

      // Send via Edge Function with admin authentication
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: emailPayload
      });

      if (error) {
        logger.error(`Edge function error for admin email (${country}):`, error);
        return {
          success: false,
          error: error.message || 'Failed to send admin email'
        };
      }

      if (data?.success) {
        logger.info(`Admin email sent successfully for country: ${country}`);
        return { success: true };
      } else {
        logger.error(`Admin email send failed for country: ${country}:`, data?.error);
        return {
          success: false,
          error: data?.error || 'Unknown error occurred'
        };
      }
    } catch (error) {
      logger.error(`Admin email service error for country ${country}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send admin email'
      };
    }
  }

  /**
   * Check if admin token is expired
   */
  private isTokenExpired(credentials: AdminEmailCredentials): boolean {
    return Date.now() >= credentials.expiresAt - 300000; // Refresh 5 minutes before expiry
  }

  /**
   * Refresh admin token using refresh token
   */
  private async refreshAdminToken(
    country: string, 
    credentials: AdminEmailCredentials
  ): Promise<{ accessToken: string; expiresAt: number } | null> {
    try {
      if (!credentials.refreshToken) {
        logger.warn(`No refresh token available for admin email in ${country}`);
        return null;
      }

      // Call token refresh endpoint based on provider
      if (credentials.provider === 'microsoft') {
        return await this.refreshMicrosoftToken(credentials);
      } else if (credentials.provider === 'google') {
        return await this.refreshGoogleToken(credentials);
      }

      return null;
    } catch (error) {
      logger.error(`Failed to refresh admin token for ${country}:`, error);
      return null;
    }
  }

  /**
   * Refresh Microsoft admin token
   */
  private async refreshMicrosoftToken(credentials: AdminEmailCredentials): Promise<{ accessToken: string; expiresAt: number } | null> {
    try {
      const response = await fetch(`https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: credentials.clientId,
          scope: 'https://graph.microsoft.com/Mail.Send offline_access',
          refresh_token: credentials.refreshToken!,
          grant_type: 'refresh_token'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Microsoft token refresh failed:', data);
        return null;
      }

      return {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
      };
    } catch (error) {
      logger.error('Microsoft token refresh error:', error);
      return null;
    }
  }

  /**
   * Refresh Google admin token
   */
  private async refreshGoogleToken(credentials: AdminEmailCredentials): Promise<{ accessToken: string; expiresAt: number } | null> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: credentials.clientId,
          refresh_token: credentials.refreshToken!,
          grant_type: 'refresh_token'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Google token refresh failed:', data);
        return null;
      }

      return {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
      };
    } catch (error) {
      logger.error('Google token refresh error:', error);
      return null;
    }
  }

  /**
   * Get all countries with admin email configurations
   */
  async getConfiguredCountries(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('admin_email_configs')
        .select('country');

      if (error) {
        logger.error('Error retrieving configured countries:', error);
        return [];
      }

      return data.map(item => item.country);
    } catch (error) {
      logger.error('Error getting configured countries:', error);
      return [];
    }
  }

  /**
   * Remove admin email configuration for a country
   */
  async removeAdminEmailConfig(country: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_email_configs')
        .delete()
        .eq('country', country);

      if (error) {
        logger.error(`Failed to remove admin email config for ${country}:`, error);
        return false;
      }

      logger.info(`Admin email config removed for country: ${country}`);
      return true;
    } catch (error) {
      logger.error(`Error removing admin email config for ${country}:`, error);
      return false;
    }
  }

  /**
   * Test admin email configuration (global)
   */
  async testAdminEmailConfig(testEmail: string): Promise<{ success: boolean; error?: string }> {
    // Email config is global now, use any country for testing
    const testCountry = 'Singapore'; // Just for the email template
    return await this.sendEmail(testCountry, {
      to: [testEmail],
      subject: 'TM Case Booking - Admin Email Configuration Test',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Email Configuration Test</h2>
          <p>This is a test email to verify that the global admin email configuration is working correctly.</p>
          
          <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Test Details</h3>
            <p><strong>Configuration:</strong> Global (applies to all countries)</p>
            <p><strong>Sent At:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Authentication:</strong> Admin System Account</p>
          </div>
          
          <p style="color: #28a745; font-weight: bold;">✅ Admin email configuration is working correctly!</p>
          
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            This is an automated test from the TM Case Booking System.<br>
            Admin email service is configured and operational.
          </p>
        </div>
      `
    });
  }
}

// Export helper functions
export function isTokenExpired(tokens: AuthTokens | null | undefined): boolean {
  if (!tokens?.expiresAt) return true;
  return Date.now() >= tokens.expiresAt;
}

export function isTokenExpiringSoon(tokens: AuthTokens | null | undefined): boolean {
  if (!tokens?.expiresAt) return true;
  const bufferTime = 10 * 60 * 1000; // 10 minutes
  return Date.now() >= tokens.expiresAt - bufferTime;
}

export const centralizedEmailService = new CentralizedEmailService();
export default centralizedEmailService;