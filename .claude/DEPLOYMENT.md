# Deployment Guide - TM Case Booking System

## Quick Deployment
```bash
# 1. Verify build
npm run build

# 2. Deploy to production
vercel --prod

# 3. Monitor deployment
vercel logs
```

## Environment Setup
- **Platform**: Vercel
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Node Version**: 18.x

## Database Configuration
- **Provider**: Supabase PostgreSQL
- **Connection**: Environment variables in Vercel dashboard
- **Features**: Real-time subscriptions, RLS, Edge Functions

## Post-Deployment Checklist
1. ✅ Application loads correctly
2. ✅ User authentication works
3. ✅ Case creation and status updates function
4. ✅ Email notifications send for all 11 status changes
5. ✅ Quantities display in case lists
6. ✅ Amendment functionality works
7. ✅ Usage calendar aggregates correctly

## Critical URLs
- **Production**: https://tm-case-booking.vercel.app
- **Supabase Dashboard**: [Project specific URL]
- **Vercel Dashboard**: https://vercel.com/dashboard

## Rollback Procedure
```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel alias [previous-deployment-url] tm-case-booking.vercel.app
```

## Support
- **Build Issues**: Check `npm run build` output
- **Runtime Issues**: Check Vercel function logs
- **Database Issues**: Check Supabase dashboard logs

---
*Updated: October 12, 2025 - v1.4.0*