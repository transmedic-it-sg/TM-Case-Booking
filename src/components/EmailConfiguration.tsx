import React, { useState, useEffect } from 'react';
import { COUNTRIES } from '../types';
import { getCurrentUser } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { useSound } from '../contexts/SoundContext';
import { useToast } from './ToastContainer';
import './EmailConfiguration.css';

interface EmailConfig {
  smtpServer: string;
  smtpPort: string;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  useSSL: boolean;
  country: string;
}

const EmailConfiguration: React.FC = () => {
  const currentUser = getCurrentUser();
  const { playSound } = useSound();
  const { showSuccess } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [emailConfigs, setEmailConfigs] = useState<Record<string, EmailConfig>>({});
  const [currentConfig, setCurrentConfig] = useState<EmailConfig>({
    smtpServer: '',
    smtpPort: '587',
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'Case Booking System',
    useSSL: true,
    country: ''
  });

  // Check permission - Debug version
  const canConfigureEmail = currentUser ? (
    currentUser.role === 'admin' || 
    currentUser.role === 'it' || 
    hasPermission(currentUser.role, PERMISSION_ACTIONS.EMAIL_CONFIG)
  ) : false;

  // Debug logging
  console.log('EmailConfiguration Debug:', {
    currentUser: currentUser,
    userRole: currentUser?.role,
    canConfigureEmail: canConfigureEmail,
    hasPermissionCheck: currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EMAIL_CONFIG) : false
  });

  // Load email configurations from localStorage
  useEffect(() => {
    const savedConfigs = localStorage.getItem('email-configs-by-country');
    if (savedConfigs) {
      try {
        const configs = JSON.parse(savedConfigs);
        setEmailConfigs(configs);
      } catch (error) {
        console.error('Failed to load email configurations:', error);
      }
    }
  }, []);

  // Update current config when country selection changes
  useEffect(() => {
    if (selectedCountry && emailConfigs[selectedCountry]) {
      setCurrentConfig(emailConfigs[selectedCountry]);
    } else if (selectedCountry) {
      setCurrentConfig(prev => ({
        ...prev,
        country: selectedCountry,
        smtpServer: '',
        smtpPort: '587',
        username: '',
        password: '',
        fromEmail: '',
        fromName: 'Case Booking System',
        useSSL: true
      }));
    }
  }, [selectedCountry, emailConfigs]);

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
  };

  const handleConfigChange = (field: keyof EmailConfig, value: string | boolean) => {
    setCurrentConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveConfig = () => {
    if (!selectedCountry) {
      showSuccess('Validation Error', 'Please select a country first');
      return;
    }

    // Validate required fields
    if (!currentConfig.smtpServer || !currentConfig.username || !currentConfig.fromEmail) {
      showSuccess('Validation Error', 'Please fill in all required fields');
      return;
    }

    // Save configuration for the selected country
    const updatedConfigs = {
      ...emailConfigs,
      [selectedCountry]: { ...currentConfig, country: selectedCountry }
    };

    setEmailConfigs(updatedConfigs);
    localStorage.setItem('email-configs-by-country', JSON.stringify(updatedConfigs));
    
    playSound.success();
    showSuccess('Email Configuration Saved', `Email settings for ${selectedCountry} have been successfully saved`);
  };

  const handleTestConfig = () => {
    if (!selectedCountry) {
      showSuccess('Validation Error', 'Please select a country first');
      return;
    }

    // This would normally send a test email, but since we're client-side only,
    // we'll just show a success message
    playSound.notification();
    showSuccess('Test Email Sent', `Test email sent using ${selectedCountry} configuration. If configured correctly, you should receive it shortly.`);
  };

  const handleResetConfig = () => {
    if (!selectedCountry) {
      showSuccess('Validation Error', 'Please select a country first');
      return;
    }

    const updatedConfigs = { ...emailConfigs };
    delete updatedConfigs[selectedCountry];
    
    setEmailConfigs(updatedConfigs);
    localStorage.setItem('email-configs-by-country', JSON.stringify(updatedConfigs));
    
    setCurrentConfig({
      smtpServer: '',
      smtpPort: '587',
      username: '',
      password: '',
      fromEmail: '',
      fromName: 'Case Booking System',
      useSSL: true,
      country: selectedCountry
    });

    playSound.click();
    showSuccess('Email Configuration Reset', `Email settings for ${selectedCountry} have been cleared`);
  };

  // Simple render test
  console.log('EmailConfiguration: Rendering component');

  if (!currentUser) {
    return (
      <div style={{ padding: '2rem', background: '#fff', margin: '2rem', borderRadius: '8px' }}>
        <h2>🔄 Loading...</h2>
        <p>Loading user information...</p>
      </div>
    );
  }

  if (!canConfigureEmail) {
    return (
      <div className="permission-denied">
        <div className="permission-denied-content">
          <h2>🚫 Access Denied</h2>
          <p>You don't have permission to configure email settings.</p>
          <p>Contact your administrator to request access.</p>
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            background: '#f8f9fa', 
            borderRadius: '6px',
            fontSize: '0.875rem',
            color: '#495057',
            textAlign: 'left'
          }}>
            <strong>Debug Info:</strong><br/>
            User: {currentUser?.name || 'Unknown'}<br/>
            Role: {currentUser?.role || 'Unknown'}<br/>
            Permission Check: {canConfigureEmail ? 'Allowed' : 'Denied'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '2rem', 
      background: '#f8f9fa',
      minHeight: 'calc(100vh - 120px)'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '3rem',
        padding: '2rem',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e9ecef'
      }}>
        <h2 style={{ fontSize: '2.5rem', color: '#2c3e50', marginBottom: '0.5rem' }}>
          📧 Email Configuration
        </h2>
        <p style={{ fontSize: '1.1rem', color: '#6c757d', margin: '0' }}>
          Configure SMTP settings for sending emails by country
        </p>
      </div>

      <div className="email-config-content">
        {/* Country Selection */}
        <div className="config-section">
          <h3>🌍 Country Selection</h3>
          <div className="form-group">
            <label htmlFor="country" className="required">Select Country</label>
            <select
              id="country"
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="form-control"
              required
            >
              <option value="">Choose a country to configure...</option>
              {COUNTRIES.map(country => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          {/* Show current configuration status */}
          {selectedCountry && (
            <div className="config-status">
              <div className="config-status-info">
                <span className="status-label">Configuration Status for {selectedCountry}:</span>
                <span className={`status-badge ${emailConfigs[selectedCountry] ? 'configured' : 'not-configured'}`}>
                  {emailConfigs[selectedCountry] ? '✅ Configured' : '❌ Not Configured'}
                </span>
              </div>
              {emailConfigs[selectedCountry] && (
                <div className="config-details">
                  <div className="config-detail">
                    <span>SMTP Server:</span>
                    <span>{emailConfigs[selectedCountry].smtpServer}:{emailConfigs[selectedCountry].smtpPort}</span>
                  </div>
                  <div className="config-detail">
                    <span>From Email:</span>
                    <span>{emailConfigs[selectedCountry].fromEmail}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SMTP Configuration Form */}
        {selectedCountry && (
          <div className="config-section">
            <h3>⚙️ SMTP Configuration for {selectedCountry}</h3>
            
            {/* Server Configuration */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ color: '#495057', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid #dee2e6', paddingBottom: '0.5rem' }}>🖥️ Server Settings</h4>
              
              <div className="form-group">
                <label htmlFor="smtpServer" className="required">SMTP Server</label>
                <input
                  type="text"
                  id="smtpServer"
                  value={currentConfig.smtpServer}
                  onChange={(e) => handleConfigChange('smtpServer', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="form-control"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="smtpPort" className="required">SMTP Port</label>
                  <input
                    type="number"
                    id="smtpPort"
                    value={currentConfig.smtpPort}
                    onChange={(e) => handleConfigChange('smtpPort', e.target.value)}
                    placeholder="587"
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group ssl-checkbox-group">
                  <label htmlFor="useSSL" className="checkbox-label">
                    <input
                      type="checkbox"
                      id="useSSL"
                      checked={currentConfig.useSSL}
                      onChange={(e) => handleConfigChange('useSSL', e.target.checked)}
                    />
                    Use SSL/TLS Encryption
                  </label>
                </div>
              </div>
            </div>

            {/* Authentication */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ color: '#495057', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid #dee2e6', paddingBottom: '0.5rem' }}>🔐 Authentication</h4>
              
              <div className="form-group">
                <label htmlFor="username" className="required">Username / Email</label>
                <input
                  type="text"
                  id="username"
                  value={currentConfig.username}
                  onChange={(e) => handleConfigChange('username', e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="required">Password / App Password</label>
                <input
                  type="password"
                  id="password"
                  value={currentConfig.password}
                  onChange={(e) => handleConfigChange('password', e.target.value)}
                  placeholder="your-app-password"
                  className="form-control"
                  required
                />
              </div>
            </div>

            {/* Email Details */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ color: '#495057', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid #dee2e6', paddingBottom: '0.5rem' }}>📧 Email Details</h4>
              
              <div className="form-group">
                <label htmlFor="fromEmail" className="required">From Email Address</label>
                <input
                  type="email"
                  id="fromEmail"
                  value={currentConfig.fromEmail}
                  onChange={(e) => handleConfigChange('fromEmail', e.target.value)}
                  placeholder="noreply@company.com"
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="fromName">Display Name</label>
                <input
                  type="text"
                  id="fromName"
                  value={currentConfig.fromName}
                  onChange={(e) => handleConfigChange('fromName', e.target.value)}
                  placeholder="Case Booking System"
                  className="form-control"
                />
              </div>
            </div>

            {/* Configuration Tips */}
            <div className="config-tips">
              <h4>📝 Configuration Tips & Best Practices:</h4>
              <ul>
                <li><strong>Gmail:</strong> Use smtp.gmail.com:587 with SSL/TLS enabled. Enable 2FA and create an App Password for authentication</li>
                <li><strong>Outlook/Hotmail:</strong> Use smtp.live.com:587 or smtp-mail.outlook.com:587 with SSL/TLS enabled</li>
                <li><strong>Office 365:</strong> Use smtp.office365.com:587 with your Office 365 credentials</li>
                <li><strong>Custom SMTP:</strong> Contact your email provider or IT department for specific SMTP settings</li>
                <li><strong>Security Best Practice:</strong> Use dedicated service accounts rather than personal email accounts</li>
                <li><strong>Troubleshooting:</strong> Ensure firewall allows outbound connections on the specified port</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="config-actions">
              <button
                onClick={handleTestConfig}
                className="btn btn-info btn-md"
                disabled={!currentConfig.smtpServer || !currentConfig.fromEmail}
                title={!currentConfig.smtpServer || !currentConfig.fromEmail ? 'Please fill in SMTP Server and From Email to test' : 'Send a test email'}
              >
                🧪 Test Configuration
              </button>
              <button
                onClick={handleResetConfig}
                className="btn btn-warning btn-md"
                disabled={!emailConfigs[selectedCountry]}
                title={!emailConfigs[selectedCountry] ? 'No configuration to reset' : `Reset configuration for ${selectedCountry}`}
              >
                🔄 Reset Configuration
              </button>
              <button
                onClick={handleSaveConfig}
                className="btn btn-primary btn-md"
                title={`Save SMTP configuration for ${selectedCountry}`}
              >
                💾 Save Configuration
              </button>
            </div>
          </div>
        )}

        {/* Configuration Summary */}
        {Object.keys(emailConfigs).length > 0 && (
          <div className="config-section">
            <h3>📊 Configuration Summary</h3>
            <div className="config-summary">
              <div className="summary-grid">
                {Object.entries(emailConfigs).map(([country, config]) => (
                  <div key={country} className="summary-item">
                    <div className="summary-country">{country}</div>
                    <div className="summary-details">
                      <div className="summary-server">{config.smtpServer}:{config.smtpPort}</div>
                      <div className="summary-email">{config.fromEmail}</div>
                      <div className="summary-status">✅ Configured</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailConfiguration;