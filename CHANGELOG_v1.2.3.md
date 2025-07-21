# Changelog - Version 1.2.3

## Release Date: 2025-01-21

### 🚀 New Features

#### Amendment System Enhancements
- **Amendment Time Configuration**: Configurable amendment policies in System Settings
  - Amendment time limit: 1-168 hours after case creation
  - Maximum amendments per case: 1-20 amendments
  - System-wide policy enforcement

- **Enhanced Amendment History Display**
  - Professional before/after change tracking
  - Color-coded changes (red→green) for better visualization
  - Chronological amendment ordering with detailed metadata
  - Complete audit trail with user attribution

### 🔧 Fixes & Improvements

#### Permission System
- **Fixed IT Role Status Transitions**: IT users can now execute all status transitions
- Complete permission set added for IT role operations
- All status transition buttons now functional for IT users

#### User Interface
- **Fixed Toggle Switch Styling**: Removed conflicting CSS classes
- **Simplified Global Tables**: Removed unnecessary country dropdown
- **Clean Interface**: Streamlined Code Table Setup for global data

#### Data Architecture
- **Supabase-First Integration**: All operations use Supabase as primary storage
- **Enhanced Error Handling**: Proper error propagation instead of silent fallbacks
- **Optimized Queries**: Improved amendment history loading performance

### 🗄️ Database Updates

#### Schema Changes
- Added `amendment_time_limit` and `max_amendments_per_case` to system_settings
- Enhanced audit_logs table with proper RLS policies
- Improved amendment_history structure with change tracking

### 🧪 Verified Functionality
- ✅ Amendment functionality with visible history
- ✅ IT role permissions for all status transitions  
- ✅ System settings amendment configuration
- ✅ Global tables simplified interface
- ✅ TypeScript compilation clean
- ✅ Supabase data consistency maintained

### 📈 Performance & Security
- Reduced query complexity for amendment operations
- Enhanced permission validation
- Comprehensive audit trail for all changes
- Optimized frontend rendering with React optimizations

---

## Deployment
- **Production URL**: https://tm-case-booking-e7fne164f-an-rong-lows-projects.vercel.app
- **Git Branches**: Version-1.2.3, Production
- **Database**: Supabase with updated schema
- **Status**: ✅ Production Ready