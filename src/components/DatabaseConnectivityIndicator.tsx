import React from 'react';
import { useDatabaseConnection } from '../hooks/useDatabaseConnection';
import './DatabaseConnectivityIndicator.css';

interface DatabaseConnectivityIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

const DatabaseConnectivityIndicator: React.FC<DatabaseConnectivityIndicatorProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
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

  return (
    <div className={`database-connectivity-indicator ${className}`}>
      {/* Always visible status light */}
      <div 
        className={`connection-status-light ${connectionInfo.status}`}
        onClick={toggleVisibility}
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
      </div>

      {/* Detailed info panel */}
      {isVisible && (
        <div className="connection-details-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="status-icon">{displayInfo.icon}</span>
              Database Connection Status
            </div>
            <button 
              className="close-button"
              onClick={toggleVisibility}
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
                {isConnected ? 'Supabase Database' : 'Local Storage (Fallback)'}
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
              onClick={forceCheck}
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
              <span>Fallback</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseConnectivityIndicator;