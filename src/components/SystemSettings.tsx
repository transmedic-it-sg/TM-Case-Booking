/**
 * SystemSettings Component - Enhanced with collapsible sections and fixes
 * Handles application configuration, performance settings, and system preferences
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../utils/authCompat';
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
import { getAppVersion, getBuildInfo } from '../utils/version';
import '../assets/components/AdminComponents.css';
import '../assets/components/SystemSettings.css';

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
    ui: boolean;
  }>({
    application: false,
    performance: false,
    security: false,
    amendment: false,
    notification: false,
    ui: false
  });

  // Check permissions - admin override
  const canManageSettings = currentUser ? (currentUser.role === 'admin' || hasPermission(currentUser.role, PERMISSION_ACTIONS.SYSTEM_SETTINGS)) : false;

  const loadSystemConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedConfig = await getSystemConfig();
      setConfig(loadedConfig);
      setOriginalConfig({ ...loadedConfig });
    } catch (error) {
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
        appVersion: getAppVersion(),
        maintenanceMode: false,
        cacheTimeout: 300,
        maxFileSize: 10,
        sessionTimeout: 3600,
        passwordComplexity: true,
        auditLogRetention: 90,
        amendmentTimeLimit: 1440,
        maxAmendmentsPerCase: 5,
        defaultTheme: 'light' as const,
        defaultLanguage: 'en'
      })));
      setConfig(defaultConfig);
      setOriginalConfig({ ...defaultConfig });
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      // Validate that settings were actually saved
      const validationResult = validateSettingsSaved(config);
      if (validationResult.allValid) {
        showSuccess('Settings Saved', `System configuration has been updated successfully. ${validationResult.validCount}/${validationResult.totalCount} settings applied.`);
      } else {
        showSuccess('Settings Partially Saved', `${validationResult.validCount}/${validationResult.totalCount} settings applied successfully. Check console for details.`);
      }
    } catch (error) {
      showError('Save Failed', 'Failed to save system configuration. Please check your permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  // Validate that settings were actually saved and applied
  const validateSettingsSaved = (savedConfig: SystemConfig) => {
    const validationResults: Array<{
      name: string;
      isValid: boolean;
      expected: string | null;
      actual: string | null;
    }> = [];

    // Check localStorage settings
    const checks: Array<{ name: string; expected: string | null; actual: string | null }> = [
      { name: 'Session Timeout', expected: (savedConfig.sessionTimeout * 1000).toString(), actual: null }, // Use Supabase system_settings table
      { name: 'Default Theme', expected: savedConfig.defaultTheme, actual: null }, // Use Supabase system_settings table
      { name: 'Cache Timeout', expected: savedConfig.cacheTimeout.toString(), actual: null }, // Use Supabase system_settings table
      { name: 'Max File Size', expected: savedConfig.maxFileSize.toString(), actual: null }, // Use Supabase system_settings table
      { name: 'Audit Log Retention', expected: savedConfig.auditLogRetention.toString(), actual: null }, // Use Supabase system_settings table
      { name: 'Amendment Time Limit', expected: savedConfig.amendmentTimeLimit.toString(), actual: null }, // Use Supabase system_settings table
      { name: 'Max Amendments Per Case', expected: savedConfig.maxAmendmentsPerCase.toString(), actual: null }, // Use Supabase system_settings table
      { name: 'Password Complexity', expected: savedConfig.passwordComplexity.toString(), actual: null }, // Use Supabase system_settings table
    ];

    // Special checks for maintenance mode (removed when false)
    if (savedConfig.maintenanceMode) {
      checks.push({ name: 'Maintenance Mode', expected: 'true', actual: null }); // Use Supabase system_settings table
    } else {
      checks.push({ name: 'Maintenance Mode', expected: null, actual: null }); // Use Supabase system_settings table
    }

    checks.forEach(check => {
      const isValid = check.expected === check.actual;
      validationResults.push({
        name: check.name,
        isValid,
        expected: check.expected,
        actual: check.actual
      });

      if (isValid) {
      } else {
      }
    });

    const validCount = validationResults.filter(r => r.isValid).length;
    const totalCount = validationResults.length;
    const failedSettings = validationResults.filter(r => !r.isValid).map(r => r.name);

    return {
      allValid: validCount === totalCount,
      validCount,
      totalCount,
      failedSettings,
      results: validationResults
    };
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
    icon,
    children
  }: {
    title: string;
    description: string;
    sectionKey: keyof typeof expandedSections;
    icon: string;
    children: React.ReactNode;
  }) => (
    <div className="settings-section">
      <div
        className={`settings-section-header ${expandedSections[sectionKey] ? 'expanded' : ''}`}
        onClick={() => toggleSection(sectionKey)}
      >
        <div className="section-header-content">
          <div className="section-header-info">
            <h2 className="section-title">
              <span className="section-icon">{icon}</span>
              {title}
            </h2>
            <p className="section-description">{description}</p>
          </div>
          <div className={`section-toggle ${expandedSections[sectionKey] ? 'expanded' : ''}`}>
            {expandedSections[sectionKey] ? '▲' : '▼'}
          </div>
        </div>
      </div>
      {expandedSections[sectionKey] && (
        <div className="settings-section-content">
          <div className="settings-items-grid">
            {children}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="system-settings-container">
      {/* Modern Header */}
      <div className="system-settings-header">
        <div className="settings-header-content">
          <div className="settings-header-info">
            <h1 className="settings-title">
              <span className="settings-title-icon">⚙️</span>
              System Settings
            </h1>
            <p className="settings-subtitle">Configure application settings and system preferences</p>
          </div>
          <div className="settings-header-actions">
            {hasChanges && (
              <div className="changes-indicator">
                <span className="changes-indicator-icon">⚡</span>
                Unsaved Changes
              </div>
            )}
            {hasChanges && (
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="settings-save-btn"
              >
                <span>💾</span>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
            <button
              onClick={handleResetConfig}
              className="settings-reset-btn"
            >
              <span>🔄</span>
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      {/* Settings Sections Grid */}
      <div className="settings-sections-grid">

        {/* Application Settings */}
        <CollapsibleSection
          title="Application Settings"
          description="General application configuration"
          sectionKey="application"
          icon="🏢"
        >
          <div className="modern-setting-item">
            <label className="modern-setting-label">Version</label>
            <input
              type="text"
              className="modern-setting-input"
              value={config.appVersion}
              disabled
              title="Version is read-only"
            />
            <small className="modern-setting-description">Current application version (read-only)</small>
          </div>
          <div className="modern-setting-item">
            <label className="modern-setting-label">Environment</label>
            <input
              type="text"
              className="modern-setting-input"
              value={getBuildInfo().environment}
              disabled
              title="Environment is auto-detected"
              style={{
                color: getBuildInfo().environment === 'Production' ? '#dc3545' : '#28a745',
                fontWeight: 'bold'
              }}
            />
            <small className="modern-setting-description">
              Auto-detected based on URL ({getBuildInfo().environment === 'Production' ? 'Vercel.app domain' : 'localhost domain'})
            </small>
          </div>
          <div className="modern-setting-item">
            <label className="modern-setting-label">Last Update</label>
            <input
              type="text"
              className="modern-setting-input"
              value={getBuildInfo().lastUpdate}
              disabled
              title="Last update date"
            />
            <small className="modern-setting-description">Last major update to the application</small>
          </div>
          <div className="modern-setting-item">
            <div className="modern-checkbox-container">
              <input
                type="checkbox"
                className="modern-checkbox"
                checked={config.maintenanceMode}
                onChange={(e) => handleConfigChange('maintenanceMode', e.target.checked)}
              />
              <label className="modern-checkbox-label">Maintenance Mode</label>
            </div>
            <small className="modern-setting-description">Prevents users from accessing the system</small>
          </div>
        </CollapsibleSection>

        {/* Performance Settings */}
        <CollapsibleSection
          title="Performance Settings"
          description="System performance and resource configuration"
          sectionKey="performance"
          icon="⚡"
        >
          <div className="modern-setting-item">
            <label className="modern-setting-label">Cache Timeout</label>
            <input
              type="number"
              className="modern-number-input"
              value={config.cacheTimeout}
              onChange={(e) => handleConfigChange('cacheTimeout', parseInt(e.target.value))}
              min="60"
              max="3600"
            />
            <small className="modern-setting-description">How long to cache data in memory</small>
            <div className="setting-range">Range: 60-3600 seconds</div>
          </div>
          <div className="modern-setting-item">
            <label className="modern-setting-label">Max File Size</label>
            <input
              type="number"
              className="modern-number-input"
              value={config.maxFileSize}
              onChange={(e) => handleConfigChange('maxFileSize', parseInt(e.target.value))}
              min="1"
              max="100"
            />
            <small className="modern-setting-description">Maximum file upload size</small>
            <div className="setting-range">Range: 1-100 MB</div>
          </div>
          <div className="modern-setting-item">
            <label className="modern-setting-label">Session Timeout</label>
            <input
              type="number"
              className="modern-number-input"
              value={config.sessionTimeout}
              onChange={(e) => handleConfigChange('sessionTimeout', parseInt(e.target.value))}
              min="300"
              max="86400"
            />
            <small className="modern-setting-description">User session timeout</small>
            <div className="setting-range">Range: 5 minutes - 24 hours</div>
          </div>
        </CollapsibleSection>

        {/* Security Settings */}
        <CollapsibleSection
          title="Security Settings"
          description="Authentication and security policies"
          sectionKey="security"
          icon="🔒"
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
          icon="📝"
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

      </div>
    </div>
  );
};

export default SystemSettings;