# Production Deployment Guide - Version 1.2.3

## 🚀 Pre-Deployment Checklist

### ✅ Code Verification
- [x] TypeScript compilation clean
- [x] All tests passing
- [x] Package.json version updated to 1.2.3
- [x] Changelog created and documented
- [x] All requested features implemented

### ✅ Database Prerequisites
**⚠️ CRITICAL: Run these SQL scripts in Supabase BEFORE deployment:**

1. **System Settings Schema Update:**
```sql
-- Run UPDATE_SYSTEM_SETTINGS_SCHEMA.sql
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS amendment_time_limit INTEGER NOT NULL DEFAULT 24,
ADD COLUMN IF NOT EXISTS max_amendments_per_case INTEGER NOT NULL DEFAULT 5;
```

2. **Audit Logs RLS Policy Fix:**
```sql
-- Run FIX_AUDIT_LOGS_RLS.sql
-- (See the complete file for full policy setup)
```

### ✅ Environment Configuration
- [x] Supabase URL and keys configured
- [x] Environment variables verified
- [x] Production build settings confirmed

## 🔧 Deployment Steps

### Step 1: Database Migration
**Execute SQL migrations in Supabase SQL Editor:**
1. Copy and run `UPDATE_SYSTEM_SETTINGS_SCHEMA.sql`
2. Copy and run `FIX_AUDIT_LOGS_RLS.sql`
3. Verify tables are updated correctly

### Step 2: Build Verification
```bash
# Verify build works locally
npm run typecheck
npm run build
```

### Step 3: Vercel Deployment
```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Deploy to production
vercel --prod
```

### Step 4: Post-Deployment Verification
1. Test amendment functionality
2. Verify IT role permissions work
3. Check Global Tables interface
4. Test system settings amendments configuration
5. Confirm toggle switches work properly

## 🌐 Vercel Configuration

### Recommended Vercel Settings
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### Environment Variables for Vercel
Make sure these are set in Vercel dashboard:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- Any other custom environment variables

## 🔍 Post-Deployment Testing Checklist

### Critical Functionality Tests
- [ ] Login/Authentication works
- [ ] Cases load properly from Supabase
- [ ] Amendment functionality creates history
- [ ] IT role can execute status transitions
- [ ] System Settings shows amendment configuration
- [ ] Global Tables work without country selector
- [ ] Toggle switches display correctly

### Performance Verification
- [ ] Page load times acceptable
- [ ] Database queries performing well
- [ ] No console errors in production
- [ ] All assets loading correctly

## 🚨 Rollback Plan

### If Issues Occur:
1. **Immediate:** Revert to previous Vercel deployment
2. **Database:** Have backup of previous schema
3. **Code:** Use git to revert to last stable commit

### Rollback Commands:
```bash
# List previous deployments
vercel list

# Promote previous deployment
vercel promote [previous-deployment-url]
```

## 📊 Success Metrics

### Deployment Successful When:
- [ ] All users can login without issues
- [ ] Amendment functionality works with visible history
- [ ] IT users can execute all status transitions
- [ ] System settings are accessible and configurable
- [ ] No critical errors in logs
- [ ] Performance is acceptable

## 🔧 Troubleshooting

### Common Issues and Solutions:

**Amendment History Not Showing:**
- Verify SQL migrations were run
- Check Supabase RLS policies
- Confirm amendment_history table exists

**IT Role Permissions Not Working:**
- Check permission matrix is deployed
- Verify user role assignments
- Clear browser cache

**Global Tables Issues:**
- Confirm country dropdown removed
- Check global tables initialization
- Verify code table service updates

**Toggle Switch Display Issues:**
- Clear browser cache
- Verify CSS changes deployed
- Check for conflicting styles

## 📞 Support Information

### If Deployment Fails:
1. Check Vercel build logs
2. Verify environment variables
3. Test local build first
4. Check Supabase connectivity

### Emergency Contacts:
- Development team: [Your contact info]
- Supabase dashboard: [Project URL]
- Vercel dashboard: [Project URL]

---

## 🎯 Final Notes

This deployment includes significant improvements:
- Enhanced amendment functionality with configurable policies
- Fixed IT role permissions for all status transitions
- Simplified Global Tables interface
- Professional amendment history display
- Improved system configuration options

**Version 1.2.3 represents a stable, production-ready release with comprehensive testing and documentation.**