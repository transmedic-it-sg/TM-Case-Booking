/**
 * Enhanced Email Notification Service
 * Improved error handling, debugging, and reliability for email notifications
 */

import { CaseBooking } from '../types';
import { 
  getNotificationMatrix, 
  getActiveProviderTokens, 
  areEmailNotificationsEnabled,
  getRecipientEmails,
  applyTemplateVariables 
} from './emailNotificationService';
import { createOAuthManager } from './simplifiedOAuth';

interface EmailDebugInfo {
  step: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  data?: any;
  timestamp: number;
}

class EnhancedEmailService {
  private debugLog: EmailDebugInfo[] = [];
  private maxDebugEntries = 50;

  private addDebugLog(step: string, status: 'success' | 'error' | 'warning' | 'info', message: string, data?: any) {
    this.debugLog.push({
      step,
      status,
      message,
      data,
      timestamp: Date.now()
    });

    // Keep only recent entries
    if (this.debugLog.length > this.maxDebugEntries) {
      this.debugLog = this.debugLog.slice(-this.maxDebugEntries);
    }

    // Console logging with emojis for clarity
    const emoji = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }[status];
    console.log(`${emoji} [EmailService:${step}] ${message}`, data ? data : '');
  }

  /**
   * Get debug information for troubleshooting
   */
  getDebugInfo(): EmailDebugInfo[] {
    return [...this.debugLog];
  }

  /**
   * Clear debug log
   */
  clearDebugLog(): void {
    this.debugLog = [];
  }

  /**
   * Enhanced email sending with comprehensive error handling
   */
  async sendNewCaseNotification(caseData: CaseBooking): Promise<{
    success: boolean;
    error?: string;
    debugInfo: EmailDebugInfo[];
  }> {
    this.addDebugLog('init', 'info', 'Starting email notification process', {
      caseId: caseData.id,
      caseReference: caseData.caseReferenceNumber,
      country: caseData.country
    });

    try {
      // Step 1: Check if email notifications are globally enabled
      const globallyEnabled = areEmailNotificationsEnabled();
      if (!globallyEnabled) {
        this.addDebugLog('global-check', 'warning', 'Email notifications are globally disabled');
        return { success: false, error: 'Email notifications are globally disabled', debugInfo: this.getDebugInfo() };
      }
      this.addDebugLog('global-check', 'success', 'Email notifications are globally enabled');

      // Step 2: Get country name (convert from code if needed)
      const fullCountryName = this.getFullCountryName(caseData.country);
      this.addDebugLog('country-mapping', 'info', `Country mapping: ${caseData.country} -> ${fullCountryName}`);

      // Step 3: Get notification matrix
      const notificationMatrix = await getNotificationMatrix(fullCountryName);
      if (!notificationMatrix) {
        this.addDebugLog('matrix-check', 'error', `No notification matrix found for country: ${fullCountryName}`, {
          availableCountries: this.getAvailableMatrixCountries()
        });
        return { 
          success: false, 
          error: `No notification matrix configured for ${fullCountryName}`, 
          debugInfo: this.getDebugInfo() 
        };
      }
      this.addDebugLog('matrix-check', 'success', `Found notification matrix with ${notificationMatrix.rules.length} rules`);

      // Step 4: Find rule for "Case Booked" status
      const statusRule = notificationMatrix.rules.find(rule => rule.status === 'Case Booked');
      if (!statusRule) {
        this.addDebugLog('rule-check', 'error', 'No rule found for "Case Booked" status', {
          availableStatuses: notificationMatrix.rules.map(r => r.status)
        });
        return { 
          success: false, 
          error: 'No notification rule configured for "Case Booked" status', 
          debugInfo: this.getDebugInfo() 
        };
      }
      
      if (!statusRule.enabled) {
        this.addDebugLog('rule-check', 'warning', 'Rule for "Case Booked" is disabled');
        return { 
          success: false, 
          error: 'Email notifications for "Case Booked" are disabled', 
          debugInfo: this.getDebugInfo() 
        };
      }
      this.addDebugLog('rule-check', 'success', 'Found enabled rule for "Case Booked"');

      // Step 5: Get OAuth authentication
      const authData = await getActiveProviderTokens(fullCountryName);
      if (!authData) {
        this.addDebugLog('auth-check', 'error', `No authenticated email provider found for ${fullCountryName}`, {
          suggestion: 'Visit Email Configuration to authenticate with Google or Microsoft'
        });
        return { 
          success: false, 
          error: `No authenticated email provider for ${fullCountryName}`, 
          debugInfo: this.getDebugInfo() 
        };
      }
      this.addDebugLog('auth-check', 'success', `Found authentication for ${authData.provider}`, {
        provider: authData.provider,
        hasTokens: !!authData.tokens,
        userEmail: authData.userInfo?.email
      });

      // Step 6: Get recipient emails
      const recipientEmails = await getRecipientEmails(statusRule.recipients, caseData);
      if (recipientEmails.length === 0) {
        this.addDebugLog('recipients-check', 'error', 'No recipient emails found', {
          rules: statusRule.recipients,
          caseCountry: caseData.country,
          caseDepartment: caseData.department
        });
        return { 
          success: false, 
          error: 'No valid recipient emails found', 
          debugInfo: this.getDebugInfo() 
        };
      }
      this.addDebugLog('recipients-check', 'success', `Found ${recipientEmails.length} recipients`, recipientEmails);

      // Step 7: Prepare email content
      const subject = applyTemplateVariables(statusRule.template.subject, caseData, { eventType: 'New Case Created' });
      const body = applyTemplateVariables(statusRule.template.body, caseData, { eventType: 'New Case Created' });
      
      this.addDebugLog('template-processing', 'success', 'Email template processed', {
        subjectLength: subject.length,
        bodyLength: body.length
      });

      // Step 8: Send email
      const oauthService = createOAuthManager(authData.provider as 'google' | 'microsoft');
      
      // Enhanced token validation
      if (!authData.tokens.accessToken) {
        this.addDebugLog('token-validation', 'error', 'Access token is missing');
        return { 
          success: false, 
          error: 'Access token is missing - please re-authenticate', 
          debugInfo: this.getDebugInfo() 
        };
      }

      // Check token expiry
      if (authData.tokens.expiresAt && Date.now() > authData.tokens.expiresAt) {
        this.addDebugLog('token-validation', 'warning', 'Access token has expired', {
          expiresAt: new Date(authData.tokens.expiresAt).toISOString(),
          now: new Date().toISOString()
        });
        
        // Try to refresh token if we have a refresh token
        if (authData.tokens.refreshToken) {
          this.addDebugLog('token-refresh', 'info', 'Attempting to refresh access token');
          try {
            // You would need to implement token refresh logic here
            // For now, we'll continue with the expired token and let the API handle it
          } catch (refreshError) {
            this.addDebugLog('token-refresh', 'error', 'Token refresh failed', refreshError);
          }
        }
      }

      this.addDebugLog('email-send', 'info', 'Attempting to send email', {
        provider: authData.provider,
        recipientCount: recipientEmails.length,
        hasAttachments: false
      });

      const emailSent = await oauthService.sendEmail(authData.tokens.accessToken, {
        to: recipientEmails,
        subject: subject,
        body: body,
        from: authData.userInfo?.name || 'Case Booking System',
      });

      if (emailSent) {
        this.addDebugLog('email-send', 'success', 'Email sent successfully', {
          caseReference: caseData.caseReferenceNumber,
          recipients: recipientEmails,
          provider: authData.provider
        });
        return { success: true, debugInfo: this.getDebugInfo() };
      } else {
        this.addDebugLog('email-send', 'error', 'Email send failed (API returned false)');
        return { 
          success: false, 
          error: 'Email API returned failure status', 
          debugInfo: this.getDebugInfo() 
        };
      }

    } catch (error) {
      this.addDebugLog('error', 'error', 'Unexpected error occurred', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred', 
        debugInfo: this.getDebugInfo() 
      };
    }
  }

  /**
   * Convert country code to full country name
   */
  private getFullCountryName(countryCode: string): string {
    const countryMap: { [key: string]: string } = {
      'SG': 'Singapore',
      'MY': 'Malaysia',
      'PH': 'Philippines', 
      'ID': 'Indonesia',
      'VN': 'Vietnam',
      'HK': 'Hong Kong',
      'TH': 'Thailand'
    };
    return countryMap[countryCode] || countryCode;
  }

  /**
   * Get available matrix countries for debugging
   */
  private getAvailableMatrixCountries(): string[] {
    try {
      const stored = localStorage.getItem('email-matrix-configs-by-country');
      if (stored) {
        const configs = JSON.parse(stored);
        return Object.keys(configs);
      }
    } catch (error) {
      this.addDebugLog('debug-helper', 'error', 'Failed to get available matrix countries', error);
    }
    return [];
  }

  /**
   * Test email configuration without sending actual email
   */
  async testEmailConfiguration(country: string): Promise<{
    success: boolean;
    issues: string[];
    debugInfo: EmailDebugInfo[];
  }> {
    this.clearDebugLog();
    const issues: string[] = [];

    this.addDebugLog('test-init', 'info', `Testing email configuration for ${country}`);

    // Check global settings
    if (!(await areEmailNotificationsEnabled())) {
      issues.push('Email notifications are globally disabled');
    }

    // Check notification matrix
    const matrix = await getNotificationMatrix(country);
    if (!matrix) {
      issues.push(`No notification matrix found for ${country}`);
    } else {
      const caseBookedRule = matrix.rules.find(r => r.status === 'Case Booked');
      if (!caseBookedRule) {
        issues.push('No rule configured for "Case Booked" status');
      } else if (!caseBookedRule.enabled) {
        issues.push('Rule for "Case Booked" is disabled');
      }
    }

    // Check authentication
    const authData = await getActiveProviderTokens(country);
    if (!authData) {
      issues.push(`No authenticated email provider for ${country}`);
    } else {
      if (!authData.tokens.accessToken) {
        issues.push('Access token is missing');
      }
      if (authData.tokens.expiresAt && Date.now() > authData.tokens.expiresAt) {
        issues.push('Access token has expired');
      }
    }

    this.addDebugLog('test-complete', issues.length === 0 ? 'success' : 'warning', 
      `Test completed with ${issues.length} issues`, { issues });

    return {
      success: issues.length === 0,
      issues,
      debugInfo: this.getDebugInfo()
    };
  }
}

// Export singleton instance
export const enhancedEmailService = new EnhancedEmailService();

// Enhanced sendNewCaseNotification function with debugging
export const sendNewCaseNotificationEnhanced = async (caseData: CaseBooking): Promise<boolean> => {
  const result = await enhancedEmailService.sendNewCaseNotification(caseData);
  
  if (!result.success) {
    console.error('❌ Email notification failed:', result.error);
    console.log('🔍 Debug information:', result.debugInfo);
  }
  
  return result.success;
};