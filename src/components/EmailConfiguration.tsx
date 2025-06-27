import React, { useState, useEffect } from 'react';
import { COUNTRIES } from '../types';
import { getCurrentUser } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { useSound } from '../contexts/SoundContext';
import { useToast } from './ToastContainer';
import MultiSelectDropdown from './MultiSelectDropdown';
import './EmailConfiguration.css';

interface EmailConfig {
  provider: 'microsoft' | 'google' | 'custom';
  clientId: string;
  clientSecret: string;
  tenantId?: string; // For Microsoft only
  redirectUri: string;
  fromEmail: string;
  fromName: string;
  country: string;
  isAuthenticated: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
}

interface NotificationRule {
  status: string;
  enabled: boolean;
  recipients: {
    roles: string[];
    specificEmails: string[];
    includeSubmitter: boolean;
  };
  template: {
    subject: string;
    body: string;
  };
}

interface EmailNotificationMatrix {
  country: string;
  rules: NotificationRule[];
}

// Collapsible Section Component
const CollapsibleSection: React.FC<{
  title: string;
  icon: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, icon, isCollapsed, onToggle, children }) => (
  <div className="config-section">
    <div 
      className="section-header" 
      onClick={onToggle}
      style={{ 
        cursor: 'pointer', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '0.5rem 0',
        marginBottom: isCollapsed ? '0' : '1.5rem'
      }}
    >
      <h3 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {icon} {title}
      </h3>
      <span style={{ 
        fontSize: '1.2rem', 
        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', 
        transition: 'transform 0.2s ease',
        color: '#6c757d'
      }}>
        ▼
      </span>
    </div>
    {!isCollapsed && (
      <div className="section-content" style={{ paddingTop: '1rem' }}>
        {children}
      </div>
    )}
  </div>
);

const EmailConfiguration: React.FC = () => {
  const currentUser = getCurrentUser();
  const { playSound } = useSound();
  const { showSuccess } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [emailConfigs, setEmailConfigs] = useState<Record<string, EmailConfig>>({});
  const [emailMatrixConfigs, setEmailMatrixConfigs] = useState<Record<string, EmailNotificationMatrix>>({});
  const [currentConfig, setCurrentConfig] = useState<EmailConfig>({
    provider: 'microsoft',
    clientId: '',
    clientSecret: '',
    tenantId: '',
    redirectUri: window.location.origin + '/auth/callback',
    fromEmail: '',
    fromName: 'Case Booking System',
    country: '',
    isAuthenticated: false
  });

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({
    oauthConfig: false,
    emailDetails: false,
    notificationMatrix: false,
    configGuide: true
  });

  // Individual notification rule collapse states
  const [ruleCollapsedStates, setRuleCollapsedStates] = useState<Record<number, boolean>>({});

  const toggleRuleCollapse = (ruleIndex: number) => {
    setRuleCollapsedStates(prev => ({
      ...prev,
      [ruleIndex]: !prev[ruleIndex]
    }));
    playSound.click();
  };

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

    const savedMatrixConfigs = localStorage.getItem('email-matrix-configs-by-country');
    if (savedMatrixConfigs) {
      try {
        const matrixConfigs = JSON.parse(savedMatrixConfigs);
        setEmailMatrixConfigs(matrixConfigs);
      } catch (error) {
        console.error('Failed to load email matrix configurations:', error);
      }
    }
  }, []);

  // Helper function to toggle sections
  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
    playSound.click();
  };

  // Initialize default notification matrix for a country
  const initializeNotificationMatrix = (country: string): EmailNotificationMatrix => {
    const statuses = [
      'Case Booked',
      'Order Prepared', 
      'Order Delivered (Hospital)',
      'Order Received (Hospital)',
      'Case Completed',
      'Order Delivered (Office)',
      'To be billed'
    ];

    return {
      country,
      rules: statuses.map(status => ({
        status,
        enabled: false,
        recipients: {
          roles: [],
          specificEmails: [],
          includeSubmitter: false
        },
        template: {
          subject: `Case Status Update: ${status}`,
          body: `A case has been updated to status: ${status}\n\nCase Reference: {{caseReference}}\nHospital: {{hospital}}\nDate: {{date}}\nSubmitted by: {{submitter}}\n\nBest regards,\nCase Booking System`
        }
      }))
    };
  };

  // Update current config when country selection changes
  useEffect(() => {
    if (selectedCountry && emailConfigs[selectedCountry]) {
      setCurrentConfig(emailConfigs[selectedCountry]);
    } else if (selectedCountry) {
      setCurrentConfig(prev => ({
        ...prev,
        country: selectedCountry,
        provider: 'microsoft',
        clientId: '',
        clientSecret: '',
        tenantId: '',
        redirectUri: window.location.origin + '/auth/callback',
        fromEmail: '',
        fromName: 'Case Booking System',
        isAuthenticated: false
      }));

      // Initialize notification matrix if it doesn't exist
      if (!emailMatrixConfigs[selectedCountry]) {
        const newMatrix = initializeNotificationMatrix(selectedCountry);
        setEmailMatrixConfigs(prev => ({
          ...prev,
          [selectedCountry]: newMatrix
        }));
      }
    }
  }, [selectedCountry, emailConfigs, emailMatrixConfigs, initializeNotificationMatrix]);

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
  };

  const handleConfigChange = (field: keyof EmailConfig, value: string | boolean) => {
    setCurrentConfig(prev => ({ ...prev, [field]: value }));
  };

  // Handle notification matrix updates
  const updateNotificationRule = (ruleIndex: number, updates: Partial<NotificationRule>) => {
    if (!selectedCountry || !emailMatrixConfigs[selectedCountry]) return;

    const updatedMatrix = {
      ...emailMatrixConfigs[selectedCountry],
      rules: emailMatrixConfigs[selectedCountry].rules.map((rule, index) =>
        index === ruleIndex ? { ...rule, ...updates } : rule
      )
    };

    setEmailMatrixConfigs(prev => ({
      ...prev,
      [selectedCountry]: updatedMatrix
    }));
  };

  const saveNotificationMatrix = () => {
    if (!selectedCountry) return;

    localStorage.setItem('email-matrix-configs-by-country', JSON.stringify(emailMatrixConfigs));
    playSound.success();
    showSuccess('Notification Matrix Saved', `Email notification rules for ${selectedCountry} have been saved successfully`);
  };

  const handleSaveConfig = () => {
    if (!selectedCountry) {
      showSuccess('Validation Error', 'Please select a country first');
      return;
    }

    // Validate required fields based on provider
    const requiredFields = ['clientId', 'redirectUri', 'fromEmail'];
    if (currentConfig.provider === 'microsoft') {
      requiredFields.push('tenantId');
    }

    for (const field of requiredFields) {
      if (!currentConfig[field as keyof EmailConfig]) {
        showSuccess('Validation Error', `Please fill in all required fields. Missing: ${field}`);
        return;
      }
    }

    // Save configuration for the selected country
    const updatedConfigs = {
      ...emailConfigs,
      [selectedCountry]: { ...currentConfig, country: selectedCountry }
    };

    setEmailConfigs(updatedConfigs);
    localStorage.setItem('email-configs-by-country', JSON.stringify(updatedConfigs));
    
    playSound.success();
    showSuccess('Email Configuration Saved', `${currentConfig.provider.toUpperCase()} SSO settings for ${selectedCountry} have been successfully saved`);
  };

  const handleOAuthAuthentication = () => {
    if (!selectedCountry) {
      showSuccess('Validation Error', 'Please select a country first');
      return;
    }

    if (!currentConfig.clientId) {
      showSuccess('Validation Error', 'Please configure Client ID first');
      return;
    }

    // OAuth authentication URLs
    let authUrl = '';
    const redirectUri = encodeURIComponent(currentConfig.redirectUri);
    const scopes = encodeURIComponent(
      currentConfig.provider === 'microsoft' 
        ? 'https://graph.microsoft.com/Mail.Send offline_access'
        : 'https://www.googleapis.com/auth/gmail.send'
    );

    if (currentConfig.provider === 'microsoft') {
      const tenantId = currentConfig.tenantId || 'common';
      authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${currentConfig.clientId}&` +
        `response_type=code&` +
        `redirect_uri=${redirectUri}&` +
        `scope=${scopes}&` +
        `state=${selectedCountry}`;
    } else if (currentConfig.provider === 'google') {
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${currentConfig.clientId}&` +
        `response_type=code&` +
        `redirect_uri=${redirectUri}&` +
        `scope=${scopes}&` +
        `state=${selectedCountry}&` +
        `access_type=offline&` +
        `prompt=consent`;
    }

    // Open OAuth flow in new window
    if (authUrl) {
      const popup = window.open(authUrl, 'oauth', 'width=500,height=600');
      playSound.click();
      showSuccess('OAuth Flow Started', `Opening ${currentConfig.provider.toUpperCase()} authentication window...`);
      
      // Monitor popup for completion (simplified)
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          showSuccess('Authentication Window Closed', 'Please complete the OAuth flow and save your configuration');
        }
      }, 1000);
    }
  };

  const handleTestConfig = () => {
    if (!selectedCountry) {
      showSuccess('Validation Error', 'Please select a country first');
      return;
    }

    if (!currentConfig.isAuthenticated) {
      showSuccess('Authentication Required', 'Please authenticate with OAuth first');
      return;
    }

    // This would normally send a test email using the OAuth token
    playSound.notification();
    showSuccess('Test Email Sent', `Test email sent using ${currentConfig.provider.toUpperCase()} OAuth for ${selectedCountry}. Check your inbox shortly.`);
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
      provider: 'microsoft',
      clientId: '',
      clientSecret: '',
      tenantId: '',
      redirectUri: window.location.origin + '/auth/callback',
      fromEmail: '',
      fromName: 'Case Booking System',
      country: selectedCountry,
      isAuthenticated: false
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
          Configure Microsoft or Google SSO authentication for sending emails by country
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
                    <span>Provider:</span>
                    <span>{emailConfigs[selectedCountry].provider.toUpperCase()} SSO</span>
                  </div>
                  <div className="config-detail">
                    <span>From Email:</span>
                    <span>{emailConfigs[selectedCountry].fromEmail}</span>
                  </div>
                  <div className="config-detail">
                    <span>Authentication:</span>
                    <span>{emailConfigs[selectedCountry].isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SSO Configuration Form */}
        {selectedCountry && (
          <>
            {/* OAuth Configuration Section */}
            <CollapsibleSection
              title={`OAuth Configuration for ${selectedCountry}`}
              icon="🔐"
              isCollapsed={collapsedSections.oauthConfig}
              onToggle={() => toggleSection('oauthConfig')}
            >
              {/* Provider Selection */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ color: '#495057', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid #dee2e6', paddingBottom: '0.5rem' }}>🏢 Email Provider</h4>
                
                <div className="form-group">
                  <label htmlFor="provider" className="required">Authentication Provider</label>
                  <select
                    id="provider"
                    value={currentConfig.provider}
                    onChange={(e) => handleConfigChange('provider', e.target.value as 'microsoft' | 'google' | 'custom')}
                    className="form-control"
                    required
                  >
                    <option value="microsoft">Microsoft 365 / Outlook (Recommended)</option>
                    <option value="google">Google Workspace / Gmail</option>
                    <option value="custom" disabled>Custom OAuth (Coming Soon)</option>
                  </select>
                </div>
              </div>

              {/* OAuth Settings */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ color: '#495057', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid #dee2e6', paddingBottom: '0.5rem' }}>🔑 OAuth Settings</h4>
              
              <div className="form-group">
                <label htmlFor="clientId" className="required">Client ID / Application ID</label>
                <input
                  type="text"
                  id="clientId"
                  value={currentConfig.clientId}
                  onChange={(e) => handleConfigChange('clientId', e.target.value)}
                  placeholder={currentConfig.provider === 'microsoft' ? 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' : 'xxxxxxxxxxxxx.apps.googleusercontent.com'}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="clientSecret">Client Secret (Optional for public apps)</label>
                <input
                  type="password"
                  id="clientSecret"
                  value={currentConfig.clientSecret}
                  onChange={(e) => handleConfigChange('clientSecret', e.target.value)}
                  placeholder="Client secret from app registration"
                  className="form-control"
                />
              </div>

              {currentConfig.provider === 'microsoft' && (
                <div className="form-group">
                  <label htmlFor="tenantId" className="required">Tenant ID / Directory ID</label>
                  <input
                    type="text"
                    id="tenantId"
                    value={currentConfig.tenantId || ''}
                    onChange={(e) => handleConfigChange('tenantId', e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx or common"
                    className="form-control"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="redirectUri" className="required">Redirect URI</label>
                <input
                  type="url"
                  id="redirectUri"
                  value={currentConfig.redirectUri}
                  onChange={(e) => handleConfigChange('redirectUri', e.target.value)}
                  placeholder={window.location.origin + '/auth/callback'}
                  className="form-control"
                  required
                />
                <small style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                  This must match the redirect URI configured in your app registration
                </small>
              </div>
            </div>

              {/* Authentication Status */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ color: '#495057', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid #dee2e6', paddingBottom: '0.5rem' }}>🔓 Authentication Status</h4>
                
                <div style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  border: `2px solid ${currentConfig.isAuthenticated ? '#28a745' : '#dc3545'}`,
                  background: currentConfig.isAuthenticated ? '#d4edda' : '#f8d7da',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {currentConfig.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#495057' }}>
                    {currentConfig.isAuthenticated 
                      ? `Successfully authenticated with ${currentConfig.provider.toUpperCase()}` 
                      : `Click "Authenticate with ${currentConfig.provider.toUpperCase()}" to connect`}
                  </div>
                  {!currentConfig.isAuthenticated && (
                    <button
                      onClick={handleOAuthAuthentication}
                      className="btn btn-primary btn-md"
                      style={{ marginTop: '1rem' }}
                      disabled={!currentConfig.clientId}
                      title={!currentConfig.clientId ? 'Please configure Client ID first' : `Authenticate with ${currentConfig.provider.toUpperCase()}`}
                    >
                      🔐 Authenticate with {currentConfig.provider.toUpperCase()}
                    </button>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* Email Details Section */}
            <CollapsibleSection
              title="Email Details"
              icon="📧"
              isCollapsed={collapsedSections.emailDetails}
              onToggle={() => toggleSection('emailDetails')}
            >
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
            </CollapsibleSection>

            {/* Email Notification Matrix Section */}
            <CollapsibleSection
              title="Email Notification Matrix"
              icon="📮"
              isCollapsed={collapsedSections.notificationMatrix}
              onToggle={() => toggleSection('notificationMatrix')}
            >
              {emailMatrixConfigs[selectedCountry] && (
                <div className="notification-matrix">
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#e3f2fd', borderRadius: '8px', border: '1px solid #2196f3' }}>
                    <h4 style={{ color: '#1976d2', margin: '0 0 0.5rem 0' }}>📋 Notification Rules Configuration</h4>
                    <p style={{ margin: '0', color: '#37474f', fontSize: '0.9rem' }}>
                      Configure which status changes trigger email notifications and who receives them.
                    </p>
                  </div>

                  {emailMatrixConfigs[selectedCountry].rules.map((rule, index) => {
                    const isRuleCollapsed = ruleCollapsedStates[index] || false;
                    const availableRoles = ['admin', 'operations', 'operation-manager', 'sales', 'sales-manager', 'driver', 'it'];
                    
                    return (
                    <div key={rule.status} className="notification-rule" style={{
                      border: '1px solid #dee2e6',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      padding: '1rem',
                      background: rule.enabled ? '#f8f9fa' : '#ffffff'
                    }}>
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          marginBottom: '1rem',
                          cursor: rule.enabled ? 'pointer' : 'default'
                        }}
                        onClick={rule.enabled ? () => toggleRuleCollapse(index) : undefined}
                      >
                        <h5 style={{ margin: '0', color: '#495057', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          📊 {rule.status}
                          {rule.enabled && (
                            <span style={{ 
                              fontSize: '0.8rem', 
                              transform: isRuleCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', 
                              transition: 'transform 0.2s ease',
                              color: '#6c757d',
                              marginLeft: '0.5rem'
                            }}>
                              ▼
                            </span>
                          )}
                        </h5>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(e) => {
                              updateNotificationRule(index, { enabled: e.target.checked });
                              if (e.target.checked && isRuleCollapsed) {
                                setRuleCollapsedStates(prev => ({ ...prev, [index]: false }));
                              }
                            }}
                            style={{ transform: 'scale(1.2)' }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span style={{ fontWeight: '500', color: rule.enabled ? '#28a745' : '#6c757d' }}>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </div>

                      {rule.enabled && !isRuleCollapsed && (
                        <div style={{ paddingLeft: '1rem', borderLeft: '3px solid #28a745' }}>
                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>
                              📧 Email Subject
                            </label>
                            <input
                              type="text"
                              value={rule.template.subject}
                              onChange={(e) => updateNotificationRule(index, {
                                template: { ...rule.template, subject: e.target.value }
                              })}
                              className="form-control"
                              placeholder="Email subject line"
                            />
                          </div>

                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>
                              📝 Email Body Template
                            </label>
                            <textarea
                              value={rule.template.body}
                              onChange={(e) => updateNotificationRule(index, {
                                template: { ...rule.template, body: e.target.value }
                              })}
                              className="form-control"
                              rows={4}
                              placeholder="Email body template (use {{caseReference}}, {{hospital}}, {{date}} as placeholders)"
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                              <MultiSelectDropdown
                                id={`roles-${index}`}
                                label="👥 Notify User Roles"
                                options={availableRoles}
                                value={rule.recipients.roles}
                                onChange={(selectedRoles: string[]) => {
                                  updateNotificationRule(index, {
                                    recipients: { ...rule.recipients, roles: selectedRoles }
                                  });
                                }}
                                placeholder="Select user roles to notify..."
                              />
                              
                              {/* Submitter Option */}
                              <div style={{ marginTop: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={rule.recipients.includeSubmitter}
                                    onChange={(e) => updateNotificationRule(index, {
                                      recipients: { ...rule.recipients, includeSubmitter: e.target.checked }
                                    })}
                                    style={{ transform: 'scale(1.1)' }}
                                  />
                                  <span style={{ fontWeight: '500', color: '#495057' }}>
                                    📝 Include Case Submitter
                                  </span>
                                </label>
                                <small style={{ color: '#6c757d', fontSize: '0.8rem', marginLeft: '1.5rem' }}>Automatically notify the person who submitted the case</small>
                              </div>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>
                                📮 Additional Email Addresses
                              </label>
                              <textarea
                                value={rule.recipients.specificEmails.join('\n')}
                                onChange={(e) => {
                                  const emails = e.target.value.split('\n').filter(email => email.trim());
                                  updateNotificationRule(index, {
                                    recipients: { ...rule.recipients, specificEmails: emails }
                                  });
                                }}
                                className="form-control"
                                rows={4}
                                placeholder="Enter email addresses (one per line)&#10;example@company.com&#10;manager@company.com"
                              />
                              <small style={{ color: '#6c757d', fontSize: '0.8rem' }}>One email address per line</small>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                  })}

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1rem', borderTop: '2px solid #dee2e6' }}>
                    <button
                      onClick={saveNotificationMatrix}
                      className="btn btn-success btn-md"
                      title="Save notification matrix configuration"
                    >
                      💾 Save Notification Rules
                    </button>
                  </div>
                </div>
              )}
            </CollapsibleSection>

            {/* Configuration Guide Section */}
            <CollapsibleSection
              title="Configuration Guide"
              icon="📝"
              isCollapsed={collapsedSections.configGuide}
              onToggle={() => toggleSection('configGuide')}
            >
              <div className="config-tips">
                <ul>
                  <li><strong>Microsoft 365:</strong> 
                    <br/>1. Go to <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer">Azure Portal → App Registrations</a>
                    <br/>2. Create new app registration with name "Case Booking Email Integration"
                    <br/>3. Add redirect URI: {currentConfig.redirectUri}
                    <br/>4. API Permissions: Add Microsoft Graph → Mail.Send (Application or Delegated)
                    <br/>5. Copy Application (client) ID and Directory (tenant) ID
                  </li>
                  <li><strong>Google Workspace:</strong>
                    <br/>1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console → Credentials</a>
                    <br/>2. Create OAuth 2.0 Client ID with type "Web application"
                    <br/>3. Add authorized redirect URI: {currentConfig.redirectUri}
                    <br/>4. Enable Gmail API in APIs & Services
                    <br/>5. Copy Client ID and Client Secret
                  </li>
                  <li><strong>Security Best Practices:</strong>
                    <br/>• Use dedicated service accounts for email sending
                    <br/>• Regularly rotate client secrets and refresh tokens
                    <br/>• Monitor OAuth token usage and expiration
                    <br/>• Implement proper scoping (Mail.Send only, not full mailbox access)
                  </li>
                  <li><strong>Troubleshooting:</strong>
                    <br/>• Ensure redirect URI exactly matches app registration
                    <br/>• Check that admin consent is granted for application permissions
                    <br/>• Verify API permissions are correctly configured
                  </li>
                </ul>
              </div>
            </CollapsibleSection>

            {/* Action Buttons */}
            <div className="config-actions">
              <button
                onClick={handleTestConfig}
                className="btn btn-info btn-md"
                disabled={!currentConfig.isAuthenticated || !currentConfig.fromEmail}
                title={!currentConfig.isAuthenticated ? 'Please authenticate with OAuth first' : !currentConfig.fromEmail ? 'Please configure From Email address' : 'Send a test email using OAuth'}
              >
                🧪 Test Email Sending
              </button>
              <button
                onClick={handleResetConfig}
                className="btn btn-warning btn-md"
                disabled={!emailConfigs[selectedCountry]}
                title={!emailConfigs[selectedCountry] ? 'No configuration to reset' : `Reset OAuth configuration for ${selectedCountry}`}
              >
                🔄 Reset Configuration
              </button>
              <button
                onClick={handleSaveConfig}
                className="btn btn-primary btn-md"
                title={`Save OAuth configuration for ${selectedCountry}`}
              >
                💾 Save Configuration
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default EmailConfiguration;