import React, { useState, useRef, useEffect } from 'react';
import { useSound } from '../contexts/SoundContext';
import { useToast } from './ToastContainer';

const Settings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isEnabled, volume, toggleSound, setVolume, playSound } = useSound();
  const { showSuccess } = useToast();
  const settingsRef = useRef<HTMLDivElement>(null);
  const [tempVolume, setTempVolume] = useState(volume);

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

  // ESC key support
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
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
    playSound.success();
    showSuccess('Settings Reset', 'All settings have been restored to defaults');
  };

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
                  className={`btn btn-secondary btn-sm toggle-switch ${isEnabled ? 'enabled' : 'disabled'}`}
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
                  <small>Show desktop notifications (if supported)</small>
                </div>
                <div className="notification-control">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                    onClick={() => {
                      // Disabled functionality
                      playSound.click();
                    }}
                  >
                    Disabled
                  </button>
                </div>
              </div>
            </div>

            {/* App Information Section */}
            <div className="settings-section">
              <h4>ℹ️ Application Info</h4>
              
              <div className="settings-item">
                <div className="app-info">
                  <div className="info-row">
                    <span>Version:</span>
                    <span>1.0.0</span>
                  </div>
                  <div className="info-row">
                    <span>Last Updated:</span>
                    <span>December 2024</span>
                  </div>
                  <div className="info-row">
                    <span>Build:</span>
                    <span>Production</span>
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