# TM Case Booking System Architecture v1.3.4

## Overview
The TM Case Booking System is a comprehensive medical case management application built with React 18, TypeScript, and Supabase. This document outlines the current system architecture, coding standards, and best practices implemented in version 1.3.4.

## Technology Stack

### Frontend
- **React 18.2.0** with TypeScript 4.7.4
- **React Scripts 5.0.1** for build tooling
- **Custom CSS** with responsive design patterns
- **React Error Boundary** for error handling
- **React Query** for data fetching and caching

### Backend
- **Supabase** for database, authentication, and real-time subscriptions
- **PostgreSQL** as the primary database
- **Edge Functions** for serverless computing
- **Row Level Security (RLS)** for data access control

### Infrastructure
- **Vercel** for hosting and deployment
- **GitHub** for version control
- **Edge Functions** for email processing

## System Architecture

### Component Architecture
```
src/
├── components/           # Reusable UI components
│   ├── common/          # Shared utility components
│   ├── CasesList/       # Case management components
│   ├── CaseCard/        # Individual case components
│   └── forms/           # Form-related components
├── hooks/               # Custom React hooks
├── services/            # Business logic and API calls
├── utils/               # Utility functions and helpers
├── types/               # TypeScript type definitions
├── constants/           # Application constants
└── assets/              # Static assets and styles
```

### Data Flow Architecture
1. **Real-time Data**: Components use `useRealtimeCases` hook for live updates
2. **Permission-based Access**: All operations check user permissions via `hasPermission`
3. **Robust Database Operations**: All queries use error handling and retry mechanisms
4. **Field Mapping**: Consistent mapping between database (snake_case) and frontend (camelCase)

## Key Design Patterns

### 1. Robust Database Operations
```typescript
// Pattern: Always use robust database operation wrappers
const { data, error } = await robustSingle<User>(
  supabase.from('profiles').select('*').eq('id', userId)
);
```

### 2. Permission-Based Access Control
```typescript
// Pattern: Check permissions before rendering/executing actions
if (hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.CREATE_CASE)) {
  // Render component or execute action
}
```

### 3. Field Mapping Consistency
```typescript
// Pattern: Use field mapping utilities for database operations
import { CASE_BOOKINGS_FIELDS, getDbField } from '../utils/fieldMappings';
const dbField = getDbField(CASE_BOOKINGS_FIELDS, 'dateOfSurgery'); // Returns 'date_of_surgery'
```

### 4. Real-time Data Management
```typescript
// Pattern: Use real-time hooks for live data updates
const { cases, loading, error } = useRealtimeCases({
  enableRealTime: true,
  filters: { country: selectedCountry }
});
```

## Coding Standards

### TypeScript Standards
- **Strict Mode**: Enabled with comprehensive type checking
- **Interface Definitions**: All data structures have proper TypeScript interfaces
- **Generic Types**: Used for database operations and API responses
- **Type Guards**: Implemented for runtime type safety

### Component Standards
- **Functional Components**: All components use React function syntax
- **Custom Hooks**: Business logic extracted into reusable hooks
- **Error Boundaries**: Comprehensive error handling at component level
- **Prop Validation**: TypeScript interfaces for all component props

### Database Standards
- **Field Naming**: Database uses snake_case, frontend uses camelCase
- **Robust Operations**: All database calls include error handling and retries
- **Transaction Safety**: Critical operations use database transactions
- **RLS Policies**: Row-level security for data access control

## Security Implementation

### Authentication & Authorization
- **Permission Matrix**: Role-based access control with granular permissions
- **Session Management**: Secure session handling with automatic cleanup
- **Password Security**: Bcrypt hashing with salt rounds
- **Temporary Passwords**: Forced password change on first login

### Data Protection
- **Input Validation**: All user inputs validated and sanitized
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **XSS Protection**: React's built-in XSS prevention
- **Audit Logging**: Comprehensive audit trail for all user actions

## Performance Optimizations

### Frontend Optimizations
- **Component Memoization**: React.memo for expensive components
- **Lazy Loading**: Dynamic imports for route-based code splitting
- **Caching Strategies**: Permission and data caching with TTL
- **Bundle Optimization**: Tree shaking and dead code elimination

### Database Optimizations
- **Indexes**: Proper database indexing for frequently queried fields
- **Connection Pooling**: Supabase connection management
- **Query Optimization**: Efficient SQL queries with proper joins
- **Real-time Subscriptions**: Selective real-time updates

## Error Handling Strategy

### Client-side Error Handling
- **Error Boundaries**: React error boundaries for component crashes
- **Graceful Degradation**: Fallback UI states for errors
- **User Feedback**: Clear error messages and recovery instructions
- **Retry Mechanisms**: Automatic retry for transient failures

### Server-side Error Handling
- **Database Errors**: Robust error handling with fallback strategies
- **Network Errors**: Retry logic with exponential backoff
- **Authentication Errors**: Token refresh and re-authentication flows
- **Rate Limiting**: Graceful handling of API rate limits

## Mobile Responsiveness

### Design Principles
- **Mobile-first**: Responsive design starting from mobile viewport
- **Touch-friendly**: Appropriate touch targets and gestures
- **Performance**: Optimized for mobile device capabilities
- **Accessibility**: WCAG 2.1 compliance for screen readers

### Implementation
- **CSS Grid/Flexbox**: Modern layout techniques for responsiveness
- **Breakpoints**: Strategic breakpoints for different device sizes
- **Touch Optimization**: Touch-friendly UI components
- **Performance Budget**: Lightweight assets for mobile networks

## Testing Strategy

### Unit Testing
- **Component Testing**: React Testing Library for component behavior
- **Hook Testing**: Custom hook testing with proper mocking
- **Utility Testing**: Pure function testing for business logic
- **Service Testing**: API service layer testing

### Integration Testing
- **Database Integration**: Full database operation testing
- **Authentication Flow**: Complete auth flow testing
- **Permission System**: Role-based access testing
- **Real-time Features**: WebSocket and real-time testing

### End-to-End Testing
- **Playwright**: E2E testing for critical user journeys
- **Cross-browser**: Testing across different browsers
- **Mobile Testing**: Mobile-specific E2E scenarios
- **Performance Testing**: Load and performance validation

## Deployment Pipeline

### Build Process
1. **TypeScript Compilation**: Strict type checking
2. **Asset Optimization**: CSS/JS minification and compression
3. **Bundle Analysis**: Bundle size monitoring and optimization
4. **Quality Gates**: Automated testing and linting

### Deployment Strategy
1. **Version Control**: Git-based deployment with proper tagging
2. **Environment Management**: Separate dev/staging/production environments
3. **Database Migrations**: Automated schema migrations
4. **Rollback Strategy**: Quick rollback capabilities for production issues

## Monitoring and Observability

### Application Monitoring
- **Error Tracking**: Client and server-side error monitoring
- **Performance Metrics**: Core Web Vitals and performance tracking
- **User Analytics**: User behavior and feature usage analytics
- **Audit Logging**: Comprehensive audit trail for compliance

### Infrastructure Monitoring
- **Database Performance**: Query performance and slow query detection
- **API Performance**: Response times and error rates
- **Resource Usage**: Memory, CPU, and storage monitoring
- **Security Monitoring**: Authentication attempts and security events

## Future Considerations

### Scalability Preparations
- **Database Sharding**: Preparation for horizontal scaling
- **CDN Integration**: Global content delivery optimization
- **Microservices**: Potential service decomposition strategies
- **Caching Layers**: Redis/Memcached integration planning

### Feature Enhancements
- **PWA Capabilities**: Offline functionality and push notifications
- **Advanced Analytics**: Business intelligence and reporting
- **API Gateway**: External API integration management
- **Third-party Integrations**: ERP and healthcare system integrations

---

**Document Version**: 1.3.4  
**Last Updated**: January 2025  
**Maintained By**: Claude Code Assistant  
**Review Frequency**: Major version releases