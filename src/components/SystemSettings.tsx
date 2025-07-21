/**
 * SystemSettings Component - System configuration and settings
 * Handles application configuration, performance settings, and system preferences
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { useToast } from './ToastContainer';
import { useModal } from '../hooks/useModal';
import CustomModal from './CustomModal';
import { 
  SystemConfig, 
  getSystemConfig, 
  saveSystemConfig, 
  resetSystemConfig,
  getSystemHealth,
  applySystemConfig
} from '../utils/systemSettingsService';
import '../assets/components/AdminComponents.css';

const SystemSettings: React.FC = () => {
  const currentUser = getCurrentUser();
  const { showSuccess, showError } = useToast();
  const { modal, closeModal, showConfirm } = useModal();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [systemHealth, setSystemHealth] = useState<{
    status: 'healthy' | 'warning' | 'error';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
    }>;
  } | null>(null);

  // Check permissions
  const canManageSettings = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.SYSTEM_SETTINGS) : false;

  const loadSystemConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load system configuration from service
      const loadedConfig = await getSystemConfig();
      setConfig(loadedConfig);
      setOriginalConfig({ ...loadedConfig });
      
      // Load system health
      const health = await getSystemHealth();
      setSystemHealth(health);
      
      // System configuration loaded successfully
    } catch (error) {
      console.error('Failed to load system configuration:', error);
      showError('Load Failed', 'Failed to load system configuration');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    // Load system configuration
    loadSystemConfig();
  }, [loadSystemConfig]);

  useEffect(() => {
    // Check if there are unsaved changes
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
      // Save system configuration using service
      await saveSystemConfig(config);
      
      // Apply configuration changes
      await applySystemConfig(config);
      
      setOriginalConfig({ ...config });
      showSuccess('Settings Saved', 'System configuration has been updated successfully');
    } catch (error) {
      console.error('Failed to save system configuration:', error);
      showError('Save Failed', 'Failed to save system configuration');
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
          const defaultConfig = await resetSystemConfig();
          setConfig(defaultConfig);
          setOriginalConfig({ ...defaultConfig });
          showSuccess('Settings Reset', 'Configuration has been reset to default values');
        } catch (error) {
          console.error('Failed to reset configuration:', error);
          showError('Reset Failed', 'Failed to reset configuration');
        }
      }
    );
  };

  const handleTestNotification = () => {
    showSuccess('Test Notification', 'This is a test notification from the system');
  };

  if (!canManageSettings) {
    return (
      <div className="permission-denied">
        <div className="permission-denied-content">
          <h2>🚫 Access Denied</h2>
          <p>You don't have permission to access system settings.</p>
          <p>Contact your system administrator for access.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h2>System Settings</h2>
          <p>Loading system configuration...</p>
        </div>
        <div className="admin-section">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading system settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h2>System Settings</h2>
          <p>Failed to load system configuration</p>
        </div>
        <div className="admin-section">
          <div className="error-message">
            <p>Unable to load system configuration. Please try refreshing the page.</p>
            <button onClick={loadSystemConfig} className="btn btn-primary">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
          <button
            onClick={handleResetConfig}
            className="btn btn-outline-secondary btn-lg"
          >
            Reset
          </button>
        </div>
      </div>

      {/* System Health Status */}
      {systemHealth && (
        <div className="admin-section">
          <div className="section-header">
            <h3>System Health</h3>
            <p>Current system status and health checks</p>
          </div>
          <div className={`health-status ${systemHealth.status}`}>
            <div className="health-indicator">
              <span className={`status-icon ${systemHealth.status}`}>
                {systemHealth.status === 'healthy' ? '✅' : 
                 systemHealth.status === 'warning' ? '⚠️' : '❌'}
              </span>
              <span className="status-text">
                System is {systemHealth.status}
              </span>
            </div>
            <div className="health-checks">
              {systemHealth.checks.map((check, index) => (
                <div key={index} className={`health-check ${check.status}`}>
                  <span className="check-icon">
                    {check.status === 'pass' ? '✅' : 
                     check.status === 'warn' ? '⚠️' : '❌'}
                  </span>
                  <span className="check-name">{check.name}</span>
                  <span className="check-message">{check.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="admin-section">
        <div className="section-header">
          <h3>Application Settings</h3>
          <p>General application configuration</p>
        </div>
        <div className="settings-grid">
          <div className="setting-item">
            <label>Application Name</label>
            <input
              type="text"
              value={config.appName}
              onChange={(e) => handleConfigChange('appName', e.target.value)}
            />
          </div>
          <div className="setting-item">
            <label>Version</label>
            <input
              type="text"
              value={config.appVersion}
              disabled
              title="Version is read-only"
            />
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
        </div>
      </div>

      <div className="admin-section">
        <div className="section-header">
          <h3>Performance Settings</h3>
          <p>Application performance and caching options</p>
        </div>
        <div className="settings-grid">
          <div className="setting-item">
            <label>Cache Timeout (seconds)</label>
            <input
              type="number"
              value={config.cacheTimeout}
              onChange={(e) => handleConfigChange('cacheTimeout', parseInt(e.target.value))}
              min="60"
              max="3600"
            />
            <small>How long to cache data before refreshing</small>
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
            <small>Maximum allowed file upload size</small>
          </div>
          <div className="setting-item">
            <label>Session Timeout (seconds)</label>
            <input
              type="number"
              value={config.sessionTimeout}
              onChange={(e) => handleConfigChange('sessionTimeout', parseInt(e.target.value))}
              min="900"
              max="86400"
            />
            <small>Automatically log out users after inactivity</small>
          </div>
        </div>
      </div>

      <div className="admin-section">
        <div className="section-header">
          <h3>Security Settings</h3>
          <p>Security and authentication preferences</p>
        </div>
        <div className="settings-grid">
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={config.passwordComplexity}
                onChange={(e) => handleConfigChange('passwordComplexity', e.target.checked)}
              />
              Enforce Password Complexity
            </label>
            <small>Require strong passwords with special characters</small>
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
            <small>Require 2FA for admin users</small>
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
            <small>How long to keep audit logs</small>
          </div>
        </div>
      </div>

      <div className="admin-section">
        <div className="section-header">
          <h3>Amendment Settings</h3>
          <p>Configure case amendment policies and time limits</p>
        </div>
        <div className="settings-grid">
          <div className="setting-item">
            <label>Amendment Time Limit (hours)</label>
            <input
              type="number"
              value={config.amendmentTimeLimit}
              onChange={(e) => handleConfigChange('amendmentTimeLimit', parseInt(e.target.value))}
              min="1"
              max="168"
            />
            <small>Time limit for amendments after case creation (1-168 hours)</small>
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
        </div>
      </div>

      <div className="admin-section">
        <div className="section-header">
          <h3>Notification Settings</h3>
          <p>Configure system notifications and alerts</p>
        </div>
        <div className="settings-grid">
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
            <small>Show system alerts and warnings</small>
          </div>
          <div className="setting-item">
            <button
              onClick={handleTestNotification}
              className="btn btn-outline-secondary btn-sm"
            >
              Test Notification
            </button>
            <small>Send a test notification</small>
          </div>
        </div>
      </div>

      <div className="admin-section">
        <div className="section-header">
          <h3>Database Settings</h3>
          <p>Database backup and maintenance options</p>
        </div>
        <div className="settings-grid">
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
            <small>How often to automatically backup database</small>
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={config.autoCleanup}
                onChange={(e) => handleConfigChange('autoCleanup', e.target.checked)}
              />
              Auto Cleanup
            </label>
            <small>Automatically clean up old data</small>
          </div>
        </div>
      </div>

      <div className="admin-section">
        <div className="section-header">
          <h3>User Interface Settings</h3>
          <p>Customize the look and feel of the application</p>
        </div>
        <div className="settings-grid">
          <div className="setting-item">
            <label>Default Theme</label>
            <select
              value={config.defaultTheme}
              onChange={(e) => handleConfigChange('defaultTheme', e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
            <small>Choose your preferred color scheme</small>
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
            <small>Default language for new users</small>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="unsaved-changes-warning">
          ⚠️ You have unsaved changes. Don't forget to save your configuration.
        </div>
      )}

      <CustomModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        actions={modal.type === 'confirm' ? [
          {
            label: 'Cancel',
            onClick: closeModal,
            style: 'secondary'
          },
          {
            label: modal.title.includes('Reset') ? 'Reset' : 'Save',
            onClick: modal.onConfirm || closeModal,
            style: modal.title.includes('Reset') ? 'danger' : 'primary'
          }
        ] : undefined}
      />
    </div>
  );
};

export default SystemSettings;