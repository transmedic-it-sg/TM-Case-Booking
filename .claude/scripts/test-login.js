#!/usr/bin/env node

/**
 * Test Login Functionality
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log('🔐 Testing Login Functionality...\n');
  
  const testCredentials = [
    { username: 'anrong.low', password: 'Tmsg@123' },
    { username: 'Admin', password: 'Admin123' }, // Corrected username
    { username: 'Sophia Tay', password: 'TempPass123!' } // From password reset test
  ];

  for (const { username, password } of testCredentials) {
    console.log(`🧪 Testing login for: ${username}`);
    
    try {
      // Get user from database
      const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', username)
        .single();

      if (error || !user) {
        console.log(`❌ User not found: ${username}`);
        continue;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (isPasswordValid) {
        console.log(`✅ Login successful for ${username}`);
        console.log(`   - Role: ${user.role}`);
        console.log(`   - Enabled: ${user.enabled}`);
        console.log(`   - Temporary Password: ${user.is_temporary_password || false}`);
        console.log(`   - Email: ${user.email || 'Not set'}`);
      } else {
        console.log(`❌ Invalid password for ${username}`);
      }
      
    } catch (error) {
      console.error(`💥 Exception testing ${username}:`, error.message);
    }
    
    console.log('');
  }

  console.log('🎉 Login Tests Complete!');
}

testLogin();