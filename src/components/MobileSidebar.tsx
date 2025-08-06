import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import NotificationBell from './NotificationBell';
import Settings from './Settings';
import '../assets/components/MobileSidebar.css';

type ActivePage = 'booking' | 'cases' | 'process' | 'users' | 'sets' | 'reports' | 'calendar' | 'permissions' | 'codetables' | 'audit-logs' | 'email-config' | 'backup-restore' | 'data-import' | 'system-settings';

interface MobileSidebarProps {
  user: User;
  onLogout: () => void;
  adminPanelExpanded: boolean;
  setAdminPanelExpanded: (expanded: boolean) => void;
  setActivePage: (page: ActivePage) => void;
  onPlaySound: () => void;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({
  user,
  onLogout,
  adminPanelExpanded,
  setAdminPanelExpanded,
  setActivePage,
  onPlaySound
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleMouseDown = (event: MouseEvent) => handleClickOutside(event);
    const handleTouchStart = (event: TouchEvent) => handleClickOutside(event);

    if (isOpen) {
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('touchstart', handleTouchStart);
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isOpen]);

  const hasAdminAccess = (user: User) => {
    return user.role === 'admin' || user.role === 'it';
  };

  return (
    <>
      {/* Mobile Menu Trigger */}
      <button
        className="mobile-sidebar-trigger"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* Sidebar Overlay */}
      {isOpen && <div className="mobile-sidebar-overlay" onClick={() => setIsOpen(false)} />}

      {/* Sidebar */}
      <div ref={sidebarRef} className={`mobile-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="mobile-sidebar-header">
          <div className="user-avatar">
            <span className="avatar-icon">👤</span>
          </div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-role">
              <span className={`role-badge ${user.role}`}>
                {user.role.replace('-', ' ').toUpperCase()}
              </span>
            </div>
            {user.selectedCountry && (
              <div className="user-country">
                <span className="country-badge">{user.selectedCountry}</span>
              </div>
            )}
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="mobile-sidebar-content">
          {/* User Actions */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">Account</div>
            <div className="sidebar-actions">
              <div 
                className="sidebar-action-item"
                onClick={(e) => {
                  e.preventDefault();
                  const bellElement = e.currentTarget.querySelector('.notification-bell button');
                  if (bellElement) {
                    (bellElement as HTMLButtonElement).click();
                  }
                }}
              >
                <NotificationBell />
                <span>Notifications</span>
              </div>
              <div 
                className="sidebar-action-item"
                onClick={(e) => {
                  e.preventDefault();
                  const settingsElement = e.currentTarget.querySelector('.settings-button');
                  if (settingsElement) {
                    (settingsElement as HTMLButtonElement).click();
                  }
                }}
              >
                <Settings />
                <span>Settings</span>
              </div>
            </div>
          </div>

          {/* Admin Panel */}
          {hasAdminAccess(user) && (
            <div className="sidebar-section">
              <div className="sidebar-section-title">Administration</div>
              <button
                className="sidebar-admin-toggle"
                onClick={() => setAdminPanelExpanded(!adminPanelExpanded)}
              >
                <span className="admin-icon">👑</span>
                <span>Admin Panel</span>
                <span className={`chevron ${adminPanelExpanded ? 'down' : 'right'}`}>
                  {adminPanelExpanded ? '▼' : '▶'}
                </span>
              </button>

              {adminPanelExpanded && (
                <div className="sidebar-admin-menu">
                  {hasPermission(user.role, PERMISSION_ACTIONS.SYSTEM_SETTINGS) && (
                    <button
                      onClick={() => {
                        setActivePage('system-settings');
                        onPlaySound();
                        setIsOpen(false);
                      }}
                      className="sidebar-admin-item"
                    >
                      ⚙️ System Settings
                    </button>
                  )}
                  {hasPermission(user.role, PERMISSION_ACTIONS.CODE_TABLE_SETUP) && (
                    <button
                      onClick={() => {
                        setActivePage('codetables');
                        onPlaySound();
                        setIsOpen(false);
                      }}
                      className="sidebar-admin-item"
                    >
                      📊 Code Table Setup
                    </button>
                  )}
                  {hasPermission(user.role, PERMISSION_ACTIONS.PERMISSION_MATRIX) && (
                    <button
                      onClick={() => {
                        setActivePage('permissions');
                        onPlaySound();
                        setIsOpen(false);
                      }}
                      className="sidebar-admin-item"
                    >
                      🔐 Permissions
                    </button>
                  )}
                  {hasPermission(user.role, PERMISSION_ACTIONS.EMAIL_CONFIG) && (
                    <button
                      onClick={() => {
                        setActivePage('email-config');
                        onPlaySound();
                        setIsOpen(false);
                      }}
                      className="sidebar-admin-item"
                    >
                      📧 Email Configuration
                    </button>
                  )}
                  {hasPermission(user.role, PERMISSION_ACTIONS.VIEW_USERS) && (
                    <button
                      onClick={() => {
                        setActivePage('users');
                        onPlaySound();
                        setIsOpen(false);
                      }}
                      className="sidebar-admin-item"
                    >
                      👥 User Management
                    </button>
                  )}
                  {hasPermission(user.role, PERMISSION_ACTIONS.AUDIT_LOGS) && (
                    <button
                      onClick={() => {
                        setActivePage('audit-logs');
                        onPlaySound();
                        setIsOpen(false);
                      }}
                      className="sidebar-admin-item"
                    >
                      📊 Audit Logs
                    </button>
                  )}
                  {hasPermission(user.role, PERMISSION_ACTIONS.BACKUP_RESTORE) && (
                    <button
                      onClick={() => {
                        setActivePage('backup-restore');
                        onPlaySound();
                        setIsOpen(false);
                      }}
                      className="sidebar-admin-item"
                    >
                      💾 Backup & Restore
                    </button>
                  )}
                  {hasPermission(user.role, PERMISSION_ACTIONS.IMPORT_DATA) && (
                    <button
                      onClick={() => {
                        setActivePage('data-import');
                        onPlaySound();
                        setIsOpen(false);
                      }}
                      className="sidebar-admin-item"
                    >
                      📥 Data Import
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Logout */}
          <div className="sidebar-section">
            <button
              className="sidebar-logout-btn"
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
            >
              <span className="logout-icon">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;