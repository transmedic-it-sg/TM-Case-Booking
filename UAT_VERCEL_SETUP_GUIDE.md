# 🚀 UAT Vercel Setup Guide

## ❌ Issue Summary

I apologize for the confusion! When I deployed the UAT environment, it overwrote your production project instead of creating a separate UAT project. 

## ✅ Current Status

- **Production Restored**: https://tm-case-booking.vercel.app (with correct production Supabase config)
- **UAT Branch Created**: Available in GitHub with UAT Supabase configuration
- **Need**: Separate UAT Vercel project

## 🎯 Manual UAT Setup (Recommended)

### Option 1: Create New Vercel Project via Dashboard

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click "New Project"

2. **Import from GitHub**
   - Connect to your GitHub account
   - Select repository: `TM-Case-Booking`
   - **Important**: Select the `UAT` branch (not main/Production)

3. **Configure Project**
   - **Project Name**: `tm-case-booking-uat`
   - **Framework**: Create React App (auto-detected)
   - **Root Directory**: `.` (default)

4. **Environment Variables**
   ```
   REACT_APP_SUPABASE_URL = https://rqcrsrdlcdpkxxkqwvyo.supabase.co
   REACT_APP_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxY3JzcmRsY2Rwa3h4a3F3dnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NTYxNzgsImV4cCI6MjA2ODAzMjE3OH0.TsacGcws7AueQNG0BGlgSrxSnVVeVTomsxRz-0mV2N0
   GENERATE_SOURCEMAP = false
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build completion (~2-3 minutes)

### Option 2: Clone Repository Method

1. **Create New Repository (Optional)**
   ```bash
   # Clone your existing repo to a new directory
   git clone https://github.com/Mika-Nim/TM-Case-Booking.git TM-Case-Booking-UAT
   cd TM-Case-Booking-UAT
   git checkout UAT
   ```

2. **Create New GitHub Repository**
   - Name: `TM-Case-Booking-UAT`
   - Push your UAT branch to this new repo

3. **Connect to Vercel**
   - Import the new repository in Vercel
   - Set environment variables as above

### Option 3: Manual Deploy (Quick Test)

1. **From UAT Branch**
   ```bash
   git checkout UAT
   npm run build
   ```

2. **Drag & Drop Deploy**
   - Go to: https://vercel.com/new
   - Drag the `build` folder to deploy
   - Manually set environment variables in project settings

## 🔧 Environment Configuration

### UAT Environment Variables
```bash
# Supabase UAT Configuration
REACT_APP_SUPABASE_URL=https://rqcrsrdlcdpkxxkqwvyo.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxY3JzcmRsY2Rwa3h4a3F3dnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NTYxNzgsImV4cCI6MjA2ODAzMjE3OH0.TsacGcws7AueQNG0BGlgSrxSnVVeVTomsxRz-0mV2N0

# Other Configuration
GENERATE_SOURCEMAP=false
REACT_APP_MICROSOFT_CLIENT_ID=766ea716-3e33-41a9-b780-c23203f5562b
```

### Production Environment Variables (Current)
```bash
# Supabase Production Configuration  
REACT_APP_SUPABASE_URL=https://aqzjzjygflmxkcbfnjbe.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw
```

## 🎯 Expected Results

After setup, you should have:

1. **Production**: https://tm-case-booking.vercel.app
   - Connected to Production Supabase database
   - Production branch deployment

2. **UAT**: https://tm-case-booking-uat.vercel.app (or similar)
   - Connected to UAT Supabase database  
   - UAT branch deployment
   - Completely separate from production

## ✅ Verification Steps

1. **Test Production**
   - Visit production URL
   - Login and verify existing data
   - Confirm production database connectivity

2. **Test UAT**
   - Visit UAT URL
   - Should show empty database (until migrated)
   - Verify UAT Supabase connection

## 🚨 Important Notes

- **UAT Branch**: Contains UAT environment configuration
- **Production Branch**: Contains production environment configuration
- **Separate Projects**: Each environment should be its own Vercel project
- **Environment Variables**: Critical for database connectivity

## 📋 Next Steps

1. **Create UAT Vercel project** using Option 1 above
2. **Migrate database** using the migration guides I provided earlier
3. **Test UAT environment** thoroughly before production deployments

Would you like me to help with any specific part of this setup process?