import React, { useState, useRef, useEffect } from 'react';
import { useSound } from '../contexts/SoundContext';
import { useToast } from './ToastContainer';
import packageJson from '../../package.json';
import { getCacheVersion } from '../utils/version';

const Settings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isEnabled, volume, toggleSound, setVolume, playSound } = useSound();
  const { showSuccess } = useToast();
  const settingsRef = useRef<HTMLDivElement>(null);
  const [tempVolume, setTempVolume] = useState(volume);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ESC key support for settings dropdown
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Sync temp volume with actual volume when settings open
  useEffect(() => {
    if (isOpen) {
      setTempVolume(volume);
    }
  }, [isOpen, volume]);

  const handleSettingsClick = () => {
    setIsOpen(!isOpen);
    playSound.click();
  };

  const handleSoundToggle = () => {
    toggleSound();
    playSound.click();
    const newState = !isEnabled; // Since toggle will flip the state
    showSuccess(
      newState ? 'Sounds Enabled' : 'Sounds Disabled',
      newState ? 'You will now hear audio feedback for actions' : 'Audio feedback has been disabled'
    );
  };

  const handleVolumeChange = (newVolume: number) => {
    setTempVolume(newVolume);
    setVolume(newVolume);
    // Play a test sound when adjusting volume
    if (isEnabled) {
      playSound.click();
    }
  };

  const testSound = () => {
    playSound.notification();
    showSuccess('Sound Test', 'This is how notifications will sound');
  };

  const resetSettings = () => {
    setVolume(0.5);
    setTempVolume(0.5);
    if (!isEnabled) {
      toggleSound();
    }
    // Reset notifications
    setNotificationsEnabled(false);
    localStorage.removeItem('notifications-enabled');
    
    playSound.success();
    showSuccess('Settings Reset', 'All settings have been restored to defaults');
  };

  const handleNotificationToggle = async () => {
    if (!('Notification' in window)) {
      showSuccess('Not Supported', 'Browser notifications are not supported in this browser');
      return;
    }

    if (notificationPermission === 'denied') {
      showSuccess('Permission Denied', 'Notifications are blocked. Please enable them in your browser settings.');
      return;
    }

    if (notificationPermission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('notifications-enabled', 'true');
          showSuccess('Notifications Enabled', 'You will now receive browser notifications');
          
          // Show a test notification
          new Notification('Case Booking System', {
            body: 'Notifications are now enabled!',
            icon: '/favicon.ico'
          });
        } else {
          showSuccess('Permission Required', 'Please allow notifications to enable this feature');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        showSuccess('Error', 'Failed to request notification permission');
      }
    } else if (notificationPermission === 'granted') {
      const newState = !notificationsEnabled;
      setNotificationsEnabled(newState);
      localStorage.setItem('notifications-enabled', JSON.stringify(newState));
      
      if (newState) {
        showSuccess('Notifications Enabled', 'You will now receive browser notifications');
        // Show a test notification
        new Notification('Case Booking System', {
          body: 'Notifications are now enabled!',
          icon: '/favicon.ico'
        });
      } else {
        showSuccess('Notifications Disabled', 'Browser notifications have been disabled');
      }
    }
    
    playSound.click();
  };

  const testNotification = () => {
    if (!('Notification' in window)) {
      showSuccess('Not Supported', 'Browser notifications are not supported');
      return;
    }

    if (notificationPermission !== 'granted' || !notificationsEnabled) {
      showSuccess('Enable Notifications', 'Please enable notifications first');
      return;
    }

    new Notification('Test Notification', {
      body: 'This is a test notification from the Case Booking System',
      icon: '/favicon.ico',
      tag: 'test-notification'
    });
    
    playSound.notification();
    showSuccess('Test Sent', 'Test notification has been sent');
  };

  const getNotificationButtonText = () => {
    if (!('Notification' in window)) return 'Not Supported';
    if (notificationPermission === 'denied') return 'Blocked';
    if (notificationPermission === 'default') return 'Allow';
    return notificationsEnabled ? 'Enabled' : 'Disabled';
  };

  const getNotificationButtonClass = () => {
    if (!('Notification' in window) || notificationPermission === 'denied') {
      return 'btn btn-secondary btn-sm notification-disabled';
    }
    if (notificationPermission === 'granted' && notificationsEnabled) {
      return 'btn btn-success btn-sm';
    }
    return 'btn btn-primary btn-sm';
  };


  // Load notification settings and check browser support
  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      // Load saved notification preference
      const savedNotificationSetting = localStorage.getItem('notifications-enabled');
      if (savedNotificationSetting) {
        setNotificationsEnabled(JSON.parse(savedNotificationSetting));
      }
    }
  }, []);


  return (
    <div className="settings-container" ref={settingsRef}>
      <button
        className="btn btn-secondary btn-md settings-button"
        onClick={handleSettingsClick}
        title="Settings"
      >
        ⚙️
      </button>

      {isOpen && (
        <div className="settings-dropdown">
          <div className="settings-header">
            <h3>Settings</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="btn btn-secondary btn-sm settings-close"
              title="Close settings"
            >
              ✕
            </button>
          </div>

          <div className="settings-content">
            {/* Sound Settings Section */}
            <div className="settings-section">
              <h4>🔊 Sound Settings</h4>
              
              <div className="settings-item">
                <div className="settings-item-info">
                  <label>Enable Sounds</label>
                  <small>Play audio feedback for user actions</small>
                </div>
                <button
                  className={`toggle-switch ${isEnabled ? 'enabled' : 'disabled'}`}
                  onClick={handleSoundToggle}
                >
                  <span className="toggle-slider"></span>
                </button>
              </div>

              {isEnabled && (
                <>
                  <div className="settings-item">
                    <div className="settings-item-info">
                      <label>Volume</label>
                      <small>Adjust sound volume level</small>
                    </div>
                    <div className="volume-control">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={tempVolume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="volume-slider"
                      />
                      <span className="volume-percentage">
                        {Math.round(tempVolume * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="settings-item">
                    <button
                      onClick={testSound}
                      className="btn btn-info btn-md test-sound-button"
                    >
                      🎵 Test Sound
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Notification Settings Section */}
            <div className="settings-section">
              <h4>🔔 Notification Settings</h4>
              
              <div className="settings-item">
                <div className="settings-item-info">
                  <label>Browser Notifications</label>
                  <small>Show desktop notifications for important updates</small>
                </div>
              </div>
              <div className="settings-item">
                <div className="notification-control">
                  <button
                    className={getNotificationButtonClass()}
                    onClick={handleNotificationToggle}
                    disabled={!('Notification' in window) || notificationPermission === 'denied'}
                  >
                    {getNotificationButtonText()}
                  </button>
                </div>
              </div>
              
              {notificationsEnabled && notificationPermission === 'granted' && (
              <>
                <div className="settings-item">
                  <div className="settings-item-info">
                    <label>Notification Status</label>
                    <small>Your browser will show notifications for case updates</small>
                  </div>
                </div>
                <div className="settings-item">
                  <button
                    onClick={testNotification}
                    className="btn btn-info btn-sm"
                  >
                    🧪 Test Notification
                  </button>
                </div>
              </>
              )}
              
              {notificationPermission === 'denied' && (
                <div className="settings-item">
                  <div className="notification-blocked-info">
                    <small style={{ color: '#e74c3c' }}>
                      Notifications are blocked. To enable them:
                      <br />1. Click the lock icon in your browser's address bar
                      <br />2. Set Notifications to "Allow"
                      <br />3. Refresh this page
                    </small>
                  </div>
                </div>
              )}
            </div>

            {/* App Information Section */}
            <div className="settings-section">
              <h4>ℹ️ Application Info</h4>
              
              <div className="settings-item">
                <div className="app-info">
                  <div className="info-row">
                    <span>Version:</span>
                    <span>{packageJson.version}</span>
                  </div>
                  <div className="info-row">
                    <span>Cache Version:</span>
                    <span>{getCacheVersion()}</span>
                  </div>
                  <div className="info-row">
                    <span>Last Updated:</span>
                    <span>June 2025</span>
                  </div>
                  <div className="info-row">
                    <span>Build:</span>
                    <span>Staging</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="settings-section">
              <h4>🔧 Actions</h4>
              
              <div className="settings-actions">
                <button
                  onClick={resetSettings}
                  className="btn btn-warning btn-md reset-settings-button"
                >
                  🔄 Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
