import React, { useState } from 'react';
import { testConnectionWithTimeout } from '../utils/databaseConnectivity';
import '../assets/components/DatabaseConnection.css';

const DatabaseConnectionStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [isTesting, setIsTesting] = useState(false);
  const [responseTime, setResponseTime] = useState<number | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const checkConnection = async () => {
    setIsTesting(true);
    try {
      const result = await testConnectionWithTimeout(3000);
      setIsConnected(result.status === 'connected');
      setLastChecked(result.lastChecked);
      setResponseTime(result.responseTime);
      setErrorMessage(result.errorMessage);
    } catch (error) {
      setIsConnected(false);
      setErrorMessage(error instanceof Error ? error.message : 'Connection failed');
    }
    setIsTesting(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const handleTogglePanel = () => {
    setShowPanel(!showPanel);
  };

  const handleTestConnection = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await checkConnection();
  };

  // Simple status indicator
  const statusIndicator = (
    <div 
      className="db-status-indicator-simple"
      onClick={handleTogglePanel}
      title="Click for database connection details"
    >
      <span className="db-dot">{isConnected ? '🟢' : '🔴'}</span>
      <span className="db-text">
        Connected to: {isConnected ? 'Custom DB' : 'Local Storage (Fallback)'}
      </span>
    </div>
  );

  // Detailed panel
  const detailPanel = showPanel ? (
    <div className="db-connection-detail-panel">
      <div className="db-panel-header">
        <div className="db-panel-title">
          <span className="db-icon">{isConnected ? '🟢' : '🔴'}</span>
          Database Connection Status
        </div>
        <button 
          className="db-panel-close"
          onClick={() => setShowPanel(false)}
          title="Close"
        >
          ✕
        </button>
      </div>
      
      <div className="db-panel-content">
        <div className="db-info-row">
          <span className="db-label">Status:</span>
          <span className={`db-value status-${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? 'Database Connected' : 'Database Disconnected'}
          </span>
        </div>
        
        <div className="db-info-row">
          <span className="db-label">Last Checked:</span>
          <span className="db-value">{formatTime(lastChecked)}</span>
        </div>
        
        <div className="db-info-row">
          <span className="db-label">Data Source:</span>
          <span className="db-value">{isConnected ? 'Custom DB' : 'Local Storage (Fallback)'}</span>
        </div>
        
        {responseTime && (
          <div className="db-info-row">
            <span className="db-label">Response Time:</span>
            <span className="db-value">{responseTime}ms</span>
          </div>
        )}
        
        {!isConnected && (
          <div className="db-connection-info">
            Connected to: Custom DB (undefined ms)
          </div>
        )}
        
        {errorMessage && (
          <div className="db-error-message">
            {errorMessage}
          </div>
        )}
        
        <div className="db-panel-actions">
          <button 
            className="db-test-button"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? '🔄 Testing...' : '🔄 Test Connection'}
          </button>
        </div>
        
        <div className="db-status-indicators">
          <div className={`db-indicator ${isConnected ? 'active' : ''}`}>
            <div className="db-indicator-dot green"></div>
            <span>Supabase</span>
          </div>
          <div className={`db-indicator ${!isConnected ? 'active' : ''}`}>
            <div className="db-indicator-dot amber"></div>
            <span>Local Storage (fallback)</span>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="db-connection-wrapper">
      {statusIndicator}
      {detailPanel}
    </div>
  );
};

export default DatabaseConnectionStatus;