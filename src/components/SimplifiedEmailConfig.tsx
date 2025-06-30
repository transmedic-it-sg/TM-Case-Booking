import React, { useState, useEffect } from 'react';
import { COUNTRIES } from '../types';
import { getCountries } from '../utils/codeTable';
import { getCurrentUser } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { useSound } from '../contexts/SoundContext';
import { useToast } from './ToastContainer';
import {
  authenticateWithPopup,
  getStoredAuthTokens,
  clearAuthTokens,
  isTokenExpired,
  UserInfo,
  AuthTokens
} from '../utils/simplifiedOAuth';
import './EmailConfiguration.css';

interface EmailProvider {
  provider: 'google' | 'microsoft';
  isAuthenticated: boolean;
  userInfo?: UserInfo;
  tokens?: AuthTokens;
  fromName: string;
}

interface CountryEmailConfig {
  country: string;
  providers: {
    google: EmailProvider;
    microsoft: EmailProvider;
  };
  activeProvider?: 'google' | 'microsoft';
}

const SimplifiedEmailConfig: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [emailConfigs, setEmailConfigs] = useState<Record<string, CountryEmailConfig>>({});
  const [isAuthenticating, setIsAuthenticating] = useState<Record<string, boolean>>({});
  const [authError, setAuthError] = useState<string>('');
  const [isProviderSectionCollapsed, setIsProviderSectionCollapsed] = useState<boolean>(false);

  const { playSound } = useSound();
  const { showSuccess, showError } = useToast();
  const currentUser = getCurrentUser();

  // Check permissions
  const canConfigureEmail = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EMAIL_CONFIG) : false;

  // Initialize countries - automatically select user's country
  useEffect(() => {
    const globalCountries = getCountries();
    const countries = globalCountries.length > 0 ? globalCountries : [...COUNTRIES];
    
    // Auto-select user's country without showing the dropdown
    if (!selectedCountry && countries.length > 0 && currentUser) {
      const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0] || countries[0];
      setSelectedCountry(userCountry);
    }
  }, [currentUser, selectedCountry]);

  // Load stored authentication data
  useEffect(() => {
    if (!selectedCountry) return;

    // Check for stored tokens for both providers
    const googleTokens = getStoredAuthTokens(selectedCountry, 'google');
    const microsoftTokens = getStoredAuthTokens(selectedCountry, 'microsoft');

    const config: CountryEmailConfig = {
      country: selectedCountry,
      providers: {
        google: {
          provider: 'google',
          isAuthenticated: googleTokens ? !isTokenExpired(googleTokens) : false,
          tokens: googleTokens || undefined,
          fromName: 'Case Booking System'
        },
        microsoft: {
          provider: 'microsoft',
          isAuthenticated: microsoftTokens ? !isTokenExpired(microsoftTokens) : false,
          tokens: microsoftTokens || undefined,
          fromName: 'Case Booking System'
        }
      }
    };

    // Determine active provider (prefer the one that's authenticated)
    if (config.providers.google.isAuthenticated) {
      config.activeProvider = 'google';
    } else if (config.providers.microsoft.isAuthenticated) {
      config.activeProvider = 'microsoft';
    }

    setEmailConfigs(prev => ({
      ...prev,
      [selectedCountry]: config
    }));
  }, [selectedCountry]);

  // Handle OAuth authentication
  const handleAuthenticate = async (provider: 'google' | 'microsoft') => {
    if (!selectedCountry) {
      showError('No Country Selected', 'Please select a country first');
      return;
    }

    // Check if OAuth client ID is configured
    const clientId = provider === 'google' 
      ? process.env.REACT_APP_GOOGLE_CLIENT_ID 
      : process.env.REACT_APP_MICROSOFT_CLIENT_ID;
    
    if (!clientId) {
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      setAuthError(`${providerName} OAuth is not configured. Please check your environment variables.`);
      showError(
        'OAuth Not Configured', 
        `${providerName} client ID is missing. Please set up OAuth credentials first.`
      );
      return;
    }

    setIsAuthenticating(prev => ({ ...prev, [provider]: true }));
    setAuthError('');

    try {
      const { tokens, userInfo } = await authenticateWithPopup(provider, selectedCountry);
      
      // Update configuration
      setEmailConfigs(prev => ({
        ...prev,
        [selectedCountry]: {
          ...prev[selectedCountry],
          providers: {
            ...prev[selectedCountry]?.providers,
            [provider]: {
              provider,
              isAuthenticated: true,
              userInfo,
              tokens,
              fromName: prev[selectedCountry]?.providers[provider]?.fromName || 'Case Booking System'
            }
          },
          activeProvider: provider
        }
      }));

      playSound.success();
      showSuccess(
        'Authentication Successful', 
        `Successfully authenticated with ${provider.charAt(0).toUpperCase() + provider.slice(1)} as ${userInfo.email}`
      );

    } catch (error) {
      console.error('Authentication failed:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      showError('Authentication Failed', error instanceof Error ? error.message : 'Please try again');
    } finally {
      setIsAuthenticating(prev => ({ ...prev, [provider]: false }));
    }
  };

  // Handle disconnection
  const handleDisconnect = (provider: 'google' | 'microsoft') => {
    if (!selectedCountry) return;

    clearAuthTokens(selectedCountry, provider);
    
    setEmailConfigs(prev => ({
      ...prev,
      [selectedCountry]: {
        ...prev[selectedCountry],
        providers: {
          ...prev[selectedCountry]?.providers,
          [provider]: {
            provider,
            isAuthenticated: false,
            fromName: prev[selectedCountry]?.providers[provider]?.fromName || 'Case Booking System'
          }
        },
        activeProvider: prev[selectedCountry]?.activeProvider === provider ? undefined : prev[selectedCountry]?.activeProvider
      }
    }));

    playSound.click();
    showSuccess('Disconnected', `Successfully disconnected from ${provider.charAt(0).toUpperCase() + provider.slice(1)}`);
  };

  // Handle from name change
  const handleFromNameChange = (provider: 'google' | 'microsoft', fromName: string) => {
    if (!selectedCountry) return;

    setEmailConfigs(prev => ({
      ...prev,
      [selectedCountry]: {
        ...prev[selectedCountry],
        providers: {
          ...prev[selectedCountry]?.providers,
          [provider]: {
            ...prev[selectedCountry]?.providers[provider],
            fromName
          }
        }
      }
    }));
  };

  // Save configuration
  const handleSaveConfig = () => {
    if (!selectedCountry || !emailConfigs[selectedCountry]) {
      showError('No Configuration', 'Please configure at least one email provider');
      return;
    }

    // Save to localStorage
    localStorage.setItem('simplified_email_configs', JSON.stringify(emailConfigs));
    
    playSound.success();
    showSuccess('Configuration Saved', `Email settings for ${selectedCountry} have been saved`);
  };

  if (!canConfigureEmail) {
    return (
      <div className="email-config-container">
        <div className="permission-denied-message">
          <h3>Access Denied</h3>
          <p>You don't have permission to configure email settings.</p>
          <p>Please contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  const currentConfig = emailConfigs[selectedCountry];
  
  // Check OAuth configuration status
  const isGoogleConfigured = !!process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const isMicrosoftConfigured = !!process.env.REACT_APP_MICROSOFT_CLIENT_ID;

  return (
    <div className="email-config-container">
      <div className="email-config-header">
        <h2>📧 Email Configuration</h2>
        <p>Configure email providers for automated notifications</p>
        {selectedCountry && (
          <div className="current-country-badge">
            <span className="country-label">Configuration for:</span>
            <span className="country-name">{selectedCountry}</span>
          </div>
        )}
      </div>

      {selectedCountry && (
        <>
          {/* Collapsible Provider Authentication */}
          <div className="config-section">
            <div 
              className="section-header collapsible-header" 
              onClick={() => setIsProviderSectionCollapsed(!isProviderSectionCollapsed)}
              style={{ cursor: 'pointer' }}
            >
              <h3>🔐 Email Provider Authentication</h3>
              <span className={`chevron ${isProviderSectionCollapsed ? 'collapsed' : 'expanded'}`}>
                {isProviderSectionCollapsed ? '▶' : '▼'}
              </span>
            </div>
            
            {!isProviderSectionCollapsed && (
              <div className="section-content">
                <p style={{ marginBottom: '2rem', color: '#6c757d' }}>
                  Authenticate with your email provider to enable automated notifications
                </p>

            {authError && (
              <div className="alert alert-danger">
                <strong>Authentication Error:</strong> {authError}
              </div>
            )}

            {/* Google Authentication */}
            <div className="provider-card">
              <div className="provider-header">
                <div className="provider-info">
                  <img 
                    src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIyLjU2IDEyLjI1QzIyLjU2IDExLjQ3IDIyLjQ5IDEwLjcyIDIyLjM2IDEwSDEyVjE0LjI2SDE3LjkyQzE3LjY2IDE1LjYzIDE2Ljg3IDE2Ljc4IDE1LjY2IDE3LjQ4VjIwLjI2SDE5LjI3QzIxLjMgMTguNDMgMjIuNTYgMTUuNiAyMi41NiAxMi4yNVoiIGZpbGw9IiM0Mjg1RjQiLz4KPHBhdGggZD0iTTEyIDIzQzE1LjI0IDIzIDE3LjQ1IDIxLjkyIDE5LjI3IDE5Ljk4TDE1LjY2IDE3LjJDMTQuNTQgMTcuNzUgMTMuMzIgMTguMDggMTIgMTguMDhDOC44NyAxOC4wOCA2LjM1IDE2LjUgNS40MiAxNC4ySDEuNzJWMTYuOTdDMy41OCAyMC43OSA3LjU0IDIzIDEyIDIzWiIgZmlsbD0iIzM0QTg1MyIvPgo8cGF0aCBkPSJNNS40MiAxMi45MkM1LjIgMTIuMzcgNS4wOCAxMS43OCA1LjA4IDExLjE3QzUuMDggMTAuNTYgNS4yIDkuOTcgNS40MiA5LjQyVjYuNjVIMS43MkMxLjEgOC4xNyAwLjc0IDkuODMgMC43NCAxMS4xN0MwLjc0IDEyLjUxIDEuMSAxNC4xNyAxLjcyIDE1LjY5TDQuNzMgMTMuNDJMNS40MiAxMi45MloiIGZpbGw9IiNGQkJDMDQiLz4KPHBhdGggZD0iTTEyIDQuOTJDMTMuNTcgNC45MiAxNC45NiA1LjUxIDE2LjAzIDYuNTJMMTkuMjUgMy4zQzE3LjQ1IDEuNjQgMTUuMjQgMC41IDEyIDAuNUM3LjU0IDAuNSAzLjU4IDIuNzEgMS43MiA2LjUzTDUuNDIgOS4zQzYuMzUgNyAxMS44NyA0LjkyIDEyIDQuOTJaIiBmaWxsPSIjRUE0MzM1Ii8+Cjwvc3ZnPgo=" 
                    alt="Google" 
                    className="provider-icon"
                  />
                  <div>
                    <h4>Google Gmail</h4>
                    <p>Send emails through Gmail API</p>
                  </div>
                </div>
                
                {currentConfig?.providers.google.isAuthenticated ? (
                  <div className="auth-status authenticated">
                    <span className="status-icon">✅</span>
                    <div className="auth-info">
                      <div>Authenticated as:</div>
                      <strong>{currentConfig.providers.google.userInfo?.email}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="auth-status not-authenticated">
                    <span className="status-icon">❌</span>
                    <div>Not authenticated</div>
                  </div>
                )}
              </div>

              <div className="provider-actions">
                {currentConfig?.providers.google.isAuthenticated ? (
                  <>
                    <div className="form-group">
                      <label>From Name:</label>
                      <input
                        type="text"
                        value={currentConfig.providers.google.fromName}
                        onChange={(e) => handleFromNameChange('google', e.target.value)}
                        className="form-control"
                        placeholder="Case Booking System"
                      />
                    </div>
                    <button
                      onClick={() => handleDisconnect('google')}
                      className="btn btn-outline-danger btn-sm"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <>
                    {!isGoogleConfigured && (
                      <div className="alert alert-warning">
                        <strong>⚠️ Setup Required:</strong> Google OAuth client ID not configured. 
                        Please see <code>MICROSOFT_OAUTH_SETUP.md</code> for setup instructions.
                      </div>
                    )}
                    <button
                      onClick={() => handleAuthenticate('google')}
                      disabled={isAuthenticating.google || !isGoogleConfigured}
                      className="btn btn-primary"
                    >
                      {isAuthenticating.google ? (
                        <>🔄 Authenticating...</>
                      ) : !isGoogleConfigured ? (
                        <>⚙️ Configure Google OAuth First</>
                      ) : (
                        <>🔐 Authenticate with Google</>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Microsoft Authentication */}
            <div className="provider-card">
              <div className="provider-header">
                <div className="provider-info">
                  <img 
                    src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjExIiBoZWlnaHQ9IjExIiBmaWxsPSIjRjI1MDIyIi8+CjxyZWN0IHg9IjEzIiB3aWR0aD0iMTEiIGhlaWdodD0iMTEiIGZpbGw9IiM3RkJBMDAiLz4KPHJlY3QgeT0iMTMiIHdpZHRoPSIxMSIgaGVpZ2h0PSIxMSIgZmlsbD0iIzAwQTRFRiIvPgo8cmVjdCB4PSIxMyIgeT0iMTMiIHdpZHRoPSIxMSIgaGVpZ2h0PSIxMSIgZmlsbD0iI0ZGQjkwMCIvPgo8L3N2Zz4K" 
                    alt="Microsoft" 
                    className="provider-icon"
                  />
                  <div>
                    <h4>Microsoft Outlook</h4>
                    <p>Send emails through Outlook/Office 365</p>
                  </div>
                </div>
                
                {currentConfig?.providers.microsoft.isAuthenticated ? (
                  <div className="auth-status authenticated">
                    <span className="status-icon">✅</span>
                    <div className="auth-info">
                      <div>Authenticated as:</div>
                      <strong>{currentConfig.providers.microsoft.userInfo?.email}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="auth-status not-authenticated">
                    <span className="status-icon">❌</span>
                    <div>Not authenticated</div>
                  </div>
                )}
              </div>

              <div className="provider-actions">
                {currentConfig?.providers.microsoft.isAuthenticated ? (
                  <>
                    <div className="form-group">
                      <label>From Name:</label>
                      <input
                        type="text"
                        value={currentConfig.providers.microsoft.fromName}
                        onChange={(e) => handleFromNameChange('microsoft', e.target.value)}
                        className="form-control"
                        placeholder="Case Booking System"
                      />
                    </div>
                    <button
                      onClick={() => handleDisconnect('microsoft')}
                      className="btn btn-outline-danger btn-sm"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <>
                    {!isMicrosoftConfigured && (
                      <div className="alert alert-warning">
                        <strong>⚠️ Setup Required:</strong> Microsoft OAuth client ID not configured. 
                        Please see <code>MICROSOFT_OAUTH_SETUP.md</code> for detailed setup instructions.
                      </div>
                    )}
                    <button
                      onClick={() => handleAuthenticate('microsoft')}
                      disabled={isAuthenticating.microsoft || !isMicrosoftConfigured}
                      className="btn btn-primary"
                    >
                      {isAuthenticating.microsoft ? (
                        <>🔄 Authenticating...</>
                      ) : !isMicrosoftConfigured ? (
                        <>⚙️ Configure Microsoft OAuth First</>
                      ) : (
                        <>🔐 Authenticate with Microsoft</>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
              </div>
            )}
          </div>

          {/* Active Provider Status & Actions */}
          <div className="config-section">
            <div className="config-summary-section">
              {currentConfig?.activeProvider ? (
                <div className="active-provider-summary">
                  <div className="provider-status-badge">
                    <span className="status-icon">✅</span>
                    <div className="status-details">
                      <strong>{currentConfig.activeProvider.charAt(0).toUpperCase() + currentConfig.activeProvider.slice(1)}</strong>
                      <div className="provider-email">{currentConfig.providers[currentConfig.activeProvider].userInfo?.email}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-provider-summary">
                  <span className="status-icon">⚠️</span>
                  <span>No email provider configured</span>
                </div>
              )}
              
              <div className="config-actions">
                <button
                  onClick={handleSaveConfig}
                  disabled={!currentConfig?.providers.google.isAuthenticated && !currentConfig?.providers.microsoft.isAuthenticated}
                  className="btn btn-success"
                >
                  💾 Save Configuration
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SimplifiedEmailConfig;