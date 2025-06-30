// Simplified OAuth Configuration for Email Integration
// Pre-configured OAuth applications for Google and Microsoft

interface OAuthConfig {
  clientId: string;
  scopes: string[];
  redirectUri: string;
}

interface OAuthProvider {
  name: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  config: OAuthConfig;
}

// Pre-configured OAuth applications
// Note: In production, these should be environment variables or secure configuration
const OAUTH_PROVIDERS: Record<'google' | 'microsoft', OAuthProvider> = {
  google: {
    name: 'Google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    config: {
      clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
      scopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      redirectUri: `${window.location.origin}/auth/callback`
    }
  },
  microsoft: {
    name: 'Microsoft',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    config: {
      clientId: process.env.REACT_APP_MICROSOFT_CLIENT_ID || '',
      scopes: [
        'https://graph.microsoft.com/Mail.Send',
        'https://graph.microsoft.com/User.Read',
        'offline_access'
      ],
      redirectUri: `${window.location.origin}/auth/callback`
    }
  }
};

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  expiresAt: number;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

class SimplifiedOAuthManager {
  private provider: 'google' | 'microsoft';
  private config: OAuthProvider;

  constructor(provider: 'google' | 'microsoft') {
    this.provider = provider;
    this.config = OAUTH_PROVIDERS[provider];
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.config.clientId,
      response_type: 'code',
      scope: this.config.config.scopes.join(' '),
      redirect_uri: this.config.config.redirectUri,
      state: state || `${this.provider}_${Date.now()}`,
      access_type: 'offline', // For refresh tokens
      prompt: 'consent' // Force consent to get refresh token
    });

    return `${this.config.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<AuthTokens> {
    const body = new URLSearchParams({
      client_id: this.config.config.clientId,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.config.redirectUri
    });

    // Note: In production, token exchange should happen on backend for security
    // This is a simplified frontend-only implementation
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString()
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    const expiresAt = Date.now() + (data.expires_in * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      expiresAt
    };
  }

  /**
   * Get user information using access token
   */
  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(this.config.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    const data = await response.json();

    // Normalize response format between Google and Microsoft
    if (this.provider === 'google') {
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture
      };
    } else {
      // Microsoft Graph API
      return {
        id: data.id,
        email: data.mail || data.userPrincipalName,
        name: data.displayName,
        picture: data.photo?.value
      };
    }
  }

  /**
   * Send email using provider's API
   */
  async sendEmail(accessToken: string, emailData: {
    to: string[];
    subject: string;
    body: string;
    from?: string;
  }): Promise<boolean> {
    if (this.provider === 'google') {
      return this.sendGmailEmail(accessToken, emailData);
    } else {
      return this.sendOutlookEmail(accessToken, emailData);
    }
  }

  private async sendGmailEmail(accessToken: string, emailData: {
    to: string[];
    subject: string;
    body: string;
    from?: string;
  }): Promise<boolean> {
    // Gmail API implementation
    const message = [
      `To: ${emailData.to.join(', ')}`,
      `Subject: ${emailData.subject}`,
      `Content-Type: text/html; charset=utf-8`,
      '',
      emailData.body
    ].join('\n');

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

  private async sendOutlookEmail(accessToken: string, emailData: {
    to: string[];
    subject: string;
    body: string;
    from?: string;
  }): Promise<boolean> {
    // Microsoft Graph API implementation
    const message = {
      message: {
        subject: emailData.subject,
        body: {
          contentType: 'HTML',
          content: emailData.body
        },
        toRecipients: emailData.to.map(email => ({
          emailAddress: {
            address: email
          }
        }))
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

// Token storage utilities
export const storeAuthTokens = (country: string, provider: string, tokens: AuthTokens): void => {
  const key = `email_auth_${country}_${provider}`;
  localStorage.setItem(key, JSON.stringify(tokens));
};

export const getStoredAuthTokens = (country: string, provider: string): AuthTokens | null => {
  const key = `email_auth_${country}_${provider}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const clearAuthTokens = (country: string, provider: string): void => {
  const key = `email_auth_${country}_${provider}`;
  localStorage.removeItem(key);
};

export const isTokenExpired = (tokens: AuthTokens): boolean => {
  return Date.now() >= tokens.expiresAt;
};

// Factory function
export const createOAuthManager = (provider: 'google' | 'microsoft'): SimplifiedOAuthManager => {
  return new SimplifiedOAuthManager(provider);
};

// Popup-based authentication flow
export const authenticateWithPopup = async (
  provider: 'google' | 'microsoft',
  country: string
): Promise<{ tokens: AuthTokens; userInfo: UserInfo }> => {
  const oauth = createOAuthManager(provider);
  const authUrl = oauth.getAuthUrl(`${country}_${Date.now()}`);

  return new Promise((resolve, reject) => {
    const popup = window.open(
      authUrl,
      'oauth_auth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Listen for auth completion
    const messageHandler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'oauth_success' && event.data.code) {
        try {
          const tokens = await oauth.exchangeCodeForTokens(event.data.code);
          const userInfo = await oauth.getUserInfo(tokens.accessToken);
          
          // Store tokens
          storeAuthTokens(country, provider, tokens);
          
          window.removeEventListener('message', messageHandler);
          popup.close();
          
          resolve({ tokens, userInfo });
        } catch (error) {
          window.removeEventListener('message', messageHandler);
          popup.close();
          reject(error);
        }
      } else if (event.data.type === 'oauth_error') {
        window.removeEventListener('message', messageHandler);
        popup.close();
        reject(new Error(event.data.error));
      }
    };

    window.addEventListener('message', messageHandler);

    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        reject(new Error('Authentication cancelled'));
      }
    }, 1000);
  });
};

export default SimplifiedOAuthManager;