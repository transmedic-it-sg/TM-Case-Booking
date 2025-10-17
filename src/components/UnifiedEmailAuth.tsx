import React, { useState, useEffect } from 'react';
import { authenticateWithPopup, getStoredAuthTokens, clearAuthTokens } from '../utils/simplifiedOAuth';
import centralizedEmailService, { AdminEmailCredentials } from '../services/centralizedEmailService';
import userService from '../services/userService';

interface UnifiedEmailAuthProps {
  selectedCountry?: string; // Optional, for UI context only
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const UnifiedEmailAuth: React.FC<UnifiedEmailAuthProps> = ({
  selectedCountry, // Not used for auth, only for display
  isCollapsed,
  setIsCollapsed
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatus, setAuthStatus] = useState<{
    isAuthenticated: boolean;
    email: string;
    expiresAt: string;
    provider: string;
  } | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load authentication status (global, not country-based)
  useEffect(() => {
    loadAuthStatus();
  }, []);

  const loadAuthStatus = async () => {
    try {
      // Use centralized email service instead of direct database access
      const config = await centralizedEmailService.getAdminEmailConfig();
      if (config && config.accessToken) {
        setAuthStatus({
          isAuthenticated: true,
          email: config.fromEmail,
          expiresAt: new Date(config.expiresAt).toISOString(),
          provider: config.provider
        });
      } else {
        setAuthStatus(null);
      }
    } catch (error) {
      console.error('❌ EMAIL AUTH - Error loading auth status:', error);
      setAuthStatus(null);
    }
  };

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setMessage(null);

    try {
      const user = await userService.getCurrentUser();
      if (!user) {
        throw new Error('No user authenticated');
      }

      // Authenticate with Microsoft (global, not country-specific)
      const result = await authenticateWithPopup('global');

      if (result.tokens) {
        // Store tokens using centralized email service
        const currentUser = await userService.getCurrentUser();
        const credentials: AdminEmailCredentials = {
          provider: 'microsoft',
          clientId: process.env.REACT_APP_MICROSOFT_CLIENT_ID || '',
          tenantId: process.env.REACT_APP_MICROSOFT_TENANT_ID || '',
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: result.tokens.expiresAt,
          fromEmail: result.userInfo.email,
          fromName: result.userInfo.name || 'TM Case Booking System'
        };
        
        await centralizedEmailService.setAdminEmailConfig(
          credentials,
          currentUser?.username || 'unknown'
        );

        setAuthStatus({
          isAuthenticated: true,
          email: result.userInfo.email,
          expiresAt: new Date(result.tokens.expiresAt).toLocaleString(),
          provider: 'microsoft'
        });

        setMessage({ 
          type: 'success', 
          text: `Successfully authenticated as ${result.userInfo.email}` 
        });

        // Schedule proactive token refresh (global, no country needed)
        scheduleTokenRefresh(result.tokens.expiresAt);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Authentication failed' 
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const scheduleTokenRefresh = (expiresAt: number) => {
    // Schedule refresh 30 minutes before expiry for better reliability
    const refreshTime = expiresAt - Date.now() - (30 * 60 * 1000);
    
    if (refreshTime > 0) {
      setTimeout(async () => {
        console.log('Proactively refreshing email authentication token...');
        await refreshToken();
      }, refreshTime);
    } else {
      // Token already expired or expiring soon, refresh immediately
      console.log('Token expired or expiring soon, refreshing immediately...');
      refreshToken();
    }
  };

  const refreshToken = async () => {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase
        .from('global_email_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (!data || !data.refresh_token) return;

      // Refresh the token
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: data.client_id,
          scope: 'offline_access https://graph.microsoft.com/Mail.Send',
          refresh_token: data.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      if (response.ok) {
        const tokens = await response.json();
        
        // Update tokens in database (global)
        await supabase
          .from('global_email_config')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || data.refresh_token,
            expires_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(), // 7 days expiry
            updated_at: new Date().toISOString()
          })
          .eq('is_active', true);

        // Schedule next refresh (global, no country needed)
        scheduleTokenRefresh(Date.now() + (tokens.expires_in * 1000));
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setIsTesting(true);
    setMessage(null);

    try {
      const result = await centralizedEmailService.testAdminEmailConfig(testEmailAddress);
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Test email sent successfully to ${testEmailAddress}` 
        });
        setTestEmailAddress('');
      } else {
        setMessage({ 
          type: 'error', 
          text: result.error || 'Failed to send test email. Please check the configuration.' 
        });
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to send test email' 
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect the email account?')) return;

    try {
      const { supabase } = await import('../lib/supabase');
      
      await supabase
        .from('admin_email_configs')
        .delete()
        .eq('country', selectedCountry);

      setAuthStatus(null);
      setMessage({ 
        type: 'info', 
        text: 'Email account disconnected successfully' 
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to disconnect email account' 
      });
    }
  };

  return (
    <div className="config-section">
      <div
        className="section-header collapsible-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3>📧 System Email Configuration</h3>
          {authStatus && (
            <div className="provider-status-badge-inline">
              <span className="status-icon">✅</span>
              <span style={{ fontSize: '0.85rem' }}>
                {authStatus.email}
              </span>
            </div>
          )}
        </div>
        <span className={`chevron ${isCollapsed ? 'collapsed' : 'expanded'}`}>
          {isCollapsed ? '▶' : '▼'}
        </span>
      </div>

      {!isCollapsed && (
        <div className="section-content">
          <div style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem', 
            background: '#e3f2fd', 
            borderRadius: '8px', 
            border: '1px solid #2196f3' 
          }}>
            <h4 style={{ color: '#1976d2', margin: '0 0 0.5rem 0' }}>
              System Email Authentication
            </h4>
            <p style={{ margin: '0', color: '#37474f', fontSize: '0.9rem' }}>
              Configure a single Microsoft email account that will send all system notifications for {selectedCountry || 'this country'}. 
              This account will be used to send case updates, status changes, and other automated emails.
            </p>
          </div>

          {message && (
            <div style={{
              padding: '1rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              background: message.type === 'success' ? '#e8f5e9' : 
                         message.type === 'error' ? '#ffebee' : '#e3f2fd',
              border: `1px solid ${
                message.type === 'success' ? '#4caf50' : 
                message.type === 'error' ? '#f44336' : '#2196f3'
              }`
            }}>
              <div style={{ 
                color: message.type === 'success' ? '#2e7d32' : 
                       message.type === 'error' ? '#c62828' : '#1565c0',
                fontWeight: 500 
              }}>
                {message.text}
              </div>
            </div>
          )}

          {authStatus ? (
            <div style={{ 
              padding: '1.5rem', 
              background: '#f5f5f5', 
              borderRadius: '8px',
              border: '1px solid #ddd' 
            }}>
              <h5 style={{ marginTop: 0, color: '#2e7d32' }}>✅ Authenticated Account</h5>
              
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Email:</strong> {authStatus.email}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Provider:</strong> Microsoft
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Token Expires:</strong> {authStatus.expiresAt}
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #ddd'
              }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Test Email Delivery
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="Enter test email address"
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                    <button
                      onClick={handleTestEmail}
                      disabled={isTesting}
                      className="btn btn-primary"
                    >
                      {isTesting ? 'Sending...' : 'Send Test'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <button
                  onClick={handleDisconnect}
                  className="btn btn-danger"
                  style={{ marginRight: '1rem' }}
                >
                  Disconnect Account
                </button>
                <button
                  onClick={handleAuthenticate}
                  disabled={isAuthenticating}
                  className="btn btn-secondary"
                >
                  Re-authenticate
                </button>
              </div>
            </div>
          ) : (
            <div style={{ 
              padding: '2rem', 
              background: '#fff3cd', 
              borderRadius: '8px',
              border: '1px solid #ffc107',
              textAlign: 'center' 
            }}>
              <h5 style={{ color: '#856404', marginBottom: '1rem' }}>
                ⚠️ No Email Account Connected
              </h5>
              <p style={{ marginBottom: '1.5rem', color: '#856404' }}>
                Please authenticate with a Microsoft account to enable email notifications for {selectedCountry || 'this country'}.
              </p>
              <button
                onClick={handleAuthenticate}
                disabled={isAuthenticating || !selectedCountry}
                className="btn btn-primary btn-lg"
              >
                {isAuthenticating ? 'Authenticating...' : 'Connect Microsoft Account'}
              </button>
            </div>
          )}

          {!selectedCountry && (
            <div style={{
              padding: '1rem',
              background: '#ffebee',
              borderRadius: '8px',
              border: '1px solid #f44336',
              marginTop: '1rem'
            }}>
              <strong style={{ color: '#c62828' }}>
                Please select a country first to configure email authentication.
              </strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UnifiedEmailAuth;