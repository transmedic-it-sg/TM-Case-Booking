import React from 'react';
import { User } from '../types';
import DatabaseConnectionStatusMobile from './DatabaseConnectionStatusMobile';
import NotificationBell from './NotificationBell';
import Settings from './Settings';
import '../assets/components/MobileHeader.css';

interface MobileHeaderProps {
  user: User;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ user }) => {
  return (
    <header className="mobile-header">
      <div className="mobile-header-content">
        <div className="mobile-header-left">
          <DatabaseConnectionStatusMobile />
        </div>
        <div className="mobile-header-right">
          <NotificationBell />
          <Settings />
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;