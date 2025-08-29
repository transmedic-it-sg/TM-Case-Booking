/**
 * System Settings Service
 * Handles system configuration, preferences, and settings persistence
 */

import { supabase } from '../lib/supabase';
import { getAppVersion } from './version';

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
    // First try to get from localStorage as it's more reliable
    const localConfig = getSystemConfigFromLocalStorage();
    
    // Try to get system settings from Supabase (key-value structure)
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value');

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, use localStorage or defaults
        console.log('📋 No system settings found in Supabase, using localStorage');
        return localConfig;
      }
      if (error.code === '42P01') {
        // Table doesn't exist
        console.log('📋 System settings table does not exist, using localStorage');
        return localConfig;
      }
      if (error.code === '401' || error.message.includes('permission denied')) {
        console.log('📋 Permission denied for system settings, using localStorage');
        return localConfig;
      }
      if (error.code === '406' || error.message.includes('Not Acceptable')) {
        console.log('📋 System settings table not configured, using localStorage (expected in development)');
        return localConfig;
      }
      console.log('Supabase error, falling back to localStorage:', error);
      return localConfig;
    }

    if (!data || data.length === 0) {
      console.log('📋 No system settings data found in Supabase, using localStorage');
      return localConfig;
    }

    // Transform key-value pairs to config object
    const settingsMap = new Map();
    data.forEach((row: any) => {
      settingsMap.set(row.setting_key, row.setting_value);
    });

    // Build config from key-value pairs with defaults
    const supabaseConfig: SystemConfig = {
      appVersion: getAppVersion(), // Always use current version from package.json
      maintenanceMode: settingsMap.has('maintenance_mode') ? settingsMap.get('maintenance_mode') : DEFAULT_CONFIG.maintenanceMode,
      cacheTimeout: settingsMap.get('cache_timeout') || DEFAULT_CONFIG.cacheTimeout,
      maxFileSize: settingsMap.get('max_file_size') || DEFAULT_CONFIG.maxFileSize,
      sessionTimeout: settingsMap.get('session_timeout') || DEFAULT_CONFIG.sessionTimeout,
      passwordComplexity: settingsMap.has('password_complexity') ? settingsMap.get('password_complexity') : DEFAULT_CONFIG.passwordComplexity,
      auditLogRetention: settingsMap.get('audit_logs_retention_days') || DEFAULT_CONFIG.auditLogRetention,
      amendmentTimeLimit: settingsMap.get('amendment_time_limit') || DEFAULT_CONFIG.amendmentTimeLimit,
      maxAmendmentsPerCase: settingsMap.get('max_amendments_per_case') || DEFAULT_CONFIG.maxAmendmentsPerCase,
      defaultTheme: settingsMap.get('default_theme') || DEFAULT_CONFIG.defaultTheme,
      defaultLanguage: settingsMap.get('default_language') || DEFAULT_CONFIG.defaultLanguage
    };

    console.log('✅ Successfully loaded system settings from Supabase');
    // Save the merged config to localStorage for future use
    saveSystemConfigToLocalStorage(supabaseConfig);
    return supabaseConfig;
  } catch (error) {
    console.error('Error getting system configuration from Supabase:', error);
    console.log('Falling back to localStorage configuration');
    return getSystemConfigFromLocalStorage();
  }
};

/**
 * Save system configuration to Supabase
 */
export const saveSystemConfig = async (config: SystemConfig): Promise<void> => {
  // Always save to localStorage first to ensure settings are persisted
  saveSystemConfigToLocalStorage(config);
  console.log('✅ System configuration saved to localStorage');

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

    // Update or insert each setting
    for (const mapping of configMappings) {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: mapping.key,
          setting_value: mapping.value,
          description: getSettingDescription(mapping.key),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist, localStorage save is sufficient
          console.log('⚠️ System settings table does not exist, but localStorage save completed');
          return;
        }
        if (error.code === '401' || error.message.includes('permission denied')) {
          console.log('⚠️ Permission denied for Supabase, but localStorage save completed');
          return;
        }
        console.warn(`⚠️ Failed to save setting ${mapping.key} to Supabase:`, error.message);
      }
    }

    console.log('✅ System configuration saved to both Supabase and localStorage');
  } catch (error) {
    console.error('⚠️ Error saving system configuration to Supabase:', error);
    console.log('✅ Configuration saved to localStorage successfully (Supabase unavailable)');
    // Don't throw error since localStorage save was successful
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createDefaultSystemConfig = async (): Promise<SystemConfig> => {
  try {
    await saveSystemConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error creating default system configuration:', error);
    return DEFAULT_CONFIG;
  }
};

/**
 * Get system configuration from localStorage (fallback)
 */
const getSystemConfigFromLocalStorage = (): SystemConfig => {
  try {
    const stored = localStorage.getItem('systemConfig');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure all required fields are present with proper defaults
      const config = {
        appVersion: getAppVersion(), // Always use current version from package.json
        maintenanceMode: parsed.maintenanceMode !== undefined ? parsed.maintenanceMode : DEFAULT_CONFIG.maintenanceMode,
        cacheTimeout: parsed.cacheTimeout || DEFAULT_CONFIG.cacheTimeout,
        maxFileSize: parsed.maxFileSize || DEFAULT_CONFIG.maxFileSize,
        sessionTimeout: parsed.sessionTimeout || DEFAULT_CONFIG.sessionTimeout,
        passwordComplexity: parsed.passwordComplexity !== undefined ? parsed.passwordComplexity : DEFAULT_CONFIG.passwordComplexity,
        auditLogRetention: parsed.auditLogRetention || DEFAULT_CONFIG.auditLogRetention,
        amendmentTimeLimit: parsed.amendmentTimeLimit || DEFAULT_CONFIG.amendmentTimeLimit,
        maxAmendmentsPerCase: parsed.maxAmendmentsPerCase || DEFAULT_CONFIG.maxAmendmentsPerCase,
        defaultTheme: parsed.defaultTheme || DEFAULT_CONFIG.defaultTheme,
        defaultLanguage: parsed.defaultLanguage || DEFAULT_CONFIG.defaultLanguage
      };
      console.log('📋 Loaded system configuration from localStorage');
      return config;
    }
    console.log('📋 No localStorage config found, using defaults');
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error getting system configuration from localStorage:', error);
    return DEFAULT_CONFIG;
  }
};

/**
 * Save system configuration to localStorage (fallback)
 */
const saveSystemConfigToLocalStorage = (config: SystemConfig): void => {
  try {
    localStorage.setItem('systemConfig', JSON.stringify(config));
  } catch (error) {
    console.error('Error saving system configuration to localStorage:', error);
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
    console.error('Error resetting system configuration:', error);
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
    
    // Check localStorage
    try {
      localStorage.setItem('healthcheck', 'test');
      localStorage.removeItem('healthcheck');
      checks.push({
        name: 'Local Storage',
        status: 'pass',
        message: 'Local storage is working'
      });
    } catch (error) {
      checks.push({
        name: 'Local Storage',
        status: 'fail',
        message: 'Local storage is not available'
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
    console.log('🔄 Applying system configuration changes...');

    // Apply session timeout
    if (config.sessionTimeout > 0) {
      const sessionTimeout = config.sessionTimeout * 1000; // Convert to milliseconds
      localStorage.setItem('sessionTimeout', sessionTimeout.toString());
      console.log(`✅ Session timeout set to ${config.sessionTimeout} seconds`);
    }
    
    // Apply maintenance mode
    if (config.maintenanceMode) {
      localStorage.setItem('maintenanceMode', 'true');
      console.log('✅ Maintenance mode enabled');
    } else {
      localStorage.removeItem('maintenanceMode');
      console.log('✅ Maintenance mode disabled');
    }
    
    
    // Apply theme changes
    if (config.defaultTheme) {
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', config.defaultTheme);
      document.body.className = document.body.className.replace(/theme-\w+/g, '');
      document.body.classList.add(`theme-${config.defaultTheme}`);
      
      // Store in localStorage
      localStorage.setItem('defaultTheme', config.defaultTheme);
      
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
      console.log(`✅ Theme set to ${config.defaultTheme}`);
    }
    
    
    // Apply cache timeout
    localStorage.setItem('cacheTimeout', config.cacheTimeout.toString());
    console.log(`✅ Cache timeout set to ${config.cacheTimeout} seconds`);
    
    // Apply max file size
    localStorage.setItem('maxFileSize', config.maxFileSize.toString());
    console.log(`✅ Max file size set to ${config.maxFileSize} MB`);
    
    // Apply audit log retention
    localStorage.setItem('auditLogRetention', config.auditLogRetention.toString());
    console.log(`✅ Audit log retention set to ${config.auditLogRetention} days`);
    
    // Apply amendment settings
    localStorage.setItem('amendmentTimeLimit', config.amendmentTimeLimit.toString());
    localStorage.setItem('maxAmendmentsPerCase', config.maxAmendmentsPerCase.toString());
    console.log(`✅ Amendment time limit: ${config.amendmentTimeLimit} minutes, max per case: ${config.maxAmendmentsPerCase}`);
    
    // Apply security settings
    localStorage.setItem('passwordComplexity', config.passwordComplexity.toString());
    console.log(`✅ Security settings applied - Password complexity: ${config.passwordComplexity}`);
    
    console.log('✅ All system configuration changes applied successfully');
  } catch (error) {
    console.error('Error applying system configuration:', error);
    throw error;
  }
};