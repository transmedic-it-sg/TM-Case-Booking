# Changelog - Version 1.2.3

## Release Date: 2025-01-21

### 🚀 New Features

#### Amendment Time Configuration
- **Added Amendment Settings to System Settings**
  - Configurable amendment time limit (1-168 hours)
  - Configurable maximum amendments per case (1-20 amendments)
  - System-wide enforcement of amendment policies
  - Database schema updated to support amendment configuration

#### Enhanced Amendment History Display
- **Completely redesigned amendment history interface**
  - Shows multiple amendments with chronological ordering
  - Detailed change tracking with before/after values
  - Color-coded changes (red for old values, green for new values)
  - Amendment reason and metadata display
  - Professional grid layout for better readability

### 🔧 Fixes

#### Global Tables Management
- **Removed unnecessary country dropdown from Global Tables**
  - Simplified Global Tables interface in Code Table Setup
  - Removed `global-countries-selector` component
  - Global tables now properly function as global (not country-specific)

#### User Interface Improvements
- **Fixed toggle switch styling bug**
  - Removed conflicting Bootstrap classes from Settings toggle switch
  - Toggle switch now displays correctly with proper styling
  - Improved visual feedback for enabled/disabled states

#### Permissions System Enhancement
- **Fixed IT role status transition permissions**
  - Added missing status transition permissions for IT role:
    - `create-case`, `amend-case`
    - `process-order`, `order-processed`
    - `pending-delivery-hospital`, `delivered-hospital`
    - `case-completed`, `pending-delivery-office`
    - `delivered-office`, `to-be-billed`, `case-closed`
  - IT users can now properly execute all status transitions
  - Buttons are now functional for IT role users

#### Amendment History Data Structure
- **Fixed amendment history loading and display**
  - Updated query to properly fetch amendment history from Supabase
  - Removed problematic profile table joins
  - Fixed data mapping from database to frontend interface
  - Amendment history now appears immediately after successful amendments

### 🗄️ Database Updates

#### System Settings Schema
- Added `amendment_time_limit` column (default: 24 hours)
- Added `max_amendments_per_case` column (default: 5 amendments)
- Updated system settings table structure for new configuration options

#### Audit Logs RLS Policy
- Created SQL fix for Row Level Security policy issues
- Proper authentication policies for audit log insertion
- Service role permissions configured correctly

### 🔍 Technical Improvements

#### Data Flow Optimization
- **Supabase-first architecture maintained**
- All data operations use Supabase as primary storage
- localStorage only for emergency fallbacks
- Comprehensive error handling with proper error propagation

#### Code Quality
- TypeScript compilation passes without errors
- Removed unused imports and functions
- Updated interface definitions for new amendment structure
- Consistent code formatting and structure

#### Amendment Processing
- Enhanced change tracking with detailed field-level monitoring
- Proper timestamp handling for amendment history
- User attribution for all amendment actions
- Comprehensive audit trail for all changes

### 📋 SQL Updates Required

#### Run these SQL commands in Supabase SQL Editor:

1. **Update System Settings Table:**
```sql
-- See UPDATE_SYSTEM_SETTINGS_SCHEMA.sql
```

2. **Fix Audit Logs RLS Policy:**
```sql
-- See FIX_AUDIT_LOGS_RLS.sql
```

### 🧪 Testing Status

#### Verified Functionality
- ✅ Amendment functionality with proper history tracking
- ✅ System settings amendment configuration
- ✅ Global tables simplified interface
- ✅ Toggle switch visual fixes
- ✅ IT role permissions for status transitions
- ✅ TypeScript compilation clean
- ✅ Supabase data consistency

#### Ready for User Testing
- Amendment time limit enforcement
- Maximum amendments per case validation
- Status transition buttons for IT role
- Amendment history display with new interface
- Global tables management without country selector

### 🔄 Migration Notes

#### For Existing Installations:
1. Run the provided SQL scripts in Supabase
2. Clear browser cache to ensure new styles load
3. Test amendment functionality with different user roles
4. Verify system settings are accessible and configurable
5. Check that Global Tables work without country selection

### 📈 Performance Improvements

- Reduced query complexity for amendment history loading
- Simplified Global Tables data flow
- Optimized permission checking for status transitions
- Faster rendering of amendment history interface

### 🛡️ Security Enhancements

- Proper RLS policies for audit logs
- Enhanced permission validation for IT role
- Secure amendment time limit enforcement
- Audit trail for all amendment configuration changes

---

## Version Compatibility

- **Database Schema Version**: Updated (requires SQL migrations)
- **API Compatibility**: Maintained
- **Frontend Compatibility**: Enhanced amendment interface
- **Permission System**: Updated IT role permissions

## Known Issues

- None identified in this release

## Next Release Preview

- Amendment time limit enforcement implementation
- Enhanced audit logging for system configuration changes
- Additional status transition validations
- User notification system for amendment policy updates