import React, { useState, useEffect, useCallback } from 'react';
import { COUNTRIES, DEPARTMENTS } from '../types';
import { getCountries } from '../utils/codeTable';
import { getCurrentUser } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { getAllRoles } from '../data/permissionMatrixData';
import { useSound } from '../contexts/SoundContext';
import { useToast } from './ToastContainer';
import MultiSelectDropdown from './MultiSelectDropdown';
import { 
  SSOAuthFactory, 
  SSOConfig, 
  SSOUserInfo,
  getDefaultScopes, 
  isTokenExpired, 
  storeTokens, 
  getStoredTokens, 
  clearStoredTokens 
} from '../utils/ssoAuth';
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
  authenticatedUser?: SSOUserInfo;
}

interface NotificationRule {
  status: string;
  enabled: boolean;
  recipients: {
    roles: string[];
    specificEmails: string[];
    includeSubmitter: boolean;
    departmentFilter: string[]; // Only notify users in these departments
    requireSameDepartment: boolean; // Only notify if user has access to case department
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
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [emailConfigs, setEmailConfigs] = useState<Record<string, EmailConfig>>({});
  const [emailMatrixConfigs, setEmailMatrixConfigs] = useState<Record<string, EmailNotificationMatrix>>({});
  const [roleRefreshTrigger, setRoleRefreshTrigger] = useState(0);
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

  // SSO Authentication state
  const [ssoInProgress, setSsoInProgress] = useState(false);
  const [authError, setAuthError] = useState<string>('');

  // Debug logging
  console.log('EmailConfiguration Debug:', {
    currentUser: currentUser,
    userRole: currentUser?.role,
    canConfigureEmail: canConfigureEmail,
    hasPermissionCheck: currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EMAIL_CONFIG) : false
  });

  // Load countries from Global-Table
  useEffect(() => {
    const countries = getCountries();
    setAvailableCountries(countries.length > 0 ? countries : [...COUNTRIES]);
  }, []);

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
  const initializeNotificationMatrix = React.useCallback((country: string): EmailNotificationMatrix => {
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
          includeSubmitter: false,
          departmentFilter: [],
          requireSameDepartment: true
        },
        template: {
          subject: `Case Status Update: ${status}`,
          body: `A case has been updated to status: ${status}\n\nCase Reference: {{caseReference}}\nHospital: {{hospital}}\nDate: {{date}}\nSubmitted by: {{submitter}}\n\nBest regards,\nCase Booking System`
        }
      }))
    };
  }, []);

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

  // Check for stored tokens and validate authentication
  const checkStoredAuthentication = useCallback(async () => {
    if (!selectedCountry || !currentConfig.provider || !currentConfig.clientId) return;
    
    // Only support Microsoft and Google SSO
    if (currentConfig.provider === 'custom') return;

    const storedTokens = getStoredTokens(selectedCountry, currentConfig.provider);
    if (storedTokens && !isTokenExpired(storedTokens)) {
      // Valid tokens found
      setCurrentConfig(prev => ({
        ...prev,
        isAuthenticated: true,
        accessToken: storedTokens.accessToken,
        refreshToken: storedTokens.refreshToken,
        tokenExpiry: storedTokens.expiresAt
      }));

      // Try to get user info
      try {
        const ssoConfig: SSOConfig = {
          provider: currentConfig.provider as 'microsoft' | 'google',
          clientId: currentConfig.clientId,
          clientSecret: currentConfig.clientSecret,
          tenantId: currentConfig.tenantId,
          redirectUri: currentConfig.redirectUri,
          scopes: getDefaultScopes(currentConfig.provider as 'microsoft' | 'google')
        };

        const auth = SSOAuthFactory.createAuth(ssoConfig);
        const userInfo = await auth.getUserInfo(storedTokens.accessToken);
        
        setCurrentConfig(prev => ({
          ...prev,
          authenticatedUser: userInfo,
          fromEmail: prev.fromEmail || userInfo.email
        }));
      } catch (error) {
        console.error('Failed to get user info:', error);
      }
    } else if (storedTokens && storedTokens.refreshToken) {
      // Try to refresh expired tokens
      try {
        const ssoConfig: SSOConfig = {
          provider: currentConfig.provider as 'microsoft' | 'google',
          clientId: currentConfig.clientId,
          clientSecret: currentConfig.clientSecret,
          tenantId: currentConfig.tenantId,
          redirectUri: currentConfig.redirectUri,
          scopes: getDefaultScopes(currentConfig.provider as 'microsoft' | 'google')
        };

        const auth = SSOAuthFactory.createAuth(ssoConfig);
        const newTokens = await auth.refreshAccessToken(storedTokens.refreshToken);
        
        storeTokens(selectedCountry, currentConfig.provider, newTokens);
        setCurrentConfig(prev => ({
          ...prev,
          isAuthenticated: true,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          tokenExpiry: newTokens.expiresAt
        }));

        showSuccess('Token Refreshed', 'Authentication tokens have been automatically refreshed');
      } catch (error) {
        console.error('Failed to refresh tokens:', error);
        clearStoredTokens(selectedCountry, currentConfig.provider);
        setCurrentConfig(prev => ({
          ...prev,
          isAuthenticated: false,
          accessToken: undefined,
          refreshToken: undefined,
          tokenExpiry: undefined,
          authenticatedUser: undefined
        }));
      }
    }
  }, [selectedCountry, currentConfig.provider, currentConfig.clientId, currentConfig.clientSecret, currentConfig.tenantId, currentConfig.redirectUri, showSuccess]);

  // Check authentication on component mount and config changes
  useEffect(() => {
    checkStoredAuthentication();
  }, [checkStoredAuthentication]);

  // Listen for role changes in localStorage (when custom roles are added/removed)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'case-booking-custom-roles') {
        setRoleRefreshTrigger(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Force component refresh when roles change (for same-tab updates)
  useEffect(() => {
    // This effect runs when roleRefreshTrigger changes
    // It forces re-render of the notification matrix
  }, [roleRefreshTrigger]);

  const handleOAuthAuthentication = async () => {
    if (!selectedCountry) {
      showSuccess('Validation Error', 'Please select a country first');
      return;
    }

    if (!currentConfig.clientId) {
      showSuccess('Validation Error', 'Please configure Client ID first');
      return;
    }

    if (currentConfig.provider === 'custom') {
      showSuccess('Provider Not Supported', 'Custom OAuth is not yet implemented. Please use Microsoft or Google.');
      return;
    }

    setSsoInProgress(true);
    setAuthError('');

    try {
      const ssoConfig: SSOConfig = {
        provider: currentConfig.provider as 'microsoft' | 'google',
        clientId: currentConfig.clientId,
        clientSecret: currentConfig.clientSecret,
        tenantId: currentConfig.tenantId,
        redirectUri: currentConfig.redirectUri,
        scopes: getDefaultScopes(currentConfig.provider as 'microsoft' | 'google')
      };

      const auth = SSOAuthFactory.createAuth(ssoConfig);
      const authUrl = auth.getAuthorizationUrl(`${selectedCountry}_${Date.now()}`);

      // Open OAuth flow in new window
      const popup = window.open(authUrl, 'sso_auth', 'width=600,height=700,scrollbars=yes,resizable=yes');
      
      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site and try again.');
      }

      playSound.click();
      showSuccess('SSO Authentication Started', `Opening ${currentConfig.provider.toUpperCase()} authentication window...`);

      // Listen for authorization code from popup
      const handleAuthCallback = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'sso_auth_success' && event.data.code) {
          try {
            // Exchange code for tokens
            const tokens = await auth.exchangeCodeForTokens(event.data.code);
            
            // Get user information
            const userInfo = await auth.getUserInfo(tokens.accessToken);
            
            // Store tokens securely
            storeTokens(selectedCountry, currentConfig.provider, tokens);
            
            // Update configuration
            setCurrentConfig(prev => ({
              ...prev,
              isAuthenticated: true,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              tokenExpiry: tokens.expiresAt,
              authenticatedUser: userInfo,
              fromEmail: prev.fromEmail || userInfo.email
            }));

            popup.close();
            setSsoInProgress(false);
            showSuccess('Authentication Successful', `Successfully authenticated with ${currentConfig.provider.toUpperCase()} as ${userInfo.email}`);
            
          } catch (error) {
            console.error('Token exchange failed:', error);
            setAuthError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setSsoInProgress(false);
            popup.close();
          }
        } else if (event.data.type === 'sso_auth_error') {
          setAuthError(`Authentication failed: ${event.data.error}`);
          setSsoInProgress(false);
          popup.close();
        }
      };

      window.addEventListener('message', handleAuthCallback);

      // Monitor popup for manual closure
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleAuthCallback);
          if (ssoInProgress) {
            setSsoInProgress(false);
            showSuccess('Authentication Cancelled', 'Authentication window was closed');
          }
        }
      }, 1000);

    } catch (error) {
      console.error('OAuth authentication failed:', error);
      setAuthError(`Failed to start authentication: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSsoInProgress(false);
    }
  };

  const handleTestConfig = async () => {
    if (!selectedCountry) {
      showSuccess('Validation Error', 'Please select a country first');
      return;
    }

    if (!currentConfig.isAuthenticated || !currentConfig.accessToken) {
      showSuccess('Authentication Required', 'Please authenticate with SSO first');
      return;
    }

    if (!currentConfig.fromEmail) {
      showSuccess('Configuration Required', 'Please configure From Email address first');
      return;
    }

    if (currentConfig.provider === 'custom') {
      showSuccess('Provider Not Supported', 'Custom OAuth is not yet implemented. Please use Microsoft or Google.');
      return;
    }

    try {
      const ssoConfig: SSOConfig = {
        provider: currentConfig.provider as 'microsoft' | 'google',
        clientId: currentConfig.clientId,
        clientSecret: currentConfig.clientSecret,
        tenantId: currentConfig.tenantId,
        redirectUri: currentConfig.redirectUri,
        scopes: getDefaultScopes(currentConfig.provider as 'microsoft' | 'google')
      };

      const auth = SSOAuthFactory.createAuth(ssoConfig);
      
      // Check if token is expired and refresh if needed
      let accessToken = currentConfig.accessToken;
      if (currentConfig.tokenExpiry && Date.now() >= currentConfig.tokenExpiry - 60000) {
        if (currentConfig.refreshToken) {
          const newTokens = await auth.refreshAccessToken(currentConfig.refreshToken);
          storeTokens(selectedCountry, currentConfig.provider, newTokens);
          setCurrentConfig(prev => ({
            ...prev,
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            tokenExpiry: newTokens.expiresAt
          }));
          accessToken = newTokens.accessToken;
        } else {
          showSuccess('Authentication Expired', 'Please re-authenticate with SSO');
          return;
        }
      }

      // Send test email
      const success = await auth.sendEmail(accessToken, {
        to: [currentConfig.fromEmail],
        subject: `Test Email from Case Booking System - ${selectedCountry}`,
        body: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #007bff;">🧪 Test Email Successful!</h2>
                <p>This is a test email from the Case Booking System email configuration.</p>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #495057;">Configuration Details:</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li><strong>Country:</strong> ${selectedCountry}</li>
                    <li><strong>Provider:</strong> ${currentConfig.provider.toUpperCase()}</li>
                    <li><strong>From Email:</strong> ${currentConfig.fromEmail}</li>
                    <li><strong>From Name:</strong> ${currentConfig.fromName}</li>
                    <li><strong>Authenticated User:</strong> ${currentConfig.authenticatedUser?.email || 'Unknown'}</li>
                  </ul>
                </div>
                
                <p>If you received this email, your SSO authentication and email sending configuration is working correctly!</p>
                
                <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
                <p style="font-size: 0.9em; color: #6c757d;">
                  <strong>Case Booking System</strong><br>
                  Test sent at: ${new Date().toLocaleString()}
                </p>
              </div>
            </body>
          </html>
        `,
        fromEmail: currentConfig.fromEmail,
        fromName: currentConfig.fromName
      });

      if (success) {
        playSound.notification();
        showSuccess('Test Email Sent', `Test email successfully sent using ${currentConfig.provider.toUpperCase()} SSO for ${selectedCountry}. Check your inbox at ${currentConfig.fromEmail}.`);
      } else {
        showSuccess('Email Send Failed', 'Failed to send test email. Please check your configuration and try again.');
      }
    } catch (error) {
      console.error('Test email failed:', error);
      showSuccess('Test Email Error', `Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDisconnectSSO = () => {
    if (!selectedCountry || !currentConfig.provider) return;

    // Clear stored tokens
    clearStoredTokens(selectedCountry, currentConfig.provider);
    
    // Reset authentication state
    setCurrentConfig(prev => ({
      ...prev,
      isAuthenticated: false,
      accessToken: undefined,
      refreshToken: undefined,
      tokenExpiry: undefined,
      authenticatedUser: undefined
    }));

    playSound.click();
    showSuccess('SSO Disconnected', `${currentConfig.provider.toUpperCase()} authentication has been disconnected for ${selectedCountry}`);
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
              {availableCountries.map(country => (
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
                <h4 style={{ color: '#495057', fontSize: '1.1rem', marginBottom: '1rem', paddingBottom: '0.5rem' }}>🏢 Email Provider</h4>
                
                <div className="form-group">
                  <label htmlFor="provider" className="required">Authentication Provider</label>
                  <select
                    id="provider"
                    value={currentConfig.provider}
                    onChange={(e) => {
                      const newProvider = e.target.value as 'microsoft' | 'google' | 'custom';
                      handleConfigChange('provider', newProvider);
                      // Reset authentication state when changing provider
                      if (newProvider !== currentConfig.provider) {
                        setCurrentConfig(prev => ({
                          ...prev,
                          isAuthenticated: false,
                          accessToken: undefined,
                          refreshToken: undefined,
                          tokenExpiry: undefined,
                          authenticatedUser: undefined
                        }));
                        setAuthError('');
                      }
                    }}
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
                <h4 style={{ color: '#495057', fontSize: '1.1rem', marginBottom: '1rem', paddingBottom: '0.5rem' }}>🔑 OAuth Settings</h4>
              
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
                <h4 style={{ color: '#495057', fontSize: '1.1rem', marginBottom: '1rem', paddingBottom: '0.5rem' }}>🔓 SSO Authentication Status</h4>
                
                {/* Authentication Error Display */}
                {authError && (
                  <div style={{
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    borderRadius: '6px',
                    border: '1px solid #dc3545',
                    background: '#f8d7da',
                    color: '#721c24'
                  }}>
                    <strong>⚠️ Authentication Error:</strong> {authError}
                  </div>
                )}
                
                <div style={{
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: `2px solid ${currentConfig.isAuthenticated ? '#28a745' : ssoInProgress ? '#ffc107' : '#dc3545'}`,
                  background: currentConfig.isAuthenticated ? '#d4edda' : ssoInProgress ? '#fff3cd' : '#f8d7da',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                    {ssoInProgress ? '🔄 Authenticating...' : 
                     currentConfig.isAuthenticated ? '✅ Successfully Authenticated' : '❌ Not Authenticated'}
                  </div>
                  
                  {currentConfig.isAuthenticated && currentConfig.authenticatedUser && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      textAlign: 'left'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <div><strong>Provider:</strong> {currentConfig.provider.toUpperCase()}</div>
                        <div><strong>User:</strong> {currentConfig.authenticatedUser.name}</div>
                        <div><strong>Email:</strong> {currentConfig.authenticatedUser.email}</div>
                        <div><strong>Token Expires:</strong> {currentConfig.tokenExpiry ? new Date(currentConfig.tokenExpiry).toLocaleString() : 'Unknown'}</div>
                      </div>
                    </div>
                  )}
                  
                  <div style={{ fontSize: '0.95rem', color: '#495057', marginBottom: '1rem' }}>
                    {currentConfig.provider === 'custom' 
                      ? 'Custom OAuth authentication is not yet implemented. Please select Microsoft or Google provider.'
                      : ssoInProgress 
                        ? 'Please complete authentication in the popup window...'
                        : currentConfig.isAuthenticated 
                          ? `Connected to ${currentConfig.provider.toUpperCase()} SSO. You can now send emails securely.`
                          : `Connect your ${currentConfig.provider.toUpperCase()} account to enable email sending`}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {!currentConfig.isAuthenticated && !ssoInProgress && currentConfig.provider !== 'custom' && (
                      <button
                        onClick={handleOAuthAuthentication}
                        className="btn btn-primary btn-md"
                        disabled={!currentConfig.clientId}
                        title={!currentConfig.clientId ? 'Please configure Client ID first' : `Authenticate with ${currentConfig.provider.toUpperCase()} SSO`}
                      >
                        🔐 Connect {currentConfig.provider.toUpperCase()} SSO
                      </button>
                    )}
                    
                    {currentConfig.isAuthenticated && (
                      <button
                        onClick={handleDisconnectSSO}
                        className="btn btn-warning btn-sm"
                        title="Disconnect SSO authentication"
                      >
                        🔌 Disconnect SSO
                      </button>
                    )}
                    
                    {ssoInProgress && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#856404',
                        fontSize: '0.9rem'
                      }}>
                        <div className="spinner-border spinner-border-sm" role="status"></div>
                        <span>Waiting for authentication...</span>
                      </div>
                    )}
                  </div>
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
                    // Get all roles from role management system (includes custom roles)
                    const allRoles = getAllRoles();
                    const availableRoles = allRoles.map(role => role.id);
                    
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

                          {/* Department Filtering Section */}
                          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                            <h5 style={{ color: '#495057', fontSize: '0.9rem', margin: '0 0 1rem 0', fontWeight: '600' }}>
                              🏥 Department-Based Filtering
                            </h5>
                            
                            <div style={{ marginBottom: '1rem' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={rule.recipients.requireSameDepartment}
                                  onChange={(e) => updateNotificationRule(index, {
                                    recipients: { ...rule.recipients, requireSameDepartment: e.target.checked }
                                  })}
                                  style={{ transform: 'scale(1.1)' }}
                                />
                                <span style={{ fontWeight: '500', color: '#495057' }}>
                                  🎯 Only notify users with access to case department
                                </span>
                              </label>
                              <small style={{ color: '#6c757d', fontSize: '0.8rem', marginLeft: '1.5rem' }}>
                                Users must have the same department as the case to receive notifications
                              </small>
                            </div>

                            <div>
                              <MultiSelectDropdown
                                id={`departments-${index}`}
                                label="🏥 Additional Department Filter (Optional)"
                                options={DEPARTMENTS}
                                value={rule.recipients.departmentFilter}
                                onChange={(selectedDepartments: string[]) => {
                                  updateNotificationRule(index, {
                                    recipients: { ...rule.recipients, departmentFilter: selectedDepartments }
                                  });
                                }}
                                placeholder="Select specific departments to include..."
                              />
                              <small style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                                If specified, only users in these departments will be notified (in addition to department access requirement above)
                              </small>
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
                <div style={{ marginBottom: '2rem', padding: '1rem', background: '#e8f4fd', borderRadius: '8px', border: '1px solid #2196f3' }}>
                  <h4 style={{ color: '#1976d2', margin: '0 0 0.5rem 0' }}>🔐 SSO Authentication Setup</h4>
                  <p style={{ margin: '0', fontSize: '0.9rem', color: '#37474f' }}>
                    This system uses modern OAuth 2.0 / OpenID Connect for secure email sending. 
                    Follow the steps below to configure SSO authentication with your email provider.
                  </p>
                </div>

                <ul style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                  <li><strong>🏢 Microsoft 365 / Entra ID Setup:</strong> 
                    <br/>1. Go to <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer">Azure Portal → App Registrations</a>
                    <br/>2. Click "New registration" and create "Case Booking Email Integration"
                    <br/>3. Set redirect URI (Web): <code style={{ background: '#f1f3f4', padding: '2px 4px', borderRadius: '3px' }}>{currentConfig.redirectUri}</code>
                    <br/>4. Go to "API permissions" → "Add a permission" → Microsoft Graph:
                    <br/>&nbsp;&nbsp;&nbsp;• <strong>Mail.Send</strong> (Delegated) - Send mail as the signed-in user
                    <br/>&nbsp;&nbsp;&nbsp;• <strong>User.Read</strong> (Delegated) - Read user profile
                    <br/>5. Grant admin consent if required for your organization
                    <br/>6. Copy <strong>Application (client) ID</strong> and <strong>Directory (tenant) ID</strong>
                    <br/>7. Optionally create a client secret for enhanced security
                  </li>
                  
                  <li style={{ marginTop: '1.5rem' }}><strong>🎯 Google Workspace / Gmail Setup:</strong>
                    <br/>1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console → Credentials</a>
                    <br/>2. Create new project or select existing project
                    <br/>3. Enable the Gmail API: Go to "APIs & Services" → "Library" → Search "Gmail API" → Enable
                    <br/>4. Create OAuth 2.0 Client ID:
                    <br/>&nbsp;&nbsp;&nbsp;• Application type: Web application
                    <br/>&nbsp;&nbsp;&nbsp;• Name: Case Booking Email Integration
                    <br/>&nbsp;&nbsp;&nbsp;• Authorized redirect URI: <code style={{ background: '#f1f3f4', padding: '2px 4px', borderRadius: '3px' }}>{currentConfig.redirectUri}</code>
                    <br/>5. Copy <strong>Client ID</strong> and <strong>Client Secret</strong>
                    <br/>6. Configure OAuth consent screen with your organization details
                  </li>
                  
                  <li style={{ marginTop: '1.5rem' }}><strong>🔒 Security & Best Practices:</strong>
                    <br/>• <strong>Principle of Least Privilege:</strong> Only request necessary scopes (Mail.Send, User.Read)
                    <br/>• <strong>Token Management:</strong> Tokens are stored securely in browser localStorage per country
                    <br/>• <strong>Automatic Refresh:</strong> Access tokens are automatically refreshed when expired
                    <br/>• <strong>Secure Storage:</strong> Sensitive data is encrypted and isolated by country
                    <br/>• <strong>Audit Trail:</strong> All authentication events are logged for security monitoring
                    <br/>• <strong>Regular Rotation:</strong> Consider rotating client secrets every 6-12 months
                  </li>
                  
                  <li style={{ marginTop: '1.5rem' }}><strong>⚡ Troubleshooting Common Issues:</strong>
                    <br/>• <strong>Redirect URI Mismatch:</strong> Ensure the URI in your app registration exactly matches: {currentConfig.redirectUri}
                    <br/>• <strong>Popup Blocked:</strong> Allow popups for this domain in your browser settings
                    <br/>• <strong>Admin Consent Required:</strong> Your organization may require admin approval for Graph API permissions
                    <br/>• <strong>Invalid Client:</strong> Double-check your Client ID and Tenant ID are correct
                    <br/>• <strong>Scope Issues:</strong> Verify Mail.Send permission is granted and consented
                    <br/>• <strong>Token Expired:</strong> Click "Disconnect SSO" and re-authenticate if tokens are invalid
                  </li>
                  
                  <li style={{ marginTop: '1.5rem' }}><strong>🧪 Testing Your Configuration:</strong>
                    <br/>1. Complete the SSO authentication flow
                    <br/>2. Configure your "From Email" address (must match authenticated user)
                    <br/>3. Click "Test Email Sending" to send a test message
                    <br/>4. Check your inbox for the test email confirmation
                    <br/>5. Verify notification rules work by triggering case status changes
                  </li>
                </ul>
              </div>
            </CollapsibleSection>

            {/* Action Buttons */}
            <div className="config-actions">
              <button
                onClick={handleTestConfig}
                className="btn btn-info btn-md"
                disabled={!currentConfig.isAuthenticated || !currentConfig.fromEmail || currentConfig.provider === 'custom'}
                title={
                  currentConfig.provider === 'custom' ? 'Custom OAuth not supported' :
                  !currentConfig.isAuthenticated ? 'Please authenticate with SSO first' : 
                  !currentConfig.fromEmail ? 'Please configure From Email address' : 
                  'Send a test email using SSO'
                }
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