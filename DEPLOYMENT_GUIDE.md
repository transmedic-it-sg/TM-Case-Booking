# Production Deployment Guide: TM Case Booking System

## Platform: Vercel + Supabase + Microsoft 365 Email

This guide covers the complete deployment process for the TM Case Booking System to production.

---

## Phase 1: Azure AD Setup (Email Service)

### Step 1: Register Application in Azure AD
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations** → **New registration**
3. Fill in:
   - **Name**: `TM Case Booking System`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: 
     - Platform: **Single-page application (SPA)** ⚠️ IMPORTANT
     - URI: `https://tm-case-booking.vercel.app/auth/callback`
4. Click **Register**

> **Why SPA?** Your React app is a single-page application that handles authentication in the browser. The SPA platform type enables the correct OAuth flow (implicit/auth code with PKCE) for browser-based apps without exposing secrets.

### Step 2: Configure API Permissions
1. In your app registration, go to **API Permissions**
2. Click **Add a permission** → **Microsoft Graph**
3. Add these permissions:
   - `Mail.Send` (Application permission) - For sending emails via backend
   - `User.Read` (Delegated permission) - For user authentication
4. Click **Grant admin consent** for your organization (requires admin rights)

### Step 3: Create Client Secret
1. Go to **Certificates & secrets** → **New client secret**
2. Add description: `Production Email Service`
3. Set expiration (recommend 24 months)
4. **⚠️ COPY THE SECRET VALUE IMMEDIATELY** (shown only once)

### Step 4: Save Your Credentials
Store these values securely:
```
Application (client) ID: ee804dfd-da69-4a89-9006-b1620346423c
Directory (tenant) ID: d213fe2b-9fcd-42cf-90a4-8ea84de3103e
Client Secret Value: 32c3d38b-ef91-4047-a760-8e4b4fcd1c82 (KEEP SECURE!)
```

---

## Phase 2: Vercel Deployment

### Step 5: Prepare for Deployment
The repository already includes `vercel.json` configuration.

### Step 6: Deploy to Vercel

#### Option A: Via Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy (from project root)
vercel

# Follow prompts:
# - Link to existing project? No (first time)
# - What's your project name? tm-case-booking
# - In which directory is your code? ./ (current directory)
# - Want to override settings? No
```

#### Option B: Via GitHub Integration
1. Push code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Configure project:
   - Framework Preset: Create React App
   - Build Command: `npm run build`
   - Output Directory: `build`

### Step 7: Configure Environment Variables in Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables for **Production**:

```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=https://aqzjzjygflmxkcbfnjbe.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw

# Microsoft Azure AD (from Step 4)
REACT_APP_MICROSOFT_CLIENT_ID=[Your Azure AD Client ID]
REACT_APP_MICROSOFT_TENANT_ID=[Your Azure AD Tenant ID]

# Build Configuration
GENERATE_SOURCEMAP=false
CI=false
```

5. Click **Save** and **Redeploy**

### Step 8: Note Your Deployment URL
Your app will be available at:
- Default: `https://tm-case-booking.vercel.app`
- Custom domain (if configured): `https://your-domain.com`

---

## Phase 3: Supabase Configuration

### Step 9: Configure CORS in Supabase
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `TM Case Booking`
3. Go to **Settings** → **API**
4. Under **CORS Configuration**, add:
   - `https://tm-case-booking.vercel.app`
   - `https://localhost:3000` (for local development)
   - Your custom domain (if applicable)

### Step 10: Configure Edge Function Secrets
1. In Supabase Dashboard, go to **Edge Functions**
2. Select `send-email` function
3. Go to **Settings** → **Secrets**
4. Add these environment variables:

```env
MICROSOFT_CLIENT_ID=[Your Azure AD Client ID]
MICROSOFT_CLIENT_SECRET=[Your Azure AD Client Secret - KEEP VERY SECURE!]
MICROSOFT_TENANT_ID=[Your Azure AD Tenant ID]
ALLOWED_ORIGINS=https://tm-case-booking.vercel.app
```

### Step 11: Deploy/Update Edge Function
```bash
# From project root
cd supabase/functions
supabase functions deploy send-email
```

---

## Phase 4: Post-Deployment Configuration

### Step 12: Update Azure AD Redirect URI
1. Return to Azure Portal → Your App Registration
2. Go to **Authentication**
3. Verify/Update the Redirect URI to match your actual deployment:
   - Production: `https://tm-case-booking.vercel.app/auth/callback`
   - Custom domain: `https://your-domain.com/auth/callback`
4. Save changes

### Step 13: Configure Email in Application
1. Visit your deployed app: `https://tm-case-booking.vercel.app`
2. Login with admin credentials
3. Navigate to **Settings** → **Email Configuration**
4. Select your country
5. Click **Authenticate with Microsoft**
6. Sign in with `SpineCaseBooking@transmedicgroup.com`
7. Configure notification rules:
   - Set which roles receive notifications for each case status
   - Customize email templates
   - Test with a sample notification

---

## Phase 5: Testing & Verification

### Step 14: Deployment Checklist

#### Application Access
- [ ] Can access `https://tm-case-booking.vercel.app`
- [ ] No console errors in browser DevTools
- [ ] Application loads without warnings

#### Authentication
- [ ] Can login with existing credentials
- [ ] Session persists correctly
- [ ] Logout works properly

#### Data Operations
- [ ] Cases load from Supabase
- [ ] Can create new cases
- [ ] Can update case status
- [ ] Real-time updates work

#### Email Notifications
- [ ] Microsoft authentication succeeds
- [ ] Test email sends successfully
- [ ] Email templates render correctly
- [ ] Notifications trigger on status changes

### Step 15: Monitor & Troubleshoot

#### View Logs
```bash
# Vercel deployment logs
vercel logs

# Supabase Edge Function logs
supabase functions logs send-email

# Local testing
npm start
```

#### Common Issues & Solutions

**Issue: CORS Error**
- Solution: Add your domain to Supabase CORS settings
- Check Edge Function CORS headers

**Issue: Email Not Sending**
- Check Edge Function logs for errors
- Verify Azure AD credentials
- Ensure Mail.Send permission has admin consent

**Issue: Build Fails on Vercel**
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Ensure `CI=false` is set

**Issue: Authentication Fails**
- Verify redirect URI matches exactly in Azure AD
- Check client ID is correct
- Ensure SPA platform is selected in Azure AD

---

## Production Checklist

### Security
- [ ] Client secrets only in Edge Functions (never in frontend)
- [ ] HTTPS enforced on all endpoints
- [ ] CORS properly configured
- [ ] Environment variables secured

### Performance
- [ ] Build optimized (`npm run build`)
- [ ] Source maps disabled in production
- [ ] Images and assets optimized
- [ ] Caching headers configured

### Monitoring
- [ ] Vercel Analytics enabled
- [ ] Supabase usage monitored
- [ ] Error tracking in place
- [ ] Email delivery logs reviewed

---

## Quick Reference

### Environment Variables

#### Frontend (Vercel)
```env
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_MICROSOFT_CLIENT_ID=your-client-id
REACT_APP_MICROSOFT_TENANT_ID=your-tenant-id
GENERATE_SOURCEMAP=false
CI=false
```

#### Backend (Supabase Edge Function)
```env
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-secret (KEEP SECURE!)
MICROSOFT_TENANT_ID=your-tenant-id
ALLOWED_ORIGINS=https://tm-case-booking.vercel.app
```

### Useful Commands
```bash
# Deploy to Vercel
vercel --prod

# View deployment
vercel ls

# Check logs
vercel logs

# Deploy Edge Function
supabase functions deploy send-email

# View Edge Function logs
supabase functions logs send-email
```

### Important URLs
- Production App: `https://tm-case-booking.vercel.app`
- Vercel Dashboard: `https://vercel.com/dashboard`
- Supabase Dashboard: `https://app.supabase.com`
- Azure Portal: `https://portal.azure.com`

---

## Support & Maintenance

### Regular Tasks
1. Monitor Azure AD client secret expiration (renew before expiry)
2. Review email delivery logs weekly
3. Check Supabase usage and limits
4. Update dependencies monthly (`npm update`)

### Backup Strategy
1. Supabase handles database backups automatically
2. Keep deployment configuration in version control
3. Document any environment variable changes

---

## Contact & Support

For issues or questions:
1. Check Edge Function logs first
2. Review Vercel deployment logs
3. Verify all environment variables are set correctly
4. Ensure Azure AD permissions are granted

---

*Last Updated: January 2025*
*Version: 1.3.1*