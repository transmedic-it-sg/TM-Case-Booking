# Microsoft OAuth Setup Guide

## Step-by-Step Microsoft App Registration

### 1. Go to Azure Portal
- Navigate to https://portal.azure.com/
- Sign in with your Microsoft account (preferably the one associated with your organization)

### 2. Navigate to App Registrations
- In the Azure portal, search for "App registrations" or go to Azure Active Directory → App registrations
- Click "New registration"

### 3. Configure App Registration
**Basic Information:**
- **Name**: Case Booking Email Integration
- **Supported account types**: Select "Accounts in any organizational directory and personal Microsoft accounts (personal Microsoft accounts and Azure AD - Multitenant)"
- **Redirect URI**: 
  - Platform: Single-page application (SPA)
  - URI: `http://localhost:3000/auth/callback` (for development)
  - For production: `https://yourdomain.com/auth/callback`

### 4. Note the Application (Client) ID
- After registration, copy the "Application (client) ID" from the Overview page
- This goes in your `.env` file as `REACT_APP_MICROSOFT_CLIENT_ID`

### 5. Configure API Permissions
- Go to "API permissions" in the left sidebar
- Click "Add a permission"
- Select "Microsoft Graph"
- Choose "Delegated permissions"
- Add these permissions:
  - `Mail.Send` - Send mail as a user
  - `User.Read` - Sign in and read user profile
  - `offline_access` - Maintain access to data you have given it access to

### 6. Grant Admin Consent (Important!)
- Click "Grant admin consent for [Your Organization]"
- This step is **required** for the permissions to work
- If you don't have admin rights, ask your IT administrator to do this

### 7. Configure Authentication Settings
- Go to "Authentication" in the left sidebar
- Under "Single-page application", ensure your redirect URI is listed
- **Important**: Do NOT enable implicit flows - we use Authorization Code with PKCE
- The default settings for Single-page applications already support PKCE
- Ensure "Allow public client flows" is set to "No" (default)

### 8. Update Environment Variables
Create/update your `.env` file:
```
REACT_APP_MICROSOFT_CLIENT_ID=your-actual-client-id-here
```

## Common Issues and Solutions

### Issue: "Application not found in directory"
**Cause**: The client ID in your `.env` file is still the placeholder value
**Solution**: Replace `your-microsoft-client-id` with your actual client ID from step 4

### Issue: "AADSTS9002325: Proof Key for Code Exchange is required"
**Cause**: PKCE is now required for Single-page applications (this is normal)
**Solution**: This error should be automatically handled by our implementation. If you see this, ensure you're using the latest version of the code.

### Issue: "AADSTS65001: The user or administrator has not consented"
**Cause**: Admin consent hasn't been granted
**Solution**: Complete step 6 above, or contact your IT administrator

### Issue: "AADSTS50011: The reply URL specified in the request does not match"
**Cause**: Redirect URI mismatch
**Solution**: Ensure the redirect URI in Azure matches exactly: `http://localhost:3000/auth/callback`

### Issue: Permission denied errors
**Cause**: Required API permissions not granted
**Solution**: Verify all permissions from step 5 are added and consented to

### Issue: "AADSTS7000218: The request body must contain the following parameter: client_assertion"
**Cause**: Incorrect authentication flow configuration
**Solution**: Ensure the app is registered as "Single-page application" not "Web application"

## Testing Your Setup
1. Update your `.env` file with the real client ID
2. Restart your development server (`npm start`)
3. Navigate to Email Configuration
4. Click "Authenticate with Microsoft"
5. You should see the Microsoft login popup

## Production Deployment
For production, you'll need to:
1. Add your production domain to the redirect URIs
2. Update the client ID in your production environment variables
3. Ensure your organization's IT policies allow the app

## Need Help?
If you encounter issues:
1. Check the Azure Portal → App registrations → Your app → Authentication logs
2. Verify all redirect URIs are exactly correct
3. Ensure admin consent has been granted
4. Contact your IT administrator if you lack sufficient permissions