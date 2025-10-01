import React, { useEffect, useState } from 'react';

/**
 * SSO OAuth Callback Handler
 *
 * This component handles the OAuth callback from Microsoft Entra ID or Google Workspace.
 * It extracts the authorization code from the URL parameters and sends it back to the parent window.
 *
 * This page should be accessible at the redirect URI configured in your OAuth applications:
 * - Microsoft: https://yourdomain.com/auth/callback
 * - Google: https://yourdomain.com/auth/callback
 */
const SSOCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const processCallback = () => {
      try {
        // Parse URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        const state = urlParams.get('state');

        if (error) {
          // OAuth error occurred
          setStatus('error');
          setMessage(`Authentication failed: ${errorDescription || error}`);

          // Send error to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'sso_auth_error',
              error: errorDescription || error,
              state: state
            }, window.location.origin);
          }

          // Auto-close after 3 seconds
          setTimeout(() => {
            window.close();
          }, 3000);

        } else if (code) {
          // Success - we have an authorization code
          setStatus('success');
          setMessage('Authentication successful! Completing setup...');

          // Send code to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'sso_auth_success',
              code: code,
              state: state
            }, window.location.origin);
          }

          // Auto-close after 1 second
          setTimeout(() => {
            window.close();
          }, 1000);

        } else {
          // No code or error - something went wrong
          setStatus('error');
          setMessage('No authorization code received. Please try again.');

          if (window.opener) {
            window.opener.postMessage({
              type: 'sso_auth_error',
              error: 'No authorization code received'
            }, window.location.origin);
          }

          setTimeout(() => {
            window.close();
          }, 3000);
        }

      } catch (err) {
        console.error('Error processing OAuth callback:', err);
        setStatus('error');
        setMessage('An error occurred while processing the authentication callback.');

        if (window.opener) {
          window.opener.postMessage({
            type: 'sso_auth_error',
            error: 'Failed to process callback'
          }, window.location.origin);
        }

        setTimeout(() => {
          window.close();
        }, 3000);
      }
    };

    // Process the callback
    processCallback();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return '🔄';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '🔄';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return '#ffc107';
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      margin: 0,
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '3rem',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem',
          animation: status === 'processing' ? 'spin 2s linear infinite' : 'none'
        }}>
          {getStatusIcon()}
        </div>

        <h2 style={{
          color: getStatusColor(),
          marginBottom: '1rem',
          fontSize: '1.5rem',
          fontWeight: '600'
        }}>
          {status === 'processing' && 'Processing Authentication'}
          {status === 'success' && 'Authentication Successful'}
          {status === 'error' && 'Authentication Failed'}
        </h2>

        <p style={{
          color: '#6c757d',
          fontSize: '1rem',
          lineHeight: '1.5',
          marginBottom: '2rem'
        }}>
          {message}
        </p>

        {status === 'processing' && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#ffc107'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #ffc107',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span>Please wait...</span>
          </div>
        )}

        {status === 'success' && (
          <p style={{
            color: '#28a745',
            fontSize: '0.9rem',
            fontStyle: 'italic'
          }}>
            This window will close automatically.
          </p>
        )}

        {status === 'error' && (
          <div>
            <button
              onClick={() => window.close()}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#c82333'}
              onMouseOut={(e) => e.currentTarget.style.background = '#dc3545'}
            >
              Close Window
            </button>
            <p style={{
              color: '#6c757d',
              fontSize: '0.8rem',
              marginTop: '1rem',
              fontStyle: 'italic'
            }}>
              Window will auto-close in a few seconds.
            </p>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SSOCallback;