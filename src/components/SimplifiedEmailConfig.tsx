import React, { useState, useEffect } from 'react';
import userService from '../services/userService';
import { User } from '../types';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { getAllRoles } from '../data/permissionMatrixData';
import { useSound } from '../contexts/SoundContext';
import { useToast } from './ToastContainer';
import MultiSelectDropdown from './MultiSelectDropdown';
import SearchableDropdown from './SearchableDropdown';
import { CASE_STATUSES, STATUS_WORKFLOW } from '../constants/statuses';
import { USER_ROLES } from '../constants/permissions';
import dynamicConstantsService from '../services/dynamicConstantsService';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';
import {
  authenticateWithPopup,
  getStoredAuthTokens,
  storeAuthTokens,
  storeUserInfo,
  clearAuthTokens,
  isTokenExpired,
  isTokenExpiringSoon,
  getStoredUserInfo,
  createOAuthManager,
  getValidAccessToken,
  checkAuthenticationStatusOnline,
  UserInfo,
  AuthTokens
} from '../utils/simplifiedOAuth';
import { centralizedEmailService, AdminEmailCredentials } from '../services/centralizedEmailService';
import '../assets/components/EmailConfiguration.css';

interface EmailProvider {
  provider: 'google' | 'microsoft';
  isAuthenticated: boolean;
  userInfo?: UserInfo;
  tokens?: AuthTokens;
  fromName: string;
}

interface CountryEmailConfig {
  country: string;
  providers: {
    google: EmailProvider;
    microsoft: EmailProvider;
  };
  activeProvider?: 'google' | 'microsoft';
  notificationRules?: Record<string, {
    enabled: boolean;
    roles: string[];
    includeSubmitter: boolean;
    requireSameDepartment: boolean;
    adminOverride: boolean;
    adminGlobalAccess: boolean;
    departmentFilter?: string[];
  }>;
}

interface NotificationRule {
  status: string;
  enabled: boolean;
  recipients: {
    roles: string[];
    specificEmails: string[];
    includeSubmitter: boolean;
    departmentFilter: string[];
    requireSameDepartment: boolean;
  };
  template: {
    subject: string;
    body: string;
  };
}

interface EmailNotificationMatrix {
  country: string;
  rules: NotificationRule[];
}

// Get email configurations from Supabase app_settings table (external function)
export const getEmailConfigFromDatabase = async (country?: string): Promise<Record<string, CountryEmailConfig>> => {
  try {
    const { supabase } = await import('../lib/supabase');
    const { userService } = await import('../services');
    
    // Get current user ID for RLS policy compliance
    const user = await userService.getCurrentUser();
    if (!user?.id) {
      console.log('User not authenticated for loading email config');
      // Still try to load global settings
    }
    
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value') // ⚠️ setting_value (settingValue) - NOT settingvalue
      .eq('setting_key', 'simplified_email_configs') // ⚠️ setting_key (settingKey) - NOT settingkey
      .eq('user_id', user?.id || null) // ⚠️ user_id (userId) FK - NOT userid
      .maybeSingle();

    if (error || !data?.setting_value) {
      console.log('No email config found for user:', error?.message || 'No data');
      return {};
    }

    return data.setting_value;
  } catch (error) {
    console.error('Error in getEmailConfigFromDatabase:', error);
    return {};
  }
};

const SimplifiedEmailConfig: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [emailConfigs, setEmailConfigs] = useState<Record<string, CountryEmailConfig>>({});
  const [isAuthenticating, setIsAuthenticating] = useState<Record<string, boolean>>({});
  const [authError, setAuthError] = useState<string>('');
  const [isProviderSectionCollapsed, setIsProviderSectionCollapsed] = useState<boolean>(true);
  const [isNotificationRulesCollapsed, setIsNotificationRulesCollapsed] = useState<boolean>(true);
  const [isTemplateVariablesCollapsed, setIsTemplateVariablesCollapsed] = useState<boolean>(true);
  const [isEmailTemplatesCollapsed, setIsEmailTemplatesCollapsed] = useState<boolean>(true);
  const [selectedTemplate, setSelectedTemplate] = useState<'status_change' | 'new_case' | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [emailMatrixConfigs, setEmailMatrixConfigs] = useState<Record<string, EmailNotificationMatrix>>({});
  const [ruleCollapsedStates, setRuleCollapsedStates] = useState<Record<number, boolean>>({});
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  
  // CRITICAL FIX: Admin email management state
  const [adminEmailConfigs, setAdminEmailConfigs] = useState<Record<string, AdminEmailCredentials>>({});
  const [isAdminConfigCollapsed, setIsAdminConfigCollapsed] = useState<boolean>(false); // Show by default for admins
  const [adminConfigLoading, setAdminConfigLoading] = useState<boolean>(false);
  const [testEmailAddress, setTestEmailAddress] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const { playSound } = useSound();
  const { showSuccess, showError } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  
  // Load current user asynchronously
  useEffect(() => {
    const loadUser = async () => {
      setUserLoading(true);
      try {
        const user = await userService.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading current user:', error);
        setCurrentUser(null);
      } finally {
        setUserLoading(false);
      }
    };
    
    loadUser();
  }, []);

  // Check permissions
  const canConfigureEmail = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EMAIL_CONFIG) : false;

  // Load countries from database
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countries = await dynamicConstantsService.getCountries();
        setAvailableCountries(countries);
      } catch (error) {
        setAvailableCountries([]);
      }
    };

    loadCountries();
  }, []);

  // Load departments based on selected country
  useEffect(() => {
    const loadDepartments = async () => {
      if (!selectedCountry) {
        setAvailableDepartments([]);
        return;
      }

      try {
        // Use standardized country-based code table departments
        const { getDepartmentsForCountry } = await import('../utils/supabaseCodeTableService');
        const departments = await getDepartmentsForCountry(selectedCountry);
        setAvailableDepartments(departments);
      } catch (error) {
        setAvailableDepartments([]);
      }
    };

    loadDepartments();
  }, [selectedCountry]);

  // CRITICAL FIX: Load admin email configurations
  useEffect(() => {
    const loadAdminConfigs = async () => {
      if (!currentUser || currentUser.role !== 'admin') return;
      
      setAdminConfigLoading(true);
      try {
        // Load configurations for all countries
        const configuredCountries = await centralizedEmailService.getConfiguredCountries();
        const configs: Record<string, AdminEmailCredentials> = {};
        
        for (const country of configuredCountries) {
          const adminCredentials = await centralizedEmailService.getAdminEmailConfig(country);
          if (adminCredentials) {
            configs[country] = adminCredentials;
          }
        }
        
        setAdminEmailConfigs(configs);
        console.log('📧 ADMIN CONFIG DEBUG - Loaded admin email configurations:', {
          configuredCountries,
          configs: Object.keys(configs)
        });
      } catch (error) {
        console.error('Failed to load admin email configurations:', error);
        showError('Configuration Error', 'Failed to load admin email configurations');
      } finally {
        setAdminConfigLoading(false);
      }
    };

    loadAdminConfigs();
  }, [currentUser, showError]);

  // Check if user can switch countries (admin only)
  const canSwitchCountries = currentUser?.role === 'admin';

  // Initialize default notification matrix for a country
  const initializeNotificationMatrix = React.useCallback((country: string): EmailNotificationMatrix => {
    // Include all statuses from the workflow plus final statuses
    const statuses = [
      ...STATUS_WORKFLOW, // Main workflow statuses
      CASE_STATUSES.CASE_CLOSED, // Final statuses
      CASE_STATUSES.CASE_CANCELLED
    ];

    return {
      country,
      rules: statuses.map(status => {
        // Enable key statuses by default and provide better templates
        const isKeyStatus = status === CASE_STATUSES.CASE_BOOKED ||
                           status === CASE_STATUSES.ORDER_PREPARATION ||
                           status === CASE_STATUSES.ORDER_PREPARED ||
                           status === CASE_STATUSES.PENDING_DELIVERY_HOSPITAL ||
                           status === CASE_STATUSES.DELIVERED_HOSPITAL ||
                           status === CASE_STATUSES.CASE_COMPLETED ||
                           status === CASE_STATUSES.PENDING_DELIVERY_OFFICE ||
                           status === CASE_STATUSES.DELIVERED_OFFICE ||
                           status === CASE_STATUSES.TO_BE_BILLED;

        // Default roles for different statuses based on workflow
        let defaultRoles: string[] = [];

        if (status === CASE_STATUSES.CASE_BOOKED) {
          defaultRoles = [USER_ROLES.ADMIN, USER_ROLES.OPERATIONS, USER_ROLES.OPERATIONS_MANAGER];
        } else if (status === CASE_STATUSES.ORDER_PREPARATION) {
          defaultRoles = [USER_ROLES.ADMIN, USER_ROLES.OPERATIONS, USER_ROLES.OPERATIONS_MANAGER];
        } else if (status === CASE_STATUSES.ORDER_PREPARED) {
          defaultRoles = [USER_ROLES.ADMIN, USER_ROLES.OPERATIONS, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.DRIVER];
        } else if (status === CASE_STATUSES.PENDING_DELIVERY_HOSPITAL) {
          defaultRoles = [USER_ROLES.ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.DRIVER];
        } else if (status === CASE_STATUSES.DELIVERED_HOSPITAL) {
          defaultRoles = [USER_ROLES.ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.DRIVER, USER_ROLES.SALES];
        } else if (status === CASE_STATUSES.CASE_COMPLETED) {
          defaultRoles = [USER_ROLES.ADMIN, USER_ROLES.SALES, USER_ROLES.SALES_MANAGER, USER_ROLES.OPERATIONS_MANAGER];
        } else if (status === CASE_STATUSES.PENDING_DELIVERY_OFFICE) {
          defaultRoles = [USER_ROLES.ADMIN, USER_ROLES.SALES, USER_ROLES.DRIVER];
        } else if (status === CASE_STATUSES.DELIVERED_OFFICE) {
          defaultRoles = [USER_ROLES.ADMIN, USER_ROLES.SALES, USER_ROLES.DRIVER];
        } else if (status === CASE_STATUSES.TO_BE_BILLED) {
          defaultRoles = [USER_ROLES.ADMIN, USER_ROLES.SALES, USER_ROLES.SALES_MANAGER, USER_ROLES.OPERATIONS_MANAGER];
        } else if (status === CASE_STATUSES.CASE_CLOSED) {
          defaultRoles = [USER_ROLES.ADMIN, USER_ROLES.SALES_MANAGER, USER_ROLES.OPERATIONS_MANAGER];
        } else if (status === CASE_STATUSES.CASE_CANCELLED) {
          defaultRoles = [USER_ROLES.ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.IT];
        }

        // Enhanced templates for different statuses
        let template = {
          subject: `Case Status Update: ${status}`,
          body: `A case has been updated to status: ${status}\n\nCase Reference: {{caseReference}}\nHospital: {{hospital}}\nDate: {{dateOfSurgery}}\nSubmitted by: {{submittedBy}}\n\nBest regards,\nCase Booking System`
        };

        // Special templates for key statuses
        if (status === CASE_STATUSES.CASE_BOOKED) {
          template = {
            subject: `🆕 New Case Booked: {{caseReference}} - {{hospital}}`,
            body: `Dear Team,

A new case has been submitted and is ready for processing.

📋 Case Details:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Surgery Date: {{dateOfSurgery}}
• Surgery Time: {{timeOfProcedure}}
• Procedure: {{procedureType}} - {{procedureName}}
• Doctor: {{doctorName}}
• Submitted by: {{submittedBy}}
• Submission Time: {{submittedAt}}

📦 Equipment Required:
• Surgery Sets: {{surgerySetSelection}}
• Implant Boxes: {{implantBox}}

💬 Special Instructions:
{{specialInstruction}}

Please proceed with order preparation.

Best regards,
{{country}} Case Booking System`
          };
        } else if (status === CASE_STATUSES.CASE_COMPLETED) {
          template = {
            subject: `✅ Case Completed: {{caseReference}} - {{hospital}}`,
            body: `Dear Team,

The surgical case has been completed successfully.

📋 Case Details:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Surgery Date: {{dateOfSurgery}}
• Doctor: {{doctorName}}
• Completed by: {{processedBy}}
• Completion Time: {{processedAt}}

📝 Summary:
{{orderSummary}}

📄 DO Number: {{doNumber}}

Please proceed with equipment collection and office delivery.

Best regards,
{{country}} Case Booking System`
          };
        } else if (status === CASE_STATUSES.ORDER_PREPARED) {
          template = {
            subject: `📦 Order Ready for Delivery: {{caseReference}} - {{hospital}}`,
            body: `Dear Delivery Team,

The order has been prepared and is ready for delivery to the hospital.

📋 Case Details:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Surgery Date: {{dateOfSurgery}}
• Surgery Time: {{timeOfProcedure}}
• Doctor: {{doctorName}}
• Prepared by: {{processedBy}}

📦 Order Details:
{{processOrderDetails}}

📦 Equipment Ready:
• Surgery Sets: {{surgerySetSelection}}
• Implant Boxes: {{implantBox}}

💬 Special Instructions:
{{specialInstruction}}

Please proceed with delivery to hospital.

Best regards,
{{country}} Case Booking System`
          };
        } else if (status === CASE_STATUSES.DELIVERED_HOSPITAL) {
          template = {
            subject: `🏥 Delivered to Hospital: {{caseReference}} - {{hospital}}`,
            body: `Dear Team,

The equipment has been successfully delivered to the hospital.

📋 Case Details:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Surgery Date: {{dateOfSurgery}}
• Doctor: {{doctorName}}
• Delivered by: {{processedBy}}

📦 Delivery Details:
{{deliveryDetails}}

The surgical team can now proceed with the case.

Best regards,
{{country}} Case Booking System`
          };
        } else if (status === CASE_STATUSES.ORDER_PREPARATION) {
          template = {
            subject: `📋 Preparing Order Started: {{caseReference}} - {{hospital}}`,
            body: `Dear Operations Team,

Order preparation has started for the following case.

📋 Case Details:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Surgery Date: {{dateOfSurgery}}
• Surgery Time: {{timeOfProcedure}}
• Doctor: {{doctorName}}
• Started by: {{processedBy}}

📦 Equipment to Prepare:
• Surgery Sets: {{surgerySetSelection}}
• Implant Boxes: {{implantBox}}

💬 Special Instructions:
{{specialInstruction}}

Please proceed with order preparation.

Best regards,
{{country}} Case Booking System`
          };
        } else if (status === CASE_STATUSES.PENDING_DELIVERY_HOSPITAL) {
          template = {
            subject: `🚚 Pending Hospital Delivery: {{caseReference}} - {{hospital}}`,
            body: `Dear Delivery Team,

The following order is ready and pending delivery to the hospital.

📋 Case Details:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Surgery Date: {{dateOfSurgery}}
• Surgery Time: {{timeOfProcedure}}
• Doctor: {{doctorName}}

📦 Ready for Delivery:
• Surgery Sets: {{surgerySetSelection}}
• Implant Boxes: {{implantBox}}

Please coordinate delivery with the hospital.

Best regards,
{{country}} Case Booking System`
          };
        } else if (status === CASE_STATUSES.PENDING_DELIVERY_OFFICE) {
          template = {
            subject: `🏢 Pending Office Delivery: {{caseReference}} - Equipment Return`,
            body: `Dear Collection Team,

The following case equipment is ready for collection and return to office.

📋 Case Details:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Surgery Date: {{dateOfSurgery}}
• Doctor: {{doctorName}}
• Completed by: {{processedBy}}

📝 Case Summary:
{{orderSummary}}

📄 DO Number: {{doNumber}}

Please coordinate equipment collection from the hospital.

Best regards,
{{country}} Case Booking System`
          };
        } else if (status === CASE_STATUSES.DELIVERED_OFFICE) {
          template = {
            subject: `✅ Equipment Returned to Office: {{caseReference}}`,
            body: `Dear Team,

The equipment has been successfully returned to the office.

📋 Case Details:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Surgery Date: {{dateOfSurgery}}
• Doctor: {{doctorName}}
• Returned by: {{processedBy}}

📄 DO Number: {{doNumber}}

The case is now ready for billing.

Best regards,
{{country}} Case Booking System`
          };
        } else if (status === CASE_STATUSES.TO_BE_BILLED) {
          template = {
            subject: `💰 Ready for Billing: {{caseReference}} - {{hospital}}`,
            body: `Dear Billing Team,

The following case is ready for billing and invoicing.

📋 Case Details:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Surgery Date: {{dateOfSurgery}}
• Doctor: {{doctorName}}
• DO Number: {{doNumber}}
• Processed by: {{processedBy}}

Please proceed with billing process.

Best regards,
{{country}} Case Booking System`
          };
        } else if (status === CASE_STATUSES.CASE_CLOSED) {
          template = {
            subject: `📁 Case Closed: {{caseReference}} - {{hospital}}`,
            body: `Dear Team,

The following case has been officially closed.

📋 Case Details:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Surgery Date: {{dateOfSurgery}}
• Doctor: {{doctorName}}
• Closed by: {{processedBy}}

📄 DO Number: {{doNumber}}

The case has been archived and the billing process is complete.

Best regards,
{{country}} Case Booking System`
          };
        } else if (status === CASE_STATUSES.CASE_CANCELLED) {
          template = {
            subject: `❌ Case Cancelled: {{caseReference}} - {{hospital}}`,
            body: `Dear Team,

The following case has been cancelled.

📋 Case Details:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Surgery Date: {{dateOfSurgery}}
• Doctor: {{doctorName}}
• Cancelled by: {{processedBy}}

💬 Cancellation Reason:
{{processOrderDetails}}

Please take appropriate action regarding any prepared equipment.

Best regards,
{{country}} Case Booking System`
          };
        }

        return {
          status,
          enabled: false, // All rules disabled by default per user request
          recipients: {
            roles: [], // All roles unchecked by default per user request
            specificEmails: [],
            includeSubmitter: false, // All options disabled by default per user request
            departmentFilter: [],
            requireSameDepartment: false, // All options disabled by default per user request
            adminOverride: false, // All options disabled by default per user request
            adminGlobalAccess: false, // All options disabled by default per user request
            legacyRoleMapping: {
              'operation-manager': 'operations-manager' // Handle legacy role names
            }
          },
          template,
          conditions: {
            countryRestrictions: [], // No country restrictions by default
            timeRestrictions: {
              weekdaysOnly: false // Send notifications any day of the week
            }
          }
        };
      })
    };
  }, []);

  // Initialize countries - automatically select user's country
  useEffect(() => {
    // Auto-select user's country without showing the dropdown
    if (!selectedCountry && availableCountries.length > 0 && currentUser) {
      const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0] || availableCountries[0];
      setSelectedCountry(userCountry);
    }
  }, [currentUser, selectedCountry, availableCountries]);

  // Load email configurations from database

  // Save email configurations to Supabase app_settings table
  const saveEmailConfigToDatabase = async (configs: Record<string, CountryEmailConfig>) => {
    try {
      const { supabase } = await import('../lib/supabase');
      const { userService } = await import('../services');
      const { centralizedEmailService } = await import('../services/centralizedEmailService');
      
      // Get current user ID for RLS policy compliance
      const user = await userService.getCurrentUser();
      if (!user?.id) {
        console.warn('User not authenticated for saving email config - saving as global setting');
      }
      
      // CRITICAL FIX: Save both user config AND admin config for centralized email system
      console.log('📧 SAVE CONFIG DEBUG - Saving email configurations:', {
        countriesCount: Object.keys(configs).length,
        countries: Object.keys(configs),
        userId: user?.id
      });
      
      // Save user configuration (for UI and backwards compatibility)
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('setting_key', 'simplified_email_configs')
        .eq('user_id', user?.id || null)
        .maybeSingle();
      
      if (existing) {
        // Update existing user record
        const { error } = await supabase
          .from('app_settings')
          .update({
            setting_value: configs, // ⚠️ setting_value (settingValue) - NOT settingvalue
            updated_at: new Date().toISOString() // ⚠️ updated_at (updatedAt)
          })
          .eq('setting_key', 'simplified_email_configs')
          .eq('user_id', user?.id || null);
        
        if (error) {
          console.error('Error updating user app_settings:', error);
          throw error;
        }
      } else {
        // Insert new user record with ON CONFLICT handling to prevent 409 errors
        const { error } = await supabase
          .from('app_settings')
          .upsert({
            user_id: user?.id || null, // ⚠️ user_id (userId) FK - NOT userid
            setting_key: 'simplified_email_configs', // ⚠️ setting_key (settingKey) - NOT settingkey
            setting_value: configs,
            updated_at: new Date().toISOString(),
            is_system_setting: false,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,setting_key' // Handle conflicts on composite primary key
          });
        
        if (error) {
          console.error('Error upserting user app_settings:', error);
          throw error;
        }
      }
      
      // CRITICAL FIX: Also save as centralized admin config for email notifications
      for (const [country, config] of Object.entries(configs)) {
        if (config.activeProvider && config.providers[config.activeProvider]?.isAuthenticated) {
          const provider = config.providers[config.activeProvider];
          
          console.log('📧 SAVE CONFIG DEBUG - Creating admin config for country:', {
            country,
            provider: config.activeProvider,
            fromEmail: provider.userInfo?.email,
            fromName: provider.fromName
          });
          
          // Convert user provider config to admin credentials format
          const adminCredentials = {
            provider: config.activeProvider,
            clientId: config.activeProvider === 'microsoft' 
              ? process.env.REACT_APP_MICROSOFT_CLIENT_ID || ''
              : process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
            tenantId: config.activeProvider === 'microsoft' 
              ? process.env.REACT_APP_MICROSOFT_TENANT_ID 
              : undefined,
            accessToken: provider.tokens?.accessToken || '',
            refreshToken: provider.tokens?.refreshToken || '',
            expiresAt: provider.tokens?.expiresAt || Date.now() + 3600000, // 1 hour default
            fromEmail: provider.userInfo?.email || '',
            fromName: provider.fromName || 'TM Spine Case Booking'
          };
          
          // Save as system admin config
          await centralizedEmailService.setAdminEmailConfig(country, adminCredentials, user?.name || 'System');
          
          console.log('✅ SAVE CONFIG DEBUG - Admin config saved for country:', country);
        }
      }
    } catch (error) {
      console.error('Error in saveEmailConfigToDatabase:', error);
      throw error;
    }
  };

  // Load stored authentication data
  useEffect(() => {
    if (!selectedCountry) return;

    const loadAuthData = async () => {
      // Load tokens and user info ONLY from Supabase
      // Microsoft-only authentication (Google Gmail API removed for security)
      const microsoftTokens = await getStoredAuthTokens(selectedCountry);

      // Load stored user info ONLY from Supabase
      const microsoftUserInfo = await getStoredUserInfo(selectedCountry);
      
      // No need for separate persistence loading - all data comes from Supabase now

      // Microsoft token validation with real-time server verification
      const validateMicrosoftTokens = async (tokens: AuthTokens | null) => {
        if (!tokens) return false;

        // First check local expiration to avoid unnecessary API calls
        if (isTokenExpired(tokens)) {
          // If token is expired but we have a refresh token, try to refresh
          if (tokens.refreshToken) {
            const validToken = await getValidAccessToken(selectedCountry);
            return !!validToken;
          }
          // Token is expired and can't be refreshed
          return false;
        }

        // Token appears valid locally, now check with Microsoft servers for real-time status
        try {
          const isValidOnline = await checkAuthenticationStatusOnline(selectedCountry);
          if (!isValidOnline) {
            // Token is invalid online - clear it and return false
            clearAuthTokens(selectedCountry);
            return false;
          }
          return true;
        } catch (error) {
          // If real-time check fails, fallback to local validation
          console.warn('Real-time validation failed for Microsoft, using local validation:', error);
          return !isTokenExpired(tokens);
        }
      };

    // Load saved email configurations from database
    const loadEmailConfigs = async () => {
      try {
        const savedEmailConfigs = await getEmailConfigFromDatabase(selectedCountry);
        return savedEmailConfigs;
      } catch (error) {
        return {};
      }
    };

    const initializeEmailConfig = async () => {
      const savedEmailConfigs = await loadEmailConfigs();

      // Get existing saved config for this country or use defaults
      const existingConfig = savedEmailConfigs[selectedCountry];

      // Validate Microsoft tokens asynchronously
      const microsoftValid = await validateMicrosoftTokens(microsoftTokens);

      // Get potentially refreshed tokens after validation
      const updatedMicrosoftTokens = await getStoredAuthTokens(selectedCountry);

      const config: CountryEmailConfig = {
        country: selectedCountry,
        providers: {
          google: {
            provider: 'google',
            isAuthenticated: false, // Google Gmail API removed
            tokens: undefined,
            userInfo: undefined,
            fromName: 'Case Booking System (Google Disabled)'
          },
          microsoft: {
            provider: 'microsoft',
            isAuthenticated: microsoftValid ?? false,
            tokens: updatedMicrosoftTokens || undefined,
            userInfo: microsoftUserInfo || undefined,
            fromName: existingConfig?.providers?.microsoft?.fromName || 'Case Booking System'
          }
        }
      };

      // Determine active provider (Microsoft-only)
      if (config.providers.microsoft.isAuthenticated) {
        config.activeProvider = 'microsoft';
      }

      setEmailConfigs(prev => ({
        ...prev,
        [selectedCountry]: config
      }));
      };

      // Call initializeEmailConfig after loading auth data
      await initializeEmailConfig();
    };

    // Initial load
    loadAuthData();

    // Add visibility change listener to reload auth when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reload auth data when tab becomes visible
        setTimeout(() => {
          loadAuthData();
        }, 100); // Small delay to ensure proper reload
      }
    };

    // Add focus listener as fallback
    const handleFocus = () => {
      setTimeout(() => {
        loadAuthData();
      }, 100);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedCountry]);

  // Load email notification matrix configs from database
  useEffect(() => {
    if (!selectedCountry) return;

    // Load email notification matrix configs from email_notification_rules table (source of truth)
    const loadNotificationMatrix = async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        
        console.log('🔧 EMAIL CONFIG LOAD - Loading notification rules from database:', {
          country: selectedCountry,
          source: 'email_notification_rules',
          timestamp: new Date().toISOString()
        });
        
        // Load all notification rules for this country from email_notification_rules table
        const { data: rules, error } = await supabase
          .from('email_notification_rules')
          .select('*')
          .eq('country', selectedCountry)
          .order('status');
        
        if (error) {
          console.error('🔧 EMAIL CONFIG LOAD - Database error:', error);
          throw error;
        }
        
        if (!rules || rules.length === 0) {
          console.log('🔧 EMAIL CONFIG LOAD - No rules found, initializing default matrix');
          // Initialize with default matrix if none exists
          const newMatrix = initializeNotificationMatrix(selectedCountry);
          setEmailMatrixConfigs(prev => ({
            ...prev,
            [selectedCountry]: newMatrix
          }));
          return;
        }
        
        console.log('🔧 EMAIL CONFIG LOAD - Found rules:', {
          country: selectedCountry,
          rulesCount: rules.length,
          statuses: rules.map(r => r.status)
        });
        
        // Convert database rules to UI format
        const matrixRules = rules.map(rule => ({
          status: rule.status,
          enabled: rule.enabled,
          template: {
            subject: rule.template.subject || '',
            body: rule.template.body || ''
          },
          recipients: {
            roles: rule.recipients.roles || [],
            specificEmails: rule.recipients.members || [],
            departmentFilter: rule.recipients.departments || [],
            includeSubmitter: rule.recipients.includeSubmitter || false,
            requireSameDepartment: false // UI field not in database
          },
          conditions: {}
        }));
        
        // Create matrix structure for this country
        const countryMatrix = {
          country: selectedCountry,
          rules: matrixRules
        };
        
        // Update state with loaded rules
        setEmailMatrixConfigs(prev => ({
          ...prev,
          [selectedCountry]: countryMatrix
        }));
        
        console.log('✅ EMAIL CONFIG LOAD - Successfully loaded rules:', {
          country: selectedCountry,
          rulesLoaded: matrixRules.length,
          enabledRules: matrixRules.filter(r => r.enabled).length
        });
        
      } catch (error) {
        console.error('❌ EMAIL CONFIG LOAD - Critical error:', error);
        // Initialize with default if loading fails
        const newMatrix = initializeNotificationMatrix(selectedCountry);
        setEmailMatrixConfigs(prev => ({
          ...prev,
          [selectedCountry]: newMatrix
        }));
      }
    };

    loadNotificationMatrix();
  }, [selectedCountry, initializeNotificationMatrix]);

  // Handle OAuth authentication
  const handleAuthenticate = async () => {
    if (!selectedCountry) {
      showError('No Country Selected', 'Please select a country first');
      return;
    }

    // Check if Microsoft OAuth client ID is configured
    const clientId = process.env.REACT_APP_MICROSOFT_CLIENT_ID;

    if (!clientId) {
      setAuthError('Microsoft OAuth is not configured. Please check your environment variables.');
      showError(
        'OAuth Not Configured',
        'Microsoft client ID is missing. Please set up OAuth credentials first.'
      );
      return;
    }

    setIsAuthenticating(prev => ({ ...prev, microsoft: true }));
    setAuthError('');

    try {
      const { tokens, userInfo } = await authenticateWithPopup(selectedCountry);
      
      // Update configuration
      const updatedConfigs = {
        ...emailConfigs,
        [selectedCountry]: {
          ...emailConfigs[selectedCountry],
          country: selectedCountry,
          providers: {
            ...emailConfigs[selectedCountry]?.providers,
            google: {
              provider: 'google' as const,
              isAuthenticated: false,
              fromName: 'Case Booking System (Google Disabled)'
            },
            microsoft: {
              provider: 'microsoft' as const,
              isAuthenticated: true,
              userInfo,
              tokens,
              fromName: emailConfigs[selectedCountry]?.providers?.microsoft?.fromName || 'Case Booking System'
            }
          },
          activeProvider: 'microsoft' as const
        }
      };

      setEmailConfigs(updatedConfigs);

      // Automatically save email configs after successful authentication
      try {
        await saveEmailConfigToDatabase(updatedConfigs);
      } catch (error) {
        showError('Save Failed', 'Email configuration saved locally but failed to sync to database');
      }

      playSound.success();
      showSuccess(
        'Authentication Successful',
        `Successfully authenticated with Microsoft as ${userInfo.email}`
      );

    } catch (error) {

      // More detailed error handling
      let errorMessage = 'Authentication failed';
      if (error instanceof Error) {
        errorMessage = error.message;

        // Check for specific error types
        if (error.message.includes('Token exchange failed')) {
          errorMessage = 'Failed to exchange authorization code for tokens. Please check your OAuth configuration.';
        } else if (error.message.includes('Failed to get user info')) {
          errorMessage = 'Authentication succeeded but failed to retrieve user information. Please try again.';
        } else if (error.message.includes('Popup blocked')) {
          errorMessage = 'Popup was blocked. Please allow popups for this site and try again.';
        } else if (error.message.includes('Authentication cancelled')) {
          errorMessage = 'Authentication was cancelled. Please try again.';
        }
      }

      setAuthError(errorMessage);
      showError('Authentication Failed', errorMessage);
    } finally {
      setIsAuthenticating(prev => ({ ...prev, microsoft: false }));
    }
  };

  // Handle disconnection
  const handleDisconnect = async () => {
    if (!selectedCountry) return;

    await clearAuthTokens(selectedCountry);

    setEmailConfigs(prev => ({
      ...prev,
      [selectedCountry]: {
        ...prev[selectedCountry],
        providers: {
          ...prev[selectedCountry]?.providers,
          microsoft: {
            provider: 'microsoft',
            isAuthenticated: false,
            fromName: prev[selectedCountry]?.providers?.microsoft?.fromName || 'Case Booking System'
          }
        },
        activeProvider: undefined // Microsoft disconnected
      }
    }));

    playSound.click();
    showSuccess('Disconnected', 'Successfully disconnected from Microsoft');
  };

  // Handle from name change
  const handleFromNameChange = (fromName: string) => {
    if (!selectedCountry) return;

    setEmailConfigs(prev => ({
      ...prev,
      [selectedCountry]: {
        ...prev[selectedCountry],
        providers: {
          ...prev[selectedCountry]?.providers,
          microsoft: {
            ...prev[selectedCountry]?.providers?.microsoft,
            fromName
          }
        }
      }
    }));
  };

  // Save configuration
  const handleSaveConfig = async () => {
    if (!selectedCountry) {
      showError('No Country Selected', 'Please select a country first');
      return;
    }

    // Check if there's any configuration to save
    const countryConfig = emailConfigs[selectedCountry];
    if (!countryConfig) {
      showError('No Configuration', 'No email provider configuration found for this country');
      return;
    }

    try {
      // Save current emailConfigs state to database (includes "From Name" changes)
      await saveEmailConfigToDatabase(emailConfigs);

      playSound.success();
      showSuccess('Configuration Saved', `Email settings for ${selectedCountry} have been saved to database`);
    } catch (error) {
      showError('Save Failed', 'Failed to save email configuration to database. Please try again.');
    }
  };

  // Test email functionality
  const handleTestEmail = async () => {
    if (!selectedCountry || !currentConfig?.activeProvider) {
      showError('No Provider Selected', 'Please authenticate with an email provider first');
      return;
    }

    const activeProvider = currentConfig.activeProvider;
    
    if (!activeProvider || !currentConfig.providers || !currentConfig.providers[activeProvider]) {
      showError('Configuration Error', 'Email provider configuration is not properly set up');
      return;
    }
    
    const providerConfig = currentConfig.providers[activeProvider];

    if (!providerConfig || !providerConfig.isAuthenticated) {
      showError('Not Authenticated', `Please authenticate with ${activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1)} first`);
      return;
    }

    if (!providerConfig.userInfo?.email) {
      showError('No Email Address', 'User email address not found. Please re-authenticate to get your email address.');
      return;
    }

    try {
      // Show loading state
      showSuccess('Sending Test Email', 'Preparing test email...');// Get valid access token (handles refresh if necessary)
      const validAccessToken = await getValidAccessToken(selectedCountry);

      if (!validAccessToken) {
        throw new Error('Unable to get valid access token. Please re-authenticate.');
      }

      // Create OAuth manager for sending email (Microsoft-only)
      const oauth = createOAuthManager();

      // Get current user's email - test email should go to logged-in user, not OAuth account
      const recipientEmail = currentUser?.email;
      
      if (!recipientEmail) {
        showError('No Recipient Email', 'Current user does not have an email address configured. Cannot send test email.');
        return;
      }
      
      // Prepare test email data
      const emailData = {
        to: [recipientEmail], // Send to logged-in user
        subject: `Test Email from ${providerConfig.fromName}`,
        body: `
          <h2>✅ Email Configuration Test</h2>
          <p>This is a test email to verify your email configuration is working correctly.</p>

          <h3>Configuration Details:</h3>
          <ul>
            <li><strong>Provider:</strong> ${activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1)}</li>
            <li><strong>Country:</strong> ${selectedCountry}</li>
            <li><strong>From Name:</strong> ${providerConfig.fromName}</li>
            <li><strong>Sent To:</strong> ${recipientEmail}</li>
            <li><strong>OAuth Account:</strong> ${providerConfig.userInfo.email}</li>
            <li><strong>Send Time:</strong> ${new Date().toLocaleString()}</li>
          </ul>

          <p><em>If you received this email, your email configuration is working properly!</em></p>

          <hr>
          <p style="color: #666; font-size: 12px;">
            This test email was sent from the Case Booking System email configuration.
          </p>
        `
      };

      // Send the test email using the valid access token
      const success = await oauth.sendEmail(validAccessToken, emailData);

      if (success) {
        playSound.success();
        showSuccess(
          'Test Email Sent Successfully! 📧',
          `Test email sent to ${recipientEmail} via ${activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1)}`
        );
      } else {
        throw new Error('Email sending failed - API returned false');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (errorMessage.includes('expired')) {
        showError('Authentication Expired', 'Your authentication has expired. Please re-authenticate and try again.');
      } else if (errorMessage.includes('blocked') || errorMessage.includes('permission')) {
        showError('Permission Denied', 'Email sending permission denied. Please check your OAuth consent settings.');
      } else {
        showError('Test Email Failed', `Unable to send test email: ${errorMessage}`);
      }
    }
  };

  // Handle notification rule updates
  const updateNotificationRule = (ruleIndex: number, updates: Partial<NotificationRule>) => {
    if (!selectedCountry || !emailMatrixConfigs[selectedCountry]) return;

    const updatedMatrix = {
      ...emailMatrixConfigs[selectedCountry],
      rules: emailMatrixConfigs[selectedCountry].rules.map((rule, index) =>
        index === ruleIndex ? { ...rule, ...updates } : rule
      )
    };

    setEmailMatrixConfigs(prev => ({
      ...prev,
      [selectedCountry]: updatedMatrix
    }));
  };

  // Toggle individual rule collapse state
  const toggleRuleCollapse = (ruleIndex: number) => {
    setRuleCollapsedStates(prev => ({
      ...prev,
      [ruleIndex]: !prev[ruleIndex]
    }));
    playSound.click();
  };

  // Setup Admin OAuth - IMPLEMENTATION
  const setupAdminOAuth = async () => {
    setAdminConfigLoading(true);
    try {
      const oauth = createOAuthManager();
      const { tokens, userInfo } = await authenticateWithPopup(selectedCountry);
      
      const adminCredentials: AdminEmailCredentials = {
        provider: 'microsoft',
        clientId: process.env.REACT_APP_MICROSOFT_CLIENT_ID!,
        tenantId: process.env.REACT_APP_MICROSOFT_TENANT_ID,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        fromEmail: userInfo.email,
        fromName: userInfo.name
      };
      
      const success = await centralizedEmailService.setAdminEmailConfig(
        selectedCountry, 
        adminCredentials, 
        currentUser!.id
      );
      
      if (success) {
        setAdminEmailConfigs(prev => ({...prev, [selectedCountry]: adminCredentials}));
        showSuccess('Admin OAuth Setup Complete', 'Admin email authentication configured successfully');
      }
    } catch (error) {
      console.error('Admin OAuth setup error:', error);
      showError('OAuth Setup Failed', error instanceof Error ? error.message : 'Failed to setup admin OAuth');
    } finally {
      setAdminConfigLoading(false);
    }
  };

  // Save notification matrix - REWRITTEN to save directly to email_notification_rules table
  const saveNotificationMatrix = async () => {
    if (!selectedCountry) return;

    try {
      const { supabase } = await import('../lib/supabase');
      
      console.log('🔧 EMAIL CONFIG SAVE - Starting comprehensive save process:', {
        country: selectedCountry,
        rulesCount: emailMatrixConfigs[selectedCountry]?.rules?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      const countryMatrix = emailMatrixConfigs[selectedCountry];
      if (!countryMatrix?.rules) {
        throw new Error(`No notification rules found for country: ${selectedCountry}`);
      }
      
      // STEP 1: Save to email_notification_rules table (primary source for email processor)
      console.log('🔧 EMAIL CONFIG SAVE - Saving to email_notification_rules table...');
      
      let savedRulesCount = 0;
      let updatedRulesCount = 0;
      
      for (const rule of countryMatrix.rules) {
        console.log('🔧 EMAIL CONFIG SAVE - Processing rule:', {
          status: rule.status,
          enabled: rule.enabled,
          hasTemplate: !!rule.template,
          hasRecipients: !!rule.recipients
        });
        
        // Check if rule already exists
        const { data: existingRule } = await supabase
          .from('email_notification_rules')
          .select('id')
          .eq('country', selectedCountry)
          .eq('status', rule.status)
          .maybeSingle();
        
        // Prepare rule data for database
        const ruleData = {
          country: selectedCountry,
          status: rule.status,
          enabled: rule.enabled,
          template: {
            subject: rule.template.subject || '',
            body: rule.template.body || ''
          },
          recipients: {
            roles: rule.recipients.roles || [],
            members: rule.recipients.specificEmails || [],
            departments: rule.recipients.departmentFilter || [],
            includeSubmitter: rule.recipients.includeSubmitter || false
          },
          conditions: {},
          updated_at: new Date().toISOString()
        };
        
        if (existingRule) {
          // Update existing rule
          const { error: updateError } = await supabase
            .from('email_notification_rules')
            .update(ruleData)
            .eq('id', existingRule.id);
          
          if (updateError) {
            console.error('🔧 EMAIL CONFIG ERROR - Failed to update rule:', {
              status: rule.status,
              error: updateError
            });
            throw updateError;
          } else {
            updatedRulesCount++;
            console.log('✅ EMAIL CONFIG SAVE - Updated rule:', rule.status);
          }
        } else {
          // Insert new rule
          const { error: insertError } = await supabase
            .from('email_notification_rules')
            .insert({
              ...ruleData,
              created_at: new Date().toISOString()
            });
          
          if (insertError) {
            console.error('🔧 EMAIL CONFIG ERROR - Failed to insert rule:', {
              status: rule.status,
              error: insertError
            });
            throw insertError;
          } else {
            savedRulesCount++;
            console.log('✅ EMAIL CONFIG SAVE - Inserted new rule:', rule.status);
          }
        }
      }
      
      // STEP 2: Also save to app_settings for UI persistence (backup/cache)
      console.log('🔧 EMAIL CONFIG SAVE - Saving to app_settings for UI persistence...');
      
      const { userService } = await import('../services');
      const user = await userService.getCurrentUser();
      
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('setting_key', 'email_matrix_configs_by_country')
        .eq('user_id', user?.id || null)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from('app_settings')
          .update({
            setting_value: emailMatrixConfigs,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'email_matrix_configs_by_country')
          .eq('user_id', user?.id || null);
      } else {
        // Use upsert to prevent 409 conflicts
        await supabase
          .from('app_settings')
          .upsert({
            user_id: user?.id || null,
            setting_key: 'email_matrix_configs_by_country',
            setting_value: emailMatrixConfigs,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_system_setting: false
          }, {
            onConflict: 'user_id,setting_key' // Handle conflicts on composite primary key
          });
      }
      
      // Success!
      console.log('✅ EMAIL CONFIG SAVE - Complete success:', {
        country: selectedCountry,
        newRules: savedRulesCount,
        updatedRules: updatedRulesCount,
        totalRules: savedRulesCount + updatedRulesCount
      });
      
      playSound.success();
      showSuccess(
        'Email Notification Rules Saved Successfully!', 
        `${selectedCountry} email templates are now synchronized with the email processor. ` +
        `${savedRulesCount} new rules created, ${updatedRulesCount} rules updated.`
      );
      
      // Show success message for tests
      setSuccessMessage(`Email configuration for ${selectedCountry} saved successfully`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
      
    } catch (error) {
      console.error('❌ EMAIL CONFIG SAVE - Critical error:', error);
      showError(
        'Save Failed', 
        `Failed to save notification rules for ${selectedCountry}. Error: ${(error as Error).message || 'Unknown error'}`
      );
    }
  };


  // Show loading while user is being loaded
  if (userLoading) {
    return (
      <div className="email-config-container">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading user information...</p>
        </div>
      </div>
    );
  }

  if (!canConfigureEmail) {
    return (
      <div className="email-config-container">
        <div className="permission-denied-message">
          <h3>Access Denied</h3>
          <p>You don't have permission to configure email settings.</p>
          <p>Please contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  const currentConfig = emailConfigs[selectedCountry] || {
    country: selectedCountry,
    providers: {
      google: {
        provider: 'google' as const,
        isAuthenticated: false,
        fromName: 'Case Booking System'
      },
      microsoft: {
        provider: 'microsoft' as const,
        isAuthenticated: false,
        fromName: 'Case Booking System'
      }
    },
    activeProvider: undefined
  };

  // Check OAuth configuration status
  const isGoogleConfigured = !!process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const isMicrosoftConfigured = !!process.env.REACT_APP_MICROSOFT_CLIENT_ID;

  return (
    <div className="email-config-container" data-testid="email-config-form">
      {/* Success Message Display */}
      {showSuccessMessage && (
        <div 
          className="alert alert-success"
          data-testid="success-message"
          style={{ marginBottom: '1rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>✅ {successMessage}</span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowSuccessMessage(false)}
              style={{ background: 'none', border: 'none', fontSize: '1.2rem', padding: '0' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="email-config-header">
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>📧 Email Configuration</h3>
        <p style={{ fontSize: '0.9rem', color: '#6c757d' }}>Configure email providers for automated notifications</p>

        {/* Country Selection for Admin */}
        {canSwitchCountries && (
          <div className="country-selection" style={{ marginTop: '1rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>Select Country:</label>
            <div style={{ maxWidth: '300px' }}>
              <SearchableDropdown
                id="country-selection"
                value={selectedCountry}
                onChange={(value) => setSelectedCountry(value)}
                options={availableCountries}
                placeholder="Search and select country"
                required={true}
                disabled={false}
              />
            </div>
          </div>
        )}

        {selectedCountry && !canSwitchCountries && (
          <div className="current-country-badge">
            <span className="country-label">Configuration for:</span>
            <span className="country-name">{selectedCountry}</span>
          </div>
        )}
      </div>

      {selectedCountry && (
        <>
          {/* CRITICAL FIX: Admin Email Configuration Section */}
          {currentUser?.role === 'admin' && (
            <div className="config-section">
              <div
                className="section-header collapsible-header"
                onClick={() => setIsAdminConfigCollapsed(!isAdminConfigCollapsed)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h3>🔧 Admin Email System Configuration</h3>
                  {adminEmailConfigs[selectedCountry] ? (
                    <div className="provider-status-badge-inline">
                      <span className="status-icon">✅</span>
                      <span style={{ fontSize: '0.85rem' }}>
                        Admin {adminEmailConfigs[selectedCountry].provider} Configured
                      </span>
                    </div>
                  ) : (
                    <div className="provider-status-badge-inline">
                      <span className="status-icon">⚠️</span>
                      <span style={{ fontSize: '0.85rem' }}>Admin Not Configured</span>
                    </div>
                  )}
                </div>
                <span className={`chevron ${isAdminConfigCollapsed ? 'collapsed' : 'expanded'}`}>
                  {isAdminConfigCollapsed ? '▶' : '▼'}
                </span>
              </div>

              {!isAdminConfigCollapsed && (
                <div className="section-content">
                  <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: '#e8f4fd',
                    borderRadius: '8px',
                    border: '1px solid #bee5eb'
                  }}>
                    <h4 style={{ color: '#0c5460', margin: '0 0 0.5rem 0' }}>🎯 Centralized Email System</h4>
                    <p style={{ color: '#0c5460', margin: 0, fontSize: '0.9rem' }}>
                      Configure admin-based email authentication for automated case notifications. 
                      This replaces individual user OAuth tokens with centralized system credentials.
                    </p>
                  </div>

                  <div className="admin-email-form">
                    <div className="form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Provider:</label>
                        <select 
                          className="form-control"
                          value={adminEmailConfigs[selectedCountry]?.provider || 'microsoft'}
                          disabled={adminConfigLoading}
                        >
                          <option value="microsoft">Microsoft (Office 365)</option>
                          <option value="google" disabled>Google (Coming Soon)</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>From Email:</label>
                        <input
                          type="email"
                          className="form-control"
                          value={adminEmailConfigs[selectedCountry]?.fromEmail || ''}
                          placeholder="system@company.com"
                          disabled={true}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>From Name:</label>
                        <input
                          type="text"
                          className="form-control"
                          value={adminEmailConfigs[selectedCountry]?.fromName || 'TM Case Booking System'}
                          disabled={true}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Status:</label>
                        <div style={{ 
                          padding: '0.375rem 0.75rem', 
                          backgroundColor: adminEmailConfigs[selectedCountry] ? '#d4edda' : '#f8d7da',
                          border: `1px solid ${adminEmailConfigs[selectedCountry] ? '#c3e6cb' : '#f5c6cb'}`,
                          borderRadius: '0.25rem',
                          color: adminEmailConfigs[selectedCountry] ? '#155724' : '#721c24'
                        }}>
                          {adminEmailConfigs[selectedCountry] ? 
                            `✅ Active (Token expires: ${new Date(adminEmailConfigs[selectedCountry].expiresAt).toLocaleDateString()})` :
                            '❌ Not Configured'
                          }
                        </div>
                      </div>
                    </div>

                    <div className="admin-config-actions" style={{ 
                      marginTop: '1.5rem', 
                      display: 'flex', 
                      gap: '1rem',
                      alignItems: 'center'
                    }}>
                      <button
                        className="btn btn-primary"
                        disabled={adminConfigLoading}
                        onClick={setupAdminOAuth}
                      >
                        {adminConfigLoading ? 'Configuring...' : (adminEmailConfigs[selectedCountry] ? 'Update Admin OAuth' : 'Setup Admin OAuth')}
                      </button>

                      {adminEmailConfigs[selectedCountry] && (
                        <>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="email"
                              className="form-control"
                              style={{ width: '200px' }}
                              placeholder="test@example.com"
                              value={testEmailAddress}
                              onChange={(e) => setTestEmailAddress(e.target.value)}
                              disabled={isTesting}
                            />
                            <button
                              className="btn btn-secondary"
                              disabled={isTesting || !testEmailAddress}
                              onClick={async () => {
                                setIsTesting(true);
                                try {
                                  const result = await centralizedEmailService.testAdminEmailConfig(selectedCountry, testEmailAddress);
                                  if (result.success) {
                                    showSuccess('Test Successful', 'Test email sent successfully!');
                                  } else {
                                    showError('Test Failed', `Test email failed: ${result.error}`);
                                  }
                                } catch (error) {
                                  showError('Test Failed', 'Test email failed');
                                } finally {
                                  setIsTesting(false);
                                }
                              }}
                            >
                              {isTesting ? 'Testing...' : 'Test Email'}
                            </button>
                          </div>

                          <button
                            className="btn btn-danger btn-sm"
                            onClick={async () => {
                              if (window.confirm(`Remove admin email configuration for ${selectedCountry}?`)) {
                                const success = await centralizedEmailService.removeAdminEmailConfig(selectedCountry);
                                if (success) {
                                  showSuccess('Configuration Removed', 'Admin configuration removed');
                                  setAdminEmailConfigs(prev => {
                                    const updated = { ...prev };
                                    delete updated[selectedCountry];
                                    return updated;
                                  });
                                } else {
                                  showError('Remove Failed', 'Failed to remove configuration');
                                }
                              }
                            }}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Collapsible Provider Authentication with Summary */}
          <div className="config-section">
            <div
              className="section-header collapsible-header"
              onClick={() => setIsProviderSectionCollapsed(!isProviderSectionCollapsed)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3>🔐 Email Provider Authentication</h3>
              </div>
              <span className={`chevron ${isProviderSectionCollapsed ? 'collapsed' : 'expanded'}`}>
                {isProviderSectionCollapsed ? '▶' : '▼'}
              </span>
            </div>

            {!isProviderSectionCollapsed && (
              <div className="section-content">
                <div style={{
                  marginBottom: '2rem',
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6'
                }}>
                  <h5 style={{ color: '#495057', margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600' }}>
                    🌐 Current Environment: {process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}
                  </h5>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                    <div><strong>Origin:</strong> {window.location.origin}</div>
                    <div><strong>Redirect URI:</strong> {window.location.origin}/auth/callback</div>
                    {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                      <div style={{ color: '#28a745', marginTop: '0.5rem' }}>
                        ✅ <strong>Localhost detected</strong> - Make sure your OAuth apps include this redirect URI
                      </div>
                    )}
                    {(window.location.hostname.includes('vercel.app') || window.location.hostname.includes('vercel.com')) && (
                      <div style={{ color: '#17a2b8', marginTop: '0.5rem' }}>
                        ☁️ <strong>Vercel detected</strong> - Production OAuth configuration active
                      </div>
                    )}
                  </div>
                </div>

                {authError && (
                  <div className="alert alert-danger">
                    <strong>Authentication Error:</strong> {authError}
                    <details style={{ marginTop: '10px' }}>
                      <summary style={{ cursor: 'pointer', fontSize: '0.9rem' }}>Show Debug Info</summary>
                      <div style={{ marginTop: '8px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        <div><strong>Country:</strong> {selectedCountry}</div>
                        <div><strong>Google Configured:</strong> {isGoogleConfigured ? 'Yes' : 'No'}</div>
                        <div><strong>Microsoft Configured:</strong> {isMicrosoftConfigured ? 'Yes' : 'No'}</div>
                        <div><strong>Environment:</strong> {process.env.NODE_ENV}</div>
                        <div><strong>Origin:</strong> {window.location.origin}</div>
                        <div><strong>Hostname:</strong> {window.location.hostname}</div>
                        <div><strong>Protocol:</strong> {window.location.protocol}</div>
                        <div><strong>Port:</strong> {window.location.port || 'default'}</div>
                        <div><strong>Redirect URI:</strong> {window.location.origin}/auth/callback</div>
                        <div><strong>Is Localhost:</strong> {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'Yes' : 'No'}</div>
                        <div><strong>Is Vercel:</strong> {(window.location.hostname.includes('vercel.app') || window.location.hostname.includes('vercel.com')) ? 'Yes' : 'No'}</div>
                        <div><strong>User Agent:</strong> {navigator.userAgent.substring(0, 100)}...</div>
                        <div><strong>Popup Support:</strong> {typeof window.open === 'function' ? 'Yes' : 'No'}</div>
                      </div>
                    </details>
                  </div>
                )}


                {/* Microsoft Authentication */}
                <div className="provider-card">
                  <div className="provider-header">
                    <div className="provider-info">
                      <img
                        src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjExIiBoZWlnaHQ9IjExIiBmaWxsPSIjRjI1MDIyIi8+CjxyZWN0IHg9IjEzIiB3aWR0aD0iMTEiIGhlaWdodD0iMTEiIGZpbGw9IiM3RkJBMDAiLz4KPHJlY3QgeT0iMTMiIHdpZHRoPSIxMSIgaGVpZ2h0PSIxMSIgZmlsbD0iIzAwQTRFRiIvPgo8cmVjdCB4PSIxMyIgeT0iMTMiIHdpZHRoPSIxMSIgaGVpZ2h0PSIxMSIgZmlsbD0iI0ZGQjkwMCIvPgo8L3N2Zz4K"
                        alt="Microsoft"
                        className="provider-icon"
                      />
                      <div>
                        <h4>
                          Microsoft Outlook
                          <span style={{ 
                            fontSize: '0.65em', 
                            marginLeft: '8px', 
                            color: '#28a745',
                            fontWeight: 'normal',
                            backgroundColor: '#e8f5e9',
                            padding: '2px 6px',
                            borderRadius: '3px'
                          }}>
                            Global Account
                          </span>
                        </h4>
                        <p>Send emails through Outlook/Office 365 (Same account for all countries)</p>
                      </div>
                    </div>

                    {currentConfig?.providers.microsoft.isAuthenticated ? (
                      <div className="auth-status authenticated">
                        <span className="status-icon">✅</span>
                        <div className="auth-info">
                          <div>Authenticated as:</div>
                          <strong>{currentConfig?.providers?.microsoft?.userInfo?.email}</strong>
                          {currentConfig?.providers?.microsoft?.tokens && (
                            <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '4px' }}>
                              {currentConfig?.providers?.microsoft?.tokens && isTokenExpiringSoon(currentConfig.providers.microsoft.tokens) ? (
                                <span style={{ color: '#ffc107' }}>⚠️ Token expires soon</span>
                              ) : (
                                <span style={{ color: '#28a745' }}>🔄 Auto-refresh enabled</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="auth-status not-authenticated">
                        <span className="status-icon">❌</span>
                        <div>Not authenticated</div>
                      </div>
                    )}
                  </div>

                  <div className="provider-actions">
                    {currentConfig?.providers.microsoft.isAuthenticated ? (
                      <>
                        <div className="form-group">
                          <label title="This name will appear as the sender name in emails">From Name (Display Name in Emails):</label>
                          <input
                            type="text"
                            value={currentConfig?.providers?.microsoft?.fromName || 'Case Booking System'}
                            onChange={(e) => handleFromNameChange(e.target.value)}
                            className="form-control"
                            placeholder="Case Booking System"
                          />
                        </div>
                        <button
                          onClick={() => handleDisconnect()}
                          className="btn btn-outline-danger btn-sm"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <>
                        {!isMicrosoftConfigured && (
                          <div className="alert alert-danger">
                            <strong>⚠️ REQUIRED: Microsoft OAuth Setup</strong><br/>
                            Add this redirect URI to your Microsoft Azure app:<br/>
                            <code style={{ background: '#fff3cd', padding: '4px 8px', borderRadius: '4px' }}>
                              https://tmcasebooking.vercel.app/auth/callback
                            </code><br/>
                            <small>Go to Azure Portal → App Registration → Authentication → Redirect URIs</small>
                          </div>
                        )}
                        <button
                          onClick={() => handleAuthenticate()}
                          disabled={isAuthenticating.microsoft || !isMicrosoftConfigured}
                          className="btn btn-primary"
                        >
                          {isAuthenticating.microsoft ? (
                            <>🔄 Authenticating...</>
                          ) : !isMicrosoftConfigured ? (
                            <>⚙️ Configure Microsoft OAuth First</>
                          ) : (
                            <>🔐 Authenticate with Microsoft</>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Configuration Actions */}
                {currentConfig?.providers.microsoft.isAuthenticated && (
                  <div className="config-actions" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e9ecef' }}>
                    <button
                      onClick={handleSaveConfig}
                      className="btn btn-success"
                      style={{ marginRight: '1rem' }}
                    >
                      💾 Save Configuration
                    </button>
                    <button
                      onClick={handleTestEmail}
                      disabled={!currentConfig?.activeProvider}
                      className="btn btn-warning"
                    >
                      📧 Test Email
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email Notification Rules Section */}
          <div className="config-section">
            <div
              className="section-header collapsible-header"
              onClick={() => setIsNotificationRulesCollapsed(!isNotificationRulesCollapsed)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3>📮 Email Notification Rules</h3>
                {/* Rules Summary Badge */}
                {emailMatrixConfigs[selectedCountry] && (
                  <div className="provider-status-badge-inline">
                    <span className="status-icon">📊</span>
                    <span style={{ fontSize: '0.85rem' }}>
                      {emailMatrixConfigs[selectedCountry].rules.filter(rule => rule.enabled).length} of {emailMatrixConfigs[selectedCountry].rules.length} Active
                    </span>
                  </div>
                )}
              </div>
              <span className={`chevron ${isNotificationRulesCollapsed ? 'collapsed' : 'expanded'}`}>
                {isNotificationRulesCollapsed ? '▶' : '▼'}
              </span>
            </div>

            {!isNotificationRulesCollapsed && (
              <div className="section-content">
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#e3f2fd', borderRadius: '8px', border: '1px solid #2196f3' }}>
                  <h4 style={{ color: '#1976d2', margin: '0 0 0.5rem 0' }}>📋 Configure Status-Based Email Notifications</h4>
                  <p style={{ margin: '0', color: '#37474f', fontSize: '0.9rem' }}>
                    Set up automatic email notifications for each case status change. Configure who receives notifications and customize email templates.
                  </p>
                </div>

                {/* Important notice about Case Booked notifications */}
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: '#e8f5e8',
                  borderRadius: '8px',
                  border: '1px solid #4caf50'
                }}>
                  <h5 style={{ color: '#2e7d32', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                    📋 Important: Case Booked Notifications
                  </h5>
                  <p style={{ margin: '0', color: '#1b5e20', fontSize: '0.85rem' }}>
                    <strong>Case Booked</strong> notifications are now automatically managed by the booking calendar system. 
                    When a case is successfully booked, confirmations are sent directly to relevant parties without requiring separate configuration here.
                  </p>
                </div>

                {/* Email Notification Matrix */}
                {emailMatrixConfigs[selectedCountry] && (
                  <div className="notification-matrix">
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {emailMatrixConfigs[selectedCountry].rules.map((rule, ruleIndex) => (
                        <div
                          key={rule.status}
                          style={{
                            padding: '1rem',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            backgroundColor: rule.enabled ? '#f8f9fa' : '#fff3cd'
                          }}
                        >
                          <div 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              marginBottom: '0.5rem',
                              cursor: 'pointer'
                            }}
                            onClick={() => toggleRuleCollapse(ruleIndex)}
                          >
                            <h5 style={{ margin: 0, color: rule.enabled ? '#28a745' : '#856404' }}>
                              {rule.status} {rule.enabled ? '✅' : '⚠️'}
                            </h5>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span style={{ 
                                fontSize: '0.8rem', 
                                color: rule.enabled ? '#28a745' : '#856404',
                                fontWeight: '600'
                              }}>
                                {rule.enabled ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                              <span className={`chevron ${ruleCollapsedStates[ruleIndex] ? 'collapsed' : 'expanded'}`}>
                                {ruleCollapsedStates[ruleIndex] ? '▶' : '▼'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Collapsible content for individual rule customization */}
                          {!ruleCollapsedStates[ruleIndex] && (
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                              {rule.enabled && rule.recipients && (
                                <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '1rem' }}>
                                  <div><strong>Recipients:</strong></div>
                                  <div style={{ marginLeft: '1rem', marginTop: '0.25rem' }}>
                                    {(rule.recipients as any)?.roles && (rule.recipients as any).roles.length > 0 && (
                                      <div>• Roles: {(rule.recipients as any).roles.join(', ')}</div>
                                    )}
                                    {(rule.recipients as any)?.members && (rule.recipients as any).members.length > 0 && (
                                      <div>• Members: {(rule.recipients as any).members.join(', ')}</div>
                                    )}
                                    {(rule.recipients as any)?.specificEmails && (rule.recipients as any).specificEmails.length > 0 && (
                                      <div>• Emails: {(rule.recipients as any).specificEmails.join(', ')}</div>
                                    )}
                                    {(rule.recipients as any)?.departments && (rule.recipients as any).departments.length > 0 && (
                                      <div>• Departments: {(rule.recipients as any).departments.join(', ')}</div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {!rule.enabled && (
                                <div style={{ fontSize: '0.85rem', color: '#856404', fontStyle: 'italic', marginBottom: '1rem' }}>
                                  This status notification is disabled. Enable it to configure recipients and email templates.
                                </div>
                              )}
                              
                              {/* Rule customization controls */}
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={rule.enabled}
                                    onChange={(e) => updateNotificationRule(ruleIndex, { enabled: e.target.checked })}
                                  />
                                  Enable notifications for {rule.status}
                                </label>
                                
                                {rule.enabled && (
                                  <button
                                    style={{
                                      padding: '0.25rem 0.75rem',
                                      fontSize: '0.8rem',
                                      border: '1px solid #007bff',
                                      backgroundColor: '#007bff',
                                      color: 'white',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                      // TODO: Open detailed configuration modal
                                      console.log('Configure detailed settings for:', rule.status);
                                    }}
                                  >
                                    Configure Details
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </>
      )}
    </div>
  );
};

// getEmailConfigFromDatabase is already exported above

export default SimplifiedEmailConfig;
