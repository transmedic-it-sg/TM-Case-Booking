import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import CaseBookingForm from './components/CaseBookingForm';
import CasesList from './components/CasesList';
import ProcessOrderPage from './components/ProcessOrderPage';
import UserManagement from './components/UserManagement';
import EditSets from './components/EditSets';
import WelcomePopup from './components/WelcomePopup';
import { User, CaseBooking } from './types';
import { getCurrentUser, logout } from './utils/auth';
import { updateCaseStatus } from './utils/storage';
import { SoundProvider, useSound } from './contexts/SoundContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { ToastProvider, useToast } from './components/ToastContainer';
import NotificationBell from './components/NotificationBell';
import Settings from './components/Settings';
import StatusLegend from './components/StatusLegend';
import './App.css';

type ActivePage = 'booking' | 'cases' | 'process' | 'users' | 'sets';

const getCountryAbbreviation = (country: string): string => {
  const abbreviations: { [key: string]: string } = {
    'Singapore': 'SG',
    'Malaysia': 'MY',
    'Philippines': 'PH',
    'Indonesia': 'ID',
    'Vietnam': 'VN',
    'Hongkong': 'HK',
    'Thailand': 'TH'
  };
  return abbreviations[country] || country.slice(0, 2).toUpperCase();
};

const getCountryFlag = (country: string): string => {
  const flags: { [key: string]: string } = {
    'Singapore': '🇸🇬',
    'Malaysia': '🇲🇾',
    'Philippines': '🇵🇭',
    'Indonesia': '🇮🇩',
    'Vietnam': '🇻🇳',
    'Hongkong': '🇭🇰',
    'Thailand': '🇹🇭'
  };
  return flags[country] || '🌍';
};

const getCountryColor = (country: string): string => {
  const colors: { [key: string]: string } = {
    'Singapore': '#d63384',
    'Malaysia': '#fd7e14',
    'Philippines': '#0d6efd',
    'Indonesia': '#dc3545',
    'Vietnam': '#198754',
    'Hongkong': '#6f42c1',
    'Thailand': '#20c997'
  };
  return colors[country] || '#6c757d';
};

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<ActivePage>('booking');
  const [processingCase, setProcessingCase] = useState<CaseBooking | null>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const { isEnabled, toggleSound, playSound } = useSound();
  const { addNotification } = useNotifications();
  const { showSuccess, showError, showInfo } = useToast();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

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
    logout();
    setUser(null);
    setActivePage('booking');
    setProcessingCase(null);
    playSound.click();
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

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🏥 Transmedic Case Booking</h1>
            <div className="header-info">
              <span className={`role-badge ${user.role}`}>{user.role.replace('-', ' ').toUpperCase()}</span>
              {user.selectedCountry && (
                <span className="country-badge">
                  {user.selectedCountry}
                </span>
              )}
              {(user.role === 'admin' || user.role === 'it') && (
                <button
                  onClick={() => {
                    setActivePage('users');
                    playSound.click();
                  }}
                  className={`user-management-button ${activePage === 'users' ? 'active' : ''}`}
                >
                  👥 User Management
                </button>
              )}
            </div>
          </div>
          <div className="header-right">
            <span className="user-display-name">{user.name}</span>
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
        <button
          onClick={() => {
            setActivePage('booking');
            playSound.click();
          }}
          className={activePage === 'booking' ? 'active' : ''}
        >
          📝 New Case Booking
        </button>
        <button
          onClick={() => {
            setActivePage('cases');
            playSound.click();
          }}
          className={activePage === 'cases' ? 'active' : ''}
        >
          📋 View All Cases
        </button>
        {(user.role === 'admin' || user.role === 'operation-manager') && (
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
      </nav>

      <StatusLegend />

      <main className="app-main">
        {activePage === 'booking' && (
          <CaseBookingForm onCaseSubmitted={handleCaseSubmitted} />
        )}
        
        {activePage === 'cases' && (
          <CasesList onProcessCase={handleProcessCase} currentUser={user} />
        )}
        
        {activePage === 'process' && processingCase && (
          <ProcessOrderPage
            caseData={processingCase}
            onProcessComplete={handleProcessComplete}
            onBack={handleBackToCases}
          />
        )}
        
        {activePage === 'users' && (user.role === 'admin' || user.role === 'it') && (
          <UserManagement />
        )}
        
        {activePage === 'sets' && (user.role === 'admin' || user.role === 'operation-manager') && (
          <EditSets />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>&copy; 2024 Transmedic Case Booking. All rights reserved.</p>
          <p>Logged in as: {user.name} ({user.role})</p>
        </div>
      </footer>

      {showWelcomePopup && (
        <WelcomePopup
          user={user}
          onClose={() => setShowWelcomePopup(false)}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SoundProvider>
      <NotificationProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </NotificationProvider>
    </SoundProvider>
  );
};

export default App;