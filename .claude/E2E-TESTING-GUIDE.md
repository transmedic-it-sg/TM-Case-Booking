# E2E Testing Guide - tm-case-booking.vercel.app

## 🚀 DEPLOYMENT STATUS

- ✅ **Production URL**: https://tm-case-booking.vercel.app
- ✅ **Build Size**: 287.93 kB (gzipped)
- ✅ **Version**: 1.3.3 with all critical fixes
- ✅ **Deployment**: Successful

## 📧 EMAIL CREDENTIALS CONFIGURATION

**Email Account**: spinecasebooking@transmedicgroup.com
**Password**: Tmsg@159349

### Edge Function Configuration Required:
The Edge Function needs these environment variables in Supabase:
```
MICROSOFT_TENANT_ID=your_tenant_id
MICROSOFT_CLIENT_ID=your_client_id  
MICROSOFT_CLIENT_SECRET=your_client_secret
```

## 🧪 E2E TEST CASES

### 1. Case Creation Test
**URL**: https://tm-case-booking.vercel.app
1. Login with valid credentials
2. Create a new case
3. **Check Console**: Look for `🔍 E2E DEBUG - Insert result: { hasData: true }`
4. **Expected**: No "No data returned from database insert" errors
5. **Expected**: Case appears in cases list immediately

### 2. Email Notification Test
1. Change case status (e.g., Case Booked → Order Preparation)
2. **Check Console**: Look for `📧 Email Debug - Attempting to send notification`
3. **Expected**: No 500 errors from Edge Function
4. **Expected**: `✅ E2E DEBUG - Email sent successfully` message

### 3. Real-time Operations Test
1. Create multiple cases
2. Change case statuses
3. **Check Console**: Look for `🔍 E2E DEBUG - Status Update Result`
4. **Expected**: No 400 database query errors
5. **Expected**: Real-time updates work without refresh

### 4. RLS Policy Verification
1. Create a case and monitor console
2. **Check Console**: `🔍 E2E DEBUG - Insert result`
3. **Expected**: `hasData: true` and `dataLength: 1`
4. **Expected**: No fallback to verification queries

## 🔧 DEBUGGING LOGS TO MONITOR

### Browser Console Logs:
```javascript
// ✅ GOOD - Case creation working
🔍 E2E DEBUG - Insert result: { hasData: true, dataLength: 1 }

// ❌ BAD - RLS policy issue (should not appear)
No data returned from database insert
Attempting to verify if case was saved despite error...

// ✅ GOOD - Email system working
📧 Email Debug - Attempting to send notification: { recipientCount: 5 }
✅ E2E DEBUG - Email sent successfully

// ❌ BAD - Email system failing
📧 Failed to send email notification: { edgeFunctionError: 500 }
```

### Network Tab Monitoring:
- **Case Creation**: `POST /rest/v1/case_bookings` should return 201
- **Email Notifications**: `POST /functions/v1/send-email` should return 200
- **Status Updates**: `PATCH /rest/v1/case_bookings` should return 200

## 🆘 CREDENTIALS NEEDED FOR TESTING

**Question**: Do you need any additional credentials?

### Current Access:
- ✅ Email credentials provided
- ✅ Application deployed and accessible
- ✅ Debugging infrastructure active

### Potentially Needed:
- 🔹 Test user accounts for different roles
- 🔹 Azure AD app registration details for email setup
- 🔹 Supabase project admin access
- 🔹 Specific test case data

## 📊 SUCCESS CRITERIA

### ✅ All Fixed Issues:
1. **RLS Policy**: No "No data returned" errors
2. **Email System**: No 500 errors, proper v2.0 Graph API usage
3. **Database Queries**: No 400 errors after case creation
4. **Performance**: Fast loading, real-time updates

### ⚠️ Expected Warnings (Non-blocking):
- Cross-Origin-Opener-Policy warnings (browser security)
- ESLint peer dependency warnings (build-time only)

## 🔄 ROLLBACK PROCEDURE

If critical issues found:
```bash
git revert HEAD~1
git push origin main
vercel rollback
```

## 📝 TESTING CHECKLIST

- [ ] Application loads at tm-case-booking.vercel.app
- [ ] Login functionality works
- [ ] Case creation shows proper debugging logs
- [ ] Email notifications trigger without 500 errors
- [ ] Status changes work without 400 errors
- [ ] Real-time updates function properly
- [ ] All browser console logs show success messages

**Ready for comprehensive E2E testing!** 🚀