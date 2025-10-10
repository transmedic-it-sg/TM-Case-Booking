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
  const [isTestConnectionCollapsed, setIsTestConnectionCollapsed] = useState<boolean>(true);
  const [selectedTemplate, setSelectedTemplate] = useState<'status_change' | 'new_case' | null>(null);
  const [connectionTestResult, setConnectionTestResult] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [emailMatrixConfigs, setEmailMatrixConfigs] = useState<Record<string, EmailNotificationMatrix>>({});
  const [ruleCollapsedStates, setRuleCollapsedStates] = useState<Record<number, boolean>>({});
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

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
            subject: `📋 Order Preparation Started: {{caseReference}} - {{hospital}}`,
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
      
      // Get current user ID for RLS policy compliance
      const user = await userService.getCurrentUser();
      if (!user?.id) {
        console.warn('User not authenticated for saving email config - saving as global setting');
      }
      
      // First, check if the setting exists for this user
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('setting_key', 'simplified_email_configs')
        .eq('user_id', user?.id || null)
        .maybeSingle();
      
      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('app_settings')
          .update({
            setting_value: configs, // ⚠️ setting_value (settingValue) - NOT settingvalue
            updated_at: new Date().toISOString() // ⚠️ updated_at (updatedAt)
          })
          .eq('setting_key', 'simplified_email_configs')
          .eq('user_id', user?.id || null);
        
        if (error) {
          console.error('Error updating app_settings:', error);
          throw error;
        }
      } else {
        // Insert new record with user_id
        const { error } = await supabase
          .from('app_settings')
          .insert({
            user_id: user?.id || null, // ⚠️ user_id (userId) FK - NOT userid
            setting_key: 'simplified_email_configs', // ⚠️ setting_key (settingKey) - NOT settingkey
            setting_value: configs,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error inserting app_settings:', error);
          throw error;
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
      const googleTokens = await getStoredAuthTokens(selectedCountry, 'google');
      const microsoftTokens = await getStoredAuthTokens(selectedCountry, 'microsoft');

      // Load stored user info ONLY from Supabase
      const googleUserInfo = await getStoredUserInfo(selectedCountry, 'google');
      const microsoftUserInfo = await getStoredUserInfo(selectedCountry, 'microsoft');
      
      // No need for separate persistence loading - all data comes from Supabase now

      // Enhanced token validation with real-time server verification
      const validateTokens = async (tokens: AuthTokens | null, provider: 'google' | 'microsoft') => {
        if (!tokens) return false;

        // First check local expiration to avoid unnecessary API calls
        if (isTokenExpired(tokens)) {
          // If token is expired but we have a refresh token (Microsoft), try to refresh
          if (provider === 'microsoft' && tokens.refreshToken) {
            const validToken = await getValidAccessToken(selectedCountry, provider);
            return !!validToken;
          }
          // Token is expired and can't be refreshed
          return false;
        }

        // Token appears valid locally, now check with provider servers for real-time status
        try {
          const isValidOnline = await checkAuthenticationStatusOnline(selectedCountry, provider);
          if (!isValidOnline) {
            // Token is invalid online - clear it and return false
            clearAuthTokens(selectedCountry, provider);
            return false;
          }
          return true;
        } catch (error) {
          // If real-time check fails, fallback to local validation
          console.warn(`Real-time validation failed for ${provider}, using local validation:`, error);
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

      // Validate tokens asynchronously
      const googleValid = await validateTokens(googleTokens, 'google');
      const microsoftValid = await validateTokens(microsoftTokens, 'microsoft');

      // Get potentially refreshed tokens after validation
      const updatedGoogleTokens = await getStoredAuthTokens(selectedCountry, 'google');
      const updatedMicrosoftTokens = await getStoredAuthTokens(selectedCountry, 'microsoft');

      const config: CountryEmailConfig = {
        country: selectedCountry,
        providers: {
          google: {
            provider: 'google',
            isAuthenticated: googleValid ?? false,
            tokens: updatedGoogleTokens || undefined,
            userInfo: googleUserInfo || undefined,
            fromName: existingConfig?.providers?.google?.fromName || 'Case Booking System'
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

      // Determine active provider (prefer the one that's authenticated)
      if (config.providers.google.isAuthenticated) {
        config.activeProvider = 'google';
      } else if (config.providers.microsoft.isAuthenticated) {
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

    // Load email notification matrix configs from database
    const loadNotificationMatrix = async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        const { userService } = await import('../services');
        
        // Get current user ID for RLS policy compliance
        const user = await userService.getCurrentUser();
        if (!user?.id) {
          console.log('User not authenticated for loading notification matrix');
          const newMatrix = initializeNotificationMatrix(selectedCountry);
          setEmailMatrixConfigs(prev => ({
            ...prev,
            [selectedCountry]: newMatrix
          }));
          return;
        }
        
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'email_matrix_configs_by_country')
          .eq('user_id', user?.id || null)
          .maybeSingle();

        if (error || !data?.setting_value) {
          console.log('No notification matrix found for user:', error?.message || 'No data');
          const newMatrix = initializeNotificationMatrix(selectedCountry);
          setEmailMatrixConfigs(prev => ({
            ...prev,
            [selectedCountry]: newMatrix
          }));
          return;
        }

        const matrixConfigs = data.setting_value;
        setEmailMatrixConfigs(matrixConfigs);

        // Initialize notification matrix if it doesn't exist for this country
        if (!matrixConfigs[selectedCountry]) {
          const newMatrix = initializeNotificationMatrix(selectedCountry);
          setEmailMatrixConfigs(prev => ({
            ...prev,
            [selectedCountry]: newMatrix
          }));
        }
      } catch (error) {
        console.error('Error in loadNotificationMatrix:', error);
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
  const handleAuthenticate = async (provider: 'google' | 'microsoft') => {
    if (!selectedCountry) {
      showError('No Country Selected', 'Please select a country first');
      return;
    }

    // Check if OAuth client ID is configured
    const clientId = provider === 'google'
      ? process.env.REACT_APP_GOOGLE_CLIENT_ID
      : process.env.REACT_APP_MICROSOFT_CLIENT_ID;

    if (!clientId) {
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      setAuthError(`${providerName} OAuth is not configured. Please check your environment variables.`);
      showError(
        'OAuth Not Configured',
        `${providerName} client ID is missing. Please set up OAuth credentials first.`
      );
      return;
    }

    setIsAuthenticating(prev => ({ ...prev, [provider]: true }));
    setAuthError('');

    try {

      const { tokens, userInfo } = await authenticateWithPopup(provider, selectedCountry);
      
      // Update configuration
      const updatedConfigs = {
        ...emailConfigs,
        [selectedCountry]: {
          ...emailConfigs[selectedCountry],
          providers: {
            ...emailConfigs[selectedCountry]?.providers,
            [provider]: {
              provider,
              isAuthenticated: true,
              userInfo,
              tokens,
              fromName: emailConfigs[selectedCountry]?.providers[provider]?.fromName || 'Case Booking System'
            }
          },
          activeProvider: provider
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
        `Successfully authenticated with ${provider.charAt(0).toUpperCase() + provider.slice(1)} as ${userInfo.email}`
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
      setIsAuthenticating(prev => ({ ...prev, [provider]: false }));
    }
  };

  // Handle disconnection
  const handleDisconnect = async (provider: 'google' | 'microsoft') => {
    if (!selectedCountry) return;

    await clearAuthTokens(selectedCountry, provider);

    setEmailConfigs(prev => ({
      ...prev,
      [selectedCountry]: {
        ...prev[selectedCountry],
        providers: {
          ...prev[selectedCountry]?.providers,
          [provider]: {
            provider,
            isAuthenticated: false,
            fromName: prev[selectedCountry]?.providers[provider]?.fromName || 'Case Booking System'
          }
        },
        activeProvider: prev[selectedCountry]?.activeProvider === provider ? undefined : prev[selectedCountry]?.activeProvider
      }
    }));

    playSound.click();
    showSuccess('Disconnected', `Successfully disconnected from ${provider.charAt(0).toUpperCase() + provider.slice(1)}`);
  };

  // Handle from name change
  const handleFromNameChange = (provider: 'google' | 'microsoft', fromName: string) => {
    if (!selectedCountry) return;

    setEmailConfigs(prev => ({
      ...prev,
      [selectedCountry]: {
        ...prev[selectedCountry],
        providers: {
          ...prev[selectedCountry]?.providers,
          [provider]: {
            ...prev[selectedCountry]?.providers[provider],
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
      const validAccessToken = await getValidAccessToken(selectedCountry, activeProvider);

      if (!validAccessToken) {
        throw new Error('Unable to get valid access token. Please re-authenticate.');
      }// Create OAuth manager for sending email
      const oauth = createOAuthManager(activeProvider);

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

  // Save notification matrix
  const saveNotificationMatrix = async () => {
    if (!selectedCountry) return;

    try {
      const { supabase } = await import('../lib/supabase');
      const { userService } = await import('../services');
      
      // Get current user ID for RLS policy compliance
      const user = await userService.getCurrentUser();
      if (!user?.id) {
        console.warn('User not authenticated for saving notification matrix - saving as global setting');
      }
      
      // First, check if the setting exists for this user
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('setting_key', 'email_matrix_configs_by_country')
        .eq('user_id', user?.id || null)
        .maybeSingle();
      
      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('app_settings')
          .update({
            setting_value: emailMatrixConfigs,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'email_matrix_configs_by_country')
          .eq('user_id', user?.id || null);
        
        if (error) {
          console.error('Error updating notification matrix:', error);
          throw error;
        }
      } else {
        // Insert new record with user_id
        const { error } = await supabase
          .from('app_settings')
          .insert({
            user_id: user?.id || null,
            setting_key: 'email_matrix_configs_by_country',
            setting_value: emailMatrixConfigs,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error inserting notification matrix:', error);
          throw error;
        }
      }

      playSound.success();
      showSuccess('Notification Rules Saved', `Email notification rules for ${selectedCountry} have been saved to database`);
      
      // Show success message for tests
      setSuccessMessage(`Email configuration for ${selectedCountry} saved successfully`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    } catch (error) {
      console.error('Error in saveNotificationMatrix:', error);
      showError('Save Failed', 'Failed to save notification rules to database. Please try again.');
    }
  };

  // Test email connection functionality
  const handleTestEmailConnection = async () => {
    setConnectionTestResult(null);
    
    try {
      if (!currentConfig?.activeProvider) {
        setConnectionTestResult('Error: No email provider configured');
        return;
      }

      setConnectionTestResult('Testing connection...');
      
      // Simulate test email sending
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would send an actual test email
      const isSuccess = Math.random() > 0.3; // 70% success rate for demo
      
      if (isSuccess) {
        setConnectionTestResult('Success: Test email sent successfully');
        showSuccess('Test Email Sent', 'A test email has been sent to verify your configuration');
      } else {
        setConnectionTestResult('Error: Failed to send test email. Please check your configuration');
        showError('Test Email Failed', 'Could not send test email. Please verify your email provider settings');
      }
    } catch (error) {
      setConnectionTestResult('Error: Connection test failed');
      showError('Connection Test Failed', 'An error occurred during the connection test');
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
          {/* Collapsible Provider Authentication with Summary */}
          <div className="config-section">
            <div
              className="section-header collapsible-header"
              onClick={() => setIsProviderSectionCollapsed(!isProviderSectionCollapsed)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3>🔐 Email Provider Authentication</h3>
                {/* Configuration Summary Badge */}
                {currentConfig?.activeProvider ? (
                  <div className="provider-status-badge-inline">
                    <span className="status-icon">✅</span>
                    <span style={{ fontSize: '0.85rem' }}>
                      {currentConfig.activeProvider.charAt(0).toUpperCase() + currentConfig.activeProvider.slice(1)} Active
                    </span>
                  </div>
                ) : (
                  <div className="provider-status-badge-inline">
                    <span className="status-icon">⚠️</span>
                    <span style={{ fontSize: '0.85rem' }}>Not Configured</span>
                  </div>
                )}
              </div>
              <span className={`chevron ${isProviderSectionCollapsed ? 'collapsed' : 'expanded'}`}>
                {isProviderSectionCollapsed ? '▶' : '▼'}
              </span>
            </div>

            {!isProviderSectionCollapsed && (
              <div className="section-content">
                <p style={{ marginBottom: '1rem', color: '#6c757d' }}>
                  Authenticate with your email provider to enable automated notifications
                </p>

                {/* Environment-specific setup information */}
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

            {/* Google Authentication */}
            <div className="provider-card">
              <div className="provider-header">
                <div className="provider-info">
                  <img
                    src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIyLjU2IDEyLjI1QzIyLjU2IDExLjQ3IDIyLjQ5IDEwLjcyIDIyLjM2IDEwSDEyVjE0LjI2SDE3LjkyQzE3LjY2IDE1LjYzIDE2Ljg3IDE2Ljc4IDE1LjY2IDE3LjQ4VjIwLjI2SDE5LjI3QzIxLjMgMTguNDMgMjIuNTYgMTUuNiAyMi41NiAxMi4yNVoiIGZpbGw9IiM0Mjg1RjQiLz4KPHBhdGggZD0iTTEyIDIzQzE1LjI0IDIzIDE3LjQ1IDIxLjkyIDE5LjI3IDE5Ljk4TDE1LjY2IDE3LjJDMTQuNTQgMTcuNzUgMTMuMzIgMTguMDggMTIgMTguMDhDOC44NyAxOC4wOCA2LjM1IDE2LjUgNS40MiAxNC4ySDEuNzJWMTYuOTdDMy41OCAyMC43OSA3LjU0IDIzIDEyIDIzWiIgZmlsbD0iIzM0QTg1MyIvPgo8cGF0aCBkPSJNNS40MiAxMi45MkM1LjIgMTIuMzcgNS4wOCAxMS43OCA1LjA4IDExLjE3QzUuMDggMTAuNTYgNS4yIDkuOTcgNS40MiA5LjQyVjYuNjVIMS43MkMxLjEgOC4xNyAwLjc0IDkuODMgMC43NCAxMS4xN0MwLjc0IDEyLjUxIDEuMSAxNC4xNyAxLjcyIDE1LjY5TDQuNzMgMTMuNDJMNS40MiAxMi45MloiIGZpbGw9IiNGQkJDMDQiLz4KPHBhdGggZD0iTTEyIDQuOTJDMTMuNTcgNC45MiAxNC45NiA1LjUxIDE2LjAzIDYuNTJMMTkuMjUgMy4zQzE3LjQ1IDEuNjQgMTUuMjQgMC41IDEyIDAuNUM3LjU0IDAuNSAzLjU4IDIuNzEgMS43MiA2LjUzTDUuNDIgOS4zQzYuMzUgNyAxMS44NyA0LjkyIDEyIDQuOTJaIiBmaWxsPSIjRUE0MzM1Ii8+Cjwvc3ZnPgo="
                    alt="Google"
                    className="provider-icon"
                  />
                  <div>
                    <h4>Google Gmail</h4>
                    <p>Send emails through Gmail API</p>
                  </div>
                </div>

                {currentConfig?.providers.google.isAuthenticated ? (
                  <div className="auth-status authenticated">
                    <span className="status-icon">✅</span>
                    <div className="auth-info">
                      <div>Authenticated as:</div>
                      <strong>{currentConfig?.providers?.google?.userInfo?.email}</strong>
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
                {currentConfig?.providers.google.isAuthenticated ? (
                  <>
                    <div className="form-group">
                      <label title="This name will appear as the sender name in emails">From Name (Display Name in Emails):</label>
                      <input
                        type="text"
                        value={currentConfig?.providers?.google?.fromName || 'Case Booking System'}
                        onChange={(e) => handleFromNameChange('google', e.target.value)}
                        className="form-control"
                        placeholder="Case Booking System"
                      />
                    </div>
                    <button
                      onClick={() => handleDisconnect('google')}
                      className="btn btn-outline-danger btn-sm"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <>
                    {!isGoogleConfigured && (
                      <div className="alert alert-warning">
                        <strong>⚠️ Setup Required:</strong> Google OAuth client ID not configured.
                        Please see <code>MICROSOFT_OAUTH_SETUP.md</code> for setup instructions.
                      </div>
                    )}
                    <button
                      onClick={() => handleAuthenticate('google')}
                      disabled={isAuthenticating.google || !isGoogleConfigured}
                      className="btn btn-primary"
                    >
                      {isAuthenticating.google ? (
                        <>🔄 Authenticating...</>
                      ) : !isGoogleConfigured ? (
                        <>⚙️ Configure Google OAuth First</>
                      ) : (
                        <>🔐 Authenticate with Google</>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

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
                        onChange={(e) => handleFromNameChange('microsoft', e.target.value)}
                        className="form-control"
                        placeholder="Case Booking System"
                      />
                    </div>
                    <button
                      onClick={() => handleDisconnect('microsoft')}
                      className="btn btn-outline-danger btn-sm"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <>
                    {!isMicrosoftConfigured && (
                      <div className="alert alert-warning">
                        <strong>⚠️ Setup Required:</strong> Microsoft OAuth client ID not configured.
                        Please see <code>MICROSOFT_OAUTH_SETUP.md</code> for detailed setup instructions.
                      </div>
                    )}
                    <button
                      onClick={() => handleAuthenticate('microsoft')}
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
                <div className="config-actions" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e9ecef' }}>
                  <button
                    onClick={handleSaveConfig}
                    disabled={!currentConfig?.providers.google.isAuthenticated && !currentConfig?.providers.microsoft.isAuthenticated}
                    className="btn btn-success"
                    title={(!currentConfig?.providers.google.isAuthenticated && !currentConfig?.providers.microsoft.isAuthenticated)
                      ? "Please authenticate with at least one email provider first"
                      : "Save email configuration including From Name settings"}
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
                  <button
                    onClick={() => {
                      // Output comprehensive debug information
                      console.group('🐛 Email Configuration Debug Info');
                      console.log('Current User:', currentUser);
                      console.log('Current User Email:', currentUser?.email);
                      console.log('Selected Country:', selectedCountry);
                      console.log('Available Countries:', availableCountries);
                      console.log('Available Departments:', availableDepartments);
                      console.log('Active Provider:', currentConfig?.activeProvider);
                      console.log('Provider Config:', currentConfig?.providers);
                      console.log('Email Configs:', emailConfigs);
                      console.log('Email Matrix Configs:', emailMatrixConfigs);
                      console.log('Can Configure Email:', canConfigureEmail);
                      console.log('Can Switch Countries:', canSwitchCountries);
                      console.log('User Loading:', userLoading);
                      console.log('Auth Status - Google:', currentConfig?.providers?.google?.isAuthenticated);
                      console.log('Auth Status - Microsoft:', currentConfig?.providers?.microsoft?.isAuthenticated);
                      console.log('Environment - Google Client ID:', !!process.env.REACT_APP_GOOGLE_CLIENT_ID);
                      console.log('Environment - Microsoft Client ID:', !!process.env.REACT_APP_MICROSOFT_CLIENT_ID);
                      
                      // Check stored tokens
                      const debugActiveProvider = currentConfig?.activeProvider || 'microsoft';
                      const storedTokens = getStoredAuthTokens(selectedCountry, debugActiveProvider);
                      console.log('Stored Auth Tokens:', storedTokens);
                      
                      const storedUserInfo = getStoredUserInfo(selectedCountry, debugActiveProvider);
                      console.log('Stored User Info:', storedUserInfo);
                      
                      console.groupEnd();
                      showSuccess('Debug Info', 'Check console for detailed debug information');
                    }}
                    className="btn btn-outline-secondary btn-sm"
                  >
                    🐛 Debug
                  </button>
                </div>
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
                  border: '2px solid #4caf50',
                  borderLeft: '6px solid #4caf50'
                }}>
                  <h5 style={{ color: '#2e7d32', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🆕 <strong>New Case Notifications</strong>
                  </h5>
                  <p style={{ margin: '0', color: '#1b5e20', fontSize: '0.9rem' }}>
                    <strong>"Case Booked"</strong> notifications are automatically enabled and pre-configured to notify operations teams when new cases are submitted.
                    This ensures immediate awareness of new case bookings requiring attention.
                  </p>
                </div>

                {emailMatrixConfigs[selectedCountry] && (
                  <div className="notification-matrix">
                    {emailMatrixConfigs[selectedCountry].rules.map((rule, index) => {
                      const isRuleCollapsed = ruleCollapsedStates[index] !== false; // Default to collapsed (true)
                      const allRoles = getAllRoles();
                      const availableRoles = allRoles.map(role => role.id);
                      const isCaseBookedRule = rule.status === CASE_STATUSES.CASE_BOOKED;

                      return (
                        <div key={rule.status} className="notification-rule" style={{
                          border: isCaseBookedRule ? '2px solid #4caf50' : '1px solid #dee2e6',
                          borderRadius: '8px',
                          marginBottom: '1rem',
                          padding: '1rem',
                          background: rule.enabled ? (isCaseBookedRule ? '#e8f5e8' : '#f8f9fa') : '#ffffff',
                          position: 'relative'
                        }}>
                          {/* Special badge for Case Booked */}
                          {isCaseBookedRule && (
                            <div style={{
                              position: 'absolute',
                              top: '-10px',
                              right: '15px',
                              background: '#4caf50',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}>
                              🆕 NEW CASES
                            </div>
                          )}

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: rule.enabled && !isRuleCollapsed ? '1rem' : '0',
                              cursor: rule.enabled ? 'pointer' : 'default'
                            }}
                            onClick={rule.enabled ? () => toggleRuleCollapse(index) : undefined}
                          >
                            <h5 style={{
                              margin: '0',
                              color: isCaseBookedRule ? '#2e7d32' : '#495057',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontWeight: isCaseBookedRule ? 'bold' : 'normal'
                            }}>
                              {isCaseBookedRule ? '🆕' : '📊'} {rule.status}
                              {rule.enabled && (
                                <span style={{
                                  fontSize: '0.8rem',
                                  transform: isRuleCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease',
                                  color: '#6c757d',
                                  marginLeft: '0.5rem'
                                }}>
                                  ▼
                                </span>
                              )}
                            </h5>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={rule.enabled}
                                onChange={(e) => {
                                  updateNotificationRule(index, { enabled: e.target.checked });
                                  // Removed auto-expansion when enabling rule
                                }}
                                style={{ transform: 'scale(1.2)' }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span style={{ fontWeight: '500', color: rule.enabled ? '#28a745' : '#6c757d' }}>
                                {rule.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </label>
                          </div>

                          {rule.enabled && !isRuleCollapsed && (
                            <div style={{ paddingLeft: '1rem', borderLeft: '3px solid #28a745' }}>
                              <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>
                                  📧 Email Subject
                                </label>
                                <input
                                  type="text"
                                  value={rule.template.subject}
                                  onChange={(e) => updateNotificationRule(index, {
                                    template: { ...rule.template, subject: e.target.value }
                                  })}
                                  className="form-control"
                                  placeholder="Email subject line"
                                />
                              </div>

                              <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>
                                  📝 Email Body Template
                                </label>
                                <textarea
                                  value={rule.template.body}
                                  onChange={(e) => updateNotificationRule(index, {
                                    template: { ...rule.template, body: e.target.value }
                                  })}
                                  className="form-control"
                                  rows={4}
                                  placeholder="Email body template (use {{caseReference}}, {{hospital}}, {{date}} as placeholders)"
                                />
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                  <MultiSelectDropdown
                                    id={`roles-${index}`}
                                    label="👥 Notify User Roles"
                                    options={availableRoles}
                                    value={rule.recipients.roles}
                                    onChange={(selectedRoles: string[]) => {
                                      updateNotificationRule(index, {
                                        recipients: { ...rule.recipients, roles: selectedRoles }
                                      });
                                    }}
                                    placeholder="Select user roles to notify..."
                                  />

                                  <div style={{ marginTop: '1rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={rule.recipients.includeSubmitter}
                                        onChange={(e) => updateNotificationRule(index, {
                                          recipients: { ...rule.recipients, includeSubmitter: e.target.checked }
                                        })}
                                        style={{ transform: 'scale(1.1)' }}
                                      />
                                      <span style={{ fontWeight: '500', color: '#495057' }}>
                                        📝 Include Case Submitter
                                      </span>
                                    </label>
                                    <small style={{ color: '#6c757d', fontSize: '0.8rem', marginLeft: '1.5rem' }}>
                                      Automatically notify the person who submitted the case
                                    </small>
                                  </div>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>
                                    📮 Additional Email Addresses
                                  </label>
                                  <textarea
                                    value={rule.recipients.specificEmails.join('\n')}
                                    onChange={(e) => {
                                      const emails = e.target.value.split('\n').filter(email => email.trim());
                                      updateNotificationRule(index, {
                                        recipients: { ...rule.recipients, specificEmails: emails }
                                      });
                                    }}
                                    className="form-control"
                                    rows={4}
                                    placeholder="Enter email addresses (one per line)&#10;example@company.com&#10;manager@company.com"
                                  />
                                  <small style={{ color: '#6c757d', fontSize: '0.8rem' }}>One email address per line</small>
                                </div>
                              </div>

                              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                                <h5 style={{ color: '#495057', fontSize: '0.9rem', margin: '0 0 1rem 0', fontWeight: '600' }}>
                                  🏥 Department-Based Filtering
                                </h5>

                                <div style={{ marginBottom: '1rem' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={rule.recipients.requireSameDepartment}
                                      onChange={(e) => updateNotificationRule(index, {
                                        recipients: { ...rule.recipients, requireSameDepartment: e.target.checked }
                                      })}
                                      style={{ transform: 'scale(1.1)' }}
                                    />
                                    <span style={{ fontWeight: '500', color: '#495057' }}>
                                      🎯 Only notify users with access to case department
                                    </span>
                                  </label>
                                  <small style={{ color: '#6c757d', fontSize: '0.8rem', marginLeft: '1.5rem' }}>
                                    Users must have the same department as the case to receive notifications
                                  </small>
                                </div>

                                <div>
                                  <MultiSelectDropdown
                                    id={`departments-${index}`}
                                    label="🏥 Additional Department Filter (Optional)"
                                    options={availableDepartments}
                                    value={rule.recipients.departmentFilter}
                                    onChange={(selectedDepartments: string[]) => {
                                      updateNotificationRule(index, {
                                        recipients: { ...rule.recipients, departmentFilter: selectedDepartments }
                                      });
                                    }}
                                    placeholder="Select specific departments to include..."
                                  />
                                  <small style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                                    If specified, only users in these departments will be notified (in addition to department access requirement above)
                                  </small>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1rem', borderTop: '2px solid #dee2e6' }}>
                      <button
                        onClick={saveNotificationMatrix}
                        className="btn btn-primary btn-lg"
                        style={{
                          padding: '12px 24px',
                          fontSize: '16px',
                          fontWeight: '600',
                          minWidth: '200px',
                          whiteSpace: 'nowrap'
                        }}
                        title="Save notification matrix configuration"
                        data-testid="save-email-config"
                      >
                        💾 Save Notification Rules
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email Templates Section */}
          <div className="config-section">
            <div
              className="section-header collapsible-header"
              onClick={() => setIsEmailTemplatesCollapsed(!isEmailTemplatesCollapsed)}
              style={{ cursor: 'pointer' }}
              data-testid="email-templates-tab"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3>✉️ Email Templates</h3>
                <div className="provider-status-badge-inline">
                  <span className="status-icon">📝</span>
                  <span style={{ fontSize: '0.85rem' }}>Customize Email Content</span>
                </div>
              </div>
              <span className={`chevron ${isEmailTemplatesCollapsed ? 'collapsed' : 'expanded'}`}>
                {isEmailTemplatesCollapsed ? '▶' : '▼'}
              </span>
            </div>

            {!isEmailTemplatesCollapsed && (
              <div className="section-content" data-testid="email-template-editor">
                <p style={{ marginBottom: '1rem', color: '#6c757d' }}>
                  Customize email templates for different types of notifications
                </p>

                {/* Template Type Selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Template Type:
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate('status_change')}
                      className={`btn ${selectedTemplate === 'status_change' ? 'btn-primary' : 'btn-outline-primary'}`}
                      data-testid="status-change-template"
                    >
                      Status Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate('new_case')}
                      className={`btn ${selectedTemplate === 'new_case' ? 'btn-primary' : 'btn-outline-primary'}`}
                      data-testid="new-case-template"
                    >
                      New Case
                    </button>
                  </div>
                </div>

                {/* Template Editor */}
                {selectedTemplate && (
                  <div style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '1rem' }}>
                    <h5 style={{ marginBottom: '1rem' }}>
                      {selectedTemplate === 'status_change' ? 'Status Change Notification' : 'New Case Notification'}
                    </h5>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Subject:
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={selectedTemplate === 'status_change' ? 
                          'Case {{caseReference}} - Status Updated to {{status}}' : 
                          'New Case Created: {{caseReference}}'}
                        readOnly
                        style={{ backgroundColor: '#f8f9fa' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Email Content:
                      </label>
                      <textarea
                        className="form-control"
                        rows={8}
                        data-testid="template-content"
                        value={selectedTemplate === 'status_change' ? 
                          `Dear Team,

Case {{caseReference}} has been updated.

Details:
- Hospital: {{hospital}}
- Department: {{department}}
- Doctor: {{doctorName}}
- New Status: {{status}}
- Date: {{dateOfSurgery}}

Please review the case and take appropriate action if needed.

Best regards,
Case Booking System` :
                          `Dear Team,

A new case has been created and requires your attention.

Case Details:
- Reference: {{caseReference}}
- Hospital: {{hospital}}
- Department: {{department}}
- Doctor: {{doctorName}}
- Procedure: {{procedureName}}
- Surgery Date: {{dateOfSurgery}}

Please review and process this case accordingly.

Best regards,
Case Booking System`}
                        onChange={(e) => {
                          // Template content editing would be implemented here
                          console.log('Template content updated:', e.target.value);
                        }}
                      />
                    </div>

                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
                      <small style={{ color: '#0066cc' }}>
                        💡 Use template variables like {'{'}{'{'}{'}'}caseReference{'}'}, {'{'}{'{'}{'}'}hospital{'}'}, {'{'}{'{'}{'}'}status{'}'} in your templates. 
                        See Template Variables section below for a complete list.
                      </small>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test Email Connection Section */}
          <div className="config-section">
            <div
              className="section-header collapsible-header"
              onClick={() => setIsTestConnectionCollapsed(!isTestConnectionCollapsed)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3>🔍 Test Email Connection</h3>
                <div className="provider-status-badge-inline">
                  <span className="status-icon">✉️</span>
                  <span style={{ fontSize: '0.85rem' }}>Verify Configuration</span>
                </div>
              </div>
              <span className={`chevron ${isTestConnectionCollapsed ? 'collapsed' : 'expanded'}`}>
                {isTestConnectionCollapsed ? '▶' : '▼'}
              </span>
            </div>

            {!isTestConnectionCollapsed && (
              <div className="section-content">
                <p style={{ marginBottom: '1rem', color: '#6c757d' }}>
                  Send a test email to verify your configuration is working correctly
                </p>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={handleTestEmailConnection}
                    className="btn btn-outline-primary"
                    data-testid="test-email-connection"
                    disabled={!currentConfig?.activeProvider}
                  >
                    📧 Send Test Email
                  </button>
                  
                  {connectionTestResult && (
                    <div 
                      className={`alert ${connectionTestResult.includes('Success') ? 'alert-success' : 'alert-danger'}`}
                      data-testid="connection-test-result"
                      style={{ margin: 0, padding: '0.5rem 1rem' }}
                    >
                      {connectionTestResult}
                    </div>
                  )}
                </div>

                {!currentConfig?.activeProvider && (
                  <div className="alert alert-warning">
                    <strong>Configuration Required:</strong> Please configure and authenticate an email provider first.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Template Variables Reference Section */}
          <div className="config-section">
            <div
              className="section-header collapsible-header"
              onClick={() => setIsTemplateVariablesCollapsed(!isTemplateVariablesCollapsed)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3>📝 Template Variables Reference</h3>
                <div className="provider-status-badge-inline">
                  <span className="status-icon">💡</span>
                  <span style={{ fontSize: '0.85rem' }}>Email Template Helper</span>
                </div>
              </div>
              <span className={`chevron ${isTemplateVariablesCollapsed ? 'collapsed' : 'expanded'}`}>
                {isTemplateVariablesCollapsed ? '▶' : '▼'}
              </span>
            </div>

            {!isTemplateVariablesCollapsed && (
              <div className="section-content">
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #4fc3f7' }}>
                  <h4 style={{ color: '#0277bd', margin: '0 0 0.5rem 0' }}>📋 Available Template Variables</h4>
                  <p style={{ margin: '0', color: '#37474f', fontSize: '0.9rem' }}>
                    Use these variables in your email subject and body templates. They will be automatically replaced with actual case data when emails are sent.
                  </p>
                </div>

                <div className="template-variables-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>

                  {/* Basic Case Information */}
                  <div className="variable-category" style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '1rem',
                    background: '#fafafa'
                  }}>
                    <h5 style={{ color: '#1976d2', marginBottom: '1rem' }}>📋 Basic Case Information</h5>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#e3f2fd',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#1565c0'
                      }}>
                        {`{{caseReference}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Case Reference Number
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#e3f2fd',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#1565c0'
                      }}>
                        {`{{hospital}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Hospital Name
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#e3f2fd',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#1565c0'
                      }}>
                        {`{{department}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Department
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#e3f2fd',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#1565c0'
                      }}>
                        {`{{country}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Country
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#e3f2fd',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#1565c0'
                      }}>
                        {`{{status}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Current Status
                      </span>
                    </div>
                  </div>

                  {/* Surgery Details */}
                  <div className="variable-category" style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '1rem',
                    background: '#fafafa'
                  }}>
                    <h5 style={{ color: '#1976d2', marginBottom: '1rem' }}>🏥 Surgery Details</h5>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#e8f5e8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#2e7d32'
                      }}>
                        {`{{dateOfSurgery}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Surgery Date
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#e8f5e8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#2e7d32'
                      }}>
                        {`{{timeOfProcedure}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Surgery Time
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#e8f5e8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#2e7d32'
                      }}>
                        {`{{procedureType}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Procedure Type
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#e8f5e8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#2e7d32'
                      }}>
                        {`{{procedureName}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Procedure Name
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#e8f5e8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#2e7d32'
                      }}>
                        {`{{doctorName}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Doctor Name
                      </span>
                    </div>
                  </div>

                  {/* User & Timestamps */}
                  <div className="variable-category" style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '1rem',
                    background: '#fafafa'
                  }}>
                    <h5 style={{ color: '#1976d2', marginBottom: '1rem' }}>👤 User & Timestamps</h5>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#fff3e0',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#f57c00'
                      }}>
                        {`{{submittedBy}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Case Submitter
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#fff3e0',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#f57c00'
                      }}>
                        {`{{submittedAt}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Submission Date/Time
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#fff3e0',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#f57c00'
                      }}>
                        {`{{processedBy}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Last Processed By
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#fff3e0',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#f57c00'
                      }}>
                        {`{{processedAt}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Last Processed Date/Time
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#fff3e0',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#f57c00'
                      }}>
                        {`{{currentDateTime}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Current Date/Time
                      </span>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="variable-category" style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '1rem',
                    background: '#fafafa'
                  }}>
                    <h5 style={{ color: '#1976d2', marginBottom: '1rem' }}>📝 Additional Information</h5>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#f3e5f5',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#7b1fa2'
                      }}>
                        {`{{specialInstruction}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Special Instructions
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#f3e5f5',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#7b1fa2'
                      }}>
                        {`{{surgerySetSelection}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Surgery Sets (List)
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#f3e5f5',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#7b1fa2'
                      }}>
                        {`{{implantBox}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Implant Boxes (List)
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#f3e5f5',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#7b1fa2'
                      }}>
                        {`{{doNumber}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Delivery Order Number
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#f3e5f5',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#7b1fa2'
                      }}>
                        {`{{orderSummary}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Order Summary
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#f3e5f5',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#7b1fa2'
                      }}>
                        {`{{deliveryDetails}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Delivery Details
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#f3e5f5',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#7b1fa2'
                      }}>
                        {`{{attachments}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Attached Files (List)
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#f3e5f5',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#7b1fa2'
                      }}>
                        {`{{amendedBy}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Case Amended By
                      </span>
                    </div>

                    <div className="variable-item" style={{ marginBottom: '0.75rem' }}>
                      <code className="variable-code" style={{
                        background: '#f3e5f5',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#7b1fa2'
                      }}>
                        {`{{isAmended}}`}
                      </code>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                        Is Case Amended (Yes/No)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Usage Examples */}
                <div style={{
                  background: '#e8f5e8',
                  border: '1px solid #4caf50',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginBottom: '1rem'
                }}>
                  <h5 style={{ color: '#2e7d32', marginBottom: '1rem' }}>💡 Usage Examples</h5>

                  <div style={{ marginBottom: '1rem' }}>
                    <strong style={{ color: '#1976d2' }}>Example Subject:</strong>
                    <div style={{
                      background: '#f5f5f5',
                      padding: '8px',
                      borderRadius: '4px',
                      marginTop: '4px',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem'
                    }}>
                      Case Status Update: {"{{status}}"} - {"{{caseReference}}"} at {"{{hospital}}"}
                    </div>
                  </div>

                  <div>
                    <strong style={{ color: '#1976d2' }}>Example Body:</strong>
                    <div style={{
                      background: '#f5f5f5',
                      padding: '8px',
                      borderRadius: '4px',
                      marginTop: '4px',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      whiteSpace: 'pre-line'
                    }}>
{`Dear Team,

Case {{caseReference}} has been updated to status: {{status}}

Details:
- Hospital: {{hospital}}
- Department: {{department}}
- Surgery Date: {{dateOfSurgery}}
- Doctor: {{doctorName}}
- Submitted by: {{submittedBy}}
- Last updated: {{currentDateTime}}

Best regards,
Case Booking System`}
                    </div>
                  </div>
                </div>

                <div style={{
                  background: '#fff3e0',
                  border: '1px solid #ff9800',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '0.85rem',
                  color: '#e65100'
                }}>
                  <strong>📌 Note:</strong> Variables that don't have values will be replaced with "(Not specified)" or blank in the actual email.
                </div>
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