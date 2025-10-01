import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseConnection } from '../hooks/useDatabaseConnection';
import { getDatabaseName } from '../utils/getDatabaseName';
import { useSound } from '../contexts/SoundContext';
import '../assets/components/DatabaseConnectivityIndicator.css';

interface DatabaseConnectivityIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

const DatabaseConnectivityIndicator: React.FC<DatabaseConnectivityIndicatorProps> = ({
  showDetails = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { playSound } = useSound();
  const {
    connectionInfo,
    displayInfo,
    isVisible,
    forceCheck,
    toggleVisibility,
    isConnected,
    isChecking,
    usingFallback
  } = useDatabaseConnection();

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Handle panel toggle with sound
  const handleToggleVisibility = () => {
    if (!isVisible) {
      playSound.click(); // Play sound when opening the panel
    }
    toggleVisibility();
  };

  // Check if mobile device
  const isMobile = () => {
    return window.innerWidth <= 1366;
  };

  // Get position of database indicator for mobile positioning
  const getIndicatorPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return {
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: Math.min(320, window.innerWidth - 24)
      };
    }
    return { top: 80, left: 12, width: 320 };
  };

  // Handle click outside to close panel (with touch support for mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element;

      // Don't close if clicking inside the panel or the indicator
      if (isVisible &&
          containerRef.current &&
          !containerRef.current.contains(target) &&
          panelRef.current &&
          !panelRef.current.contains(target)) {
        toggleVisibility();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isVisible, toggleVisibility]);

  // Handle escape key to close panel
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (isVisible && event.key === 'Escape') {
        toggleVisibility();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isVisible, toggleVisibility]);

  return (
    <div ref={containerRef} className={`database-connectivity-indicator ${className}`}>
      {/* Always visible status light */}
      <div
        className={`connection-status-light ${connectionInfo.status}`}
        onClick={handleToggleVisibility}
        title={`${displayInfo.text} - Click for details`}
      >
        <div className="status-light">
          <div
            className={`light-dot ${isChecking ? 'pulse' : ''}`}
            style={{ backgroundColor: displayInfo.color }}
          ></div>
        </div>
        {showDetails && (
          <span className="status-text">{displayInfo.text}</span>
        )}
        <span className="database-name">
          Connected to: {isConnected ? getDatabaseName() : 'Local Storage (Fallback)'}
        </span>
      </div>

      {/* Database panel - only show when clicked */}
      {isVisible && (() => {
        const position = getIndicatorPosition();
        const panelContent = (
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
              zIndex: 50000,
              backgroundColor: 'white',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              maxHeight: '80vh',
              overflow: 'hidden',
              pointerEvents: 'auto'
            }}
          >
            <div className="panel-header">
              <div className="panel-title">
                <span className="status-icon">{displayInfo.icon}</span>
                Database Connection Status
              </div>
              <button
                className="close-button"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling
                  toggleVisibility();
                }}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="panel-content">
              <div className="status-row">
                <span className="label">Status:</span>
                <span className={`status-value ${connectionInfo.status}`}>
                  {displayInfo.text}
                </span>
              </div>

              <div className="status-row">
                <span className="label">Last Checked:</span>
                <span className="value">{formatTimestamp(connectionInfo.lastChecked)}</span>
              </div>

              {connectionInfo.responseTime && (
                <div className="status-row">
                  <span className="label">Response Time:</span>
                  <span className="value">{connectionInfo.responseTime}ms</span>
                </div>
              )}

              <div className="status-row">
                <span className="label">Data Source:</span>
                <span className="value">
                  {isConnected ? getDatabaseName() : 'Local Storage (Fallback)'}
                </span>
              </div>

              {connectionInfo.errorMessage && (
                <div className="status-row error">
                  <span className="label">Error:</span>
                  <span className="value">{connectionInfo.errorMessage}</span>
                </div>
              )}

              <div className="description">
                {displayInfo.description}
              </div>
            </div>

            <div className="panel-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling
                  forceCheck();
                }}
                disabled={isChecking}
              >
                {isChecking ? '🔄 Testing...' : '🔄 Test Connection'}
              </button>
            </div>

            {/* Connection indicators */}
            <div className="connection-indicators">
              <div className={`indicator ${isConnected ? 'active' : ''}`}>
                <div className="indicator-dot green"></div>
                <span>Supabase</span>
              </div>
              <div className={`indicator ${usingFallback ? 'active' : ''}`}>
                <div className="indicator-dot amber"></div>
                <span>Local Storage (Fallback)</span>
              </div>
            </div>
          </div>
        );

        // FORCE RENDER AT DOCUMENT BODY LEVEL TO BYPASS ALL CSS
        return createPortal(panelContent, document.body);
      })()}

    </div>
  );
};

export default DatabaseConnectivityIndicator;