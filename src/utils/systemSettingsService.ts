/**
 * System Settings Service
 * Handles system configuration, preferences, and settings persistence
 */

import { supabase } from '../lib/supabase';

export interface SystemConfig {
  // Application Settings
  appName: string;
  appVersion: string;
  maintenanceMode: boolean;
  
  // Performance Settings
  cacheTimeout: number;
  maxFileSize: number;
  sessionTimeout: number;
  
  // Security Settings
  passwordComplexity: boolean;
  twoFactorAuth: boolean;
  auditLogRetention: number;
  
  // Amendment Settings
  amendmentTimeLimit: number; // Time limit in minutes for amendments
  maxAmendmentsPerCase: number; // Maximum number of amendments allowed per case
  
  // Notification Settings
  emailNotifications: boolean;
  systemAlerts: boolean;
  
  // Database Settings
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  autoCleanup: boolean;
  
  // UI Settings
  defaultTheme: 'light' | 'dark' | 'auto';
  defaultLanguage: string;
}

const DEFAULT_CONFIG: SystemConfig = {
  appName: 'Transmedic Case Booking',
  appVersion: '1.2.2',
  maintenanceMode: false,
  cacheTimeout: 300,
  maxFileSize: 10,
  sessionTimeout: 3600,
  passwordComplexity: true,
  twoFactorAuth: false,
  auditLogRetention: 90,
  amendmentTimeLimit: 1440, // 1440 minutes (24 hours) default
  maxAmendmentsPerCase: 5, // 5 amendments max per case
  emailNotifications: true,
  systemAlerts: true,
  backupFrequency: 'daily',
  autoCleanup: true,
  defaultTheme: 'light',
  defaultLanguage: 'en'
};

/**
 * Get system configuration from Supabase
 */
export const getSystemConfig = async (): Promise<SystemConfig> => {
  try {
    // Get system settings from Supabase
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, create default settings
        console.log('No system settings found, creating default configuration...');
        return await createDefaultSystemConfig();
      }
      if (error.code === '42P01') {
        // Table doesn't exist
        console.log('System settings table does not exist, using default configuration');
        return DEFAULT_CONFIG;
      }
      throw error;
    }

    // Transform database format to SystemConfig
    return {
      appName: data.app_name || DEFAULT_CONFIG.appName,
      appVersion: data.app_version || DEFAULT_CONFIG.appVersion,
      maintenanceMode: data.maintenance_mode || DEFAULT_CONFIG.maintenanceMode,
      cacheTimeout: data.cache_timeout || DEFAULT_CONFIG.cacheTimeout,
      maxFileSize: data.max_file_size || DEFAULT_CONFIG.maxFileSize,
      sessionTimeout: data.session_timeout || DEFAULT_CONFIG.sessionTimeout,
      passwordComplexity: data.password_complexity || DEFAULT_CONFIG.passwordComplexity,
      twoFactorAuth: data.two_factor_auth || DEFAULT_CONFIG.twoFactorAuth,
      auditLogRetention: data.audit_log_retention || DEFAULT_CONFIG.auditLogRetention,
      amendmentTimeLimit: data.amendment_time_limit || DEFAULT_CONFIG.amendmentTimeLimit,
      maxAmendmentsPerCase: data.max_amendments_per_case || DEFAULT_CONFIG.maxAmendmentsPerCase,
      emailNotifications: data.email_notifications || DEFAULT_CONFIG.emailNotifications,
      systemAlerts: data.system_alerts || DEFAULT_CONFIG.systemAlerts,
      backupFrequency: data.backup_frequency || DEFAULT_CONFIG.backupFrequency,
      autoCleanup: data.auto_cleanup || DEFAULT_CONFIG.autoCleanup,
      defaultTheme: data.default_theme || DEFAULT_CONFIG.defaultTheme,
      defaultLanguage: data.default_language || DEFAULT_CONFIG.defaultLanguage
    };
  } catch (error) {
    console.error('Error getting system configuration from Supabase:', error);
    // Only fall back to localStorage if there's a connection issue
    if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('network'))) {
      console.log('Network error, falling back to localStorage');
      return getSystemConfigFromLocalStorage();
    }
    throw error;
  }
};

/**
 * Save system configuration to Supabase
 */
export const saveSystemConfig = async (config: SystemConfig): Promise<void> => {
  try {
    // Save to Supabase
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        id: 1, // Single row for system settings
        app_name: config.appName,
        app_version: config.appVersion,
        maintenance_mode: config.maintenanceMode,
        cache_timeout: config.cacheTimeout,
        max_file_size: config.maxFileSize,
        session_timeout: config.sessionTimeout,
        password_complexity: config.passwordComplexity,
        two_factor_auth: config.twoFactorAuth,
        audit_log_retention: config.auditLogRetention,
        amendment_time_limit: config.amendmentTimeLimit,
        max_amendments_per_case: config.maxAmendmentsPerCase,
        email_notifications: config.emailNotifications,
        system_alerts: config.systemAlerts,
        backup_frequency: config.backupFrequency,
        auto_cleanup: config.autoCleanup,
        default_theme: config.defaultTheme,
        default_language: config.defaultLanguage,
        updated_at: new Date().toISOString()
      });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist, save to localStorage only
        console.log('System settings table does not exist, saving to localStorage only');
        saveSystemConfigToLocalStorage(config);
        return;
      }
      throw error;
    }

    // Also save to localStorage as backup
    saveSystemConfigToLocalStorage(config);
    
    console.log('System configuration saved successfully');
  } catch (error) {
    console.error('Error saving system configuration to Supabase:', error);
    // Only fall back to localStorage if there's a connection issue
    if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('network'))) {
      console.log('Network error, falling back to localStorage');
      saveSystemConfigToLocalStorage(config);
    } else {
      throw error;
    }
  }
};

/**
 * Create default system configuration
 */
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
      return { ...DEFAULT_CONFIG, ...parsed };
    }
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
    // Apply session timeout
    if (config.sessionTimeout > 0) {
      const sessionTimeout = config.sessionTimeout * 1000; // Convert to milliseconds
      
      // Update session timeout in localStorage
      localStorage.setItem('sessionTimeout', sessionTimeout.toString());
    }
    
    // Apply maintenance mode
    if (config.maintenanceMode) {
      localStorage.setItem('maintenanceMode', 'true');
    } else {
      localStorage.removeItem('maintenanceMode');
    }
    
    // Apply theme
    if (config.defaultTheme) {
      document.documentElement.setAttribute('data-theme', config.defaultTheme);
      localStorage.setItem('defaultTheme', config.defaultTheme);
    }
    
    // Apply other settings as needed
  } catch (error) {
    console.error('Error applying system configuration:', error);
    throw error;
  }
};