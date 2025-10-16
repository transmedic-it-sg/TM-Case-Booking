/**
 * System Settings Service
 * Handles system configuration, preferences, and settings persistence
 */

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

import { supabase } from '../lib/supabase';
import { getAppVersion } from './version';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';

export interface SystemConfig {
  // Application Settings
  appVersion: string;
  maintenanceMode: boolean;

  // Performance Settings
  cacheTimeout: number;
  maxFileSize: number;
  sessionTimeout: number;

  // Security Settings
  passwordComplexity: boolean;
  auditLogRetention: number;

  // Amendment Settings
  amendmentTimeLimit: number; // Time limit in minutes for amendments
  maxAmendmentsPerCase: number; // Maximum number of amendments allowed per case

  // UI Settings
  defaultTheme: 'light' | 'dark' | 'auto';
  defaultLanguage: string;
}

const DEFAULT_CONFIG: SystemConfig = {
  appVersion: getAppVersion(),
  maintenanceMode: false,
  cacheTimeout: 300,
  maxFileSize: 10,
  sessionTimeout: 3600,
  passwordComplexity: true,
  auditLogRetention: 90,
  amendmentTimeLimit: 1440, // 1440 minutes (24 hours) default
  maxAmendmentsPerCase: 5, // 5 amendments max per case
  defaultTheme: 'light',
  defaultLanguage: 'en'
};

/**
 * Get system configuration from Supabase
 */
export const getSystemConfig = async (): Promise<SystemConfig> => {
  try {
    // Try to get system settings from Supabase (key-value structure)
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value');

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, use defaults
        return DEFAULT_CONFIG;
      }
      if (error.code === '42P01') {
        // Table doesn't exist
        return DEFAULT_CONFIG;
      }
      if (error.code === '401' || error.message.includes('permission denied')) {
        return DEFAULT_CONFIG;
      }
      if (error.code === '406' || error.message.includes('Not Acceptable')) {
        return DEFAULT_CONFIG;
      }
      return DEFAULT_CONFIG;
    }

    if (!data || data.length === 0) {
      return DEFAULT_CONFIG;
    }

    // Transform key-value pairs to config object
    const settingsMap = new Map();
    data.forEach((row: any) => {
      settingsMap.set(row.setting_key, row.setting_value);
    });

    // Build config from key-value pairs with defaults
    // Parse JSONB values properly - they come as already parsed objects/primitives
    const supabaseConfig: SystemConfig = {
      appVersion: getAppVersion(), // Always use current version from package.json
      maintenanceMode: settingsMap.has('maintenance_mode') 
        ? (typeof settingsMap.get('maintenance_mode') === 'string' 
          ? settingsMap.get('maintenance_mode') === 'true' 
          : settingsMap.get('maintenance_mode')) 
        : DEFAULT_CONFIG.maintenanceMode,
      cacheTimeout: Number(settingsMap.get('cache_timeout')) || DEFAULT_CONFIG.cacheTimeout,
      maxFileSize: Number(settingsMap.get('max_file_size')) || DEFAULT_CONFIG.maxFileSize,
      sessionTimeout: Number(settingsMap.get('session_timeout')) || DEFAULT_CONFIG.sessionTimeout,
      passwordComplexity: settingsMap.has('password_complexity') 
        ? (typeof settingsMap.get('password_complexity') === 'string'
          ? settingsMap.get('password_complexity') === 'true'
          : settingsMap.get('password_complexity'))
        : DEFAULT_CONFIG.passwordComplexity,
      auditLogRetention: Number(settingsMap.get('audit_logs_retention_days')) || DEFAULT_CONFIG.auditLogRetention,
      amendmentTimeLimit: Number(settingsMap.get('amendment_time_limit')) || DEFAULT_CONFIG.amendmentTimeLimit,
      maxAmendmentsPerCase: Number(settingsMap.get('max_amendments_per_case')) || DEFAULT_CONFIG.maxAmendmentsPerCase,
      defaultTheme: settingsMap.get('default_theme') || DEFAULT_CONFIG.defaultTheme,
      defaultLanguage: settingsMap.get('default_language') || DEFAULT_CONFIG.defaultLanguage
    };
    return supabaseConfig;
  } catch (error) {
    return DEFAULT_CONFIG;
  }
};

/**
 * Save system configuration to Supabase
 */
export const saveSystemConfig = async (config: SystemConfig): Promise<void> => {
  console.log('🔧 SYSTEM SETTINGS SAVE - Starting save operation:', config);
  
  try {
    // Prepare key-value pairs for Supabase
    const configMappings = [
      { key: 'version', value: config.appVersion },
      { key: 'maintenance_mode', value: config.maintenanceMode },
      { key: 'cache_timeout', value: config.cacheTimeout },
      { key: 'max_file_size', value: config.maxFileSize },
      { key: 'session_timeout', value: config.sessionTimeout },
      { key: 'password_complexity', value: config.passwordComplexity },
      { key: 'audit_logs_retention_days', value: config.auditLogRetention },
      { key: 'amendment_time_limit', value: config.amendmentTimeLimit },
      { key: 'max_amendments_per_case', value: config.maxAmendmentsPerCase },
      { key: 'default_theme', value: config.defaultTheme },
      { key: 'default_language', value: config.defaultLanguage }
    ];
    
    console.log('📝 SYSTEM SETTINGS SAVE - Prepared mappings:', configMappings);

    // Update or insert each setting
    for (const mapping of configMappings) {
      // First try to update existing setting
      const { data: existingData, error: selectError } = await supabase
        .from('system_settings')
        .select('id')
        .eq('setting_key', mapping.key)
        .single();

      console.log(`🔍 SYSTEM SETTINGS SAVE - Processing ${mapping.key}:`, {
        key: mapping.key,
        value: mapping.value,
        valueType: typeof mapping.value,
        hasExisting: !!existingData
      });

      if (existingData) {
        // Update existing setting - JSONB column handles serialization automatically
        console.log(`📤 SYSTEM SETTINGS UPDATE - Updating ${mapping.key}`);
        
        const { data: updateData, error } = await supabase
          .from('system_settings')
          .update({
            setting_value: mapping.value, // Direct value, no JSON.stringify needed for JSONB
            description: getSettingDescription(mapping.key),
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', mapping.key)
          .select()
          .single();

        if (error) {
          console.error(`❌ SYSTEM SETTINGS UPDATE - Failed to update ${mapping.key}:`, error);
          throw error;
        }
        
        console.log(`✅ SYSTEM SETTINGS UPDATE - Successfully updated ${mapping.key}:`, updateData);
      } else {
        // Insert new setting - JSONB column handles serialization automatically
        console.log(`📤 SYSTEM SETTINGS INSERT - Creating ${mapping.key}`);
        
        const { data: insertData, error } = await supabase
          .from('system_settings')
          .insert({
            setting_key: mapping.key,
            setting_value: mapping.value, // Direct value, no JSON.stringify needed for JSONB
            description: getSettingDescription(mapping.key),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ SYSTEM SETTINGS INSERT - Failed to insert ${mapping.key}:`, error);
          throw error;
        }
        
        console.log(`✅ SYSTEM SETTINGS INSERT - Successfully created ${mapping.key}:`, insertData);
      }
    }
    
    console.log('🎉 SYSTEM SETTINGS SAVE - All settings saved successfully');
  } catch (error) {
    console.error('💥 SYSTEM SETTINGS SAVE - Critical error:', error);
    throw error;
  }
};

/**
 * Get description for a setting key
 */
const getSettingDescription = (key: string): string => {
  const descriptions: Record<string, string> = {
    'version': 'Current application version',
    'maintenance_mode': 'Enable maintenance mode',
    'cache_timeout': 'Cache timeout in seconds',
    'max_file_size': 'Maximum file size in MB',
    'session_timeout': 'Session timeout in seconds',
    'password_complexity': 'Enable password complexity requirements',
    'audit_logs_retention_days': 'Number of days to retain audit logs',
    'amendment_time_limit': 'Time limit for amendments in minutes',
    'max_amendments_per_case': 'Maximum amendments per case',
    'default_theme': 'Default UI theme',
    'default_language': 'Default application language'
  };
  return descriptions[key] || `Setting for ${key}`;
};

/**
 * Create default system configuration
 */
const createDefaultSystemConfig = async (): Promise<SystemConfig> => {
  try {
    await saveSystemConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  } catch (error) {
    return DEFAULT_CONFIG;
  }
};


/**
 * Reset system configuration to defaults
 */
export const resetSystemConfig = async (): Promise<SystemConfig> => {
  try {
    await saveSystemConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  } catch (error) {
    throw error;
  }
};

/**
 * Get system health status
 */
export const getSystemHealth = async (): Promise<{
  status: 'healthy' | 'warning' | 'error';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
  }>;
}> => {
  const checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
  }> = [];

  try {
    // Check database connection
    const { error: dbError } = await supabase.from('system_settings').select('id').limit(1);
    checks.push({
      name: 'Database Connection',
      status: dbError ? 'fail' : 'pass',
      message: dbError ? 'Database connection failed' : 'Database connection healthy'
    });

    // Check session storage
    try {
      sessionStorage.setItem('healthcheck', 'test');
      sessionStorage.removeItem('healthcheck');
      checks.push({
        name: 'Session Storage',
        status: 'pass',
        message: 'Session storage is working'
      });
    } catch (error) {
      checks.push({
        name: 'Session Storage',
        status: 'fail',
        message: 'Session storage is not available'
      });
    }

    // Check system configuration
    const config = await getSystemConfig();
    checks.push({
      name: 'System Configuration',
      status: config ? 'pass' : 'fail',
      message: config ? 'System configuration loaded' : 'System configuration unavailable'
    });

    // Determine overall status
    const failCount = checks.filter(c => c.status === 'fail').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;

    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    if (failCount > 0) {
      status = 'error';
    } else if (warnCount > 0) {
      status = 'warning';
    }

    return { status, checks };
  } catch (error) {
    return {
      status: 'error',
      checks: [{
        name: 'System Health Check',
        status: 'fail',
        message: 'System health check failed'
      }]
    };
  }
};

/**
 * Apply system configuration changes
 */
export const applySystemConfig = async (config: SystemConfig): Promise<void> => {
  try {
    // Apply session timeout
    if (config.sessionTimeout > 0) {
      const sessionTimeout = config.sessionTimeout * 1000; // Convert to milliseconds
      sessionStorage.setItem('sessionTimeout', sessionTimeout.toString());
    }

    // Apply maintenance mode
    if (config.maintenanceMode) {
      sessionStorage.setItem('maintenanceMode', 'true');
    } else {
      sessionStorage.removeItem('maintenanceMode');
    }

    // Apply theme changes
    if (config.defaultTheme) {
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', config.defaultTheme);
      document.body.className = document.body.className.replace(/theme-\w+/g, '');
      document.body.classList.add(`theme-${config.defaultTheme}`);

      // Store in sessionStorage
      sessionStorage.setItem('defaultTheme', config.defaultTheme);

      // Apply CSS variables for light/dark theme
      const root = document.documentElement;
      if (config.defaultTheme === 'dark') {
        root.style.setProperty('--background-color', '#1a1a1a');
        root.style.setProperty('--text-color', '#ffffff');
        root.style.setProperty('--card-background', '#2d2d2d');
        root.style.setProperty('--border-color', '#404040');
      } else {
        root.style.setProperty('--background-color', '#ffffff');
        root.style.setProperty('--text-color', '#333333');
        root.style.setProperty('--card-background', '#ffffff');
        root.style.setProperty('--border-color', '#e9ecef');
      }
    }

    // Apply cache timeout
    sessionStorage.setItem('cacheTimeout', config.cacheTimeout.toString());
    
    // Apply max file size
    sessionStorage.setItem('maxFileSize', config.maxFileSize.toString());
    
    // Apply audit log retention
    sessionStorage.setItem('auditLogRetention', config.auditLogRetention.toString());
    
    // Apply amendment settings
    sessionStorage.setItem('amendmentTimeLimit', config.amendmentTimeLimit.toString());
    sessionStorage.setItem('maxAmendmentsPerCase', config.maxAmendmentsPerCase.toString());
    
    // Apply security settings
    sessionStorage.setItem('passwordComplexity', config.passwordComplexity.toString());
  } catch (error) {
    throw error;
  }
};