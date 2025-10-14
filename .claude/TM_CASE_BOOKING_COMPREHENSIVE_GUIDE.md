# TM Case Booking Application - Comprehensive System Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Authentication & Authorization](#authentication--authorization)
5. [Component Hierarchy](#component-hierarchy)
6. [Services & Utilities](#services--utilities)
7. [Real-time Features](#real-time-features)
8. [Email Notification System](#email-notification-system)
9. [File Structure Analysis](#file-structure-analysis)
10. [Recent Fixes & Improvements](#recent-fixes--improvements)
11. [Development Guidelines](#development-guidelines)
12. [Testing Framework](#testing-framework)

## System Overview

The TM Case Booking Application is a comprehensive medical case management system built for Transmedic, designed to handle surgical case bookings, equipment management, and workflow automation across multiple countries and departments.

### Key Features
- **Multi-country Support**: Malaysia, Singapore, Thailand operations
- **Role-based Access Control**: Admin, Operations, Sales, Driver, IT roles
- **Real-time Data Synchronization**: Live updates across all connected clients
- **Mobile-responsive Design**: Optimized for both desktop and mobile devices
- **Email Notification System**: Automated notifications for status changes
- **Audit Logging**: Complete activity tracking for compliance
- **File Attachment Management**: Document and image handling

### Technical Stack
- **Frontend**: React 18.2.0 with TypeScript
- **Backend**: Supabase (PostgreSQL + Real-time subscriptions)
- **Authentication**: Supabase Auth with custom user management
- **State Management**: React Query for server state, React Context for global state
- **Styling**: CSS Modules with responsive design
- **Testing**: Playwright for E2E, Jest for unit tests

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Supabase      │    │  Email Services │
│                 │◄──►│                 │◄──►│                 │
│ - Components    │    │ - PostgreSQL    │    │ - Edge Functions│
│ - Services      │    │ - Real-time     │    │ - SMTP/OAuth    │
│ - Utils         │    │ - Auth          │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Design Principles
1. **Field Mapping Consistency**: Centralized field mappings prevent database naming issues
2. **Real-time First**: No caching, always fresh data via Supabase subscriptions
3. **Permission-based UI**: Components adapt based on user roles
4. **Error Handling**: Comprehensive error boundaries and user feedback
5. **Mobile-first Responsive**: Progressive enhancement for mobile devices

## Database Schema

### Core Tables

#### `case_bookings` (Main entity)
```sql
- id: string (PK)
- case_reference_number: string (unique)
- hospital: string
- department: string
- date_of_surgery: string (NOT case_date)
- procedure_type: string (NOT procedure)
- procedure_name: string
- doctor_name: string
- doctor_id: string
- time_of_procedure: string
- surgery_set_selection: string[]
- implant_box: string[]
- special_instruction: string
- status: CaseStatus enum
- submitted_by: string
- country: string
- attachments: string[]
- quantities: Record<string, number>
```

#### `profiles` (User management)
```sql
- id: string (PK, links to Supabase auth)
- username: string
- name: string
- email: string
- role: string
- departments: string[]
- countries: string[]
- selected_country: string
- enabled: boolean
```

#### `permissions` (RBAC system)
```sql
- id: string (PK)
- role: string
- action: string
- resource: string
- allowed: boolean
```

#### Support Tables
- `status_history`: Case status change tracking
- `amendment_history`: Case modification records
- `notifications`: User notifications
- `audit_logs`: System activity logging
- `code_tables`: Dynamic configuration data
- `departments`: Department management
- `system_settings`: Application configuration

### Critical Field Mappings
The application uses strict field mapping rules via `fieldMappings.ts`:
- **Database**: snake_case (e.g., `date_of_surgery`)
- **TypeScript**: camelCase (e.g., `dateOfSurgery`)
- **NEVER use**: `case_date` → USE: `date_of_surgery`
- **NEVER use**: `procedure` → USE: `procedure_type`

## Authentication & Authorization

### Authentication Flow
1. **Supabase Auth**: Primary authentication system
2. **Custom User Profiles**: Extended user data in `profiles` table
3. **Session Management**: Automatic token refresh and validation
4. **Remember Me**: Optional persistent login

### Authorization System
Permission-based access control with these actions:
- `CREATE_CASE`, `VIEW_CASES`, `EDIT_CASES`
- `PROCESS_ORDERS`, `UPDATE_STATUS`
- `VIEW_REPORTS`, `SYSTEM_SETTINGS`
- `USER_MANAGEMENT`, `PERMISSION_MATRIX`
- `AUDIT_LOGS`, `EMAIL_CONFIG`

### User Roles
- **Admin**: Full system access
- **Operations Manager**: Case management + user oversight
- **Operations**: Case processing and status updates
- **Sales Manager**: Sales oversight + reporting
- **Sales**: Sales approval workflow
- **Driver**: Delivery status updates
- **IT**: Technical administration

## Component Hierarchy

### Main Application Structure
```
App.tsx (Root)
├── ErrorBoundary
├── QueryClientProvider
├── SoundProvider
├── NotificationProvider
├── ToastProvider
├── RealtimeProvider
└── AppContent
    ├── SupabaseLogin (when not authenticated)
    ├── MobileEntryPage (mobile intro)
    └── Main Application (when authenticated)
        ├── Header (Desktop)
        ├── MobileHeader
        ├── Navigation
        ├── Main Content Area
        ├── Footer
        └── Modals/Popups
```

### Key Components

#### **CaseBookingForm**
- Multi-step form for creating new cases
- Dynamic dropdowns with real-time data
- Department-doctor-procedure relationship handling
- Quantity management for equipment
- Prefill support from calendar clicks

#### **CasesList**
- Real-time case display with filtering
- Status workflow management
- Attachment handling
- Amendment processing
- Permission-based action buttons

#### **BookingCalendar**
- Calendar view of scheduled surgeries
- Color-coded by status
- Click-to-create functionality
- Department filtering

#### **EditSets** 
- Equipment set management
- Department-procedure associations
- Fuzzy search capabilities
- Bulk operations

#### **UserManagement**
- User CRUD operations
- Role assignment
- Department/country access control
- Password management

## Services & Utilities

### Core Services

#### **realtimeCaseService**
- Direct Supabase integration
- Real-time subscriptions
- CRUD operations for cases
- Status update handling

#### **emailNotificationProcessor**
- Status change notifications
- Role-based recipient filtering
- Department-specific rules
- Centralized email configuration

#### **correctDatabaseService**
- Unified data access layer
- Country-specific filtering
- Code table management
- Dynamic configuration loading

#### **userService**
- User session management
- Profile synchronization
- Permission caching

### Critical Utilities

#### **fieldMappings.ts**
Central field mapping system preventing database naming conflicts:
```typescript
export const CASE_BOOKINGS_FIELDS = {
  dateOfSurgery: 'date_of_surgery',
  procedureType: 'procedure_type',
  caseReferenceNumber: 'case_reference_number'
  // ... more mappings
};
```

#### **permissions.ts**
Role-based access control with caching:
- User-specific permission caching
- Runtime permission loading from database
- Permission validation functions

#### **errorHandler.ts**
Centralized error handling with:
- Retry mechanisms
- User-friendly messages
- Toast notifications
- Audit logging

## Real-time Features

### Supabase Integration
- **Real-time subscriptions**: Live updates for cases, users, settings
- **Optimistic updates**: Instant UI feedback with server reconciliation
- **Connection monitoring**: Automatic reconnection handling
- **No caching strategy**: Always fresh data from database

### Key Real-time Hooks
- `useRealtimeCases`: Live case data with filtering
- `useRealtimeUsers`: User management updates
- `useRealtimeSettings`: System configuration changes
- `useRealtimeDepartments`: Department data synchronization

## Email Notification System

### Architecture
```
Status Change → emailNotificationProcessor → centralizedEmailService → Supabase Edge Function → Email Provider
```

### Features
- **Role-based notifications**: Configurable per status and role
- **Department filtering**: Notifications respect department access
- **Admin override**: Global access for admin users
- **Template system**: Standardized email formats
- **OAuth integration**: Microsoft 365 integration for enterprise

### Configuration
Email rules configured per status with:
- Enabled/disabled toggle
- Target roles
- Include submitter option
- Department requirements
- Admin global access

## File Structure Analysis

### `/src` Directory Structure
```
src/
├── components/           # React components
│   ├── CaseCard/        # Case detail components
│   ├── CasesList/       # Case listing components
│   ├── EditSets/        # Equipment management
│   ├── common/          # Shared UI components
│   └── ErrorBoundary/   # Error handling
├── services/            # Business logic services
├── utils/               # Utility functions
├── hooks/               # Custom React hooks
├── types/               # TypeScript definitions
├── constants/           # Application constants
├── contexts/            # React contexts
├── assets/              # CSS and static files
└── tests/               # Test files
```

### Configuration Files
- `package.json`: Dependencies and scripts (v1.3.3)
- `.env`: Environment variables (Supabase, OAuth)
- `tsconfig.json`: TypeScript configuration
- `playwright.config.ts`: E2E testing setup

## Recent Fixes & Improvements

### Version 1.3.3 Critical Fixes

#### Email System Overhaul
- **Centralized Admin Authentication**: Replaced user OAuth with system-level authentication
- **Enhanced Error Handling**: Better email delivery failure management
- **Template Standardization**: Consistent email formats across all notifications

#### Performance Optimizations
- **Optimized Status Updates**: Reduced database queries for status changes
- **Sales Approval Workflow**: Streamlined approval process
- **Critical Operations**: Enhanced performance for high-frequency operations

#### Attachment Management
- **Enhanced Functions**: Improved add/replace image functionality in View All Cases
- **File Type Validation**: Better file handling and validation
- **Storage Optimization**: Efficient file storage and retrieval

#### User Experience Improvements
- **Remember Me Login**: Persistent login functionality
- **409 Conflict Resolution**: Fixed user management conflicts
- **Security Warning Elimination**: Removed false security warnings

#### Field Mapping Fixes
- **Database Field Mapping**: Resolved 400 Bad Request errors
- **Quantity Display**: Fixed amendment quantity visibility
- **CSS Improvements**: Enhanced visual consistency

## Development Guidelines

### Coding Standards
1. **Always use fieldMappings.ts** instead of hardcoded field names
2. **No caching** - use real-time subscriptions for fresh data
3. **Permission checks** before rendering UI components
4. **Error boundaries** around complex components
5. **TypeScript strict mode** for type safety

### Database Operations
- Use `correctDatabaseService` for data operations
- Always handle errors with `ErrorHandler`
- Use transactions for multi-table operations
- Respect RLS (Row Level Security) policies

### Component Development
- Components should be permission-aware
- Use React Query for server state
- Implement loading and error states
- Follow mobile-first responsive design

### Testing Requirements
- E2E tests for critical user flows
- Unit tests for utility functions
- Integration tests for service layers
- Real-time functionality validation

## Testing Framework

### E2E Testing (Playwright)
- **Authentication flows**: Login, logout, session management
- **Case creation**: Full case booking workflow
- **Case management**: Status updates, amendments, attachments
- **Mobile responsiveness**: Cross-device testing
- **Email notifications**: Notification sending validation

### Unit Testing (Jest)
- **Service layer testing**: Data operations and transformations
- **Utility function testing**: Helper functions and calculations
- **Component testing**: Isolated component behavior

### Integration Testing
- **Real-time subscriptions**: Supabase connection testing
- **Database operations**: CRUD operation validation
- **Permission system**: Access control verification

### Testing Commands
```bash
npm run test:e2e          # Run E2E tests
npm run test:e2e:headed   # Run with browser UI
npm run test:coverage     # Generate coverage report
npm run test:ci           # CI pipeline tests
```

---

## System Health & Monitoring

The application includes comprehensive monitoring:
- **Database connectivity**: Real-time connection status
- **Performance metrics**: Query timing and optimization
- **Error tracking**: Centralized error logging
- **Audit trails**: Complete user activity logging
- **Version management**: Dynamic version tracking and cache busting

This guide provides a complete overview of the TM Case Booking system architecture, components, and operational procedures. For specific implementation details, refer to the individual component and service files in the codebase.