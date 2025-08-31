import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { authenticate } from '../utils/auth'; // Fallback to localStorage
import { User } from '../types';

interface HybridLoginProps {
  onLogin: (user: User) => void;
}

const HybridLogin: React.FC<HybridLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSupabase, setUseSupabase] = useState(false);

  // Check if Supabase is configured
  useEffect(() => {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey && supabaseUrl !== 'your-supabase-project-url') {
      setUseSupabase(true);
      console.log('✅ Supabase configuration detected - using cloud authentication');
    } else {
      console.log('📦 Using localStorage authentication (development mode)');
    }
  }, []);

  const handleSupabaseLogin = async () => {
    try {
      // For demo purposes, create a test user if it doesn't exist
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // If sign in fails, try to sign up (for first time setup)
        if (signInError.message.includes('Invalid login credentials')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
          });

          if (signUpError) throw signUpError;

          if (signUpData.user) {
            // Create profile for new user
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: signUpData.user.id,
                username: email.split('@')[0],
                name: 'Admin User',
                role: 'admin',
                departments: [],
                countries: [], // Will be populated from database
                enabled: true
              });

            if (profileError) {
              console.error('Profile creation error:', profileError);
              // Continue anyway, profile might be created by trigger
            }

            setError('Account created! Please check your email for verification, then try logging in again.');
            return;
          }
        } else {
          throw signInError;
        }
      }

      if (signInData.user) {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', signInData.user.id)
          .single();

        if (profileError || !profile) {
          throw new Error('Profile not found. Please contact administrator.');
        }

        const user: User = {
          id: profile.id,
          username: profile.username,
          password: '',
          role: profile.role,
          name: profile.name,
          departments: profile.departments || [],
          countries: profile.countries || [],
          selectedCountry: profile.countries[0] || 'Singapore',
          enabled: profile.enabled
        };

        onLogin(user);
      }
    } catch (error: any) {
      console.error('Supabase login error:', error);
      setError(error.message || 'Login failed');
    }
  };

  const handleLocalStorageLogin = async () => {
    // Use existing localStorage authentication as fallback
    const result = await authenticate(email.split('@')[0] || email, password, 'Singapore');
    if (result.user) {
      onLogin(result.user);
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (useSupabase) {
        await handleSupabaseLogin();
      } else {
        handleLocalStorageLogin();
      }
    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: 'linear-gradient(135deg, #20b2aa 0%, #008b8b 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 10px 28px rgba(0,0,0,0.25)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ color: '#20b2aa', marginBottom: '0.5rem' }}>Case Booking System</h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            {useSupabase ? '🌐 Cloud Authentication' : '📦 Local Development'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              {useSupabase ? 'Email' : 'Username'}
            </label>
            <input
              type={useSupabase ? 'email' : 'text'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={useSupabase ? 'Enter your email' : 'Enter username (try: Admin)'}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={useSupabase ? 'Enter your password' : 'Enter password (try: Admin)'}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              background: isLoading ? '#ccc' : 'linear-gradient(135deg, #20b2aa 0%, #008b8b 100%)',
              color: 'white',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {!useSupabase && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#f0f8ff',
            borderRadius: '6px',
            fontSize: '0.85rem'
          }}>
            <p style={{ margin: '0', fontWeight: '500' }}>Demo Credentials:</p>
            <p style={{ margin: '0.5rem 0 0 0' }}>Username: <strong>Admin</strong></p>
            <p style={{ margin: '0' }}>Password: <strong>Admin</strong></p>
          </div>
        )}

        {useSupabase && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#e8f5e8',
            borderRadius: '6px',
            fontSize: '0.85rem'
          }}>
            <p style={{ margin: '0', fontWeight: '500' }}>First Time Setup:</p>
            <p style={{ margin: '0.5rem 0 0 0' }}>Enter any email/password to create an admin account</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HybridLogin;