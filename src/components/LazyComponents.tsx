/**
 * Lazy Loading Components
 * Reduces initial bundle size by loading components only when needed
 */

import React, { Suspense } from 'react';

// Loading spinner component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    color: '#20b2aa'
  }}>
    <div style={{
      width: '32px',
      height: '32px',
      border: '3px solid #e2e8f0',
      borderTop: '3px solid #20b2aa',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <span style={{ marginLeft: '1rem' }}>Loading...</span>
  </div>
);

// Lazy load heavy components
const SimplifiedEmailConfig = React.lazy(() =>
  import('./SimplifiedEmailConfig')
);

const Reports = React.lazy(() =>
  import('./Reports')
);

const AuditLogs = React.lazy(() =>
  import('./AuditLogs')
);

const UserManagement = React.lazy(() =>
  import('./UserManagement')
);

const CodeTableSetup = React.lazy(() =>
  import('./CodeTableSetup')
);

const SystemSettings = React.lazy(() =>
  import('./SystemSettings')
);

const PermissionMatrixPage = React.lazy(() =>
  import('./PermissionMatrixPage')
);

// Wrapper component with error boundary
class LazyComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#e74c3c' }}>
          <h3>⚠️ Component Loading Error</h3>
          <p>This component failed to load. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#20b2aa',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              margin: '1rem'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for lazy loading with suspense
const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) => {
  const LazyWrapper = (props: P) => (
    <LazyComponentErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback || <LoadingSpinner />}>
        <Component {...props} />
      </Suspense>
    </LazyComponentErrorBoundary>
  );

  LazyWrapper.displayName = `LazyWrapper(${Component.displayName || Component.name})`;
  return LazyWrapper;
};

// Export lazy-loaded components
export const LazySimplifiedEmailConfig = withLazyLoading(SimplifiedEmailConfig);
export const LazyReports = withLazyLoading(Reports);
export const LazyAuditLogs = withLazyLoading(AuditLogs);
export const LazyUserManagement = withLazyLoading(UserManagement);
export const LazyCodeTableSetup = withLazyLoading(CodeTableSetup);
export const LazySystemSettings = withLazyLoading(SystemSettings);
export const LazyPermissionMatrixPage = withLazyLoading(PermissionMatrixPage);

// Preload function for critical routes
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be used soon
  import('./SimplifiedEmailConfig');
  import('./UserManagement');
  import('./AuditLogs');
};

// Component registry for dynamic loading
export const componentRegistry = {
  'SimplifiedEmailConfig': LazySimplifiedEmailConfig,
  'Reports': LazyReports,
  'AuditLogs': LazyAuditLogs,
  'UserManagement': LazyUserManagement,
  'CodeTableSetup': LazyCodeTableSetup,
  'SystemSettings': LazySystemSettings,
  'PermissionMatrixPage': LazyPermissionMatrixPage,
} as const;

export type LazyComponentName = keyof typeof componentRegistry;