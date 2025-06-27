// SSO Authentication utilities for Email Configuration
// Handles Microsoft Entra ID (Azure AD) and Google Workspace authentication

export interface SSOConfig {
  provider: 'microsoft' | 'google';
  clientId: string;
  clientSecret?: string;
  tenantId?: string; // Microsoft only
  redirectUri: string;
  scopes: string[];
}

export interface SSOTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
  scope: string;
}

export interface SSOUserInfo {
  id: string;
  email: string;
  name: string;
  provider: 'microsoft' | 'google';
}

// Microsoft Entra ID (Azure AD) SSO Authentication
export class MicrosoftSSOAuth {
  private config: SSOConfig;
  
  constructor(config: SSOConfig) {
    this.config = config;
  }

  /**
   * Generate Microsoft OAuth 2.0 authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const tenantId = this.config.tenantId || 'common';
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      response_mode: 'query',
      state: state || `microsoft_${Date.now()}`,
      prompt: 'consent'
    });

    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code: string): Promise<SSOTokens> {
    const tenantId = this.config.tenantId || 'common';
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret || '',
      code: code,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
      scope: this.config.scopes.join(' ')
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Microsoft token exchange failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      tokenType: data.token_type,
      scope: data.scope
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<SSOTokens> {
    const tenantId = this.config.tenantId || 'common';
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: this.config.scopes.join(' ')
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Microsoft token refresh failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (data.expires_in * 1000),
      tokenType: data.token_type,
      scope: data.scope
    };
  }

  /**
   * Get user information from Microsoft Graph API
   */
  async getUserInfo(accessToken: string): Promise<SSOUserInfo> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Microsoft user info');
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      provider: 'microsoft'
    };
  }

  /**
   * Send email using Microsoft Graph API
   */
  async sendEmail(accessToken: string, emailData: {
    to: string[];
    subject: string;
    body: string;
    fromEmail?: string;
    fromName?: string;
  }): Promise<boolean> {
    const message = {
      message: {
        subject: emailData.subject,
        body: {
          contentType: 'HTML',
          content: emailData.body
        },
        toRecipients: emailData.to.map(email => ({
          emailAddress: { address: email }
        })),
        from: emailData.fromEmail ? {
          emailAddress: {
            address: emailData.fromEmail,
            name: emailData.fromName || 'Case Booking System'
          }
        } : undefined
      }
    };

    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    return response.ok;
  }
}

// Google Workspace SSO Authentication
export class GoogleSSOAuth {
  private config: SSOConfig;
  
  constructor(config: SSOConfig) {
    this.config = config;
  }

  /**
   * Generate Google OAuth 2.0 authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      response_type: 'code',
      state: state || `google_${Date.now()}`,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code: string): Promise<SSOTokens> {
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret || '',
      code: code,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code'
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google token exchange failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      tokenType: data.token_type,
      scope: data.scope
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<SSOTokens> {
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google token refresh failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (data.expires_in * 1000),
      tokenType: data.token_type,
      scope: data.scope
    };
  }

  /**
   * Get user information from Google API
   */
  async getUserInfo(accessToken: string): Promise<SSOUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Google user info');
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      provider: 'google'
    };
  }

  /**
   * Send email using Gmail API
   */
  async sendEmail(accessToken: string, emailData: {
    to: string[];
    subject: string;
    body: string;
    fromEmail?: string;
    fromName?: string;
  }): Promise<boolean> {
    // Create email message in RFC 2822 format
    const fromHeader = emailData.fromEmail 
      ? `${emailData.fromName || 'Case Booking System'} <${emailData.fromEmail}>`
      : undefined;
    
    const message = [
      `To: ${emailData.to.join(', ')}`,
      fromHeader ? `From: ${fromHeader}` : '',
      `Subject: ${emailData.subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      emailData.body
    ].filter(Boolean).join('\n');

    // Base64 encode the message
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    return response.ok;
  }
}

// SSO Factory to create appropriate auth instance
export class SSOAuthFactory {
  static createAuth(config: SSOConfig): MicrosoftSSOAuth | GoogleSSOAuth {
    switch (config.provider) {
      case 'microsoft':
        return new MicrosoftSSOAuth(config);
      case 'google':
        return new GoogleSSOAuth(config);
      default:
        throw new Error(`Unsupported SSO provider: ${config.provider}`);
    }
  }
}

// Helper function to get default scopes for each provider
export function getDefaultScopes(provider: 'microsoft' | 'google'): string[] {
  switch (provider) {
    case 'microsoft':
      return [
        'https://graph.microsoft.com/Mail.Send',
        'https://graph.microsoft.com/User.Read',
        'offline_access'
      ];
    case 'google':
      return [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ];
    default:
      return [];
  }
}

// Helper function to validate token expiration
export function isTokenExpired(token: SSOTokens): boolean {
  return Date.now() >= token.expiresAt - 60000; // 1 minute buffer
}

// Helper function to store tokens securely
export function storeTokens(country: string, provider: string, tokens: SSOTokens): void {
  const key = `sso-tokens-${country}-${provider}`;
  localStorage.setItem(key, JSON.stringify(tokens));
}

// Helper function to retrieve stored tokens
export function getStoredTokens(country: string, provider: string): SSOTokens | null {
  const key = `sso-tokens-${country}-${provider}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse stored tokens:', error);
      localStorage.removeItem(key);
    }
  }
  return null;
}

// Helper function to clear stored tokens
export function clearStoredTokens(country: string, provider: string): void {
  const key = `sso-tokens-${country}-${provider}`;
  localStorage.removeItem(key);
}