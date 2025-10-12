// Simplified OAuth Configuration for Email Integration
// Microsoft-only OAuth integration (Google Gmail API removed for security)

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

// Global flag to prevent duplicate environment logging
let environmentLogged = false;

/**
 * Get the appropriate redirect URI for the current environment
 */
const getRedirectUri = (): string => {
  const origin = window.location.origin;

  // Log the current environment for debugging (only once)
  if (!environmentLogged) {
    environmentLogged = true;
  }

  // Construct redirect URI
  const redirectUri = `${origin}/auth/callback`;

  return redirectUri;
};

// Microsoft-only OAuth configuration
const OAUTH_PROVIDERS: Record<'microsoft', OAuthProvider> = {
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
      redirectUri: getRedirectUri()
    }
  }
};

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  expiresAt: number;
}

// PKCE (Proof Key for Code Exchange) utilities
interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
}

function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

async function generatePKCEChallenge(): Promise<PKCEChallenge> {
  const codeVerifier = generateRandomString(128);

  // Create SHA256 hash of the code verifier
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);

  // Convert to base64url - compatible with older TypeScript
  const bytes = new Uint8Array(digest);
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  const base64String = btoa(binaryString);
  const codeChallenge = base64String
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    codeVerifier,
    codeChallenge
  };
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

class SimplifiedOAuthManager {
  private provider: 'microsoft';
  private config: OAuthProvider;
  private pkceChallenge?: PKCEChallenge;

  constructor() {
    this.provider = 'microsoft';
    this.config = OAUTH_PROVIDERS.microsoft;
  }

  /**
   * Generate OAuth authorization URL with PKCE support
   */
  async getAuthUrl(state?: string): Promise<string> {if (!this.config.config.clientId || this.config.config.clientId.includes('your-') || this.config.config.clientId === '') {
      throw new Error(`${this.provider} OAuth client ID is not properly configured. Please check your environment variables.`);
    }

    const params: Record<string, string> = {
      client_id: this.config.config.clientId,
      response_type: 'code',
      scope: this.config.config.scopes.join(' '),
      redirect_uri: this.config.config.redirectUri,
      state: state || `${this.provider}_${Date.now()}`
    };

    //   clientId: this.config.config.clientId.substring(0, 8) + '...',
    //   redirectUri: this.config.config.redirectUri,
    //   scopes: this.config.config.scopes
    // });

    // Add PKCE for Microsoft (required)
    this.pkceChallenge = await generatePKCEChallenge();
    params.code_challenge = this.pkceChallenge.codeChallenge;
    params.code_challenge_method = 'S256';

    const authUrl = `${this.config.authUrl}?${new URLSearchParams(params).toString()}`;
    
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens with PKCE support
   */
  async exchangeCodeForTokens(code: string): Promise<AuthTokens> {
    if (!this.pkceChallenge) {
      throw new Error('PKCE challenge not found. Make sure to call getAuthUrl first.');
    }

    const body = new URLSearchParams({
      client_id: this.config.config.clientId,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.config.redirectUri,
      code_verifier: this.pkceChallenge.codeVerifier // PKCE code verifier
    });

    //   clientId: this.config.config.clientId.substring(0, 8) + '...',
    //   hasCode: !!code,
    //   codeLength: code.length
    // });

    try {
      // Note: In production, token exchange should happen on backend for security
      // This is a simplified frontend-only implementation with enhanced error handling
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: body.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        //   status: response.status,
        //   statusText: response.statusText,
        //   body: errorText,
        //   provider: this.provider,
        //   url: this.config.tokenUrl,
        //   environment: process.env.NODE_ENV
        // });

        // Enhanced error messages for common issues
        if (response.status === 400) {
          if (errorText.includes('invalid_grant')) {
            throw new Error('Invalid authorization code or code expired. Please try authenticating again.');
          } else if (errorText.includes('redirect_uri_mismatch')) {
            throw new Error('Redirect URI mismatch. Please check your OAuth application configuration.');
          }
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Please check your OAuth client configuration.');
        }

        throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();const expiresAt = Date.now() + (data.expires_in * 1000);

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        expiresAt
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        //   error: error.message,
        //   environment: process.env.NODE_ENV,
        //   origin: window.location.origin
        // });
        throw new Error('Network error during authentication. Please check your internet connection and try again.');
      }
      throw error;
    }
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
      const errorText = await response.text();
      //   status: response.status,
      //   statusText: response.statusText,
      //   body: errorText,
      //   provider: this.provider
      // });
      throw new Error(`Failed to get user info: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Microsoft Graph API response format
    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      picture: data.photo?.value
    };
  }

  /**
   * Send email using Microsoft Graph API
   */
  async sendEmail(accessToken: string, emailData: {
    to: string[];
    subject: string;
    body: string;
    from?: string;
    attachments?: Array<{
      filename: string;
      content: string; // base64 encoded content
      contentType: string;
    }>;
  }): Promise<boolean> {
    return this.sendOutlookEmail(accessToken, emailData);
  }

  private async sendOutlookEmail(accessToken: string, emailData: {
    to: string[];
    subject: string;
    body: string;
    from?: string;
    attachments?: Array<{
      filename: string;
      content: string; // base64 encoded content
      contentType: string;
    }>;
  }): Promise<boolean> {
    // Microsoft Graph API implementation
    const message: any = {
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

    // Add attachments if provided
    if (emailData.attachments && emailData.attachments.length > 0) {
      message.message.attachments = emailData.attachments.map(attachment => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.filename,
        contentType: attachment.contentType,
        contentBytes: attachment.content
      }));
    }

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

// Token storage utilities (Microsoft-only)
export const storeAuthTokens = (country: string, tokens: AuthTokens): void => {
  // Microsoft auth is global (same account for all countries)
  const key = `email_auth_global_microsoft`;
  
  try {
    // Use sessionStorage for security - tokens expire when browser session ends
    sessionStorage.setItem(key, JSON.stringify(tokens));
  } catch (error) {
    console.warn('Failed to store auth tokens:', error);
  }
};

// User info storage utilities (Microsoft-only)
export const storeUserInfo = (country: string, userInfo: UserInfo): void => {
  // Microsoft user info is global (same account for all countries)
  const key = `email_userinfo_global_microsoft`;
  
  try {
    // Use sessionStorage for security - info expires when browser session ends
    sessionStorage.setItem(key, JSON.stringify(userInfo));
  } catch (error) {
    console.warn('Failed to store user info:', error);
  }
};

export const getStoredUserInfo = (country: string): UserInfo | null => {
  // Microsoft user info is global (same account for all countries)
  const key = `email_userinfo_global_microsoft`;
  
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.warn('Failed to retrieve user info:', error);
    return null;
  }
};

export const clearUserInfo = (country: string): void => {
  const key = `email_userinfo_global_microsoft`;
  
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear user info:', error);
  }
};

export const getStoredAuthTokens = (country: string): AuthTokens | null => {
  // Microsoft auth is global (same account for all countries)
  const key = `email_auth_global_microsoft`;
  
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.warn('Failed to retrieve auth tokens:', error);
    return null;
  }
};

export const clearAuthTokens = (country: string): void => {
  const key = `email_auth_global_microsoft`;
  
  try {
    sessionStorage.removeItem(key);
    // Also clear user info when clearing tokens
    clearUserInfo(country);
  } catch (error) {
    console.warn('Failed to clear auth tokens:', error);
  }
};

export const isTokenExpired = (tokens: AuthTokens): boolean => {
  return Date.now() >= tokens.expiresAt;
};

/**
 * Validate Microsoft access token in real-time with Microsoft servers
 * Makes actual API call to verify token is still valid
 */
export const validateMicrosoftTokenOnline = async (accessToken: string): Promise<boolean> => {
  try {
    // Make a lightweight call to Microsoft Graph /me endpoint
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // If we get a successful response, token is valid
    if (response.ok) {
      return true;
    }

    // Check for specific authentication errors
    if (response.status === 401) {
      // Unauthorized - token is invalid or expired
      return false;
    }

    // For other errors, assume token might still be valid (network issues, etc.)
    console.warn('Token validation returned unexpected status:', response.status);
    return false;
  } catch (error) {
    // Network error or other issues - assume token is invalid to be safe
    console.error('Error validating Microsoft token online:', error);
    return false;
  }
};

/**
 * Check Microsoft authentication status in real-time by validating with Microsoft servers
 * This provides true real-time status instead of relying on local expiration times
 */
export const checkAuthenticationStatusOnline = async (country: string): Promise<boolean> => {
  const tokens = getStoredAuthTokens(country);
  
  if (!tokens || !tokens.accessToken) {
    return false;
  }

  // First check local expiration to avoid unnecessary API calls
  if (isTokenExpired(tokens)) {
    return false;
  }

  // Make real-time validation call to Microsoft
  try {
    return await validateMicrosoftTokenOnline(tokens.accessToken);
  } catch (error) {
    console.error('Error checking Microsoft authentication status online:', error);
  }

  return false;
};

/**
 * Check if token is about to expire within the next 5 minutes
 */
export const isTokenExpiringSoon = (tokens: AuthTokens): boolean => {
  const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
  return fiveMinutesFromNow >= tokens.expiresAt;
};

/**
 * Refresh Microsoft access token using refresh token
 */
export const refreshMicrosoftToken = async (country: string, refreshToken: string): Promise<AuthTokens | null> => {
  try {
    const clientId = process.env.REACT_APP_MICROSOFT_CLIENT_ID;
    if (!clientId) {
      throw new Error('Microsoft client ID not configured');
    }

    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: OAUTH_PROVIDERS.microsoft.config.scopes.join(' ')
    });

    const response = await fetch(OAUTH_PROVIDERS.microsoft.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      return null;
    }

    const data = await response.json();
    const expiresAt = Date.now() + (data.expires_in * 1000);

    const newTokens: AuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Keep old refresh token if new one not provided
      expiresIn: data.expires_in,
      expiresAt
    };

    // Store the new tokens
    storeAuthTokens(country, newTokens);
    return newTokens;
  } catch (error) {
    return null;
  }
};

/**
 * Get valid Microsoft access token, refreshing if necessary
 */
export const getValidAccessToken = async (country: string): Promise<string | null> => {
  const tokens = getStoredAuthTokens(country);

  if (!tokens) {
    return null;
  }

  // If token is not expired, return it
  if (!isTokenExpired(tokens)) {
    return tokens.accessToken;
  }

  // Token is expired - try to refresh if has refresh token
  if (tokens.refreshToken) {
    const newTokens = await refreshMicrosoftToken(country, tokens.refreshToken);

    if (newTokens) {
      return newTokens.accessToken;
    } else {
      clearAuthTokens(country);
      return null;
    }
  }

  // Token is expired and unusable
  clearAuthTokens(country);
  return null;
};

// Factory function (Microsoft-only)
export const createOAuthManager = (): SimplifiedOAuthManager => {
  return new SimplifiedOAuthManager();
};

// Popup-based authentication flow with PKCE support (Microsoft-only)
export const authenticateWithPopup = async (
  country: string
): Promise<{ tokens: AuthTokens; userInfo: UserInfo }> => {
  const oauth = createOAuthManager();

  try {
    // Generate auth URL with PKCE (async operation)
    const authUrl = await oauth.getAuthUrl(`${country}_${Date.now()}`);

    return new Promise((resolve, reject) => {
      const popup = window.open(
        authUrl,
        'oauth_auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        reject(new Error('Popup blocked. Please allow popups for this site.'));
        return;
      }// Listen for auth completion
      const messageHandler = async (event: MessageEvent) => {if (event.origin !== window.location.origin) {
          return;
        }

        if ((event.data.type === 'oauth_success' || event.data.type === 'sso_auth_success') && event.data.code) {
          try {
            authComplete = true;
            const tokens = await oauth.exchangeCodeForTokens(event.data.code);
            const userInfo = await oauth.getUserInfo(tokens.accessToken);
            // Store tokens and user info
            storeAuthTokens(country, tokens);
            storeUserInfo(country, userInfo);
            window.removeEventListener('message', messageHandler);
            clearInterval(checkClosed);
            popup.close();
            resolve({ tokens, userInfo });
          } catch (error) {
            authComplete = true;
            window.removeEventListener('message', messageHandler);
            clearInterval(checkClosed);
            popup.close();
            reject(error);
          }
        } else if (event.data.type === 'oauth_error' || event.data.type === 'sso_auth_error') {
          authComplete = true;
          window.removeEventListener('message', messageHandler);
          clearInterval(checkClosed);
          popup.close();
          reject(new Error(event.data.error));
        } else {}
      };
      
      // Track authentication completion to avoid false cancellation errors
      let authComplete = false;
      window.addEventListener('message', messageHandler);

      // Check if popup was closed manually (CORS-safe approach)
      const checkClosed = setInterval(() => {
        try {
          // Try to access popup location - will throw if CORS blocked
          if (popup.closed || popup.location.href === 'about:blank') {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            if (!authComplete) {
              reject(new Error('Authentication cancelled'));
            }
          }
        } catch (error) {
          // CORS error means popup is on different origin, continue polling
          // This is expected during OAuth flow
        }
      }, 1000);

      // Add timeout protection
      setTimeout(() => {
        try {
          if (!popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            popup.close();
            reject(new Error('Authentication timeout - please try again'));
          }
        } catch (error) {
          // CORS error means popup is still on different origin
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          reject(new Error('Authentication timeout - please try again'));
        }
      }, 120000); // 2 minute timeout
    });
  } catch (error) {
    throw new Error(`Failed to generate auth URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export default SimplifiedOAuthManager;