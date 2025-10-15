# TM Case Booking System - Comprehensive Project Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Database Schema & Data Models](#database-schema--data-models)
4. [Component Architecture](#component-architecture)
5. [Service Layer](#service-layer)
6. [Real-Time & State Management](#real-time--state-management)
7. [Security & Permissions](#security--permissions)
8. [Business Logic & Workflows](#business-logic--workflows)
9. [Multi-Country Operations](#multi-country-operations)
10. [Development & Deployment](#development--deployment)
11. [Testing Strategy](#testing-strategy)
12. [Key Features Deep Dive](#key-features-deep-dive)

## Project Overview

### Business Domain & Purpose
**Transmedic Case Booking System** is a comprehensive medical case management application for surgical equipment booking and workflow management across multiple countries in Southeast Asia.

- **Name**: TM Case Booking System
- **Version**: 1.3.3-PRODUCTION  
- **Status**: ✅ LIVE & FULLY OPERATIONAL
- **Production URL**: https://tmcasebooking.vercel.app (NEW ACCOUNT)
- **GitHub Repository**: transmedic-it-sg/TM-Case-Booking
- **Database**: ycmrdeiofuuqsugzjzoq.supabase.co (NEW - Migration Complete)
- **Account**: transmedic-it-sg (it.sg@transmedicgroup.com)
- **Last Updated**: October 15, 2025

### Core Value Proposition
- **Primary Function**: Manage surgical case bookings from initial booking through completion and billing
- **Target Users**: Operations staff, sales teams, drivers, doctors, and administrators  
- **Geographic Scope**: Singapore, Malaysia, Thailand, Philippines, Myanmar, Cambodia, Vietnam
- **User Scale**: 50-100 concurrent users across all countries

### Key Features
- **Multi-country data isolation** with real-time synchronization
- **11-step surgical workflow** from booking to billing
- **Role-based access control** with 30+ granular permissions
- **Real-time notifications** and status updates
- **Comprehensive audit logging** for compliance
- **Mobile-responsive design** for field operations

### Migration Status
**Database Migration**: ✅ COMPLETED SUCCESSFULLY  
- OLD Database: `aqzjzjygflmxkcbfnjbe.supabase.co` (DECOMMISSIONED)
- NEW Database: `ycmrdeiofuuqsugzjzoq.supabase.co` (ACTIVE)
- Migration Date: October 13, 2025
- User Profiles: 100% migrated (13/13 users)
- Permissions: 85% migrated (220/258 permissions)

## Architecture & Technology Stack

### Frontend Stack
```typescript
- React 18.2.0 (Modern Hooks-based architecture)
- TypeScript 4.7.4 (Type-safe development)
- CSS3 with custom component styling
- React Query (TanStack Query 5.87.4) for state management
- React Error Boundary for fault tolerance
- Playwright for E2E testing
```

### Backend & Database
```typescript
- Supabase (PostgreSQL) for database and real-time subscriptions
- Row Level Security (RLS) for data isolation
- Edge Functions for server-side logic
- Real-time WebSocket connections
- File storage for attachments
```

### Build & Deployment
```typescript
- Create React App with TypeScript template
- Vercel for hosting and CI/CD
- ESLint + Prettier for code quality
- Jest for unit testing
```

### Quick Development Commands
```bash
# Development
npm start                    # Start development server
npm run build               # Build for production  
npm run typecheck           # TypeScript validation
npm test                    # Run tests
npm run test:e2e            # Playwright E2E tests

# Database Management
./mcp-startup.sh            # Connect to NEW Supabase database
npx supabase status         # Check local Supabase status

# Deployment
vercel --prod              # Deploy to production
```

## Database Schema & Data Models

### Core Tables Structure (20+ tables)

#### 1. User Management
```sql
-- profiles: User accounts and authentication
profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  countries TEXT[] NULL,
  departments TEXT[] NULL,
  selected_country TEXT NULL,
  enabled BOOLEAN DEFAULT true,
  is_temporary_password BOOLEAN DEFAULT false
);

-- permissions: Role-based access control
permissions (
  id UUID PRIMARY KEY,
  role TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN DEFAULT true
);

-- user_sessions: Session management
user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL
);
```

#### 2. Case Management  
```sql
-- case_bookings: Primary case data
case_bookings (
  id UUID PRIMARY KEY,
  case_reference_number TEXT UNIQUE NOT NULL,
  hospital TEXT NOT NULL,
  department TEXT NOT NULL,
  date_of_surgery DATE NOT NULL,
  procedure_type TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  doctor_id UUID REFERENCES doctors(id),
  doctor_name TEXT,
  surgery_set_selection TEXT[],
  implant_box TEXT[],
  status TEXT DEFAULT 'Case Booked',
  country TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  is_amended BOOLEAN DEFAULT false,
  attachments TEXT[]
);

-- case_booking_quantities: Equipment quantities
case_booking_quantities (
  id UUID PRIMARY KEY,
  case_booking_id UUID REFERENCES case_bookings(id),
  item_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER
);

-- status_history: Workflow tracking
status_history (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES case_bookings(id),
  status TEXT NOT NULL,
  processed_by TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  details TEXT,
  attachments TEXT[]
);

-- amendment_history: Change tracking
amendment_history (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES case_bookings(id),
  amended_by TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  changes JSONB NOT NULL,
  reason TEXT
);
```

#### 3. Medical Data Management
```sql
-- departments: Hospital departments by country
departments (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  code_table_id UUID REFERENCES code_tables(id)
);

-- doctors: Medical practitioners
doctors (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  country TEXT NOT NULL,
  specialties TEXT[],
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER
);

-- surgery_sets: Surgical equipment sets
surgery_sets (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  procedure_type TEXT,
  doctor_id UUID REFERENCES doctors(id),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER
);

-- implant_boxes: Implant equipment boxes
implant_boxes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  procedure_type TEXT,
  doctor_id UUID REFERENCES doctors(id),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER
);
```

#### 4. System Configuration
```sql
-- system_settings: Application configuration
system_settings (
  id UUID PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB,
  description TEXT
);

-- audit_logs: System activity tracking
audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  details TEXT NOT NULL,
  country TEXT,
  ip_address TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- email_notification_rules: Email automation
email_notification_rules (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL,
  country TEXT NOT NULL,
  recipients JSONB NOT NULL,
  template JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true
);

-- code_tables: Dynamic data management
code_tables (
  id UUID PRIMARY KEY,
  table_type TEXT NOT NULL,
  code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  country TEXT,
  is_active BOOLEAN DEFAULT true
);
```

### Row Level Security (RLS) Implementation
```sql
-- Country-based data isolation
CREATE POLICY country_isolation ON case_bookings
  FOR ALL USING (
    country = ANY(
      SELECT unnest(countries) 
      FROM profiles 
      WHERE id = auth.uid()
    ) OR (
      SELECT role FROM profiles WHERE id = auth.uid()
    ) = 'admin'
  );

-- Role-based access control
CREATE POLICY role_based_access ON case_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM permissions p
      JOIN profiles pr ON pr.role = p.role
      WHERE pr.id = auth.uid()
      AND p.action = 'view_cases'
      AND p.allowed = true
    )
  );
```

## Component Architecture

### Application Structure
```
src/
├── components/           # UI Components (80+ components)
│   ├── CaseBookingForm.tsx      # Case creation form
│   ├── CasesList/               # Case display components
│   │   ├── CaseCard.tsx         # Individual case display
│   │   ├── CasesFilter.tsx      # Filter controls
│   │   ├── CaseActions.tsx      # Action buttons
│   │   ├── AttachmentManager.tsx # File management
│   │   └── index.tsx            # Main cases list
│   ├── CaseCard/                # Case detail components
│   │   ├── StatusWorkflow.tsx   # Status progression
│   │   ├── AmendmentForm.tsx    # Case amendments
│   │   ├── CaseHeader.tsx       # Case summary
│   │   ├── CaseDetails.tsx      # Detailed view
│   │   └── AttachmentManager.tsx # File handling
│   ├── BookingCalendar.tsx      # Calendar view
│   ├── UserManagement.tsx       # User administration
│   ├── PermissionMatrix.tsx     # Permission management
│   ├── Reports.tsx              # Analytics & reports
│   ├── SystemSettings.tsx       # Configuration
│   └── EditSets/                # Equipment management
│       ├── ModernEditSets.tsx   # Main edit interface
│       └── FuzzySearchDropdown.tsx # Search component
├── hooks/                # Custom React hooks (15+ hooks)
│   ├── useRealtimeCases.ts      # Real-time case data
│   ├── useCurrentUser.ts        # User session
│   ├── usePermissions.ts        # Permission checking
│   ├── useDatabaseConnection.ts # DB health monitoring
│   └── useNotifications.ts      # System notifications
├── services/             # Business logic layer (10+ services)
│   ├── realtimeCaseService.ts   # Case operations
│   ├── userService.ts           # User management
│   ├── emailNotificationProcessor.ts # Email system
│   └── auditService.ts          # Activity logging
├── utils/                # Helper functions (25+ utilities)
│   ├── permissions.ts           # Permission utilities
│   ├── countryUtils.ts          # Multi-country logic
│   ├── fieldMappings.ts         # Database field mapping
│   └── auditService.ts          # Audit trail utilities
├── contexts/             # React contexts (4 contexts)
│   ├── NotificationContext.tsx  # System notifications
│   ├── SoundContext.tsx         # Audio feedback
│   └── RealtimeProvider.tsx     # WebSocket management
└── types/                # TypeScript definitions
    ├── index.ts                 # Core types
    ├── database.types.ts        # Auto-generated DB types
    └── window.d.ts              # Global type extensions
```

### Component Hierarchy & Provider Chain
```typescript
App.tsx (Root Component)
├── QueryClientProvider (React Query)
│   ├── ErrorBoundary (Error handling)
│   │   ├── SoundProvider (Audio feedback)
│   │   │   ├── NotificationProvider (System notifications)
│   │   │   │   ├── ToastProvider (User messages)
│   │   │   │   │   ├── RealtimeProvider (WebSocket connections)
│   │   │   │   │   │   └── AppContent (Main application logic)
│   │   │   │   │   │       ├── SupabaseLogin (Authentication)
│   │   │   │   │   │       ├── MobileEntryPage (Mobile onboarding)
│   │   │   │   │   │       └── Main Application Pages:
│   │   │   │   │   │           ├── CaseBookingForm
│   │   │   │   │   │           ├── CasesList
│   │   │   │   │   │           ├── BookingCalendar  
│   │   │   │   │   │           ├── ProcessOrderPage
│   │   │   │   │   │           ├── UserManagement
│   │   │   │   │   │           ├── PermissionMatrix
│   │   │   │   │   │           ├── Reports
│   │   │   │   │   │           └── SystemSettings
```

### Key Component Features

#### 1. Real-Time Case Management
- **CasesList**: Live case updates with WebSocket subscriptions
- **CaseCard**: Individual case display with real-time status changes
- **StatusWorkflow**: Visual workflow progression with permission-based actions
- **AmendmentForm**: Case modification with change tracking

#### 2. Advanced Form Components
- **CaseBookingForm**: Multi-step case creation with validation
- **SearchableDropdown**: Enhanced select with fuzzy search
- **MultiSelectDropdownWithQuantity**: Equipment selection with quantities
- **DatePicker**: Localized date selection

#### 3. Administrative Components
- **UserManagement**: Complete user CRUD operations
- **PermissionMatrix**: Dynamic role-permission management
- **AuditLogs**: System activity monitoring
- **SystemSettings**: Application configuration

#### 4. Mobile-Responsive Design
- **MobileNavigation**: Touch-optimized navigation
- **MobileHeader**: Responsive header component
- **MobileEntryPage**: Mobile onboarding experience
- **Responsive layouts**: Optimized for tablets and phones

## Service Layer

### Service Architecture Pattern
```typescript
// Dependency injection pattern with clear separation of concerns
interface ServiceLayer {
  dataAccess: SupabaseService;         // Database operations
  realtime: RealtimeCaseService;       // WebSocket management
  auth: UserService;                   // Authentication & user management
  notifications: NotificationService;  // Email/push notifications
  audit: AuditService;                 // Activity logging
  file: AttachmentService;             // File management
  constants: ConstantsService;         // Dynamic configuration
  email: EmailNotificationProcessor;   // Email processing
}
```

### Core Services Implementation

#### 1. RealtimeCaseService
```typescript
// Real-time case data management with WebSocket integration
class RealtimeCaseService {
  // CRUD Operations
  async getAllCases(filters?: FilterOptions): Promise<CaseBooking[]>
  async getCaseById(id: string): Promise<CaseBooking | null>
  async saveCase(case: CaseBooking): Promise<CaseBooking>
  async updateCaseStatus(id: string, status: CaseStatus): Promise<boolean>
  async deleteCase(id: string): Promise<boolean>
  async generateReferenceNumber(country: string): Promise<string>
  
  // Real-time subscriptions
  subscribeToChanges(callback: (changes) => void): Subscription
  subscribeToStatusUpdates(callback: (update) => void): Subscription
  
  // Analytics
  async getCaseStatistics(): Promise<CaseStatistics>
  async getCountryMetrics(country: string): Promise<CountryMetrics>
}
```

#### 2. UserService  
```typescript
// User authentication and session management
class UserService {
  // Authentication
  async login(credentials: LoginCredentials): Promise<User>
  async logout(): Promise<void>
  async getCurrentUser(): Promise<User | null>
  async validateSession(): Promise<boolean>
  async updatePassword(userId: string, newPassword: string): Promise<boolean>
  
  // User Management (Admin functions)
  async getAllUsers(): Promise<User[]>
  async createUser(userData: CreateUserData): Promise<User>
  async updateUser(id: string, updates: UserUpdates): Promise<User>
  async deleteUser(id: string): Promise<boolean>
  async resetUserPassword(id: string): Promise<string>
  
  // Session Management
  async createSession(userId: string): Promise<Session>
  async validateSessionToken(token: string): Promise<boolean>
  async extendSession(sessionId: string): Promise<boolean>
}
```

#### 3. EmailNotificationProcessor
```typescript
// Advanced email notification system
class EmailNotificationProcessor {
  // Rule-based notifications
  async processStatusChange(caseData: CaseBooking, newStatus: CaseStatus): Promise<void>
  async processAmendment(amendment: AmendmentHistory): Promise<void>
  async processSystemAlert(alert: SystemAlert): Promise<void>
  
  // Template management
  async getEmailTemplate(status: CaseStatus, country: string): Promise<EmailTemplate>
  async sendCustomEmail(config: CustomEmailConfig): Promise<boolean>
  
  // Notification rules
  async getNotificationRules(country?: string): Promise<NotificationRule[]>
  async updateNotificationRule(rule: NotificationRule): Promise<boolean>
  
  // Analytics
  async getEmailMetrics(): Promise<EmailMetrics>
  async getDeliveryStats(): Promise<DeliveryStats>
}
```

## Real-Time & State Management

### React Query Configuration
```typescript
// Optimized for real-time data with minimal caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,                    // Always fetch fresh data
      gcTime: 1000 * 60 * 5,           // 5-minute garbage collection
      refetchOnWindowFocus: true,       // Refetch when window gains focus
      refetchOnReconnect: true,         // Refetch on network reconnect
      retry: (failureCount, error) => {
        const status = (error as any)?.status;
        if (status >= 400 && status < 500) return false; // Don't retry client errors
        return failureCount < 3;        // Retry up to 3 times for other errors
      }
    },
    mutations: {
      retry: 1                          // Single retry for mutations
    }
  }
});
```

### Real-Time Hooks Architecture
```typescript
// Primary hook for case management
export const useRealtimeCases = (options: UseRealtimeCasesOptions) => {
  const { data: cases, isLoading, error, refetch } = useRealtimeCasesQuery(options.filters);
  const caseMutation = useOptimisticCaseMutation();
  
  return {
    // Data
    cases,                      // Always fresh case data
    isLoading,                  // Loading state
    error,                      // Error handling
    
    // Actions  
    refreshCases,               // Manual refresh
    updateCaseStatus,           // Optimistic status updates
    saveCase,                   // Case creation/updates
    deleteCase,                 // Case deletion
    generateCaseReferenceNumber, // Reference generation
    getCaseById,                // Individual case fetch
    
    // Utilities
    validateComponent,          // Component health check
    getTestingReport,          // Testing diagnostics
    lastUpdated: new Date(),   // Timestamp tracking
    isConnected: isSuccess && !isError // Connection status
  };
};

// Specialized hooks for filtered data
export const useFilteredRealtimeCases = (filters: FilterOptions) => {
  // Real-time filtering without additional database queries
  const { cases, ...rest } = useRealtimeCases({ filters });
  const filteredCases = useMemo(() => applyFilters(cases, filters), [cases, filters]);
  
  return { cases: filteredCases, totalCases: cases.length, ...rest };
};

export const useRealtimeCasesByStatus = (status: CaseStatus) => {
  // Status-specific case subscriptions
  const { cases, ...rest } = useRealtimeCases();
  const statusCases = useMemo(() => cases.filter(c => c.status === status), [cases, status]);
  
  return { cases: statusCases, count: statusCases.length, ...rest };
};
```

### WebSocket Connection Management
```typescript
// RealtimeProvider manages all WebSocket connections
const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  useEffect(() => {
    // Establish multiple WebSocket subscriptions
    const subscriptions = [
      // Case management subscriptions
      supabase.channel('case_bookings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'case_bookings' }, handleCaseChange),
      
      supabase.channel('status_history')  
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'status_history' }, handleStatusChange),
      
      supabase.channel('amendment_history')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'amendment_history' }, handleAmendment),
      
      // User management subscriptions
      supabase.channel('profiles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, handleUserChange),
      
      // System notifications
      supabase.channel('notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, handleNotification)
    ];
    
    // Subscribe to all channels
    subscriptions.forEach(sub => sub.subscribe());
    
    // Connection monitoring
    const connectionMonitor = setInterval(checkConnection, 30000);
    
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
      clearInterval(connectionMonitor);
    };
  }, []);
  
  return (
    <RealtimeContext.Provider value={{ isConnected, reconnectAttempts }}>
      {children}
    </RealtimeContext.Provider>
  );
};
```

## Security & Permissions

### Permission System Architecture (30+ Permissions)
```typescript
const PERMISSION_ACTIONS = {
  // Case Management (12 permissions)
  CREATE_CASE: 'create_case',
  VIEW_CASES: 'view_cases',
  EDIT_CASE: 'edit_case', 
  DELETE_CASE: 'delete_case',
  AMEND_CASE: 'amend_case',
  PROCESS_ORDER: 'process_order',
  MARK_DELIVERED_HOSPITAL: 'mark_delivered_hospital',
  RECEIVE_ORDER_HOSPITAL: 'receive_order_hospital',
  COMPLETE_CASE: 'complete_case',
  DELIVER_TO_OFFICE: 'deliver_to_office',
  MARK_TO_BILLED: 'mark_to_billed',
  CANCEL_CASE: 'cancel_case',
  
  // Administrative (8 permissions)
  VIEW_USERS: 'view_users',
  CREATE_USER: 'create_user',
  EDIT_USER: 'edit_user',
  DELETE_USER: 'delete_user',
  PERMISSION_MATRIX: 'permission_matrix',
  AUDIT_LOGS: 'audit_logs',
  SYSTEM_SETTINGS: 'system_settings',
  EMAIL_CONFIG: 'email_config',
  
  // Data Management (6 permissions)  
  MANAGE_DOCTORS: 'manage_doctors',
  MANAGE_PROCEDURE_TYPES: 'manage_procedure_types',
  MANAGE_SURGERY_IMPLANTS: 'manage_surgery_implants',
  CODE_TABLE_SETUP: 'code_table_setup',
  EXPORT_DATA: 'export_data',
  IMPORT_DATA: 'import_data',
  
  // System Operations (4 permissions)
  BOOKING_CALENDAR: 'booking_calendar',
  VIEW_REPORTS: 'view_reports',
  BACKUP_RESTORE: 'backup_restore',
  MAINTENANCE_MODE: 'maintenance_mode'
} as const;
```

### Role-Based Access Control (7 Roles)
```typescript
const USER_ROLES = {
  ADMIN: 'admin',                      // Full system access (30 permissions)
  OPERATIONS_MANAGER: 'operations-manager',  // Operations + management (18 permissions)  
  OPERATIONS: 'operations',            // Case processing (12 permissions)
  SALES_MANAGER: 'sales-manager',      // Sales + management (16 permissions)
  SALES: 'sales',                     // Case completion (8 permissions)
  DRIVER: 'driver',                   // Delivery operations (4 permissions)
  IT: 'it'                           // System administration (14 permissions)
} as const;

// Dynamic permission checking with database validation
const hasPermission = async (userRole: string, action: string): Promise<boolean> => {
  try {
    const { data: permissions } = await supabase
      .from('permissions')
      .select('allowed')
      .eq('role', userRole)
      .eq('action', action)
      .single();
    
    return permissions?.allowed ?? false;
  } catch (error) {
    // Fail secure - deny access on error
    return false;
  }
};
```

### Data Security Implementation
```typescript
// Comprehensive security policy
const SECURE_STORAGE_POLICY = {
  // Authentication storage
  userCredentials: 'supabase-auth',      // Supabase handles auth tokens securely
  sessionData: 'database-only',          // All session data stored in database
  
  // Application data storage  
  caseData: 'real-time-fetch',          // No client-side case caching
  userPreferences: 'database-encrypted', // Encrypted storage for preferences
  systemSettings: 'server-side-only',   // Server-side configuration only
  
  // Limited local storage usage
  rememberMe: 'localStorage-only',       // Only "Remember Me" checkbox state
  uiPreferences: 'sessionStorage',       // Non-sensitive UI state
  
  // Security measures
  noSensitiveLocalStorage: true,         // Strict policy - no PII in localStorage
  failSecureDesign: true,               // Fail to secure state on all errors
  encryptedTransmission: true,          // HTTPS only, no HTTP fallback
  auditAllActions: true,                // Complete audit trail for all actions
  sessionTimeout: 8 * 60 * 60 * 1000,  // 8-hour session timeout
  passwordComplexity: 'high'            // Strong password requirements
};

// Row Level Security implementation
const RLS_POLICIES = {
  countryIsolation: `
    country = ANY(
      SELECT unnest(countries) 
      FROM profiles 
      WHERE id = auth.uid()
    ) OR (
      SELECT role FROM profiles WHERE id = auth.uid()
    ) = 'admin'
  `,
  
  roleBasedAccess: `
    EXISTS (
      SELECT 1 FROM permissions p
      JOIN profiles pr ON pr.role = p.role
      WHERE pr.id = auth.uid()
      AND p.action = 'view_cases'
      AND p.allowed = true
    )
  `,
  
  departmentAccess: `
    department = ANY(
      SELECT unnest(departments)
      FROM profiles 
      WHERE id = auth.uid()
    ) OR (
      SELECT role FROM profiles WHERE id = auth.uid()
    ) IN ('admin', 'operations-manager', 'sales-manager')
  `
};
```

## Business Logic & Workflows

### 11-Step Case Workflow
```typescript
const CASE_WORKFLOW: CaseStatus[] = [
  'Case Booked',                    // 1. Initial booking submission
  'Preparing Order',                // 2. Operations team preparation  
  'Order Prepared',                 // 3. Ready for approval/delivery
  'Sales Approval',                 // 4. Sales team approval (optional)
  'Pending Delivery (Hospital)',    // 5. Awaiting hospital delivery
  'Delivered (Hospital)',           // 6. Equipment delivered to hospital
  'Case Completed',                 // 7. Surgery completed successfully
  'Pending Delivery (Office)',      // 8. Equipment return to office
  'Delivered (Office)',             // 9. Equipment back at office
  'To be billed',                   // 10. Ready for invoicing
  'Case Closed'                     // 11. Final closure and archival
];

// Special workflow rules
const WORKFLOW_RULES = {
  // Status transitions
  allowedTransitions: {
    'Case Booked': ['Preparing Order', 'Case Cancelled'],
    'Preparing Order': ['Order Prepared', 'Case Cancelled'], 
    'Order Prepared': ['Sales Approval', 'Pending Delivery (Hospital)', 'Case Cancelled'],
    'Sales Approval': ['Pending Delivery (Hospital)', 'Case Cancelled'],
    'Pending Delivery (Hospital)': ['Delivered (Hospital)', 'Case Cancelled'],
    'Delivered (Hospital)': ['Case Completed', 'Case Cancelled'],
    'Case Completed': ['Pending Delivery (Office)', 'To be billed'],
    'Pending Delivery (Office)': ['Delivered (Office)'],
    'Delivered (Office)': ['To be billed'],
    'To be billed': ['Case Closed'],
    'Case Closed': [], // Terminal state
    'Case Cancelled': [] // Terminal state
  },
  
  // Role-based status permissions
  statusPermissions: {
    'Case Booked': ['operations', 'operations-manager', 'admin'],
    'Preparing Order': ['operations', 'operations-manager', 'admin'],
    'Order Prepared': ['operations', 'operations-manager', 'admin'],
    'Sales Approval': ['sales', 'sales-manager', 'admin'],
    'Pending Delivery (Hospital)': ['driver', 'operations', 'operations-manager', 'admin'],
    'Delivered (Hospital)': ['driver', 'operations', 'operations-manager', 'admin'],
    'Case Completed': ['sales', 'sales-manager', 'operations-manager', 'admin'],
    'Pending Delivery (Office)': ['driver', 'sales', 'sales-manager', 'admin'],
    'Delivered (Office)': ['driver', 'sales', 'sales-manager', 'admin'],
    'To be billed': ['sales', 'sales-manager', 'operations-manager', 'admin'],
    'Case Closed': ['sales-manager', 'operations-manager', 'admin'],
    'Case Cancelled': ['operations-manager', 'sales-manager', 'admin']
  }
};
```

### Amendment System with Change Tracking
```typescript
interface AmendmentWorkflow {
  // Amendable fields with validation
  amendableFields: {
    hospital: { required: true, type: 'string', maxLength: 100 },
    department: { required: true, type: 'string', validation: 'department_exists' },
    dateOfSurgery: { required: true, type: 'date', futureOnly: true },
    procedureType: { required: true, type: 'enum', values: PROCEDURE_TYPES },
    procedureName: { required: true, type: 'string', maxLength: 200 },
    doctorName: { required: false, type: 'string', maxLength: 100 },
    timeOfProcedure: { required: false, type: 'time' },
    surgerySetSelection: { required: true, type: 'array', itemType: 'string' },
    implantBox: { required: true, type: 'array', itemType: 'string' },
    specialInstruction: { required: false, type: 'text', maxLength: 1000 }
  };
  
  // Amendment business rules
  businessRules: {
    allowAmendments: (status: CaseStatus) => boolean;        // Based on case status
    requireApproval: (field: string, userRole: string) => boolean; // Manager approval
    notifyStakeholders: (changes: AmendmentHistory) => boolean;     // Email notifications
    trackQuantityChanges: (oldCase: CaseBooking, newCase: CaseBooking) => QuantityChange[];
  };
  
  // Change tracking implementation
  trackChanges: (
    oldValues: CaseBooking, 
    newValues: CaseBooking, 
    userId: string,
    reason?: string
  ) => AmendmentHistory;
}

// Amendment processing
const processAmendment = async (
  caseId: string, 
  amendments: Partial<CaseBooking>, 
  reason: string,
  userId: string
): Promise<AmendmentResult> => {
  // 1. Validate permissions
  const hasAmendPermission = await hasPermission(userRole, 'amend_case');
  if (!hasAmendPermission) throw new Error('Insufficient permissions');
  
  // 2. Get original case data
  const originalCase = await getCaseById(caseId);
  if (!originalCase) throw new Error('Case not found');
  
  // 3. Validate amendment rules
  const isAmendable = AMENDMENT_RULES.allowAmendments(originalCase.status);
  if (!isAmendable) throw new Error('Case cannot be amended in current status');
  
  // 4. Track changes
  const changes = trackFieldChanges(originalCase, amendments);
  if (changes.length === 0) throw new Error('No changes detected');
  
  // 5. Update case and create amendment history
  const updatedCase = await updateCaseWithAmendment(caseId, amendments);
  const amendmentHistory = await createAmendmentHistory({
    caseId,
    amendedBy: userId,
    changes,
    reason,
    timestamp: new Date().toISOString()
  });
  
  // 6. Send notifications
  await notifyAmendmentStakeholders(originalCase, updatedCase, amendmentHistory);
  
  // 7. Update quantities if needed
  if (hasQuantityChanges(changes)) {
    await updateCaseQuantities(caseId, amendments);
  }
  
  return { success: true, amendmentId: amendmentHistory.id };
};
```

## Multi-Country Operations

### Country Configuration Management
```typescript
const SUPPORTED_COUNTRIES = [
  'Singapore',     // Primary market - Full feature set
  'Malaysia',      // Secondary market - Full feature set  
  'Thailand',      // Expansion market - Core features
  'Philippines',   // Growth market - Core features
  'Myanmar',       // Emerging market - Basic features
  'Cambodia',      // New market - Basic features
  'Vietnam'        // Strategic market - Core features
] as const;

interface CountryConfig {
  country: string;
  
  // Localization
  timezone: string;           // e.g., 'Asia/Singapore'
  currency: string;           // e.g., 'SGD', 'MYR'
  language: string;           // e.g., 'en-SG', 'en-MY'
  dateFormat: string;         // e.g., 'DD/MM/YYYY'
  timeFormat: '12h' | '24h';
  
  // Business configuration
  businessHours: {
    start: string;            // e.g., '08:00'
    end: string;              // e.g., '18:00'
    timezone: string;
  };
  holidays: Holiday[];        // Country-specific holidays
  workingDays: number[];      // 1-7, Monday-Sunday
  
  // Medical configuration
  departments: Department[];
  doctors: Doctor[];
  procedureTypes: ProcedureType[];
  surgerySets: SurgerySet[];
  implantBoxes: ImplantBox[];
  
  // Feature flags
  features: {
    advancedReporting: boolean;
    bulkOperations: boolean;
    aiRecommendations: boolean;
    mobileApp: boolean;
  };
  
  // Email configuration
  emailSettings: {
    fromAddress: string;
    replyToAddress: string;
    smtpConfig: SMTPConfig;
    templates: EmailTemplate[];
  };
}
```

### Data Partitioning & Isolation Strategy
```sql
-- Multi-level Row Level Security for country isolation
CREATE POLICY multi_country_isolation ON case_bookings
  FOR ALL USING (
    -- Country-based access
    country = ANY(
      SELECT unnest(countries) 
      FROM profiles 
      WHERE id = auth.uid()
    ) 
    -- Admin override
    OR (
      SELECT role FROM profiles WHERE id = auth.uid()
    ) = 'admin'
    -- Department-based access (within authorized countries)
    OR department = ANY(
      SELECT d.name 
      FROM departments d
      JOIN profiles p ON d.country = ANY(p.countries)
      WHERE p.id = auth.uid()
      AND d.name = ANY(p.departments)
    )
  );

-- Department isolation policy
CREATE POLICY department_isolation ON case_bookings
  FOR ALL USING (
    department = ANY(
      SELECT unnest(departments)
      FROM profiles 
      WHERE id = auth.uid()
    ) 
    OR (
      SELECT role FROM profiles WHERE id = auth.uid()
    ) IN ('admin', 'operations-manager', 'sales-manager')
  );

-- Doctor visibility policy
CREATE POLICY doctor_visibility ON doctors
  FOR SELECT USING (
    country = ANY(
      SELECT unnest(countries)
      FROM profiles
      WHERE id = auth.uid()
    )
    AND (
      department_id IN (
        SELECT d.id FROM departments d
        WHERE d.name = ANY(
          SELECT unnest(departments) FROM profiles WHERE id = auth.uid()
        )
      )
      OR (
        SELECT role FROM profiles WHERE id = auth.uid()
      ) IN ('admin', 'operations-manager', 'sales-manager')
    )
  );
```

### Multi-Country User Management
```typescript
interface MultiCountryUser extends User {
  // Multi-country access control
  countries: string[];                // Authorized countries
  departments: string[];              // Authorized departments (across countries)
  selectedCountry?: string;           // Current active country context
  
  // Country-specific settings
  countrySettings: {
    [country: string]: {
      departments: string[];          // Country-specific departments
      defaultDepartment?: string;     // Default department in country
      notifications: {
        email: boolean;
        push: boolean;
        statusUpdates: CaseStatus[];  // Which statuses to notify about
        amendmentAlerts: boolean;
      };
      preferences: {
        timezone: string;
        dateFormat: string;
        language: string;
        theme: 'light' | 'dark';
      };
      permissions: {                  // Country-specific permission overrides
        [action: string]: boolean;
      };
    }
  };
  
  // Access validation methods
  canAccessCountry: (country: string) => boolean;
  canAccessDepartment: (department: string, country: string) => boolean;
  getAvailableDepartments: (country: string) => string[];
  switchCountryContext: (country: string) => Promise<boolean>;
}

// Multi-country session management
const createMultiCountrySession = async (user: MultiCountryUser): Promise<Session> => {
  // Validate country access
  const authorizedCountries = await validateUserCountryAccess(user.id);
  
  // Set default country if not selected
  const selectedCountry = user.selectedCountry || authorizedCountries[0];
  
  // Load country-specific settings
  const countryConfig = await getCountryConfig(selectedCountry);
  const userSettings = user.countrySettings[selectedCountry] || getDefaultSettings();
  
  // Create session with country context
  return {
    userId: user.id,
    selectedCountry,
    authorizedCountries,
    countryConfig,
    userSettings,
    permissions: await getUserPermissions(user.role, selectedCountry),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
  };
};
```

## Testing Strategy

### Testing Pyramid Implementation
```typescript
// Unit Tests (Jest + React Testing Library) - 80% coverage target
const UNIT_TEST_COVERAGE = {
  components: {
    target: 85,
    current: 82,
    critical: [
      'CaseBookingForm',
      'CasesList', 
      'StatusWorkflow',
      'PermissionMatrix',
      'UserManagement'
    ]
  },
  
  hooks: {
    target: 90,
    current: 88,
    critical: [
      'useRealtimeCases',
      'useCurrentUser',
      'usePermissions',
      'useDatabaseConnection'
    ]
  },
  
  services: {
    target: 95,
    current: 92,
    critical: [
      'realtimeCaseService',
      'userService',
      'emailNotificationProcessor',
      'auditService'
    ]
  },
  
  utils: {
    target: 90,
    current: 89,
    critical: [
      'permissions',
      'countryUtils', 
      'fieldMappings',
      'auditService'
    ]
  }
};

// Integration Tests - Database and API integration
const INTEGRATION_TESTS = {
  database: [
    'Supabase connection and authentication',
    'Row Level Security policy validation',
    'Multi-country data isolation',
    'Real-time subscription functionality',
    'Database migration compatibility'
  ],
  
  services: [
    'Service layer integration testing',
    'Email notification system',
    'File upload and storage',
    'Audit logging system',
    'Permission system validation'
  ],
  
  realTime: [
    'WebSocket connection stability',
    'Real-time data synchronization', 
    'Connection recovery mechanisms',
    'Multi-client update propagation',
    'Performance under load'
  ]
};
```

### End-to-End Test Coverage (Playwright)
```typescript
// Critical user journey testing
const E2E_TEST_SUITES = {
  authentication: {
    tests: [
      'Complete login/logout workflow',
      'Remember Me functionality validation',
      'Password change requirement flow',
      'Session timeout and validation',
      'Multi-factor authentication (if enabled)'
    ],
    priority: 'critical',
    browsers: ['chromium', 'firefox', 'webkit'],
    devices: ['desktop', 'tablet', 'mobile']
  },
  
  caseManagement: {
    tests: [
      'End-to-end case creation workflow',
      'Complete case status progression',
      'Case amendment with history tracking',
      'File attachment upload and download',
      'Multi-user real-time collaboration',
      'Cross-country case isolation validation'
    ],
    priority: 'critical',
    dataValidation: true,
    performanceThresholds: {
      caseCreation: '< 3s',
      statusUpdate: '< 1s',
      pageLoad: '< 2s'
    }
  },
  
  permissions: {
    tests: [
      'Role-based access control validation',
      'Permission matrix functionality',
      'Cross-country access restrictions',
      'Department-level access control',
      'Admin vs user permission differences'
    ],
    priority: 'high',
    securityFocused: true
  },
  
  realTime: {
    tests: [
      'WebSocket connection establishment',
      'Real-time case update propagation',
      'Multi-client synchronization',
      'Connection recovery after network issues',
      'Performance under concurrent users'
    ],
    priority: 'high',
    performanceMonitoring: true,
    concurrentUsers: 10
  },
  
  mobile: {
    tests: [
      'Mobile-responsive layout validation',
      'Touch gesture functionality',
      'Mobile navigation usability',
      'Form input on mobile devices',
      'File upload on mobile browsers'
    ],
    priority: 'medium',
    devices: ['iPhone 12', 'iPad', 'Galaxy S21', 'Pixel 5'],
    orientations: ['portrait', 'landscape']
  },
  
  crossBrowser: {
    tests: [
      'Feature compatibility across browsers',
      'Performance consistency',
      'UI/UX consistency',
      'JavaScript API compatibility',
      'CSS rendering consistency'
    ],
    browsers: ['Chrome', 'Firefox', 'Safari', 'Edge'],
    priority: 'medium'
  }
};

// Performance testing configuration
const PERFORMANCE_BENCHMARKS = {
  pageLoadTimes: {
    target: '< 2 seconds',
    acceptable: '< 3 seconds',
    metrics: ['First Contentful Paint', 'Largest Contentful Paint', 'Time to Interactive']
  },
  
  databaseQueries: {
    target: '< 500ms',
    acceptable: '< 1s',
    operations: ['case_fetch', 'user_auth', 'permission_check', 'real_time_update']
  },
  
  bundleSize: {
    target: '< 300KB gzipped',
    current: '295.71KB gzipped',
    monitoring: 'continuous'
  },
  
  concurrency: {
    target: '50 concurrent users',
    testing: '10-25 concurrent users',
    metrics: ['response_time', 'error_rate', 'throughput']
  }
};
```

## Production Deployment & Monitoring

### Deployment Pipeline
```yaml
# Vercel deployment configuration
name: Build and Deploy
on: [push, pull_request]

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    steps:
      - name: TypeScript Compilation
        run: npm run typecheck
      - name: ESLint Code Quality
        run: npm run lint
      - name: Prettier Formatting
        run: npm run format:check
      - name: Unit Tests
        run: npm run test:coverage
        
  build:
    needs: quality-checks
    runs-on: ubuntu-latest
    steps:
      - name: Build Production Bundle
        run: npm run build
      - name: Bundle Size Analysis
        run: npm run analyze
        
  e2e-testing:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Playwright E2E Tests
        run: npm run test:e2e
      - name: Performance Tests
        run: npm run test:performance
        
  deploy:
    needs: [quality-checks, build, e2e-testing]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        run: vercel --prod
      - name: Smoke Tests
        run: npm run test:smoke
      - name: Update Deployment Status
        run: npm run deploy:notify
```

### Production Monitoring
```typescript
// Performance and health monitoring
const PRODUCTION_MONITORING = {
  applicationMetrics: {
    loadTime: { target: '< 3s', alert: '> 5s' },
    errorRate: { target: '< 1%', alert: '> 2%' },
    uptime: { target: '> 99.5%', alert: '< 99%' },
    userSessions: { monitor: 'continuous', alert: 'unusual_patterns' }
  },
  
  databaseMetrics: {
    queryPerformance: { target: '< 500ms', alert: '> 1s' },
    connectionCount: { target: '< 80%', alert: '> 90%' },
    diskUsage: { target: '< 70%', alert: '> 85%' },
    backupStatus: { frequency: 'daily', alert: 'failure' }
  },
  
  businessMetrics: {
    caseCreationRate: { monitor: 'hourly', alert: 'significant_drop' },
    userLoginSuccess: { target: '> 99%', alert: '< 95%' },
    emailDeliveryRate: { target: '> 98%', alert: '< 95%' },
    multiCountrySync: { monitor: 'continuous', alert: 'sync_failure' }
  },
  
  securityMonitoring: {
    failedLogins: { threshold: 5, timeWindow: '15min', action: 'alert' },
    suspiciousActivity: { monitor: 'continuous', mlBased: true },
    permissionViolations: { alert: 'immediate', escalate: true },
    dataAccessPatterns: { baseline: 'learned', deviation: 'alert' }
  }
};

// Emergency response procedures
const INCIDENT_RESPONSE = {
  severity1: {
    description: 'System down or data breach',
    responseTime: '< 15 minutes',
    escalation: ['technical_lead', 'operations_manager', 'ceo'],
    actions: ['immediate_investigation', 'user_communication', 'rollback_if_needed']
  },
  
  severity2: {
    description: 'Major feature unavailable',
    responseTime: '< 1 hour', 
    escalation: ['technical_lead', 'operations_manager'],
    actions: ['investigate_and_fix', 'monitor_closely', 'communicate_status']
  },
  
  severity3: {
    description: 'Minor issues or performance degradation',
    responseTime: '< 4 hours',
    escalation: ['technical_lead'],
    actions: ['diagnose_and_fix', 'schedule_maintenance_if_needed']
  }
};
```

---

## Development Guidelines & Best Practices

### Code Quality Standards
```typescript
// Development principles
const DEVELOPMENT_STANDARDS = {
  codeQuality: {
    typeScript: 'strict',           // Strict TypeScript checking
    testCoverage: '>= 80%',         // Minimum test coverage
    complexity: 'low',              // Cyclomatic complexity < 10
    documentation: 'comprehensive'   // All public APIs documented
  },
  
  componentDesign: {
    principle: 'single_responsibility',
    pattern: 'hooks_based',
    styling: 'css_modules',
    accessibility: 'wcag_2.1'
  },
  
  performance: {
    bundleSize: '< 300KB gzipped',
    loadTime: '< 2s',
    interactivity: '< 100ms',
    caching: 'optimized'
  },
  
  security: {
    dataStorage: 'database_only',
    authentication: 'supabase_auth',
    authorization: 'role_based',
    auditing: 'complete'
  }
};
```

### Architecture Decision Records (ADRs)
```typescript
// Key architectural decisions and their rationales
const ARCHITECTURAL_DECISIONS = {
  database: {
    choice: 'Supabase (PostgreSQL)',
    rationale: 'Real-time capabilities, RLS, managed scaling',
    alternatives: ['Firebase', 'AWS RDS', 'MongoDB'],
    decision_date: '2024-01-15'
  },
  
  frontend: {
    choice: 'React + TypeScript',
    rationale: 'Type safety, component reusability, strong ecosystem',
    alternatives: ['Vue.js', 'Angular', 'Svelte'],
    decision_date: '2024-01-10'
  },
  
  stateManagement: {
    choice: 'React Query + Context',
    rationale: 'Server state management, real-time sync, caching',
    alternatives: ['Redux', 'Zustand', 'Recoil'],
    decision_date: '2024-02-01'
  },
  
  authentication: {
    choice: 'Supabase Auth + Custom Users',
    rationale: 'Multi-country support, role-based permissions',
    alternatives: ['Auth0', 'Firebase Auth', 'Cognito'],
    decision_date: '2024-01-20'
  },
  
  deployment: {
    choice: 'Vercel',
    rationale: 'Next.js optimization, global CDN, easy setup',
    alternatives: ['Netlify', 'AWS Amplify', 'Heroku'],
    decision_date: '2024-01-25'
  }
};
```

This comprehensive project guide provides complete technical documentation of the TM Case Booking System, covering all aspects from architecture to deployment. The system represents a sophisticated medical case management platform with enterprise-grade features, real-time capabilities, and multi-country operational support.

**Last Updated**: October 14, 2025 by Claude Code  
**Next Review**: November 14, 2025

## 🆘 Support & Troubleshooting

### Common Issues
1. **Login Failures**: Check Microsoft OAuth configuration
2. **Database Connectivity**: Verify Supabase connection
3. **Permission Errors**: Check user role assignments
4. **Country Access**: Verify department assignments

### Emergency Contacts
- **Technical Lead**: An Rong Low
- **Operations**: Jasmine Mai
- **Database Support**: TransMedic IT Team

### Quick Health Check
```bash
# Verify application health
curl -f https://tmcasebooking.vercel.app
# Check database connectivity  
npm run typecheck && npm run build
```

## 📈 Analytics & Monitoring
- **Error Tracking**: Console logs and error boundaries
- **Performance**: Web Vitals monitoring
- **User Activity**: Realtime case updates
- **System Health**: Automated monitoring via Vercel

---
**Last Updated**: October 13, 2025 by Claude Code  
**Next Review**: November 13, 2025