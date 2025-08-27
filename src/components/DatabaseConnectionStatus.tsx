import React, { useState, useEffect } from 'react';
import { ConnectionStatus, connectionMonitor } from '../utils/databaseConnectionMonitor';
import '../assets/components/DatabaseConnection.css';

interface DatabaseConnectionStatusProps {
  onFallbackWarning?: () => void;
}

const DatabaseConnectionStatus: React.FC<DatabaseConnectionStatusProps> = ({ onFallbackWarning }) => {
  const [status, setStatus] = useState<ConnectionStatus>(connectionMonitor.getStatus());
  const [showModal, setShowModal] = useState(false);
  const [showFallbackWarning, setShowFallbackWarning] = useState(false);

  useEffect(() => {
    const handleStatusChange = (newStatus: ConnectionStatus) => {
      setStatus(newStatus);

      // Show modal when connection is lost and retrying
      if (!newStatus.isConnected && newStatus.isRetrying) {
        setShowModal(true);
      }

      // Show fallback warning when fallback mode is activated
      if (newStatus.fallbackMode && !showFallbackWarning) {
        setShowFallbackWarning(true);
        if (onFallbackWarning) {
          onFallbackWarning();
        }
      }

      // Hide modal when connection is restored
      if (newStatus.isConnected && !newStatus.isRetrying) {
        setShowModal(false);
        setShowFallbackWarning(false);
      }
    };

    connectionMonitor.addListener(handleStatusChange);

    return () => {
      connectionMonitor.removeListener(handleStatusChange);
    };
  }, [onFallbackWarning, showFallbackWarning]);

  const handleRetry = async () => {
    const reconnected = await connectionMonitor.forceReconnect();
    if (reconnected) {
      setShowModal(false);
      setShowFallbackWarning(false);
    }
  };

  const handleUseFallback = () => {
    setShowModal(false);
    setShowFallbackWarning(true);
  };

  const closeFallbackWarning = () => {
    setShowFallbackWarning(false);
  };

  // Connection retry modal
  const retryModal = showModal ? (
    <div className="db-connection-modal-overlay">
      <div className="db-connection-modal">
        <div className="db-connection-header">
          <h3>Database Connection Lost</h3>
        </div>
        <div className="db-connection-icon">
          {status.isRetrying ? (
            <div className="retry-spinner"></div>
          ) : (
            <div className="error-icon">⚠️</div>
          )}
        </div>
        
        <div className="db-connection-content">
          {status.isRetrying ? (
            <>
              <p>Attempting to reconnect to database...</p>
              <p className="retry-info">
                Retry {status.retryCount} of 3 - Next attempt in a few seconds
              </p>
            </>
          ) : (
            <>
              <p>Connection to database has been lost.</p>
              <p className="error-details">{status.lastError}</p>
            </>
          )}
        </div>

        {!status.isRetrying && (
          <div className="db-connection-actions">
            <button 
              className="btn-primary" 
              onClick={handleRetry}
              disabled={status.isRetrying}
            >
              Try Again
            </button>
            <button 
              className="btn-secondary" 
              onClick={handleUseFallback}
            >
              Work Offline
            </button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  // Fallback warning modal
  const fallbackWarningModal = showFallbackWarning ? (
    <div className="db-connection-modal-overlay">
      <div className="db-fallback-warning">
        <div className="db-connection-header">
          <h3>Working in Offline Mode</h3>
          <button className="close-btn" onClick={closeFallbackWarning}>×</button>
        </div>
        <div className="warning-icon">⚠️</div>
        <div className="warning-content">
          <p><strong>You are now working in offline mode.</strong></p>
          <p>Changes will be saved locally but will not sync to the server until connection is restored.</p>
          <p>Please ensure you have a stable internet connection and try refreshing the page.</p>
        </div>
        <div className="warning-actions">
          <button 
            className="btn-primary" 
            onClick={handleRetry}
          >
            Test Connection
          </button>
          <button 
            className="btn-secondary" 
            onClick={closeFallbackWarning}
          >
            Continue Offline
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Connection status panel matching header-stats.png design
  const statusPanel = (
    <div 
      className={`db-connection-panel ${status.fallbackMode ? 'offline' : status.isConnected ? 'online' : 'error'}`}
      onClick={() => setShowModal(true)}
      title="Click to view database connection details"
    >
      <div className="db-panel-indicator">
        {status.fallbackMode ? '📴' : status.isConnected ? '🟢' : '🔴'}
      </div>
      <div className="db-panel-text">
        {status.fallbackMode ? (
          <>
            <span className="db-status">Disconnected</span>
            <span className="db-environment">Offline Mode</span>
          </>
        ) : status.isConnected ? (
          <>
            <span className="db-status">Connected to:</span>
            <span className="db-environment">Production DB</span>
          </>
        ) : (
          <>
            <span className="db-status">Connecting to:</span>
            <span className="db-environment">Production DB</span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {statusPanel}
      {retryModal}
      {fallbackWarningModal}
    </>
  );
};

export default DatabaseConnectionStatus;