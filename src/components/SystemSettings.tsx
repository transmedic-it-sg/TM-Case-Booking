/**
 * SystemSettings Component - Enhanced with collapsible sections and fixes
 * Handles application configuration, performance settings, and system preferences
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { useToast } from './ToastContainer';
import { useModal } from '../hooks/useModal';
import { 
  SystemConfig, 
  getSystemConfig, 
  saveSystemConfig, 
  resetSystemConfig,
  applySystemConfig
} from '../utils/systemSettingsService';
import '../assets/components/AdminComponents.css';

const SystemSettings: React.FC = () => {
  const currentUser = getCurrentUser();
  const { showSuccess, showError } = useToast();
  const { showConfirm } = useModal();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Collapsible sections state - all collapsed by default
  const [expandedSections, setExpandedSections] = useState<{
    application: boolean;
    performance: boolean;
    security: boolean;
    amendment: boolean;
    notification: boolean;
    database: boolean;
    ui: boolean;
  }>({
    application: false,
    performance: false,
    security: false,
    amendment: false,
    notification: false,
    database: false,
    ui: false
  });

  // Check permissions
  const canManageSettings = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.SYSTEM_SETTINGS) : false;

  const loadSystemConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedConfig = await getSystemConfig();
      setConfig(loadedConfig);
      setOriginalConfig({ ...loadedConfig });
    } catch (error) {
      console.error('Failed to load system configuration:', error);
      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('system_settings')) {
        showError('Database Setup Required', 'System settings table needs to be created. Please run the CREATE_SYSTEM_SETTINGS_TABLE.sql script.');
      } else if (error instanceof Error && error.message.includes('permission')) {
        showError('Permission Denied', 'You do not have permission to access system settings.');
      } else {
        showError('Load Failed', 'Failed to load system configuration. Using default settings.');
      }
      // Fall back to default config so the UI still works
      const defaultConfig = await import('../utils/systemSettingsService').then(m => m.getSystemConfig().catch(() => ({
        appName: 'Transmedic Case Booking',
        appVersion: '1.2.2',
        maintenanceMode: false,
        cacheTimeout: 300,
        maxFileSize: 10,
        sessionTimeout: 3600,
        passwordComplexity: true,
        twoFactorAuth: false,
        auditLogRetention: 90,
        amendmentTimeLimit: 1440,
        maxAmendmentsPerCase: 5,
        emailNotifications: true,
        systemAlerts: true,
        backupFrequency: 'daily' as const,
        autoCleanup: true,
        defaultTheme: 'light' as const,
        defaultLanguage: 'en'
      })));
      setConfig(defaultConfig);
      setOriginalConfig({ ...defaultConfig });
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (canManageSettings) {
      loadSystemConfig();
    }
  }, [canManageSettings, loadSystemConfig]);

  // Check for changes
  useEffect(() => {
    if (config && originalConfig) {
      setHasChanges(JSON.stringify(config) !== JSON.stringify(originalConfig));
    }
  }, [config, originalConfig]);

  const handleConfigChange = (key: keyof SystemConfig, value: any) => {
    if (!config) return;
    
    setConfig(prev => prev ? ({
      ...prev,
      [key]: value
    }) : null);
  };
  
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSaveConfig = () => {
    if (!hasChanges) return;

    showConfirm(
      '💾 Save Configuration',
      'Are you sure you want to save these system settings?\n\nSome changes may require system restart to take effect.',
      () => performSave()
    );
  };

  const performSave = async () => {
    if (!config) return;
    
    setIsSaving(true);
    try {
      await saveSystemConfig(config);
      await applySystemConfig(config);
      
      setOriginalConfig({ ...config });
      showSuccess('Settings Saved', 'System configuration has been updated successfully');
    } catch (error) {
      console.error('Failed to save system configuration:', error);
      showError('Save Failed', 'Failed to save system configuration. Please check your permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetConfig = () => {
    showConfirm(
      '🔄 Reset Configuration',
      'Are you sure you want to reset all settings to default values?\n\nThis action cannot be undone.',
      async () => {
        try {
          await resetSystemConfig();
          await loadSystemConfig();
          showSuccess('Settings Reset', 'System configuration has been reset to defaults');
        } catch (error) {
          console.error('Failed to reset system configuration:', error);
          showError('Reset Failed', 'Failed to reset system configuration');
        }
      }
    );
  };

  if (!canManageSettings) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h2>Access Denied</h2>
          <p>You do not have permission to manage system settings.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h2>System Settings</h2>
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h2>System Settings</h2>
          <p>Failed to load system configuration.</p>
        </div>
        <div className="admin-section">
          <div className="alert alert-warning">
            <h4>⚠️ Configuration Not Available</h4>
            <p>The system settings could not be loaded. This might be due to:</p>
            <ul>
              <li>Missing database table (run CREATE_SYSTEM_SETTINGS_TABLE.sql)</li>
              <li>Network connectivity issues</li>
              <li>Permission restrictions</li>
            </ul>
            <div className="mt-3">
              <button onClick={loadSystemConfig} className="btn btn-primary me-2">
                🔄 Retry Loading
              </button>
              <a href="/CREATE_SYSTEM_SETTINGS_TABLE.sql" download className="btn btn-secondary">
                📥 Download SQL Script
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const CollapsibleSection = ({ 
    title, 
    description, 
    sectionKey, 
    children 
  }: { 
    title: string; 
    description: string; 
    sectionKey: keyof typeof expandedSections; 
    children: React.ReactNode; 
  }) => (
    <div className="admin-section collapsible-section">
      <div 
        className="section-header clickable" 
        onClick={() => toggleSection(sectionKey)}
        style={{ 
          cursor: 'pointer', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: expandedSections[sectionKey] ? '16px' : '0'
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <p style={{ margin: '4px 0 0 0', color: '#666' }}>{description}</p>
        </div>
        <span style={{ fontSize: '18px', color: '#666' }}>
          {expandedSections[sectionKey] ? '▼' : '▶'}
        </span>
      </div>
      {expandedSections[sectionKey] && (
        <div className="section-content" style={{ padding: '0 16px 16px 16px' }}>
          <div className="settings-grid">
            {children}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>System Settings</h2>
        <p>Configure application settings and system preferences</p>
        <div className="header-actions">
          {hasChanges && (
            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="btn btn-primary btn-lg"
              style={{ marginRight: '12px' }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
          <button
            onClick={handleResetConfig}
            className="btn btn-outline-secondary btn-lg"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Application Settings */}
      <CollapsibleSection 
        title="Application Settings" 
        description="General application configuration"
        sectionKey="application"
      >
        <div className="setting-item">
          <label>Application Name</label>
          <input
            type="text"
            value={config.appName}
            onChange={(e) => handleConfigChange('appName', e.target.value)}
            placeholder="Enter application name"
          />
          <small>Name displayed in the application header</small>
        </div>
        <div className="setting-item">
          <label>Version</label>
          <input
            type="text"
            value={config.appVersion}
            disabled
            title="Version is read-only"
          />
          <small>Current application version (read-only)</small>
        </div>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={config.maintenanceMode}
              onChange={(e) => handleConfigChange('maintenanceMode', e.target.checked)}
            />
            Maintenance Mode
          </label>
          <small>Prevents users from accessing the system</small>
        </div>
      </CollapsibleSection>

      {/* Performance Settings */}
      <CollapsibleSection 
        title="Performance Settings" 
        description="System performance and resource configuration"
        sectionKey="performance"
      >
        <div className="setting-item">
          <label>Cache Timeout (seconds)</label>
          <input
            type="number"
            value={config.cacheTimeout}
            onChange={(e) => handleConfigChange('cacheTimeout', parseInt(e.target.value))}
            min="60"
            max="3600"
          />
          <small>How long to cache data in memory (60-3600 seconds)</small>
        </div>
        <div className="setting-item">
          <label>Max File Size (MB)</label>
          <input
            type="number"
            value={config.maxFileSize}
            onChange={(e) => handleConfigChange('maxFileSize', parseInt(e.target.value))}
            min="1"
            max="100"
          />
          <small>Maximum file upload size (1-100 MB)</small>
        </div>
        <div className="setting-item">
          <label>Session Timeout (seconds)</label>
          <input
            type="number"
            value={config.sessionTimeout}
            onChange={(e) => handleConfigChange('sessionTimeout', parseInt(e.target.value))}
            min="300"
            max="86400"
          />
          <small>User session timeout (5 minutes - 24 hours)</small>
        </div>
      </CollapsibleSection>

      {/* Security Settings */}
      <CollapsibleSection 
        title="Security Settings" 
        description="Authentication and security policies"
        sectionKey="security"
      >
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={config.passwordComplexity}
              onChange={(e) => handleConfigChange('passwordComplexity', e.target.checked)}
            />
            Password Complexity Requirements
          </label>
          <small>Enforce strong password requirements</small>
        </div>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={config.twoFactorAuth}
              onChange={(e) => handleConfigChange('twoFactorAuth', e.target.checked)}
            />
            Two-Factor Authentication
          </label>
          <small>Require 2FA for user accounts</small>
        </div>
        <div className="setting-item">
          <label>Audit Log Retention (days)</label>
          <input
            type="number"
            value={config.auditLogRetention}
            onChange={(e) => handleConfigChange('auditLogRetention', parseInt(e.target.value))}
            min="30"
            max="365"
          />
          <small>How long to keep audit logs (30-365 days)</small>
        </div>
      </CollapsibleSection>

      {/* Amendment Settings */}
      <CollapsibleSection 
        title="Amendment Settings" 
        description="Configure case amendment policies and time limits"
        sectionKey="amendment"
      >
        <div className="setting-item">
          <label>Amendment Time Limit (minutes)</label>
          <input
            type="number"
            value={config.amendmentTimeLimit}
            onChange={(e) => handleConfigChange('amendmentTimeLimit', parseInt(e.target.value))}
            min="30"
            max="10080"
          />
          <small>Time limit for amendments after case creation (30 minutes - 7 days)</small>
        </div>
        <div className="setting-item">
          <label>Maximum Amendments Per Case</label>
          <input
            type="number"
            value={config.maxAmendmentsPerCase}
            onChange={(e) => handleConfigChange('maxAmendmentsPerCase', parseInt(e.target.value))}
            min="1"
            max="20"
          />
          <small>Maximum number of amendments allowed per case (1-20)</small>
        </div>
      </CollapsibleSection>

      {/* Notification Settings */}
      <CollapsibleSection 
        title="Notification Settings" 
        description="Configure system notifications and alerts"
        sectionKey="notification"
      >
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={config.emailNotifications}
              onChange={(e) => handleConfigChange('emailNotifications', e.target.checked)}
            />
            Email Notifications
          </label>
          <small>Send notifications via email</small>
        </div>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={config.systemAlerts}
              onChange={(e) => handleConfigChange('systemAlerts', e.target.checked)}
            />
            System Alerts
          </label>
          <small>Show system-wide alert messages</small>
        </div>
      </CollapsibleSection>

      {/* Database Settings */}
      <CollapsibleSection 
        title="Database Settings" 
        description="Database maintenance and backup configuration"
        sectionKey="database"
      >
        <div className="setting-item">
          <label>Backup Frequency</label>
          <select
            value={config.backupFrequency}
            onChange={(e) => handleConfigChange('backupFrequency', e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <small>How often to create database backups</small>
        </div>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={config.autoCleanup}
              onChange={(e) => handleConfigChange('autoCleanup', e.target.checked)}
            />
            Automatic Cleanup
          </label>
          <small>Automatically clean old data and logs</small>
        </div>
      </CollapsibleSection>

      {/* User Interface Settings */}
      <CollapsibleSection 
        title="User Interface Settings" 
        description="Default UI preferences and theme settings"
        sectionKey="ui"
      >
        <div className="setting-item">
          <label>Default Theme</label>
          <select
            value={config.defaultTheme}
            onChange={(e) => handleConfigChange('defaultTheme', e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </select>
          <small>Default theme for new users</small>
        </div>
        <div className="setting-item">
          <label>Default Language</label>
          <select
            value={config.defaultLanguage}
            onChange={(e) => handleConfigChange('defaultLanguage', e.target.value)}
          >
            <option value="en">English</option>
            <option value="ms">Bahasa Malaysia</option>
            <option value="zh">中文</option>
          </select>
          <small>Default language for the application</small>
        </div>
      </CollapsibleSection>

    </div>
  );
};

export default SystemSettings;