import React, { useEffect } from 'react';
import { CacheVersion } from '../utils/cacheVersionService';

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
  // Auto reload after 15 seconds if user doesn't click
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onForceLogout]);

  if (!isOpen) return null;

  const handleRefresh = () => {
    // Clear any cached version checking state before refreshing
    sessionStorage.setItem('cache-popup-dismissed', 'true');
    window.location.reload();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
        
        <h3 style={{ 
          color: '#333', 
          marginBottom: '16px',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          System Update Available
        </h3>
        
        <p style={{ 
          color: '#666', 
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>
          New updates are available. Please refresh to get the latest data and features.
        </p>
        
        <button 
          onClick={handleRefresh}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            marginBottom: '12px'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
        >
          Refresh Now
        </button>
        
        <p style={{ 
          fontSize: '12px', 
          color: '#888',
          margin: 0
        }}>
          Auto-refresh in 15 seconds...
        </p>
      </div>
    </div>
  );
};

export default CacheVersionMismatchPopup;