import React, { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '../utils/authCompat';

export interface NotificationPreferences {
  statusUpdates: boolean;
  caseCreated: boolean;
  caseAmended: boolean;
  orderProcessed: boolean;
  orderDelivered: boolean;
  orderReceived: boolean;
  caseCompleted: boolean;
  toBeBilled: boolean;
  systemAlerts: boolean;
  reminderNotifications: boolean;
  sound: boolean;
  desktop: boolean;
}

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultPreferences: NotificationPreferences = {
  statusUpdates: true,
  caseCreated: true,
  caseAmended: true,
  orderProcessed: true,
  orderDelivered: true,
  orderReceived: true,
  caseCompleted: true,
  toBeBilled: true,
  systemAlerts: true,
  reminderNotifications: true,
  sound: true,
  desktop: false
};

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ isOpen, onClose }) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [currentUser] = useState(getCurrentUser());
  const modalRef = useRef<HTMLDivElement>(null);

  // Load saved preferences using secure storage
  useEffect(() => {
    if (currentUser) {
      const loadPreferences = async () => {
        try {
          const { SafeStorage } = await import('../utils/secureDataManager');
          const { STORAGE_KEYS } = await import('../constants/secureStorage');

          const savedPreferences = await SafeStorage.getItem(`${STORAGE_KEYS.USER_PREFERENCES}_notifications_${currentUser.id}`);
          if (savedPreferences) {
            setPreferences({ ...defaultPreferences, ...savedPreferences });
          }
        } catch (error) {
          // // // console.error('Error loading notification preferences:', error);
        }
      };

      loadPreferences();
    }
  }, [currentUser]);

  // Handle ESC key and click outside to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Save preferences using secure storage
  const savePreferences = async (newPreferences: NotificationPreferences) => {
    if (currentUser) {
      try {
        const { SafeStorage } = await import('../utils/secureDataManager');
        const { STORAGE_KEYS } = await import('../constants/secureStorage');

        await SafeStorage.setItem(`${STORAGE_KEYS.USER_PREFERENCES}_notifications_${currentUser.id}`, newPreferences);
        setPreferences(newPreferences);
      } catch (error) {
        // // // console.error('Error saving notification preferences:', error);
      }
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    savePreferences(newPreferences);
  };

  const handleSelectAll = () => {
    const allEnabled: NotificationPreferences = {
      statusUpdates: true,
      caseCreated: true,
      caseAmended: true,
      orderProcessed: true,
      orderDelivered: true,
      orderReceived: true,
      caseCompleted: true,
      toBeBilled: true,
      systemAlerts: true,
      reminderNotifications: true,
      sound: true,
      desktop: true
    };
    savePreferences(allEnabled);
  };

  const handleSelectNone = () => {
    const allDisabled: NotificationPreferences = {
      statusUpdates: false,
      caseCreated: false,
      caseAmended: false,
      orderProcessed: false,
      orderDelivered: false,
      orderReceived: false,
      caseCompleted: false,
      toBeBilled: false,
      systemAlerts: false,
      reminderNotifications: false,
      sound: false,
      desktop: false
    };
    savePreferences(allDisabled);
  };

  const handleResetToDefault = () => {
    savePreferences(defaultPreferences);
  };

  if (!isOpen) return null;

  return (
    <div className="notification-settings-overlay">
      <div className="notification-settings-modal" ref={modalRef}>
        <div className="notification-settings-header">
          <h2>🔔 Notification Settings</h2>
          <button
            className="btn btn-outline-secondary btn-sm close-settings-button"
            onClick={onClose}
            title="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="notification-settings-content">
          {/* Quick Actions */}
          <div className="settings-quick-actions">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={handleSelectAll}
            >
              ✅ Enable All
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={handleSelectNone}
            >
              ❌ Disable All
            </button>
            <button
              className="btn btn-outline-warning btn-sm"
              onClick={handleResetToDefault}
            >
              🔄 Reset to Default
            </button>
          </div>

          {/* Workflow Notifications */}
          <div className="settings-section">
            <h3>📋 Workflow Notifications</h3>
            <div className="settings-group">
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={preferences.statusUpdates}
                  onChange={(e) => handlePreferenceChange('statusUpdates', e.target.checked)}
                />
                <span className="setting-label">
                  <span className="setting-title">Status Updates</span>
                  <span className="setting-description">Receive notifications when case statuses change</span>
                </span>
              </label>

              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={preferences.caseCreated}
                  onChange={(e) => handlePreferenceChange('caseCreated', e.target.checked)}
                />
                <span className="setting-label">
                  <span className="setting-title">Case Created</span>
                  <span className="setting-description">New case bookings in your departments</span>
                </span>
              </label>

              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={preferences.caseAmended}
                  onChange={(e) => handlePreferenceChange('caseAmended', e.target.checked)}
                />
                <span className="setting-label">
                  <span className="setting-title">Case Amended</span>
                  <span className="setting-description">Case details have been modified</span>
                </span>
              </label>

              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={preferences.orderProcessed}
                  onChange={(e) => handlePreferenceChange('orderProcessed', e.target.checked)}
                />
                <span className="setting-label">
                  <span className="setting-title">Order Processed</span>
                  <span className="setting-description">Orders have been prepared</span>
                </span>
              </label>

              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={preferences.orderDelivered}
                  onChange={(e) => handlePreferenceChange('orderDelivered', e.target.checked)}
                />
                <span className="setting-label">
                  <span className="setting-title">Order Delivered</span>
                  <span className="setting-description">Orders delivered to hospitals</span>
                </span>
              </label>

              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={preferences.orderReceived}
                  onChange={(e) => handlePreferenceChange('orderReceived', e.target.checked)}
                />
                <span className="setting-label">
                  <span className="setting-title">Order Received</span>
                  <span className="setting-description">Orders confirmed at hospitals</span>
                </span>
              </label>

              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={preferences.caseCompleted}
                  onChange={(e) => handlePreferenceChange('caseCompleted', e.target.checked)}
                />
                <span className="setting-label">
                  <span className="setting-title">Case Completed</span>
                  <span className="setting-description">Surgical procedures completed</span>
                </span>
              </label>

              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={preferences.toBeBilled}
                  onChange={(e) => handlePreferenceChange('toBeBilled', e.target.checked)}
                />
                <span className="setting-label">
                  <span className="setting-title">Ready for Billing</span>
                  <span className="setting-description">Cases ready for invoicing</span>
                </span>
              </label>
            </div>
          </div>

          {/* System Notifications */}
          <div className="settings-section">
            <h3>⚙️ System Notifications</h3>
            <div className="settings-group">
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={preferences.systemAlerts}
                  onChange={(e) => handlePreferenceChange('systemAlerts', e.target.checked)}
                />
                <span className="setting-label">
                  <span className="setting-title">System Alerts</span>
                  <span className="setting-description">Important system messages and updates</span>
                </span>
              </label>

              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={preferences.reminderNotifications}
                  onChange={(e) => handlePreferenceChange('reminderNotifications', e.target.checked)}
                />
                <span className="setting-label">
                  <span className="setting-title">Reminder Notifications</span>
                  <span className="setting-description">Upcoming surgery reminders and deadlines</span>
                </span>
              </label>
            </div>
          </div>

          {/* Notification Methods */}
          <div className="settings-section">
            <h3>🔊 Notification Methods</h3>
            <div className="settings-group">
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={preferences.sound}
                  onChange={(e) => handlePreferenceChange('sound', e.target.checked)}
                />
                <span className="setting-label">
                  <span className="setting-title">Sound Alerts</span>
                  <span className="setting-description">Play audio when notifications arrive</span>
                </span>
              </label>

              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={preferences.desktop}
                  onChange={(e) => handlePreferenceChange('desktop', e.target.checked)}
                />
                <span className="setting-label">
                  <span className="setting-title">Desktop Notifications</span>
                  <span className="setting-description">Show browser desktop notifications</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="notification-settings-footer">
          <p className="settings-note">
            💡 Tip: You can customize which notifications you receive to reduce noise and stay focused.
          </p>
          <button
            className="btn btn-primary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;