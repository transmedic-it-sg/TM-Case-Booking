# OAuth Authentication Troubleshooting Guide

## Issue: "Authentication Failed" after successful login

This usually indicates that the OAuth popup completes successfully, but there's an issue with the token exchange or user info retrieval.

## Debugging Steps

### 1. Check Browser Console
Open your browser's Developer Tools (F12) and look at the Console tab for detailed error messages.

**What to look for:**
- `Starting [provider] authentication for [country]...`
- `Received authorization code for [provider], exchanging for tokens...`
- `Token exchange successful for [provider], fetching user info...`
- `User info retrieved for [provider]:` 
- Any error messages with detailed information

### 2. Common Issues and Solutions

#### A. Token Exchange Fails
**Symptoms:** Console shows "Token exchange failed"
**Causes:**
- PKCE code verifier/challenge mismatch
- Incorrect client ID
- Redirect URI mismatch
- Client secret required (should not be for SPA)

**Solutions:**
1. Verify your Azure app is configured as "Single-page application"
2. Ensure redirect URI is exactly: `http://localhost:3000/auth/callback`
3. Check that no client secret is configured in Azure
4. Verify the client ID in your `.env` file

#### B. User Info Retrieval Fails
**Symptoms:** Console shows "Failed to get user info"
**Causes:**
- Access token doesn't have required permissions
- Token expired immediately
- API permissions not granted

**Solutions:**
1. Check API permissions in Azure AD:
   - `User.Read` - to read user profile
   - `Mail.Send` - to send emails
   - `offline_access` - for refresh tokens
2. Ensure admin consent is granted
3. Try re-authenticating

#### C. Popup Issues
**Symptoms:** "Popup blocked" or no response
**Causes:**
- Browser blocking popups
- Popup closed manually
- Cross-origin issues

**Solutions:**
1. Allow popups for your domain
2. Check that callback URL is accessible
3. Ensure no CORS issues

### 3. Manual Debugging

#### Step 1: Check Environment Variables
```bash
# Create a .env file with your actual credentials
REACT_APP_MICROSOFT_CLIENT_ID=your-actual-client-id
REACT_APP_GOOGLE_CLIENT_ID=your-actual-client-id.googleusercontent.com
```

#### Step 2: Test Callback URL
Visit: `http://localhost:3000/auth/callback`
You should see the callback page (not a 404)

#### Step 3: Verify Azure Configuration
In Azure Portal → App registrations → Your app:
1. **Platform**: Single-page application
2. **Redirect URI**: `http://localhost:3000/auth/callback`
3. **API permissions**: User.Read, Mail.Send, offline_access
4. **Admin consent**: Granted
5. **Allow public client flows**: No

### 4. Advanced Debugging

#### Enable Detailed Logging
The app now includes enhanced logging. Open the browser console and try authentication to see:
- Each step of the OAuth flow
- Token exchange details
- User info retrieval
- Error details with HTTP status codes

#### Check Network Tab
1. Open Developer Tools → Network tab
2. Attempt authentication
3. Look for failed requests to:
   - `login.microsoftonline.com/common/oauth2/v2.0/token`
   - `graph.microsoft.com/v1.0/me`

#### Debug Panel
In development mode, click the "🐛 Debug" button to see:
- Current configuration state
- OAuth setup status
- Browser capabilities

### 5. Quick Fixes

#### Clear Browser Data
```bash
# Clear all data for localhost:3000
# In Chrome: Settings → Privacy → Clear browsing data → Cookies and site data
```

#### Restart Development Server
```bash
# Kill the current server
Ctrl+C

# Start fresh
npm start
```

#### Verify Permissions
Check that your Azure app has the correct permissions and admin consent is granted.

### 6. Working Test Flow

A successful authentication should show this sequence in the console:

```
Starting microsoft authentication for Singapore...
Received authorization code for microsoft, exchanging for tokens...
Token exchange response: { hasAccessToken: true, hasRefreshToken: true, expiresIn: 3600 }
Token exchange successful for microsoft, fetching user info...
User info response: { provider: "microsoft", hasEmail: true, hasId: true, hasName: true }
User info retrieved for microsoft: { email: "user@domain.com", id: "..." }
Authentication successful: { provider: "microsoft", email: "user@domain.com", hasAccessToken: true }
```

If any step fails, the error will be logged with detailed information.

### 7. Contact Support

If the issue persists, provide:
1. Browser console logs
2. Network tab requests/responses
3. Azure app registration configuration
4. Environment variables (client IDs only, no secrets)

## Quick Recovery

1. ✅ Clear browser cache and cookies for localhost:3000
2. ✅ Restart the development server (`npm start`)
3. ✅ Check browser console for detailed error messages
4. ✅ Verify Azure app configuration matches the setup guide
5. ✅ Test with different browsers to isolate browser-specific issues