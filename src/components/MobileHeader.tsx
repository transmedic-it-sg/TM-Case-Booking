import React from 'react';
import { User } from '../types';
import DatabaseConnectivityIndicator from './DatabaseConnectivityIndicator';
import NotificationBell from './NotificationBell';
import Settings from './Settings';
import '../assets/components/MobileHeader.css';

interface MobileHeaderProps {
  user: User;
  onLogout: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="mobile-header">
      <div className="mobile-header-content">
        <div className="mobile-header-left">
          <DatabaseConnectivityIndicator className="mobile-db-indicator" />
          <div className="mobile-header-title">
            <h1>TM Cases</h1>
            {user.selectedCountry && (
              <span className="mobile-country-badge">
                {user.selectedCountry}
              </span>
            )}
          </div>
        </div>
        <div className="mobile-header-right">
          <NotificationBell />
          <Settings />
          <button onClick={onLogout} className="mobile-logout-btn" title="Logout">
            🚪
          </button>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;