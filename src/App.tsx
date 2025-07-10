import React, { useState, useEffect, useRef } from 'react';
import SupabaseLogin from './components/SupabaseLogin';
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
import LogoutConfirmation from './components/LogoutConfirmation';
import SSOCallback from './components/SSOCallback';
import { User, CaseBooking } from './types';
import { getCurrentUser, logout } from './utils/auth';
import { hasPermission, PERMISSION_ACTIONS, initializePermissions } from './utils/permissions';
import { initializeCodeTables } from './utils/codeTable';
import { SoundProvider, useSound } from './contexts/SoundContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { ToastProvider, useToast } from './components/ToastContainer';
import NotificationBell from './components/NotificationBell';
import Settings from './components/Settings';
import StatusLegend from './components/StatusLegend';
import './App.css';
import './components/CodeTableSetup.css';
import './components/AuditLogs.css';

type ActivePage = 'booking' | 'cases' | 'process' | 'users' | 'sets' | 'reports' | 'calendar' | 'permissions' | 'codetables' | 'audit-logs' | 'email-config';




const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<ActivePage>('booking');
  const [processingCase, setProcessingCase] = useState<CaseBooking | null>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [adminPanelExpanded, setAdminPanelExpanded] = useState(false);
  const [highlightedCaseId, setHighlightedCaseId] = useState<string | null>(null);
  const adminPanelRef = useRef<HTMLDivElement>(null);
  const { playSound } = useSound();
  const { addNotification } = useNotifications();
  const { showSuccess } = useToast();

  // Check if this is an SSO callback route after all hooks
  const isCallbackRoute = window.location.pathname === '/auth/callback' || window.location.search.includes('code=');

  useEffect(() => {
    // Initialize code tables and permissions
    const initialize = async () => {
      initializeCodeTables();
      await initializePermissions();
      
      const currentUser = getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    };
    
    initialize();
  }, []);

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

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setShowWelcomePopup(true);
    playSound.success();
    showSuccess('Welcome back!', `You're now logged in as ${loggedInUser.name}`);
    addNotification({
      title: 'Successful Login',
      message: `Welcome back, ${loggedInUser.name}! You're logged in as ${loggedInUser.role}.`,
      type: 'success'
    });
  };

  const handleLogout = () => {
    setShowLogoutConfirmation(true);
  };

  const confirmLogout = async () => {
    await logout();
    setUser(null);
    setActivePage('booking');
    setProcessingCase(null);
    setShowLogoutConfirmation(false);
    playSound.click();
    showSuccess('Logged Out', 'You have been successfully logged out of the system');
  };

  const cancelLogout = () => {
    setShowLogoutConfirmation(false);
  };

  const handleCaseSubmitted = () => {
    setActivePage('cases');
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

  const handleCalendarCaseClick = (caseId: string) => {
    setHighlightedCaseId(caseId);
    setActivePage('cases');
    playSound.click();
  };

  // Helper function to check if user has admin access
  const hasAdminAccess = (user: User | null): boolean => {
    if (!user) return false;
    return user.role === 'admin' || 
           hasPermission(user.role, PERMISSION_ACTIONS.VIEW_USERS) ||
           (user.role === 'it');
  };

  // Helper function to toggle admin panel
  const toggleAdminPanel = () => {
    setAdminPanelExpanded(!adminPanelExpanded);
    playSound.click();
  };

  if (!user) {
    return <SupabaseLogin onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🏥 Transmedic Case Booking</h1>
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
                        {hasPermission(user.role, 'code-table-setup') && (
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
                        {user.role === 'admin' && (
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
          <button
            onClick={() => {
              setActivePage('cases');
              playSound.click();
            }}
            className={activePage === 'cases' ? 'active' : ''}
          >
            📋 View All Cases
          </button>
          <StatusLegend />
          {hasPermission(user.role, 'booking-calendar') && (
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
        
        {activePage === 'cases' && (
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
        
        {activePage === 'permissions' && user.role === 'admin' && (
          <PermissionMatrixPage />
        )}
        
        {activePage === 'email-config' && hasPermission(user.role, PERMISSION_ACTIONS.EMAIL_CONFIG) && (
          <SimplifiedEmailConfig />
        )}
        
        {activePage === 'calendar' && hasPermission(user.role, 'booking-calendar') && (
          <BookingCalendar onCaseClick={handleCalendarCaseClick} />
        )}
        
        {activePage === 'sets' && hasPermission(user.role, PERMISSION_ACTIONS.EDIT_SETS) && (
          <EditSets />
        )}
        
        {activePage === 'reports' && hasPermission(user.role, PERMISSION_ACTIONS.VIEW_REPORTS) && (
          <Reports />
        )}
        
        {activePage === 'codetables' && hasPermission(user.role, 'code-table-setup') && (
          <CodeTableSetup />
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