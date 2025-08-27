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
import BackupRestore from './components/BackupRestore';
import DataImport from './components/DataImport';
import SystemSettings from './components/SystemSettings';
import LogoutConfirmation from './components/LogoutConfirmation';
import SSOCallback from './components/SSOCallback';
import { User, CaseBooking } from './types';
import { getCurrentUser, logout } from './utils/auth';
import { hasPermission, PERMISSION_ACTIONS, initializePermissions } from './utils/permissions';
import { initializeCodeTables } from './utils/codeTable';
import { auditLogout } from './utils/auditService';
import { SoundProvider, useSound } from './contexts/SoundContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { ToastProvider, useToast } from './components/ToastContainer';
import { getSystemConfig } from './utils/systemSettingsService';
import { getCases } from './utils/storage';
import NotificationBell from './components/NotificationBell';
import Settings from './components/Settings';
// Removed unused import: getAppVersion
import { initializeVersionManager, handleVersionUpdate } from './utils/appVersionManager';
import VersionUpdatePopup from './components/VersionUpdatePopup';
import StatusLegend from './components/StatusLegend';
import MobileNavigation from './components/MobileNavigation';
import MobileHeader from './components/MobileHeader';
import CacheVersionMismatchPopup from './components/CacheVersionMismatchPopup';
import MaintenanceMode from './components/MaintenanceMode';
import DatabaseConnectionStatus from './components/DatabaseConnectionStatus';
// import { SystemHealthMonitor } from './utils/systemHealthMonitor'; // Temporarily disabled
// import { DataValidationService } from './utils/dataValidationService'; // Unused
import './assets/components/App.css';
import './assets/components/CodeTableSetup.css';
import './assets/components/AuditLogs.css';
import './assets/components/MobileNavigation.css';
import './assets/components/MobileHeader.css';
import './assets/components/MobileLayout.css';
import './assets/components/MobileComponents.css';
import './assets/components/MobileEntryPage.css';
import './assets/components/MobileOverrides.css'; // Load last for maximum specificity

type ActivePage = 'booking' | 'cases' | 'process' | 'users' | 'sets' | 'reports' | 'calendar' | 'permissions' | 'codetables' | 'audit-logs' | 'email-config' | 'backup-restore' | 'data-import' | 'system-settings';




const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showMobileEntry, setShowMobileEntry] = useState(false);
  const [activePage, setActivePage] = useState<ActivePage>('booking');
  const [processingCase, setProcessingCase] = useState<CaseBooking | null>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
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
  
  // Cache version management
  // DISABLED: Aggressive cache versioning causing UX issues with too many popups
  // const {
  //   showMismatchPopup,
  //   outdatedTypes,
  //   changedVersions,
  //   forceLogout,
  //   manualVersionCheck
  // } = useCacheVersionManager();
  
  // Temporary disable cache version popups - they're too disruptive
  const showMismatchPopup = false;
  const outdatedTypes: string[] = [];
  const changedVersions: any[] = [];
  const forceLogout = () => {};

  // App version management with logout on version change
  useEffect(() => {
    const versionCheck = initializeVersionManager();
    
    // If version changed and user is logged in, show update popup
    if (versionCheck.versionChanged && versionCheck.userLoggedIn) {
      console.log(`🔄 Version updated from ${versionCheck.storedVersion} to ${versionCheck.currentVersion} - user will be logged out`);
      
      setVersionUpdateInfo({
        currentVersion: versionCheck.currentVersion,
        previousVersion: versionCheck.storedVersion || 'Unknown'
      });
      setShowVersionUpdatePopup(true);
    } else {
      // Normal version logging
      console.log(`📱 TM Case Booking v${versionCheck.currentVersion} loaded`);
    }
  }, []);

  // Check maintenance mode status
  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const config = await getSystemConfig();
        setMaintenanceModeActive(config.maintenanceMode);
      } catch (error) {
        console.log('Could not check maintenance mode status:', error);
      }
    };

    checkMaintenanceMode();

    // Set up periodic check for maintenance mode changes
    const maintenanceCheckInterval = setInterval(checkMaintenanceMode, 30000); // Check every 30 seconds

    return () => clearInterval(maintenanceCheckInterval);
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
        initializeCodeTables();
        // Force refresh permissions on app startup to handle browser refresh scenarios
        await initializePermissions(true);
        
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          // User is already logged in, no need to show mobile entry
        } else if (isMobileDevice()) {
          setShowMobileEntry(true); // Only show mobile entry if no user and on mobile

          // DISABLED: Health monitoring causing infinite loops
          // TODO: Fix database schema issues before re-enabling
          console.log('🔍 System health monitoring temporarily disabled');
        }
      } catch (error) {
        console.error('Error during initialization:', error);
        // Still try to get current user even if initialization fails
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          // User is already logged in, no need to show mobile entry
        } else if (isMobileDevice()) {
          setShowMobileEntry(true); // Only show mobile entry if no user and on mobile
        }
      }
    };
    
    initialize();
  }, []);

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
    setUser(loggedInUser);
    setShowWelcomePopup(true);
    setShowMobileEntry(false);
    
    // Refresh permissions cache for the new user to ensure correct permissions
    console.log('🔄 Refreshing permissions cache for new user login:', loggedInUser.name);
    try {
      // Force refresh permissions on login to ensure fresh permissions
      await initializePermissions(true);
      console.log('✅ Permissions refreshed successfully for user login');
    } catch (error) {
      console.error('❌ Failed to refresh permissions on user login:', error);
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

  const handleLogout = () => {
    setShowLogoutConfirmation(true);
  };

  const confirmLogout = async () => {
    // Add audit log for logout before clearing user
    if (user) {
      await auditLogout(user.name, user.id, user.role, user.selectedCountry);
    }
    
    await logout();
    
    // Clear permissions cache on logout to prevent stale permissions for next user
    console.log('🗑️ Clearing permissions cache on user logout');
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
    showSuccess('Order Processed!', 'The order has been successfully prepared and is ready for delivery.');
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
    try {
      // Load all cases and find the clicked case
      const allCases = await getCases();
      const clickedCase = allCases.find(c => c.id === caseId);
      
      if (clickedCase) {
        // Pre-fill the booking form with the case's department and date
        localStorage.setItem('calendar_prefill_date', clickedCase.dateOfSurgery + 'T00:00:00.000Z');
        localStorage.setItem('calendar_prefill_department', clickedCase.department);
        
        // Navigate to booking page to create a new case in the same slot/department
        setActivePage('booking');
      } else {
        // Fallback: just highlight the case in the cases list
        setHighlightedCaseId(caseId);
        setActivePage('cases');
      }
    } catch (error) {
      console.error('Error loading case data:', error);
      // Fallback: just highlight the case in the cases list
      setHighlightedCaseId(caseId);
      setActivePage('cases');
    }
    playSound.click();
  };

  const handleCalendarDateClick = (date: Date, department: string) => {
    // Store the selected date and department for pre-filling the booking form
    localStorage.setItem('calendar_prefill_date', date.toISOString());
    localStorage.setItem('calendar_prefill_department', department);
    
    // Switch to booking page
    setActivePage('booking');
    playSound.click();
  };

  // Helper function to check if user has admin access
  const hasAdminAccess = (user: User | null): boolean => {
    if (!user) return false;
    
    // Admin and IT roles always have admin access
    if (user.role === 'admin' || user.role === 'it') {
      return true;
    }
    
    // For other roles, check specific permissions
    return hasPermission(user.role, PERMISSION_ACTIONS.VIEW_USERS);
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
    console.log('🗑️ Clearing permissions cache on maintenance mode logout');
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
                    >
                      <span className="admin-icon">👑</span>
                      <span className="admin-label">Admin</span>
                      <span className={`chevron ${adminPanelExpanded ? 'down' : 'right'}`}>
                        {adminPanelExpanded ? '▼' : '▶'}
                      </span>
                    </button>
                    
                    {adminPanelExpanded && (
                      <div className="header-admin-submenu">
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
                        {hasPermission(user.role, PERMISSION_ACTIONS.BACKUP_RESTORE) && (
                          <button
                            onClick={() => {
                              setActivePage('backup-restore');
                              playSound.click();
                              setAdminPanelExpanded(false);
                            }}
                            className={`header-admin-item ${activePage === 'backup-restore' ? 'active' : ''}`}
                          >
                            💾 Backup & Restore
                          </button>
                        )}
                        {hasPermission(user.role, PERMISSION_ACTIONS.IMPORT_DATA) && (
                          <button
                            onClick={() => {
                              setActivePage('data-import');
                              playSound.click();
                              setAdminPanelExpanded(false);
                            }}
                            className={`header-admin-item ${activePage === 'data-import' ? 'active' : ''}`}
                          >
                            📥 Data Import
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
            <div className="header-actions">
              <NotificationBell />
              <Settings />
              <button onClick={handleLogout} className="logout-button">
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
            >
              📋 View All Cases
            </button>
          )}
          <StatusLegend />
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
          {hasPermission(user.role, PERMISSION_ACTIONS.VIEW_REPORTS) && (
            <button
              onClick={() => {
                setActivePage('reports');
                playSound.click();
              }}
              className={activePage === 'reports' ? 'active' : ''}
            >
              📊 Reports
            </button>
          )}
        </div>
      </nav>

      <main className="app-main">
        {activePage === 'booking' && hasPermission(user.role, PERMISSION_ACTIONS.CREATE_CASE) && (
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
        
        {activePage === 'backup-restore' && hasPermission(user.role, PERMISSION_ACTIONS.BACKUP_RESTORE) && (
          <BackupRestore />
        )}
        
        {activePage === 'data-import' && hasPermission(user.role, PERMISSION_ACTIONS.IMPORT_DATA) && (
          <DataImport />
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

      <LogoutConfirmation
        isOpen={showLogoutConfirmation}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
        userName={user?.name}
      />

      {/* Cache Version Mismatch Popup */}
      <CacheVersionMismatchPopup
        isOpen={showMismatchPopup}
        outdatedTypes={outdatedTypes}
        changedVersions={changedVersions}
        onForceLogout={forceLogout}
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

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <SoundProvider>
        <NotificationProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </NotificationProvider>
      </SoundProvider>
    </ErrorBoundary>
  );
};

export default App;