# TM Case Booking System - Complete Architecture Guide

## System Overview
A React-based case management system for medical device booking and delivery tracking with role-based permissions and real-time updates.

## Core Technologies
- **Frontend**: React 18.2.0 + TypeScript
- **Backend**: Supabase (PostgreSQL + Real-time + Auth)
- **Deployment**: Vercel
- **Authentication**: Microsoft OAuth + Supabase Auth

## Database Schema

### Core Tables
```sql
-- User Management
profiles                    -- Main user table (replaces users)
├── id (uuid, PK)
├── username (unique)
├── name, email, role
├── departments[], countries[]
├── password_hash, enabled
└── timestamps

-- Case Management
case_bookings              -- Main case records
├── id (uuid, PK)
├── case_reference_number (unique)
├── hospital, department, country
├── date_of_surgery, time_of_procedure
├── doctor_id (FK → doctors.id)
├── surgery_set_selection[], implant_box[]
├── status (enum: 12 statuses)
├── submitted_by, processed_by
└── timestamps

case_booking_quantities    -- Quantity tracking
├── case_booking_id (FK)
├── item_type ('surgery_set' | 'implant_box')
├── item_name, quantity
└── timestamps

-- Medical Data
doctors                    -- Doctor information
├── id (uuid, PK)
├── name, specialties[]
├── department_id (FK)
├── country, sort_order
└── timestamps

departments               -- Hospital departments
surgery_sets             -- Surgery equipment sets
implant_boxes           -- Implant equipment boxes

-- System Management
permissions              -- Role-based access control
email_notification_rules -- Email automation
audit_logs              -- System audit trail
admin_email_configs     -- Email OAuth settings
```

### Database Functions
```sql
get_daily_usage()        -- Usage analytics (FIXED)
migrate_essential_data() -- Data migration helper
```

## Authentication Flow

### 1. Microsoft OAuth (Primary)
```typescript
// OAuth flow for admin email configuration
Microsoft Graph API → Supabase → profiles table
```

### 2. Local Authentication (Fallback)
```typescript
// Username/password for non-admin users
username + password_hash → Supabase Auth → profiles table
```

## Permission System Architecture

### Permission Matrix Structure
```typescript
interface Permission {
  actionId: string;    // Frontend format: 'create-case'
  roleId: string;      // 'admin' | 'operations' | 'sales' | etc.
  allowed: boolean;
}

// Database format (different from frontend!)
interface DBPermission {
  role: string;        // Same as roleId
  resource: string;    // 'case'
  action: string;      // 'create'
  allowed: boolean;
}
```

### Critical Issue Found & Fixed
**Problem**: Permission Matrix not working due to format mismatch
**Root Cause**: Frontend uses `actionId: 'create-case'` but database stores `resource: 'case', action: 'create'`
**Fix Location**: `parseActionId()` function in `supabasePermissionService.ts`

## Component Standardization Issues

### Dropdown Components (CRITICAL STANDARDIZATION NEEDED)
Currently 5-10 different dropdown designs across the app:

1. **MultiSelectDropdown** (legacy)
2. **MultiSelectDropdownWithQuantity** (new standard)
3. **Regular HTML select** (basic)
4. **Department dropdown** (custom)
5. **Country selector** (different styling)

**Recommended Standard**: Use `MultiSelectDropdownWithQuantity` everywhere for consistency.

### Form Components
Similar inconsistencies in:
- Button styles
- Input field layouts
- Modal designs
- Card layouts
- Loading states

## File Structure & Key Components

### Critical Service Files
```
src/utils/
├── fieldMappings.ts           -- Database field mapping (CRITICAL)
├── supabasePermissionService.ts -- Permission system
├── supabaseCaseService.ts     -- Case CRUD operations
├── auth.ts                    -- Authentication logic
├── errorHandler.ts            -- Error management
└── realTimeStorage.ts         -- Real-time updates

src/components/
├── PermissionMatrix.tsx       -- Role permission management
├── SimplifiedEmailConfig.tsx  -- Email configuration
├── CaseBookingForm.tsx        -- Main booking form
├── BookingCalendar.tsx        -- Calendar interface
└── UserManagement.tsx         -- User admin
```

### Data Flow
```
User Action → Component → Service → Supabase → Real-time Update → UI Refresh
```

## Known Issues & Fixes Applied

### 1. Missing Database Functions ✅ FIXED
- **Issue**: `get_daily_usage()` function missing (404 errors)
- **Fix**: Created complete function with proper parameters
- **Location**: Applied via migration

### 2. Permission Matrix Not Working ✅ FIXING
- **Issue**: Format mismatch between frontend and database
- **Root Cause**: `actionId` vs `resource+action` format
- **Fix**: Enhanced `parseActionId()` mapping function

### 3. Email System Duplication
- **Issue**: Duplicated email notification sections
- **Status**: Previously fixed but may need verification

### 4. Case Deletion 409 Conflicts
- **Issue**: Concurrent modification conflicts
- **Status**: Pending investigation

### 5. localStorage Usage Cleanup
- **Issue**: Hardcoded fallbacks throughout codebase
- **Status**: Scanning in progress

## Environment Configuration

### Production Setup
```bash
# Supabase (NEW DATABASE)
REACT_APP_SUPABASE_URL=https://ycmrdeiofuuqsugzjzoq.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...

# Microsoft OAuth
REACT_APP_MICROSOFT_CLIENT_ID=ee804dfd-da69-4a89-9006-b1620346423c
REACT_APP_MICROSOFT_TENANT_ID=d213fe2b-9fcd-42cf-90a4-8ea84de3103e

# Deployment
Production URL: https://tmcasebooking.vercel.app
GitHub: transmedic-it-sg/TM-Case-Booking
Account: transmedic-it-sg
```

### Development Setup
```bash
npm start                    # Local development (port 3002)
npm run build               # Production build
npm run typecheck           # TypeScript validation
```

## Real-time Features

### WebSocket Subscriptions
```typescript
// Case updates
supabase.channel('case_bookings').on('UPDATE', callback)

// Status changes
supabase.channel('status_history').on('INSERT', callback)

// User management
supabase.channel('profiles').on('*', callback)
```

## Security Model

### Row Level Security (RLS)
- **Current Status**: Most tables have RLS disabled (SECURITY ISSUE)
- **Recommendation**: Enable RLS for production security

### API Security
- **Anonymous Key**: Used for all operations (standard Supabase pattern)
- **Role-based**: Permissions enforced at application level

## Standardization Recommendations

### 1. Component Library
Create standardized components:
```typescript
// Standard dropdown
<StandardDropdown 
  options={options}
  value={value}
  onChange={onChange}
  withQuantities={boolean}
  multiple={boolean}
/>

// Standard form field
<StandardField
  label="Label"
  type="text|email|select|multi-select"
  required={boolean}
  validation={rules}
/>
```

### 2. CSS Variables
Define consistent design tokens:
```css
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --border-radius: 4px;
  --font-size-sm: 12px;
  --font-size-md: 14px;
}
```

### 3. Utility Functions
Standardize common operations:
```typescript
// Standard API calls
apiCall(endpoint, method, data)

// Standard error handling
handleError(error, context)

// Standard validation
validateField(value, rules)
```

## Migration History
- **v1.3.3**: Current version with critical fixes
- **Database Migration**: Moved from old to new Supabase instance
- **Account Migration**: Moved to transmedic-it-sg GitHub/Vercel accounts

## Monitoring & Debugging

### Logs Access
```typescript
// Supabase logs
mcp__supabase-new__get_logs(service: 'api'|'postgres'|'auth')

// Audit logs
src/components/AuditLogs.tsx

// Console debugging
console log.md (comprehensive error log)
```

### Performance Issues
- **Case deletion conflicts**: 409 HTTP errors
- **Email OAuth**: 400 authentication errors  
- **Missing functions**: 404 RPC errors

## Next Steps for System Improvement

1. **Create Component Library** with standardized dropdowns/forms
2. **Enable RLS** for proper database security
3. **Implement Design System** with consistent CSS variables
4. **Add Integration Tests** for critical workflows
5. **Performance Optimization** for large datasets
6. **Documentation Updates** for all new standards

This architecture guide should be updated whenever major changes are made to maintain system understanding and prevent inconsistencies.