# Email Setup Checklist - TM Case Booking System

## ✅ Completed Steps
- [x] Azure AD Application created
- [x] Client ID obtained: `ee804dfd-da69-4a89-9006-b1620346423c`
- [x] Tenant ID obtained: `d213fe2b-9fcd-42cf-90a4-8ea84de3103e`
- [x] Client Secret created: `32c3d38b-ef91-4047-a760-8e4b4fcd1c82`
- [x] Local .env file updated with credentials
- [x] Edge Function code updated

## 📋 Required Actions

### 1. Vercel Environment Variables (REQUIRED)
Go to your Vercel Dashboard → Project Settings → Environment Variables and add:

```env
REACT_APP_SUPABASE_URL=https://aqzjzjygflmxkcbfnjbe.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw
REACT_APP_MICROSOFT_CLIENT_ID=ee804dfd-da69-4a89-9006-b1620346423c
REACT_APP_MICROSOFT_TENANT_ID=d213fe2b-9fcd-42cf-90a4-8ea84de3103e
GENERATE_SOURCEMAP=false
CI=false
```

### 2. Supabase Edge Function Secrets (REQUIRED)
Go to Supabase Dashboard → Edge Functions → send-email → Settings → Secrets and add:

```env
MICROSOFT_CLIENT_ID=ee804dfd-da69-4a89-9006-b1620346423c
MICROSOFT_CLIENT_SECRET=32c3d38b-ef91-4047-a760-8e4b4fcd1c82
MICROSOFT_TENANT_ID=d213fe2b-9fcd-42cf-90a4-8ea84de3103e
ALLOWED_ORIGINS=https://tm-case-booking.vercel.app
```

⚠️ **IMPORTANT**: The Client Secret must be kept secure and only added in Supabase, never in frontend code.

### 3. Deploy Edge Function to Supabase (REQUIRED)
Run this command from your project root:

```bash
cd /mnt/c/Users/anrong.low/TM-Case-Booking
supabase functions deploy send-email
```

### 4. Update Azure AD Redirect URIs (REQUIRED)
Go to Azure Portal → Your App Registration → Authentication and add these redirect URIs:
- Platform: **Single-page application (SPA)**
- URIs:
  - `https://tm-case-booking.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (for local testing)
  - Your custom domain if you have one

### 5. Deploy to Vercel (REQUIRED)
```bash
vercel --prod
```

## 🌍 Multi-Country Email Configuration

### How It Works:
- **ONE Azure AD App** serves ALL countries
- **ONE email account** (SpineCaseBooking@transmedicgroup.com) sends for ALL countries
- **Country-specific settings** are configured in the app's Email Configuration page

### In-App Configuration (After Deployment):
1. Login as admin to your deployed app
2. Go to Settings → Email Configuration
3. For EACH country (Singapore, Malaysia, Thailand, etc.):
   - Select the country
   - Click "Authenticate with Microsoft" (you only need to do this once)
   - Configure notification rules:
     - Which roles get notified for each status
     - Email templates for that country
     - Department-specific rules

### Email Flow:
```
User updates case in Singapore → 
App checks Singapore notification rules → 
Sends email via SpineCaseBooking@transmedicgroup.com → 
Recipients get notification
```

## 🔍 Testing Checklist

### Local Testing First:
```bash
# Start the app locally
npm start

# Test email configuration
1. Go to http://localhost:3000
2. Login as admin
3. Settings → Email Configuration
4. Select Singapore
5. Click "Authenticate with Microsoft"
6. Login with SpineCaseBooking@transmedicgroup.com
7. Create a test case
8. Update case status
9. Verify email is received
```

### Production Testing:
1. Visit https://tm-case-booking.vercel.app
2. Repeat the same steps as local testing
3. Check Edge Function logs:
   ```bash
   supabase functions logs send-email
   ```

## 🚨 Common Issues & Solutions

### Issue: "Permission denied" when sending email
**Solution**: In Azure AD, ensure Mail.Send permission has admin consent granted

### Issue: Authentication redirect fails
**Solution**: Verify redirect URI in Azure AD matches exactly (including https://)

### Issue: Email not sending from Edge Function
**Solution**: Check Edge Function secrets are set correctly in Supabase Dashboard

### Issue: CORS error
**Solution**: Add your domain to Supabase CORS settings and Edge Function ALLOWED_ORIGINS

## 📊 Email System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React App      │────▶│ Supabase Edge   │────▶│ Microsoft Graph │
│  (All Countries)│     │ Function        │     │ API             │
│                 │     │ (send-email)    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         │                       │                        │
    User triggers           Uses stored              Sends via
    notification          client secret         SpineCaseBooking@
                                                transmedicgroup.com
```

## 📅 Next Steps Priority

1. **TODAY**: Set Vercel environment variables
2. **TODAY**: Set Supabase Edge Function secrets  
3. **TODAY**: Deploy Edge Function
4. **TODAY**: Update Azure AD redirect URIs
5. **TODAY**: Deploy to Vercel
6. **AFTER DEPLOYMENT**: Configure email rules for Singapore in the app
7. **LATER**: Configure email rules for other countries as needed

## 💡 Important Notes

- **One Setup, Multiple Countries**: You do NOT need separate Azure apps per country
- **Centralized Email**: All emails sent from SpineCaseBooking@transmedicgroup.com
- **Country Rules**: Different notification rules per country configured in-app
- **Security**: Client secret ONLY in Supabase, never exposed to frontend
- **Scalability**: Can add new countries without touching Azure AD

## 📞 Support

If you encounter issues:
1. Check this checklist first
2. Review Edge Function logs: `supabase functions logs send-email`
3. Verify all environment variables are set
4. Ensure Azure AD permissions are granted with admin consent

---
*Ready for production deployment*
*Last updated: January 2025*