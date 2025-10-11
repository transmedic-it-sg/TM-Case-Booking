import React, { useState, useEffect, useRef } from 'react';
import SupabaseLogin from './components/SupabaseLogin';
import MobileEntryPage from './components/MobileEntryPage';
import ErrorBoundary from './components/ErrorBoundary';
import CaseBookingForm from './components/CaseBookingForm';
import CasesList from './components/CasesList';
import ProcessOrderPage from './components/ProcessOrderPage';
import UserManagement from './components/UserManagement';
import EditSets from './components/EditSets';
import Reports from './components/Reports';
import BookingCalendar from './components/BookingCalendar';
import CodeTableSetup from './components/CodeTableSetup';
import WelcomePopup from './components/WelcomePopup';
import PermissionMatrixPage from './components/PermissionMatrixPage';
import AuditLogs from './components/AuditLogs';
import SimplifiedEmailConfig from './components/SimplifiedEmailConfig';
import DataExportImport from './components/DataExportImport';
import SystemSettings from './components/SystemSettings';
import LogoutConfirmation from './components/LogoutConfirmation';
import SSOCallback from './components/SSOCallback';
import { User, CaseBooking } from './types';
import { logout, validateSession } from './utils/auth';
import { supabase } from './lib/supabase';
import UserService from './services/userService';
import { hasPermission, PERMISSION_ACTIONS, initializePermissions } from './utils/permissions';
import { getSupabaseCodeTables } from './utils/supabaseCodeTableService';
import { auditLogout } from './utils/auditService';
import { SoundProvider, useSound } from './contexts/SoundContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { ToastProvider, useToast } from './components/ToastContainer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RealtimeProvider } from './components/RealtimeProvider';
import { getSystemConfig } from './utils/systemSettingsService';
// SafeStorage removed - using Supabase database for all data storage
import NotificationBell from './components/NotificationBell';
import Settings from './components/Settings';
import { initializeVersionManager, handleVersionUpdate, updateStoredAppVersion } from './utils/appVersionManager';
import VersionUpdatePopup from './components/VersionUpdatePopup';
import MobileNavigation from './components/MobileNavigation';
import MobileHeader from './components/MobileHeader';
import MaintenanceMode from './components/MaintenanceMode';
import DatabaseConnectionStatus from './components/DatabaseConnectionStatus';
import { initRefreshAnimations } from './utils/refreshAnimation';
import './assets/components/globals.css'; // CSS variables and utilities
import './assets/components/App.css';
import './assets/components/forms.css'; // Standardized form styling
import './assets/components/CodeTableSetup.css';
import './assets/components/AuditLogs.css';
import './assets/components/RefreshAnimation.css'; // Refresh button animations
import './assets/components/MobileNavigation.css';
import './assets/components/MobileHeader.css';
import './assets/components/MobileLayout.css';
import './assets/components/MobileComponents.css';
import './assets/components/MobileEntryPage.css';
import './assets/components/MobileOverrides.css'; // Load last for maximum specificity

type ActivePage = 'booking' | 'cases' | 'process' | 'users' | 'sets' | 'reports' | 'calendar' | 'permissions' | 'codetables' | 'audit-logs' | 'email-config' | 'data-import' | 'system-settings';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showMobileEntry, setShowMobileEntry] = useState(false);
  const [activePage, setActivePage] = useState<ActivePage>('booking');
  const [processingCase, setProcessingCase] = useState<CaseBooking | null>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({
    newPassword: '',
    confirmPassword: '',
    isChanging: false,
    error: ''
  });
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showVersionUpdatePopup, setShowVersionUpdatePopup] = useState(false);
  const [versionUpdateInfo, setVersionUpdateInfo] = useState<{currentVersion: string; previousVersion: string}>({currentVersion: '', previousVersion: ''});
  const [adminPanelExpanded, setAdminPanelExpanded] = useState(false);
  const [highlightedCaseId, setHighlightedCaseId] = useState<string | null>(null);
  const [maintenanceModeActive, setMaintenanceModeActive] = useState(false);
  const adminPanelRef = useRef<HTMLDivElement>(null);
  const { playSound } = useSound();
  const { addNotification } = useNotifications();
  const { showSuccess, showError, showWarning, showInfo } = useToast();


  // App version management with logout on version change - DYNAMIC VERSION TRACKING
  useEffect(() => {
    // Initialize refresh button animations
    initRefreshAnimations();
    
    // Re-initialize when page changes
    const animationInterval = setInterval(initRefreshAnimations, 1000);
    
    // Prevent double initialization in React Strict Mode
    if (window.versionCheckInProgress) {
      clearInterval(animationInterval);
      return;
    }

    window.versionCheckInProgress = true;

    // Handle async version check
    initializeVersionManager().then(versionCheck => {
      // Debug logging with current version
      // If app version or cache version changed, handle it
      const anyVersionChanged = versionCheck.versionChanged;

      if (anyVersionChanged) {
        let updateMessage = '🔄 ';
        const changes = [];

        if (versionCheck.versionChanged) {
          changes.push(`App version: ${versionCheck.storedVersion} → ${versionCheck.currentVersion}`);
        }

        updateMessage += changes.join(', ') + ' - clearing cache';
        
        // CRITICAL FIX: Update stored versions FIRST to prevent infinite loop
        updateStoredAppVersion().then(() => {
          if (versionCheck.userLoggedIn) {
            // Show popup for logged users
            setVersionUpdateInfo({
              currentVersion: versionCheck.currentVersion,
              previousVersion: versionCheck.storedVersion || 'Unknown'
            });
            setShowVersionUpdatePopup(true);
          } else {
            // For non-logged users, clear cache and reload immediately
            // Version tracking now in system_settings table, not localStorage

            // Version updates handled via database system_settings table
            // No sessionStorage clearing needed

            // Clear browser cache if possible
            if ('caches' in window) {
              caches.keys().then(names => {
                return Promise.all(names.map(name => caches.delete(name)));
              }).then(() => {
                // Force reload to get fresh content
                setTimeout(() => window.location.reload(), 500);
              }).catch(err => {
                // Force reload anyway
                setTimeout(() => window.location.reload(), 500);
              });
            } else {
              // No cache API support, just reload
              setTimeout(() => window.location.reload(), 500);
            }
          }
        });
      } else {
        // Normal version logging - ensure versions are stored
        updateStoredAppVersion();
      }
    }).catch(error => {
      // Version check failed silently
      window.versionCheckInProgress = false;
    });

    // Initialize UserService with existing user session if available
    const initializeUserService = async () => {
      try {
        const existingUser = await UserService.getCurrentUser();
        if (existingUser && !user) {
          setUser(existingUser);
        }
      } catch (error) {
        // No existing user session found
      }
    };

    initializeUserService();

    // Cleanup flag after initialization
    return () => {
      window.versionCheckInProgress = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - user state check is intentional initialization

  // Check maintenance mode status
  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const config = await getSystemConfig();
        setMaintenanceModeActive(config.maintenanceMode);
      } catch (error) {
        // Failed to check maintenance mode - continue silently
      }
    };

    checkMaintenanceMode();

    // Set up periodic check for maintenance mode changes
    const maintenanceCheckInterval = setInterval(checkMaintenanceMode, 30000); // Check every 30 seconds

    // Remove automatic session validation - the app uses custom auth
    // Session management should be handled by user activity, not periodic checks
    // This prevents unexpected logouts while users are actively working

    return () => {
      clearInterval(maintenanceCheckInterval);
    };
  }, []);

  // Set up global error handling listeners
  useEffect(() => {
    const handleToastEvent = (event: CustomEvent) => {
      const { type, message } = event.detail;
      const [title, ...messageParts] = message.split('\n\n');
      const detailMessage = messageParts.join('\n\n');

      switch (type) {
        case 'success':
          showSuccess(title, detailMessage || '');
          break;
        case 'error':
          showError(title, detailMessage || '');
          break;
        case 'warning':
          showWarning(title, detailMessage || '');
          break;
        case 'info':
          showInfo(title, detailMessage || '');
          break;
      }
    };

    const handleNotificationEvent = (event: CustomEvent) => {
      const { type, message } = event.detail;
      addNotification({
        type,
        title: type.charAt(0).toUpperCase() + type.slice(1),
        message
      });
    };

    window.addEventListener('showToast', handleToastEvent as EventListener);
    window.addEventListener('showNotification', handleNotificationEvent as EventListener);

    return () => {
      window.removeEventListener('showToast', handleToastEvent as EventListener);
      window.removeEventListener('showNotification', handleNotificationEvent as EventListener);
    };
  }, [showSuccess, showError, showWarning, showInfo, addNotification]);

  // Check if this is an SSO callback route after all hooks
  const isCallbackRoute = window.location.pathname === '/auth/callback' || window.location.search.includes('code=');

  // Check if this is a mobile device
  const isMobileDevice = () => {
    return window.innerWidth <= 1366 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  useEffect(() => {
    // Initialize code tables and permissions
    const initialize = async () => {
      try {
        // Initialize Supabase code tables instead of legacy localStorage
        await getSupabaseCodeTables();
        // Force refresh permissions on app startup to handle browser refresh scenarios
        await initializePermissions(true);

        const currentUser = UserService.getCurrentUserSync();
        if (currentUser) {
          // Validate session to prevent concurrent logins
          const isValidSession = await validateSession();
          if (isValidSession) {
            setUser(currentUser);
            // User is already logged in with valid session, no need to show mobile entry
          } else {
            // Invalid session, force logout
            // Invalid session detected, logging out user
            await logout();
            setUser(null);
            if (isMobileDevice()) {
              setShowMobileEntry(true);
            }
          }
        } else if (isMobileDevice()) {
          setShowMobileEntry(true); // Only show mobile entry if no user and on mobile
        }

        // DISABLED: Health monitoring causing infinite loops
      } catch (error) {
        // Still try to get current user even if initialization fails
        const currentUser = UserService.getCurrentUserSync();
        if (currentUser) {
          setUser(currentUser);
          // User is already logged in, no need to show mobile entry
        } else if (isMobileDevice()) {
          setShowMobileEntry(true); // Only show mobile entry if no user and on mobile
        }
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - user state is intentionally managed within

  // Mobile entry is handled in the initialization useEffect above

  // Close admin panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminPanelRef.current && !adminPanelRef.current.contains(event.target as Node) && adminPanelExpanded) {
        setAdminPanelExpanded(false);
      }
    };

    if (adminPanelExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [adminPanelExpanded]);

  // Return SSO callback component if needed (after all hooks)
  if (isCallbackRoute) {
    return <SSOCallback />;
  }

  const handleLogin = async (loggedInUser: User) => {
    // Synchronize UserService with authenticated user
    await UserService.setCurrentUser(loggedInUser);

    // Check if user has temporary password and needs to change it
    if (loggedInUser.isTemporaryPassword) {
      setUser(loggedInUser);
      setShowPasswordChangeModal(true);
      return;
    }

    setUser(loggedInUser);
    setShowWelcomePopup(true);
    setShowMobileEntry(false);

    // Refresh permissions cache for the new user to ensure correct permissions
    try {
      // Force refresh permissions on login to ensure fresh permissions
      await initializePermissions(true);
    } catch (error) {
      // Failed to refresh permissions on user login
    }

    playSound.success();
    showSuccess('Welcome back!', `You're now logged in as ${loggedInUser.name}`);
    addNotification({
      title: 'Successful Login',
      message: `Welcome back, ${loggedInUser.name}! You're logged in as ${loggedInUser.role}.`,
      type: 'success'
    });
  };

  const handleProceedToLogin = () => {
    setShowMobileEntry(false);
    playSound.click();
  };

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    return errors;
  };

  const handlePasswordChangeSubmit = async () => {
    if (!user) return;

    const { newPassword, confirmPassword } = passwordChangeData;

    // Validation
    const errors: string[] = [];

    if (!newPassword.trim()) {
      errors.push('New password is required');
    }

    if (!confirmPassword.trim()) {
      errors.push('Password confirmation is required');
    }

    if (newPassword !== confirmPassword) {
      errors.push('Passwords do not match');
    }

    const passwordErrors = validatePassword(newPassword);
    errors.push(...passwordErrors);

    if (errors.length > 0) {
      setPasswordChangeData(prev => ({
        ...prev,
        error: errors.join('. ')
      }));
      return;
    }

    // Change password
    setPasswordChangeData(prev => ({ ...prev, isChanging: true, error: '' }));

    try {
      const { updateSupabaseUserPassword } = await import('./utils/supabaseUserService');
      const success = await updateSupabaseUserPassword(user.id, newPassword);

      if (!success) {
        throw new Error('Failed to update password');
      }

      // Update user state to remove temporary password flag
      setUser(prev => prev ? { ...prev, isTemporaryPassword: false } : null);
      setShowPasswordChangeModal(false);
      setPasswordChangeData({
        newPassword: '',
        confirmPassword: '',
        isChanging: false,
        error: ''
      });
      setShowWelcomePopup(true);
      showSuccess('Password changed successfully!', 'Your password has been updated and you can now access the application.');

    } catch (error) {
      setPasswordChangeData(prev => ({
        ...prev,
        isChanging: false,
        error: 'Failed to change password. Please try again or contact support.'
      }));
    }
  };

  const handlePasswordChangeCancel = () => {
    setUser(null);
    setShowPasswordChangeModal(false);
    setPasswordChangeData({
      newPassword: '',
      confirmPassword: '',
      isChanging: false,
      error: ''
    });
  };

  const handleLogout = () => {
    setShowLogoutConfirmation(true);
  };

  const confirmLogout = async () => {
    // Add audit log for logout before clearing user
    if (user) {
      await auditLogout(user.name, user.id, user.role, user.selectedCountry);
    }

    await logout();

    // Clear UserService cache
    await UserService.logout();

    // Clear permissions cache on logout to prevent stale permissions for next user
    const { clearPermissionsCache } = await import('./utils/permissions');
    clearPermissionsCache();

    setUser(null);
    setActivePage('booking');
    setProcessingCase(null);
    setShowLogoutConfirmation(false);
    // On mobile, go directly to login instead of introduction page
    if (isMobileDevice()) {
      setShowMobileEntry(false);
    }
    playSound.click();
    showSuccess('Logged Out', 'You have been successfully logged out of the system');
  };

  const cancelLogout = () => {
    setShowLogoutConfirmation(false);
  };

  const handleVersionUpdateConfirm = async () => {
    setShowVersionUpdatePopup(false);
    await handleVersionUpdate();
  };

  const handleCaseSubmitted = () => {
    // Only change page to 'cases' if not currently on 'sets' page
    if (activePage !== 'sets') {
      setActivePage('cases');
    }
    playSound.submit();
    showSuccess('Case Submitted!', 'Your case booking has been submitted successfully with a reference number.');
    addNotification({
      title: 'New Case Submitted',
      message: 'A new case booking has been created and assigned a reference number.',
      type: 'success'
    });
  };

  const handleProcessCase = (caseData: CaseBooking) => {
    setProcessingCase(caseData);
    setActivePage('process');
    playSound.click();
  };

  const handleProcessComplete = () => {
    setProcessingCase(null);
    setActivePage('cases');
    playSound.statusChange();
    showSuccess('Order Prepared!', 'The order has been successfully prepared and is ready for delivery.');
    addNotification({
      title: 'Order Processing Complete',
      message: 'An order has been successfully processed and prepared for delivery.',
      type: 'success'
    });
  };

  const handleBackToCases = () => {
    setProcessingCase(null);
    setActivePage('cases');
    playSound.click();
  };

  const handleCalendarCaseClick = async (caseId: string) => {
    // Navigate to cases view and highlight the specific case
    // No storage clearing needed - using React state for prefill data
    setHighlightedCaseId(caseId);
    setActivePage('cases');
    playSound.click();
  };

  const handleCalendarDateClick = async (date: Date, department: string) => {
    // TODO: Pass prefill data via React state/context instead of storage
    // For now, navigate to booking page without prefill
    setActivePage('booking');
    playSound.click();
  };

  // Helper function to check if user has admin access
  const hasAdminAccess = (user: User | null): boolean => {
    if (!user) return false;

    // Check if user has any admin panel permissions
    return hasPermission(user.role, PERMISSION_ACTIONS.SYSTEM_SETTINGS) ||
           hasPermission(user.role, PERMISSION_ACTIONS.VIEW_REPORTS) ||
           hasPermission(user.role, PERMISSION_ACTIONS.CODE_TABLE_SETUP) ||
           hasPermission(user.role, PERMISSION_ACTIONS.PERMISSION_MATRIX) ||
           hasPermission(user.role, PERMISSION_ACTIONS.EMAIL_CONFIG) ||
           hasPermission(user.role, PERMISSION_ACTIONS.AUDIT_LOGS) ||
           hasPermission(user.role, PERMISSION_ACTIONS.EXPORT_DATA) ||
           hasPermission(user.role, PERMISSION_ACTIONS.VIEW_USERS);
  };

  // Helper function to toggle admin panel
  const toggleAdminPanel = () => {
    setAdminPanelExpanded(!adminPanelExpanded);
    playSound.click();
  };

  // Handle maintenance mode forced logout
  const handleMaintenanceModeLogout = async () => {
    if (user) {
      await auditLogout(user.name, user.id, user.role, user.selectedCountry);
    }

    await logout();

    // Clear permissions cache on maintenance mode logout
    const { clearPermissionsCache } = await import('./utils/permissions');
    clearPermissionsCache();

    setUser(null);
    setActivePage('booking');
    setProcessingCase(null);
    setMaintenanceModeActive(false);

    // On mobile, go directly to login instead of introduction page
    if (isMobileDevice()) {
      setShowMobileEntry(false);
    }

    showSuccess('Maintenance Mode', 'You have been logged out due to system maintenance');
  };

  if (!user) {
    // Show mobile entry page first on mobile devices
    if (isMobileDevice() && showMobileEntry) {
      return (
        <>
          <MobileEntryPage onProceedToLogin={handleProceedToLogin} />
          {/* Also render login in background for desktop fallback */}
          <div style={{ display: 'none' }}>
            <SupabaseLogin onLogin={handleLogin} />
          </div>
        </>
      );
    }

    // Show login directly on desktop or after mobile entry
    return <SupabaseLogin onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      {/* Desktop Header */}
      <header className="app-header desktop-header">
        <div className="header-content">
          <div className="header-left">
            <h1>
              <DatabaseConnectionStatus />
              Transmedic Case Booking
            </h1>
            <div className="header-info">
              <div className="role-country-info">
                <span className="info-label">Role:</span>
                <span className={`role-badge ${user.role}`}>{user.role.replace('-', ' ').toUpperCase()}</span>
                {user.selectedCountry && (
                  <>
                    <span className="info-label">Country:</span>
                    <span className="country-badge">
                      {user.selectedCountry}
                    </span>
                  </>
                )}
                {/* Admin Panel in Header */}
                {hasAdminAccess(user) && (
                  <div className="header-admin-panel" ref={adminPanelRef}>
                    <button
                      className={`header-admin-toggle ${adminPanelExpanded ? 'expanded' : ''}`}
                      onClick={toggleAdminPanel}
                      title="Admin Panel"
                      data-testid="admin-menu"
                    >
                      <span className="admin-icon">👑</span>
                      <span className="admin-label">Admin</span>
                      <span className={`chevron ${adminPanelExpanded ? 'down' : 'right'}`}>
                        {adminPanelExpanded ? '▼' : '▶'}
                      </span>
                    </button>

                    {adminPanelExpanded && (
                      <div className="header-admin-submenu">
                        {hasPermission(user.role, PERMISSION_ACTIONS.VIEW_REPORTS) && (
                          <button
                            onClick={() => {
                              setActivePage('reports');
                              playSound.click();
                              setAdminPanelExpanded(false);
                            }}
                            className={`header-admin-item ${activePage === 'reports' ? 'active' : ''}`}
                          >
                            📊 Reports
                          </button>
                        )}
                        {hasPermission(user.role, PERMISSION_ACTIONS.SYSTEM_SETTINGS) && (
                          <button
                            onClick={() => {
                              setActivePage('system-settings');
                              playSound.click();
                              setAdminPanelExpanded(false);
                            }}
                            className={`header-admin-item ${activePage === 'system-settings' ? 'active' : ''}`}
                          >
                            ⚙️ System Settings
                          </button>
                        )}
                        {hasPermission(user.role, PERMISSION_ACTIONS.CODE_TABLE_SETUP) && (
                          <button
                            onClick={() => {
                              setActivePage('codetables');
                              playSound.click();
                              setAdminPanelExpanded(false);
                            }}
                            className={`header-admin-item ${activePage === 'codetables' ? 'active' : ''}`}
                          >
                            📊 Code Table Setup
                          </button>
                        )}
                        {hasPermission(user.role, PERMISSION_ACTIONS.PERMISSION_MATRIX) && (
                          <button
                            onClick={() => {
                              setActivePage('permissions');
                              playSound.click();
                              setAdminPanelExpanded(false);
                            }}
                            className={`header-admin-item ${activePage === 'permissions' ? 'active' : ''}`}
                          >
                            🔐 Permissions
                          </button>
                        )}
                        {hasPermission(user.role, PERMISSION_ACTIONS.EMAIL_CONFIG) && (
                          <button
                            onClick={() => {
                              setActivePage('email-config');
                              playSound.click();
                              setAdminPanelExpanded(false);
                            }}
                            className={`header-admin-item ${activePage === 'email-config' ? 'active' : ''}`}
                          >
                            📧 Email Configuration
                          </button>
                        )}
                        {hasPermission(user.role, PERMISSION_ACTIONS.VIEW_USERS) && (
                          <button
                            onClick={() => {
                              setActivePage('users');
                              playSound.click();
                              setAdminPanelExpanded(false);
                            }}
                            className={`header-admin-item ${activePage === 'users' ? 'active' : ''}`}
                          >
                            👥 User Management
                          </button>
                        )}
                        {hasPermission(user.role, PERMISSION_ACTIONS.AUDIT_LOGS) && (
                          <button
                            onClick={() => {
                              setActivePage('audit-logs');
                              playSound.click();
                              setAdminPanelExpanded(false);
                            }}
                            className={`header-admin-item ${activePage === 'audit-logs' ? 'active' : ''}`}
                          >
                            📊 Audit Logs
                          </button>
                        )}
                        {(hasPermission(user.role, PERMISSION_ACTIONS.IMPORT_DATA) || hasPermission(user.role, PERMISSION_ACTIONS.EXPORT_DATA)) && (
                          <button
                            onClick={() => {
                              setActivePage('data-import');
                              playSound.click();
                              setAdminPanelExpanded(false);
                            }}
                            className={`header-admin-item ${activePage === 'data-import' ? 'active' : ''}`}
                          >
                            📦 Data Export/Import
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="header-right">
            <div className="logged-in-info">
              <span className="logged-in-label">Logged in as:</span>
              <span className="user-display-name">{user.name}</span>
            </div>
            <div className="header-actions" data-testid="user-menu">
              <NotificationBell />
              <Settings />
              <button onClick={handleLogout} className="logout-button" data-testid="logout-button">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <MobileHeader user={user} />

      <nav className="app-nav">
        <div className="nav-buttons">
          {hasPermission(user.role, PERMISSION_ACTIONS.CREATE_CASE) && (
            <button
              onClick={() => {
                setActivePage('booking');
                playSound.click();
              }}
              className={activePage === 'booking' ? 'active' : ''}
              data-testid="new-case-button"
            >
              📝 New Case Booking
            </button>
          )}
          {hasPermission(user.role, PERMISSION_ACTIONS.VIEW_CASES) && (
            <button
              onClick={() => {
                setActivePage('cases');
                playSound.click();
              }}
              className={activePage === 'cases' ? 'active' : ''}
              data-page="cases"
              data-testid="view-all-cases"
            >
              📋 View All Cases
            </button>
          )}
          {hasPermission(user.role, PERMISSION_ACTIONS.BOOKING_CALENDAR) && (
            <button
              onClick={() => {
                setActivePage('calendar');
                playSound.click();
              }}
              className={activePage === 'calendar' ? 'active' : ''}
            >
              📅 Booking Calendar
            </button>
          )}
          {hasPermission(user.role, PERMISSION_ACTIONS.EDIT_SETS) && (
            <button
              onClick={() => {
                setActivePage('sets');
                playSound.click();
              }}
              className={activePage === 'sets' ? 'active' : ''}
            >
              ⚙️ Edit Sets
            </button>
          )}
        </div>
      </nav>

      <main className="app-main" data-testid="main-dashboard">
        {activePage === 'booking' && (() => {
          const canCreate = hasPermission(user.role, PERMISSION_ACTIONS.CREATE_CASE);
          return canCreate;
        })() && (
          <CaseBookingForm onCaseSubmitted={handleCaseSubmitted} />
        )}

        {activePage === 'booking' && !hasPermission(user.role, PERMISSION_ACTIONS.CREATE_CASE) && (
          <div className="permission-denied">
            <div className="permission-denied-content">
              <h2>🚫 Access Denied</h2>
              <p>You don't have permission to create new cases.</p>
              <p>Your role (<span className={`role-badge ${user.role}`}>{user.role.replace('-', ' ').toUpperCase()}</span>) does not allow case booking access.</p>
              <button
                onClick={() => {
                  setActivePage('cases');
                  playSound.click();
                }}
                className="btn btn-primary btn-lg"
              >
                View Cases Instead
              </button>
            </div>
          </div>
        )}

        {activePage === 'cases' && hasPermission(user.role, PERMISSION_ACTIONS.VIEW_CASES) && (
          <CasesList
            onProcessCase={handleProcessCase}
            currentUser={user}
            highlightedCaseId={highlightedCaseId}
            onClearHighlight={() => setHighlightedCaseId(null)}
            onNavigateToPermissions={() => {
              setActivePage('permissions');
              playSound.click();
            }}
          />
        )}

        {activePage === 'process' && processingCase && (
          <ProcessOrderPage
            caseData={processingCase}
            onProcessComplete={handleProcessComplete}
            onBack={handleBackToCases}
          />
        )}

        {activePage === 'users' && hasPermission(user.role, PERMISSION_ACTIONS.VIEW_USERS) && (
          <UserManagement />
        )}

        {activePage === 'audit-logs' && hasPermission(user.role, PERMISSION_ACTIONS.AUDIT_LOGS) && (
          <AuditLogs />
        )}

        {activePage === 'permissions' && hasPermission(user.role, PERMISSION_ACTIONS.PERMISSION_MATRIX) && (
          <PermissionMatrixPage />
        )}

        {activePage === 'email-config' && hasPermission(user.role, PERMISSION_ACTIONS.EMAIL_CONFIG) && (
          <SimplifiedEmailConfig />
        )}

        {activePage === 'calendar' && hasPermission(user.role, PERMISSION_ACTIONS.BOOKING_CALENDAR) && (
          <BookingCalendar
            onCaseClick={handleCalendarCaseClick}
            onDateClick={hasPermission(user.role, PERMISSION_ACTIONS.CREATE_CASE) ? handleCalendarDateClick : undefined}
          />
        )}

        {activePage === 'sets' && hasPermission(user.role, PERMISSION_ACTIONS.EDIT_SETS) && (
          <EditSets />
        )}

        {activePage === 'reports' && hasPermission(user.role, PERMISSION_ACTIONS.VIEW_REPORTS) && (
          <Reports />
        )}

        {activePage === 'codetables' && hasPermission(user.role, PERMISSION_ACTIONS.CODE_TABLE_SETUP) && (
          <CodeTableSetup />
        )}


        {activePage === 'data-import' && (hasPermission(user.role, PERMISSION_ACTIONS.IMPORT_DATA) || hasPermission(user.role, PERMISSION_ACTIONS.EXPORT_DATA)) && (
          <DataExportImport />
        )}

        {activePage === 'system-settings' && hasPermission(user.role, PERMISSION_ACTIONS.SYSTEM_SETTINGS) && (
          <SystemSettings />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>&copy; 2025 Transmedic Case Booking. All rights reserved.</p>
          <p>Logged in as: {user.name} ({user.role})</p>
        </div>
      </footer>

      {showWelcomePopup && (
        <WelcomePopup
          user={user}
          onClose={() => setShowWelcomePopup(false)}
        />
      )}

      {showPasswordChangeModal && user && (
        <div className="modal-overlay" onClick={() => {}}>
          <div className="modal-content password-change-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Password Change Required</h3>
            </div>
            <div className="modal-body">
              <p>Your password is temporary and must be changed before you can continue.</p>
              <p><strong>User:</strong> {user.name} ({user.username})</p>

              {passwordChangeData.error && (
                <div className="alert alert-danger">
                  {passwordChangeData.error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordChangeData.newPassword}
                  onChange={(e) => setPasswordChangeData(prev => ({ ...prev, newPassword: e.target.value, error: '' }))}
                  placeholder="Enter your new password (min 8 characters)"
                  className="form-control"
                  disabled={passwordChangeData.isChanging}
                  minLength={8}
                />
                <small className="form-text text-muted">
                  Password must be at least 8 characters long
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordChangeData.confirmPassword}
                  onChange={(e) => setPasswordChangeData(prev => ({ ...prev, confirmPassword: e.target.value, error: '' }))}
                  placeholder="Confirm your new password"
                  className="form-control"
                  disabled={passwordChangeData.isChanging}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={handlePasswordChangeCancel}
                disabled={passwordChangeData.isChanging}
              >
                Logout
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePasswordChangeSubmit}
                disabled={passwordChangeData.isChanging || !passwordChangeData.newPassword || !passwordChangeData.confirmPassword}
              >
                {passwordChangeData.isChanging ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LogoutConfirmation
        isOpen={showLogoutConfirmation}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
        userName={user?.name}
      />


      {showVersionUpdatePopup && (
        <VersionUpdatePopup
          currentVersion={versionUpdateInfo.currentVersion}
          previousVersion={versionUpdateInfo.previousVersion}
          onConfirm={handleVersionUpdateConfirm}
        />
      )}

      {/* Mobile Navigation */}
      <MobileNavigation
        user={user}
        activePage={activePage}
        onNavigate={(page) => {
          setActivePage(page);
          playSound.click();
        }}
        onLogout={handleLogout}
      />

      {/* Maintenance Mode Modal */}
      <MaintenanceMode
        isActive={maintenanceModeActive}
        onForceLogout={handleMaintenanceModeLogout}
      />
    </div>
  );
};

// React Query client with optimized settings for real-time data
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable caching for live data - always fetch fresh
      staleTime: 0,
      gcTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        const status = (error as any)?.status;
        if (status >= 400 && status < 500) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SoundProvider>
          <NotificationProvider>
            <ToastProvider>
              <RealtimeProvider>
                <AppContent />
              </RealtimeProvider>
            </ToastProvider>
          </NotificationProvider>
        </SoundProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;