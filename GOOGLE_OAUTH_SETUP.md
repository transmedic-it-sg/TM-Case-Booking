# Google OAuth Setup Guide

## Step-by-Step Google OAuth Setup

### 1. Go to Google Cloud Console
- Navigate to https://console.cloud.google.com/
- Sign in with your Google account

### 2. Create or Select a Project
- If you don't have a project, click "Create Project"
- Give it a name like "Case Booking Email Integration"
- Select it from the project dropdown

### 3. Enable Gmail API
- Go to "APIs & Services" → "Library"
- Search for "Gmail API"
- Click on it and press "Enable"

### 4. Create OAuth 2.0 Credentials
- Go to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "OAuth 2.0 Client IDs"
- If prompted, configure the OAuth consent screen first (see step 5)

### 5. Configure OAuth Consent Screen (if needed)
- Go to "APIs & Services" → "OAuth consent screen"
- Choose "External" (unless you're using a Google Workspace account)
- Fill in required fields:
  - **App name**: Case Booking Email Integration
  - **User support email**: Your email
  - **Developer contact information**: Your email
- Add scopes:
  - `../auth/gmail.send`
  - `../auth/userinfo.email`
  - `../auth/userinfo.profile`
- Add test users (your email addresses)

### 6. Create OAuth Client ID
- Application type: **Single-page application (SPA)**
- Name: Case Booking App
- Authorized JavaScript origins:
  - `http://localhost:3000` (for development)
  - `https://yourdomain.com` (for production)
- Authorized redirect URIs:
  - `http://localhost:3000/auth/callback` (for development)
  - `https://yourdomain.com/auth/callback` (for production)

### 7. Copy Client ID
- After creation, copy the "Client ID" (it ends with .googleusercontent.com)
- This goes in your `.env` file as `REACT_APP_GOOGLE_CLIENT_ID`

### 8. Update Environment Variables
Create/update your `.env` file:
```
REACT_APP_GOOGLE_CLIENT_ID=your-actual-client-id.googleusercontent.com
```

## Common Issues and Solutions

### Issue: "Error 400: redirect_uri_mismatch"
**Cause**: The redirect URI doesn't match what's configured in Google Console
**Solution**: Ensure the redirect URI exactly matches: `http://localhost:3000/auth/callback`

### Issue: "Error 403: access_denied"
**Cause**: The app is not approved for production use
**Solution**: Add your email as a test user in the OAuth consent screen

### Issue: "Error 400: invalid_client"
**Cause**: The client ID is incorrect or not configured
**Solution**: Double-check the client ID in your `.env` file

### Issue: Gmail API is not enabled
**Cause**: The Gmail API hasn't been enabled for your project
**Solution**: Go to APIs & Services → Library and enable Gmail API

## Testing Your Setup
1. Update your `.env` file with the real client ID
2. Restart your development server (`npm start`)
3. Navigate to Email Configuration
4. Click "Authenticate with Google"
5. You should see the Google login popup

## Production Deployment
For production, you'll need to:
1. Add your production domain to the authorized origins and redirect URIs
2. Submit your app for verification if you plan to have many users
3. Update the client ID in your production environment variables

## Verification Requirements
If your app will be used by many people, Google may require verification:
- Domain verification
- Privacy policy
- Terms of service
- App review process

For internal company use, adding test users is usually sufficient.

## Need Help?
If you encounter issues:
1. Check the Google Cloud Console → Credentials → Your OAuth client
2. Verify all URLs are exactly correct (no trailing slashes, correct protocol)
3. Check browser console for detailed error messages
4. Ensure Gmail API is enabled for your project