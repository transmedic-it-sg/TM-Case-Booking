# TM Case Booking Application - Complete Technical Guide
*Generated: 2025-10-13 | Version: 1.3.3 | Status: Production Ready*

## 📋 Application Overview

The TM Case Booking application is a comprehensive medical case booking and management system built for TransMedic Group. It supports multi-country operations (7 countries) with role-based access control, real-time updates, and complete case lifecycle management from booking to completion.

### 🎯 Core Business Purpose
- **Medical Case Booking**: Schedule surgical procedures across multiple hospitals
- **Multi-Country Operations**: Singapore, Malaysia, Thailand, Indonesia, Philippines, Vietnam, Myanmar  
- **Role-Based Workflow**: Admin, Operations, Sales, Driver, IT roles with specific permissions
- **Real-Time Collaboration**: Live updates for 50-100+ concurrent users
- **Complete Audit Trail**: Full traceability of case changes and user actions

### 🏗️ Technical Architecture

**Frontend Stack:**
- React 18.2+ with TypeScript
- React Query (TanStack Query) for state management
- Real-time subscriptions via Supabase
- Vercel deployment platform

**Backend Stack:**
- Supabase (PostgreSQL) - Primary database
- Real-time subscriptions for live updates
- Row-level security (RLS) for data protection
- Edge Functions for server-side logic

**Key Integrations:**
- MCP (Model Context Protocol) for database access
- Email notification system
- File attachment management (Base64 encoding)
- OAuth authentication flow

---

## 🗂️ Complete Component Architecture

### **1. Core Application Structure**
```
src/
├── App.tsx                    # Main app router & auth guard
├── index.tsx                  # React root & providers setup
├── components/                # UI Components
├── hooks/                     # Custom React hooks  
├── services/                  # Business logic & API calls
├── utils/                     # Utility functions
├── types/                     # TypeScript definitions
├── constants/                 # App constants & enums
└── assets/                    # Styles & static files
```

### **2. Authentication & User Management**
- **`src/components/LoginPage.tsx`**: OAuth-based login with provider selection
- **`src/components/UserManagement.tsx`**: CRUD operations for user accounts
- **`src/hooks/useCurrentUser.ts`**: Current user state management
- **`src/utils/supabaseUserService.ts`**: User database operations
- **`src/hooks/useRealtimeUsers.ts`**: Real-time user data synchronization

### **3. Case Management Core**
- **`src/components/CaseBookingForm.tsx`**: New case creation form
- **`src/components/CasesList/index.tsx`**: Main cases list view
- **`src/components/CasesList/CaseCard.tsx`**: Individual case display/actions
- **`src/hooks/useRealtimeCases.ts`**: Real-time case data management
- **`src/services/realtimeQueryService.ts`**: Core query optimization service

### **4. Status Workflow Management**
- **`src/components/CaseCard/StatusWorkflow.tsx`**: Status transition logic
- **`src/constants/statuses.ts`**: All available case statuses
- **Status Flow**: Case Booked → Order Prepared → Sales Approval → Delivered → Received → Case Completed

### **5. Attachment System**
- **`src/components/CasesList/StatusAttachmentManager.tsx`**: Add attachments to status history
- **`src/components/CaseCard/EnhancedAttachmentManager.tsx`**: Full attachment CRUD
- **`src/components/CasesList/AttachmentRenderer.tsx`**: Centralized attachment display
- **Key Features**: Multiple file selection, replace/delete functions, Base64 storage

### **6. Permission & Security**
- **`src/components/PermissionMatrix.tsx`**: Role-based access control UI
- **`src/hooks/usePermissions.ts`**: Permission checking logic
- **`src/utils/permissions.ts`**: Core permission definitions
- **`src/data/permissionMatrixData.ts`**: Permission matrix configuration

### **7. Real-Time & Performance**
- **`src/services/realtimeQueryService.ts`**: Optimized query performance
- **`src/hooks/useDebounce.ts`**: Input debouncing for performance
- **`src/utils/testingFramework.ts`**: Performance monitoring
- **Query Optimization**: 30s staleTime, 10min gcTime, smart caching

### **8. Email Notifications**
- **`src/services/emailNotificationProcessor.ts`**: Country-specific email rules
- **`src/components/SimplifiedEmailConfig.tsx`**: Email configuration UI
- **Features**: Multi-country routing, template management, status-based triggers

### **9. Data Services**
- **`src/utils/supabaseCaseService.ts`**: Case CRUD operations
- **`src/utils/fieldMappings.ts`**: Database field mapping utilities
- **`src/services/correctDatabaseService.ts`**: Database consistency checks
- **Critical**: All database operations use field mappings to prevent naming issues

---

## 🔄 Complete Application Workflow

### **1. User Authentication Flow**
1. **Login** → OAuth provider selection → Supabase Auth
2. **Session Management** → JWT tokens, no localStorage fallback  
3. **User Profile** → Automatic profile creation in `profiles` table
4. **Permission Check** → Role-based access control applied

### **2. Case Creation Workflow**
1. **Form Submission** → `CaseBookingForm.tsx` validates input
2. **Data Processing** → Field mappings applied, quantities calculated
3. **Database Insert** → `case_bookings` table with audit trail
4. **Real-Time Update** → All connected users see new case instantly
5. **Email Notifications** → Country-specific rules triggered

### **3. Case Status Management**
1. **Status Transition** → `StatusWorkflow.tsx` determines available actions
2. **Permission Validation** → User role checked against action requirements  
3. **Optimistic Update** → UI updates immediately for better UX
4. **Database Sync** → `realtimeQueryService.ts` handles backend sync
5. **Status History** → Complete audit trail in `status_history` table
6. **Attachment Processing** → Files encoded and stored with status

### **4. Multi-User Collaboration**
1. **Real-Time Subscriptions** → Supabase channels for live updates
2. **Conflict Resolution** → Last-write-wins with user notifications
3. **Optimistic Updates** → Instant UI feedback with rollback on errors
4. **Data Synchronization** → Query invalidation ensures consistency

---

## 🗄️ Database Schema Overview

### **Core Tables**
- **`case_bookings`**: Main case data (snake_case fields)
- **`status_history`**: Complete status change audit trail  
- **`case_quantities`**: Item quantities per case
- **`profiles`**: User accounts and permissions
- **`code_tables`**: Reference data (hospitals, procedures, etc.)
- **`audit_logs`**: User action tracking
- **`system_settings`**: Application configuration

### **Field Mapping System**
- **TypeScript**: camelCase (e.g., `dateOfSurgery`, `caseBookingId`)
- **Database**: snake_case (e.g., `date_of_surgery`, `case_booking_id`)  
- **Utility**: `src/utils/fieldMappings.ts` handles all conversions
- **Critical**: NEVER hardcode field names, always use mapping utilities

---

## ⚡ Performance Optimizations

### **Query Performance**
- **Optimized Caching**: 30s staleTime, 10min gcTime
- **Smart Refetching**: Disabled on tab focus, enabled on reconnect
- **Real-Time Updates**: Reduces need for polling
- **Duplicate Prevention**: Status history deduplication logic

### **Bundle Optimization**
- **Code Splitting**: React lazy loading for routes
- **Tree Shaking**: Unused imports automatically removed
- **Asset Optimization**: Images and CSS optimized for production
- **Gzip Compression**: ~296KB main bundle size

### **Database Optimization**
- **Field Mapping**: Prevents field naming errors
- **Query Batching**: Multiple operations combined
- **Connection Pooling**: Efficient database connections
- **Indexed Queries**: Optimized for common operations

---

## 🚀 Production Deployment Configuration

### **Vercel Deployment**
- **Primary URL**: `tmcasebooking.vercel.app`
- **Branch Deployment**: Automatic preview deployments
- **Environment Variables**: Production secrets managed via Vercel
- **Build Optimization**: React production build with optimizations

### **Supabase Configuration**
- **Production Database**: Full RLS policies enabled
- **Real-Time Subscriptions**: Optimized for 100+ concurrent users  
- **Edge Functions**: Email processing and notifications
- **Backup Strategy**: Daily automated backups

### **Security Configuration**
- **Row Level Security**: All tables protected
- **JWT Authentication**: Secure token-based auth
- **CORS Policy**: Restricted to allowed domains
- **Input Validation**: Complete sanitization

---

## 🔧 Development Guidelines

### **Code Quality Standards**
- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Comprehensive linting rules
- **Field Mappings**: Always use mapping utilities
- **Error Handling**: Comprehensive error boundaries
- **Testing**: Component testing with validation hooks

### **Database Interaction Rules**
1. **Always use field mappings** from `fieldMappings.ts`
2. **Never hardcode field names** in queries
3. **Use proper error handling** with `ErrorHandler.executeWithRetry`
4. **Implement optimistic updates** for better UX
5. **Add audit trails** for all critical operations

### **Performance Guidelines**
1. **Use React Query** for all API calls
2. **Implement proper caching** strategies
3. **Debounce user inputs** to prevent excessive queries
4. **Use real-time subscriptions** instead of polling
5. **Monitor performance** with built-in testing framework

---

## 📊 Application State Management

### **Global State**
- **React Query**: Server state management
- **Context API**: User authentication state
- **Real-Time Subscriptions**: Live data synchronization
- **Local State**: Component-specific UI state only

### **Data Flow**
1. **User Action** → Component handler
2. **Optimistic Update** → Immediate UI feedback  
3. **API Call** → Supabase service
4. **Real-Time Broadcast** → All connected clients
5. **Query Invalidation** → Fresh data fetch

---

## 🛡️ Security Implementation

### **Authentication Security**
- **OAuth Integration**: Third-party provider authentication
- **JWT Tokens**: Secure session management
- **No LocalStorage**: All auth handled via Supabase
- **Session Timeout**: Configurable session expiry

### **Data Security**
- **Row Level Security**: Database-level protection
- **Role-Based Access**: Granular permission system
- **Input Sanitization**: All user inputs validated
- **Audit Logging**: Complete action tracking

### **File Security**
- **Base64 Encoding**: Secure file storage
- **Type Validation**: File type restrictions
- **Size Limits**: Configurable file size limits
- **Access Control**: Permission-based file access

---

## 📞 Support & Maintenance

### **Monitoring**
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: Built-in testing framework
- **User Activity**: Audit logs for all actions
- **System Health**: Database connectivity checks

### **Backup & Recovery**
- **Database Backups**: Daily automated backups
- **Code Versioning**: Git-based version control
- **Deployment Rollback**: Vercel rollback capabilities
- **Data Recovery**: Point-in-time recovery options

### **Troubleshooting**
- **Debug Logging**: Comprehensive application logging
- **Error Boundaries**: Graceful error handling
- **Health Checks**: System connectivity validation
- **Performance Metrics**: Real-time monitoring

---

## 🎯 Key Success Metrics

### **Performance Targets**
- **Page Load Time**: < 3 seconds
- **Real-Time Update Latency**: < 1 second
- **Database Query Response**: < 500ms average
- **Concurrent User Support**: 100+ users

### **Reliability Targets**
- **Uptime**: 99.9% availability
- **Error Rate**: < 0.1% of requests
- **Data Integrity**: 100% audit trail coverage
- **Security**: Zero data breaches

---

**This guide represents the complete technical implementation of the TM Case Booking application as of Version 1.3.3. All critical issues have been resolved and the application is production-ready for multi-country medical case booking operations.**