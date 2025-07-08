import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface SupabaseLoginProps {
  onLogin: (user: User) => void;
}

const SupabaseLogin: React.FC<SupabaseLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('Singapore');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const countries = [
    'Singapore', 'Malaysia', 'Philippines', 'Indonesia', 
    'Vietnam', 'Hong Kong', 'Thailand'
  ];

  // Load remembered credentials on component mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem('rememberMe');
    if (savedCredentials) {
      try {
        const { username: savedUsername, password: savedPassword, country: savedCountry } = JSON.parse(savedCredentials);
        setUsername(savedUsername);
        setPassword(savedPassword);
        setCountry(savedCountry);
        setRememberMe(true);
      } catch (error) {
        console.error('Error loading saved credentials:', error);
        localStorage.removeItem('rememberMe');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Query Supabase profiles table directly for username/password authentication
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('password', password) // In production, you should hash passwords
        .single();

      if (profileError || !profile) {
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
      localStorage.setItem('currentUser', JSON.stringify(user));

      onLogin(user);
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>🏥 Case Booking System</h2>
          <p>Sign in to your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="country">Country</label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            >
              {countries.map(countryOption => (
                <option key={countryOption} value={countryOption}>
                  {countryOption}
                </option>
              ))}
            </select>
          </div>

          <div className="remember-me-container">
            <label className="remember-me-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="checkmark"></span>
              Remember me
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-info">
          <p>🌐 Connected to Supabase Cloud Database</p>
          <p>Contact your administrator for account access</p>
        </div>
      </div>
    </div>
  );
};

export default SupabaseLogin;