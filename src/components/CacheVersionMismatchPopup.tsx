import React, { useEffect } from 'react';
import { CacheVersion } from '../utils/cacheVersionService';
import '../assets/components/CacheVersionMismatchPopup.css';

export interface CacheVersionMismatchPopupProps {
  isOpen: boolean;
  outdatedTypes: string[];
  changedVersions: CacheVersion[];
  onForceLogout: () => void;
}

const CacheVersionMismatchPopup: React.FC<CacheVersionMismatchPopupProps> = ({
  isOpen,
  outdatedTypes,
  changedVersions,
  onForceLogout
}) => {
  // Auto logout after 10 seconds if user doesn't click
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onForceLogout();
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onForceLogout]);

  if (!isOpen) return null;

  const getChangeDescription = (versions: CacheVersion[]): string => {
    const changes = versions.map(v => {
      if (v.country === 'GLOBAL') {
        return 'Application updates';
      }
      
      switch (v.version_type) {
        case 'surgery_sets':
          return `${v.country} surgery sets or implant boxes`;
        case 'departments':
          return `${v.country} departments`;
        case 'procedure_types':
          return `${v.country} procedure types`;
        default:
          return `${v.country} ${v.version_type}`;
      }
    });

    return changes.join(', ');
  };

  return (
    <div className="cache-mismatch-overlay">
      <div className="cache-mismatch-modal">
        <div className="cache-mismatch-header">
          <div className="cache-mismatch-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"
                fill="#ff6b6b"
                stroke="#ff6b6b"
                strokeWidth="2"
              />
              <circle cx="12" cy="12" r="1" fill="white" />
            </svg>
          </div>
          <h2>System Update Available</h2>
        </div>

        <div className="cache-mismatch-content">
          <p className="cache-mismatch-message">
            New updates are available for your region. To ensure data consistency, 
            you need to refresh your session.
          </p>
          
          <div className="cache-mismatch-details">
            <h4>What's Updated:</h4>
            <p>{getChangeDescription(changedVersions)}</p>
          </div>

          <div className="cache-mismatch-note">
            <p>
              <strong>Note:</strong> This affects only your country's data. 
              Users from other regions will continue working normally.
            </p>
          </div>
        </div>

        <div className="cache-mismatch-actions">
          <button
            className="btn-cache-logout"
            onClick={onForceLogout}
          >
            Refresh Session
          </button>
          
          <div className="cache-mismatch-countdown">
            Auto-refresh in 10 seconds...
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheVersionMismatchPopup;