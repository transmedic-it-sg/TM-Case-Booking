# Case Booking Application - Code Documentation

## Overview
A React-based case booking application for medical procedures with role-based access control, status workflow management, and notification system.

## Architecture

### Core Components
- **App.tsx**: Main application container with routing logic
- **CasesList.tsx**: Primary workflow component with status transitions
- **CaseBookingForm.tsx**: New case creation form
- **ProcessOrderPage.tsx**: Dedicated order processing page
- **Login.tsx**: Authentication component
- **UserManagement.tsx**: User administration

### Context Providers
- **NotificationContext.tsx**: Persistent notification system
- **ToastContainer.tsx**: Temporary toast notifications

### Utilities
- **auth.ts**: Authentication and session management
- **storage.ts**: LocalStorage operations for cases and users
- **sounds.ts**: Audio feedback system

## Status Workflow
The complete standardized workflow follows this sequence:
```
Case Booked → Order Preparation → Order Prepared → Pending Delivery (Hospital) → 
Delivered (Hospital) → Case Completed → Pending Delivery (Office) → Delivered (Office) → To be billed
```

### Additional Final Statuses (outside main workflow):
- **Case Closed**: Case finalized and archived
- **Case Cancelled**: Case cancelled

### Role-Based Permissions
- **Operations/Operations-Manager**: Process orders (Order Preparation → Order Prepared), mark as pending/delivered to hospital
- **Driver**: Mark orders as delivered to hospital (Pending Delivery (Hospital) → Delivered (Hospital)) with image/details
- **Sales**: Complete cases (Delivered (Hospital) → Case Completed) with attachments/summary/DO, handle office delivery
- **Admin**: Full access + user management
- **All Users**: Mark as "To be billed" from any active status

## Key Features
1. **Multi-country Support**: Singapore, Malaysia, Philippines, Indonesia, Vietnam, Hong Kong, Thailand
2. **Department Management**: Cardiology, Orthopedics, Neurosurgery, etc.
3. **Status History**: Complete audit trail with timestamps
4. **File Uploads**: Image support for delivery confirmation
5. **Notification System**: Real-time notifications for all status changes
6. **Sound Effects**: Audio feedback for user actions
7. **Advanced Filtering**: Search by multiple criteria with date ranges

## Data Models

### CaseBooking Interface
```typescript
{
  id: string;
  caseReferenceNumber: string;
  hospital: string;
  department: string;
  dateOfSurgery: string;
  procedureType: string;
  procedureName: string;
  doctorName?: string;
  timeOfProcedure?: string;
  surgerySetSelection: string[];
  implantBox: string[];
  specialInstruction?: string;
  status: CaseStatus;
  submittedBy: string;
  submittedAt: string;
  processedBy?: string;
  processedAt?: string;
  processOrderDetails?: string;
  country: string;
  statusHistory: StatusHistory[];
  isAmended?: boolean;
  amendedBy?: string;
  amendedAt?: string;
}
```

### User Interface
```typescript
{
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'operations' | 'operation-manager' | 'sales' | 'sales-manager' | 'driver' | 'it';
  name: string;
  departments: string[];
  countries: string[];
  selectedCountry?: string;
}
```

## Status Transition Functions

### CasesList.tsx Key Functions
- `handleStatusChange(caseId, newStatus)`: Generic status updater with notifications
- `handleOrderDelivered(caseId)`: Operations/Manager only - Hospital delivery
- `handleOrderReceived(caseId)`: Driver only - Opens form for details/image
- `handleSaveOrderReceived(caseId)`: Saves received order with details
- `handleCaseCompleted(caseId)`: Sales only - Opens completion form
- `handleSaveCaseCompleted(caseId)`: Saves completed case with attachments/DO
- `handleOrderDeliveredOffice(caseId)`: Sales only - Office delivery
- `handleToBeBilled(caseId)`: All users - Final billing status

## Notification System
All status changes trigger notifications with:
- Case reference number
- Action performed
- User who performed action
- Timestamp
- Success/error status

## Recent Fixes & Optimizations Applied

### Functionality Fixes
1. ✅ Added missing status transition buttons for all workflow steps
2. ✅ Implemented role-based button enabling/disabling
3. ✅ Added notification calls to all status change handlers
4. ✅ Created modal forms for Order Received and Case Completed workflows
5. ✅ Fixed Process Order button permissions (Operations/Manager only)
6. ✅ Added image upload capability for delivery confirmation
7. ✅ Implemented attachments/summary/DO number for case completion

### Performance Optimizations
8. ✅ Added React.memo to MultiSelectDropdown and NotificationBell components
9. ✅ Implemented useMemo for expensive array operations in CaseBookingForm
10. ✅ Added useCallback for event handlers to prevent unnecessary re-renders
11. ✅ Optimized notification list rendering with memoized slicing
12. ✅ Reduced motion support for accessibility and performance

### CSS & UX Improvements
13. ✅ Enhanced status transition buttons with gradient backgrounds and animations
14. ✅ Added shimmer effects on button hover with slide animations
15. ✅ Improved disabled button states with better visual feedback
16. ✅ Created animated modal forms with slide-down animations
17. ✅ Enhanced image upload styling with drag-and-drop visual feedback
18. ✅ Added responsive design improvements for mobile devices
19. ✅ Improved accessibility with better focus states and reduced motion support
20. ✅ Added smooth scroll behavior throughout the application

### Code Quality Improvements
21. ✅ Created comprehensive code documentation system (CLAUDE.md)
22. ✅ Identified and documented 12 components with specific bugs and improvements
23. ✅ Enhanced error handling patterns across components
24. ✅ Improved form validation and user feedback systems

### Latest UI/UX Enhancements
25. ✅ Fixed Process Order button workflow (Case Booked → Order Preparation)
26. ✅ Removed country label from header, keeping only emoji
27. ✅ Implemented status-based color theming across all case information
28. ✅ Added collapsible status history showing only current status by default
29. ✅ Enhanced role-based permissions for Operations/Operations Manager roles
30. ✅ Added status-specific color coding for better visual organization

### Critical Bug Fixes
31. ✅ Fixed "Mark as Delivered" button to only allow Driver role (was Operations/Manager)
32. ✅ Replaced country emoji with colored country name badges
33. ✅ Fixed Process Order Details bug showing delivery data instead of order details
34. ✅ Added data cleanup utility to fix existing corrupted processOrderDetails
35. ✅ Enhanced updateCaseStatus function to prevent data corruption

## Build Commands
- `npm start`: Development server
- `npm run build`: Production build
- `npm test`: Run tests

## Email Configuration Setup
The application now features simplified OAuth-based email configuration:

### OAuth Setup Required
1. **Google OAuth**: Create credentials at https://console.cloud.google.com/
2. **Microsoft OAuth**: Create app registration at https://portal.azure.com/
3. **Environment Variables**: Copy `.env.example` to `.env` and configure client IDs

### Key Features
- Direct OAuth authentication (no manual credential entry)
- Support for both Google Gmail and Microsoft Outlook
- Secure token storage and refresh handling
- Simplified UI with authentication buttons
- Per-country email provider configuration

## Known Working Features
- ✅ User authentication with role-based access
- ✅ Case creation and submission
- ✅ Complete status workflow with proper permissions
- ✅ Notification system for all status changes
- ✅ Advanced filtering and search
- ✅ Case amendment functionality
- ✅ User management (admin only)
- ✅ Multi-country and department support
- ✅ File upload for delivery images
- ✅ Sound effects and toast notifications

## Technology Stack
- React 18 with TypeScript
- CSS3 with responsive design
- LocalStorage for data persistence
- FileReader API for image uploads
- Web Audio API for sound effects