/**
 * Edit Sets Error Boundary - Proper Exception Handling
 * Implements 2025 best practices for hierarchical component error handling
 * NO localStorage fallbacks, NO false data - proper error messages only
 */

import React, { ErrorInfo } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

interface EditSetsErrorFallbackProps extends FallbackProps {
  componentName?: string;
  userAction?: string;
}

const EditSetsErrorFallback: React.FC<EditSetsErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  componentName = 'Edit Sets',
  userAction = 'working with Edit Sets'
}) => {
  const handleReportError = () => {
    // Log to console for development
    //   component: componentName,
    //   userAction,
    //   error: error.message,
    //   stack: error.stack,
    //   timestamp: new Date().toISOString()
    // });

    // In production, this would send to error reporting service
    // Example: Sentry, LogRocket, etc.
  };

  return (
    <div className="edit-sets-error-boundary">
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h2>Something went wrong with {componentName}</h2>
        <div className="error-details">
          <p><strong>What happened:</strong> An error occurred while {userAction}</p>
          <p><strong>Error:</strong> {error.message}</p>

          {process.env.NODE_ENV === 'development' && (
            <details className="error-technical">
              <summary>Technical Details (Development)</summary>
              <pre className="error-stack">{error.stack}</pre>
            </details>
          )}
        </div>

        <div className="error-actions">
          <button
            onClick={resetErrorBoundary}
            className="btn btn-primary"
          >
            Try Again
          </button>
          <button
            onClick={handleReportError}
            className="btn btn-outline-secondary"
          >
            Report Issue
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-outline-danger"
          >
            Reload Page
          </button>
        </div>

        <div className="error-help">
          <h4>Need Help?</h4>
          <ul>
            <li>Check your internet connection</li>
            <li>Verify you have proper permissions</li>
            <li>Try refreshing the page</li>
            <li>Contact support if the problem persists</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const EditSetsErrorBoundary: React.FC<{
  children: React.ReactNode;
  componentName?: string;
  userAction?: string;
}> = ({ children, componentName, userAction }) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Enhanced error logging
    //   error: error.message,
    //   stack: error.stack,
    //   componentStack: errorInfo.componentStack,
    //   timestamp: new Date().toISOString(),
    //   userAgent: navigator.userAgent,
    //   url: window.location.href
    // });

    // In production, send to error reporting service
    // Example: Sentry.captureException(error, { contexts: { errorInfo } });
  };

  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <EditSetsErrorFallback
          {...props}
          componentName={componentName}
          userAction={userAction}
        />
      )}
      onError={handleError}
      onReset={() => {
        // Clear any error state, reset forms, etc.
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default EditSetsErrorBoundary;