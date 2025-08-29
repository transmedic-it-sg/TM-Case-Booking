import React, { useState, useRef, useEffect } from 'react';
import { testConnectionWithTimeout } from '../utils/databaseConnectivity';
import '../assets/components/DatabaseConnection.css';

const DatabaseConnectionStatusMobile: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [isTesting, setIsTesting] = useState(false);
  const [responseTime, setResponseTime] = useState<number | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Auto-close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPanel]);

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

  // Compact mobile status indicator - just the dot
  const mobileStatusIndicator = (
    <div 
      className="db-status-indicator-mobile"
      onClick={handleTogglePanel}
      title="Database connection status"
    >
      <span className="db-dot-mobile">{isConnected ? '🟢' : '🔴'}</span>
    </div>
  );

  // Detailed panel - same content but optimized for mobile
  const detailPanel = showPanel ? (
    <div className="db-connection-detail-panel mobile-optimized">
      <div className="db-panel-header">
        <div className="db-panel-title">
          <span className="db-icon">{isConnected ? '🟢' : '🔴'}</span>
          Database Connection
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
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="db-info-row">
          <span className="db-label">Data Source:</span>
          <span className="db-value">{isConnected ? 'Supabase DB' : 'Local Storage'}</span>
        </div>
        
        <div className="db-info-row">
          <span className="db-label">Last Checked:</span>
          <span className="db-value">{formatTime(lastChecked)}</span>
        </div>
        
        {responseTime && (
          <div className="db-info-row">
            <span className="db-label">Response Time:</span>
            <span className="db-value">{responseTime}ms</span>
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
            <span>Supabase Database</span>
          </div>
          <div className={`db-indicator ${!isConnected ? 'active' : ''}`}>
            <div className="db-indicator-dot amber"></div>
            <span>Local Storage</span>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="db-connection-wrapper mobile" ref={wrapperRef}>
      {mobileStatusIndicator}
      {detailPanel}
    </div>
  );
};

export default DatabaseConnectionStatusMobile;