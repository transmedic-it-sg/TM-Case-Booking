/**
 * Push Notification Settings Component
 * Allows users to manage their push notification preferences
 */

import React, { useState, useEffect } from 'react';
import { pushNotificationService, isPushNotificationSupported, getNotificationPermission } from '../services/pushNotificationService';
import { useToast } from './ToastContainer';

interface PushNotificationSettingsProps {
  onClose?: () => void;
  embedded?: boolean; // If true, renders without modal wrapper
}

const PushNotificationSettings: React.FC<PushNotificationSettingsProps> = ({
  onClose,
  embedded = false
}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasTestedNotification, setHasTestedNotification] = useState(false);

  const { showSuccess, showError, showWarning, showInfo } = useToast();

  // Check initial status
  useEffect(() => {
    checkNotificationStatus();
  }, []);

  // Listen for case highlight events (from notification clicks)
  useEffect(() => {
    const handleHighlightCase = (event: CustomEvent) => {
      const { caseId } = event.detail;
      showInfo('Navigation', `Highlighting case: ${caseId}`);
      // Here you could integrate with your app's state management to highlight the case
    };

    window.addEventListener('highlightCase', handleHighlightCase as EventListener);
    return () => {
      window.removeEventListener('highlightCase', handleHighlightCase as EventListener);
    };
  }, [showInfo]);

  const checkNotificationStatus = () => {
    setIsSupported(isPushNotificationSupported());
    setPermission(getNotificationPermission());

    const status = pushNotificationService.getSubscriptionStatus();
    setIsSubscribed(status);
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const subscription = await pushNotificationService.subscribeToPush();
      if (subscription) {
        setIsSubscribed(true);
        setPermission('granted');
        showSuccess('Notifications Enabled', 'You will now receive push notifications for case updates');
      } else {
        showError('Enable Failed', 'Failed to enable push notifications. Please check your browser settings.');
      }
    } catch (error) {
      // // // console.error('Error enabling notifications:', error);
      showError('Enable Failed', 'An error occurred while enabling notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    try {
      const success = await pushNotificationService.unsubscribeFromPush();
      if (success) {
        setIsSubscribed(false);
        showSuccess('Notifications Disabled', 'You will no longer receive push notifications');
      } else {
        showError('Disable Failed', 'Failed to disable push notifications');
      }
    } catch (error) {
      // // // console.error('Error disabling notifications:', error);
      showError('Disable Failed', 'An error occurred while disabling notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await pushNotificationService.sendTestNotification();
      setHasTestedNotification(true);
      showInfo('Test Sent', 'Check for the test notification on your device');
    } catch (error) {
      // // // console.error('Error sending test notification:', error);
      showError('Test Failed', 'Failed to send test notification');
    }
  };

  const getPermissionStatusText = () => {
    switch (permission) {
      case 'granted':
        return { text: 'Granted', color: '#28a745', icon: '✅' };
      case 'denied':
        return { text: 'Denied', color: '#dc3545', icon: '❌' };
      default:
        return { text: 'Not requested', color: '#6c757d', icon: '❓' };
    }
  };

  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome')) {
      return 'Chrome: Click the 🔒 icon in the address bar → Notifications → Allow';
    } else if (userAgent.includes('firefox')) {
      return 'Firefox: Click the shield icon → Keep Blocking or Allow';
    } else if (userAgent.includes('safari')) {
      return 'Safari: Safari menu → Preferences → Websites → Notifications → Allow';
    } else if (userAgent.includes('edge')) {
      return 'Edge: Click the 🔒 icon in the address bar → Notifications → Allow';
    }
    return 'Check your browser settings to allow notifications for this site';
  };

  const renderContent = () => (
    <div className="push-notification-settings">
      <div className="settings-header">
        <h3>📱 Push Notifications</h3>
        <p>Get notified about case status updates on your mobile device</p>
      </div>

      <div className="settings-content">
        {/* Browser Support Check */}
        <div className="setting-section">
          <div className="setting-item">
            <span className="setting-label">Browser Support:</span>
            <span className={`setting-value ${isSupported ? 'supported' : 'not-supported'}`}>
              {isSupported ? '✅ Supported' : '❌ Not Supported'}
            </span>
          </div>
        </div>

        {isSupported && (
          <>
            {/* Permission Status */}
            <div className="setting-section">
              <div className="setting-item">
                <span className="setting-label">Permission:</span>
                <span
                  className="setting-value"
                  style={{ color: getPermissionStatusText().color }}
                >
                  {getPermissionStatusText().icon} {getPermissionStatusText().text}
                </span>
              </div>
            </div>

            {/* Subscription Status */}
            <div className="setting-section">
              <div className="setting-item">
                <span className="setting-label">Status:</span>
                <span className={`setting-value ${isSubscribed ? 'subscribed' : 'not-subscribed'}`}>
                  {isSubscribed ? '🔔 Active' : '🔕 Inactive'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="setting-actions">
              {!isSubscribed ? (
                <button
                  className="btn btn-primary"
                  onClick={handleEnableNotifications}
                  disabled={isLoading || permission === 'denied'}
                >
                  {isLoading ? '⏳ Enabling...' : '🔔 Enable Notifications'}
                </button>
              ) : (
                <div className="subscribed-actions">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={handleTestNotification}
                    disabled={isLoading}
                  >
                    🧪 Send Test
                  </button>
                  <button
                    className="btn btn-outline-danger"
                    onClick={handleDisableNotifications}
                    disabled={isLoading}
                  >
                    {isLoading ? '⏳ Disabling...' : '🔕 Disable'}
                  </button>
                </div>
              )}
            </div>

            {/* Permission Denied Help */}
            {permission === 'denied' && (
              <div className="help-section denied-help">
                <h4>🚫 Notifications Blocked</h4>
                <p>To enable notifications, you need to allow them in your browser settings:</p>
                <p className="browser-instructions">{getBrowserInstructions()}</p>
                <p><small>After changing settings, refresh this page and try again.</small></p>
              </div>
            )}

            {/* Success Message */}
            {isSubscribed && (
              <div className="help-section success-help">
                <h4>🎉 You're all set!</h4>
                <p>You'll receive notifications for:</p>
                <ul>
                  <li>Case status changes</li>
                  <li>New case assignments</li>
                  <li>Delivery confirmations</li>
                  <li>System alerts</li>
                </ul>
                {hasTestedNotification && (
                  <p><small>✨ Test notification sent! Check your notification panel.</small></p>
                )}
              </div>
            )}

            {/* Mobile Tips */}
            <div className="help-section mobile-tips">
              <h4>📱 Mobile Tips</h4>
              <ul>
                <li>Add this site to your home screen for a better experience</li>
                <li>Enable notifications in your device settings</li>
                <li>Notifications work even when the browser is closed</li>
                <li>Tap notifications to open the app directly</li>
              </ul>
            </div>
          </>
        )}

        {/* Not Supported Help */}
        {!isSupported && (
          <div className="help-section not-supported-help">
            <h4>⚠️ Browser Not Supported</h4>
            <p>Push notifications are not supported in your current browser. For the best experience, please use:</p>
            <ul>
              <li>Chrome (recommended)</li>
              <li>Firefox</li>
              <li>Edge</li>
              <li>Safari (iOS 16.4+)</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return renderContent();
  }

  return (
    <div className="push-notification-modal">
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <button className="close-button" onClick={onClose}>✕</button>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PushNotificationSettings);