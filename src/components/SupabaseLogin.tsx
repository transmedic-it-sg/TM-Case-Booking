import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { getCountries, initializeCodeTables } from '../utils/codeTable';
import { auditLogin } from '../utils/auditService';
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

  // Initialize code tables and load countries
  useEffect(() => {
    initializeCodeTables();
    const countries = getCountries();
    setAvailableCountries(countries);

    
    // Load remembered credentials
    const savedCredentials = localStorage.getItem('rememberMe');
    if (savedCredentials) {
      try {
        const { username: savedUsername, password: savedPassword, country: savedCountry } = JSON.parse(savedCredentials);
        setUsername(savedUsername || '');
        setPassword(savedPassword || '');
        setCountry(savedCountry || '');
        setRememberMe(true);
      } catch (error) {
        console.warn('Failed to load saved credentials:', error);
        localStorage.removeItem('rememberMe');
      }
    }
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
      // Query Supabase profiles table for username authentication
      // Note: In the seed data, passwords are hashed placeholders - for demo, we'll use simple comparison
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError || !profile) {
        throw new Error('Invalid username or password');
      }

      // For demo purposes, accept simple passwords (Admin, ops_manager, sales_user)
      // In production, you would verify against password_hash
      const validPasswords = ['Admin', 'ops_manager', 'sales_user'];
      if (!validPasswords.includes(password)) {
        throw new Error('Invalid username or password');
      }

      // Check if user is enabled
      if (!profile.enabled) {
        throw new Error('Account is disabled. Please contact administrator.');
      }

      // Check if user has access to selected country
      if (!profile.countries.includes(country)) {
        throw new Error(`You don't have access to ${country}. Available countries: ${profile.countries.join(', ')}`);
      }

      // Create user object
      const user: User = {
        id: profile.id,
        username: profile.username,
        password: '', // Don't store password in memory
        role: profile.role,
        name: profile.name,
        departments: profile.departments || [],
        countries: profile.countries || [],
        selectedCountry: country,
        enabled: profile.enabled
      };

      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberMe', JSON.stringify({
          username,
          password,
          country
        }));
      } else {
        localStorage.removeItem('rememberMe');
      }

      // Store user session
      localStorage.setItem('case-booking-session', JSON.stringify(user));

      // Add audit log for successful login
      await auditLogin(user.name, user.id, user.role, user.selectedCountry);

      onLogin(user);
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