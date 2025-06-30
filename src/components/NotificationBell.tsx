import React, { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useSound } from '../contexts/SoundContext';
import { formatDate } from '../utils/dateFormat';
import { getCurrentUser } from '../utils/auth';
import NotificationSettings from './NotificationSettings';
import './NotificationSettings.css';

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();
  const { playSound } = useSound();
  const bellRef = useRef<HTMLDivElement>(null);
  
  // All users can access notification settings
  const currentUser = getCurrentUser();
  const canViewNotifications = !!currentUser;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
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

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    playSound.click();
    
    // Mark all notifications as read when opening
    if (!isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  };

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
    playSound.click();
  };

  const handleClearNotification = useCallback((id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    clearNotification(id);
    playSound.click();
  }, [clearNotification, playSound]);

  const formatTimestamp = useCallback((timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return formatDate(notificationTime);
  }, []);

  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  }, []);

  const recentNotifications = useMemo(() => 
    notifications.slice(0, 10), 
    [notifications]
  );

  return (
    <div className="notification-bell-container" ref={bellRef}>
      <button
        className={`btn btn-outline-secondary btn-md notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={handleBellClick}
        title={`${unreadCount} unread notifications`}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-header-actions">
              {canViewNotifications && (
                <button
                  onClick={() => {
                    setShowSettings(true);
                    setIsOpen(false);
                    playSound.click();
                  }}
                  className="btn btn-outline-primary btn-sm settings-button"
                  title="Notification Settings"
                >
                  ⚙️ Settings
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    markAllAsRead();
                    playSound.click();
                  }}
                  className="btn btn-outline-secondary btn-sm mark-all-read-button"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <div className="no-notifications-icon">🔕</div>
                <p>No notifications yet</p>
                <small>You'll see important updates here</small>
              </div>
            ) : (
              recentNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''} ${notification.urgent ? 'urgent' : ''}`}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <div className="notification-content">
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-text">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">{formatTimestamp(notification.timestamp)}</div>
                    </div>
                    <button
                      className="btn btn-outline-secondary btn-sm notification-close"
                      onClick={(e) => handleClearNotification(notification.id, e)}
                      title="Clear notification"
                    >
                      ✕
                    </button>
                  </div>
                  {!notification.read && <div className="unread-indicator"></div>}
                </div>
              ))
            )}
          </div>

          {notifications.length > 10 && (
            <div className="notification-footer">
              <small>Showing 10 of {notifications.length} notifications</small>
            </div>
          )}
        </div>
      )}

      {/* Notification Settings Modal */}
      <NotificationSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default memo(NotificationBell);