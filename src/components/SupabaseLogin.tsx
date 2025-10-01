import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { SUPPORTED_COUNTRIES } from '../utils/countryUtils';
import { auditLogin } from '../utils/auditService';
import { authenticate } from '../utils/auth';
import SearchableDropdown from './SearchableDropdown';

interface SupabaseLoginProps {
  onLogin: (user: User) => void;
}

const SupabaseLogin: React.FC<SupabaseLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const countrySelectRef = useRef<HTMLSelectElement>(null);

  // Load countries on component mount
  useEffect(() => {
    setAvailableCountries([...SUPPORTED_COUNTRIES]);

    // Remember me handled by Supabase auth session persistence
    // No need to manually store credentials in localStorage
  }, []);

  // Set custom validation message for country select
  useEffect(() => {
    if (countrySelectRef.current) {
      countrySelectRef.current.setCustomValidity(
        country ? '' : 'Please select a country.'
      );
    }
  }, [country]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Check if country is not selected first
    if (!country) {
      setError('Please select a country');
      setIsLoading(false);
      return;
    }

    // Check for missing username field
    if (!username) {
      setError('Please enter your username');
      setIsLoading(false);
      return;
    }

    // Check for missing password field
    if (!password) {
      setError('Please enter your password');
      setIsLoading(false);
      return;
    }

    try {
      // Use the authentication service which handles Supabase and localStorage fallbacks
      const result = await authenticate(username, password, country);

      if (result.user) {
        // Remember me handled by Supabase auth session persistence
        // Supabase automatically manages session based on rememberMe flag

        // Audit the login
        try {
          await auditLogin(result.user.name, result.user.id, result.user.role, result.user.selectedCountry);
        } catch (auditError) {
          console.warn('Failed to audit login:', auditError);
          // Continue with login even if audit fails
        }

        onLogin(result.user);
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="modern-login-container">
      <div className="login-split-screen">
        {/* Left Side - Branding */}
        <div className="login-left">
          <div className="login-branding">
            <div className="brand-logo">
              <img
                src="https://www.transmedicgroup.com/wp-content/themes/transmedic/transmedic_assets/images/logo/logo-v5-transmedic-header-small.svg"
                alt="Transmedic Logo"
                className="logo-image"
              />
            </div>
            <h2 className="brand-subtitle">Case Booking System</h2>
            <p className="brand-description">
              Streamline your medical case management with our comprehensive booking platform
            </p>
            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon">📋</span>
                <span>Easy Case Management</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <span>Real-time Updates</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <span>Secure & Reliable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-right">
          <div className="login-form-container">
            <div className="form-header">
              <h3 className="welcome-title">Welcome Back</h3>
              <p className="welcome-subtitle">Please sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="modern-login-form">
              <div className="floating-input-group">
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={username ? 'has-value' : ''}
                  disabled={isLoading}
                  autoComplete="username"
                />
                <label htmlFor="username">Username</label>
                <div className="input-underline"></div>
              </div>

              <div className="floating-input-group password-input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={password ? 'has-value' : ''}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
                <div className="input-underline"></div>
              </div>

              <div className="remember-me-group">
                <label className="remember-me-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span className="checkmark"></span>
                  <span className="remember-me-text">Remember me</span>
                </label>
              </div>

              <div className="dropdown-input-group">
                <label htmlFor="country" className="dropdown-label required">Country</label>
                <SearchableDropdown
                  id="country"
                  options={availableCountries.map(countryOption => ({
                    value: countryOption,
                    label: countryOption
                  }))}
                  value={country}
                  onChange={(value) => setCountry(value)}
                  placeholder="Select Country"
                  disabled={isLoading}
                  className="login-dropdown"
                />
              </div>

              {error && (
                <div className="modern-error-message">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className={`btn btn-primary btn-lg full-width-button ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="button-spinner"></div>
                    <span>Signing In...</span>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseLogin;