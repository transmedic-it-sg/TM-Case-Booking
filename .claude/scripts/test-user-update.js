#!/usr/bin/env node

/**
 * Test User Update to Debug PATCH 400 Errors
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPasswordReset() {
  const userId = '58ed0cd2-5fcc-4d02-97bd-93777d9863d4'; // Sophia Tay
  
  console.log('🧪 Testing password reset for Sophia Tay...');
  
  try {
    // Generate a secure temporary password
    const tempPassword = 'TempPass123!';
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    
    console.log('✅ Generated temp password hash');
    
    // Try the exact update that's failing
    const { data, error } = await supabase
      .from('profiles')
      .update({
        password_hash: hashedPassword,
        is_temporary_password: true,
        password_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('❌ Update failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Update successful:', data);
      console.log('🔐 Temp password for testing:', tempPassword);
    }
    
  } catch (error) {
    console.error('💥 Exception:', error.message);
  }
}

testPasswordReset();