#!/usr/bin/env node

/**
 * Fix Admin User Password
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAdminPassword() {
  console.log('🔧 Fixing Admin user password...');
  
  try {
    // Generate proper bcrypt hash for Admin123
    const password = 'Admin123';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    console.log('✅ Generated bcrypt hash for Admin123');
    
    // Update the Admin user
    const { data, error } = await supabase
      .from('profiles')
      .update({
        password_hash: hashedPassword,
        is_temporary_password: false,
        updated_at: new Date().toISOString()
      })
      .eq('username', 'Admin')
      .select();

    if (error) {
      console.error('❌ Failed to update Admin password:', error);
    } else {
      console.log('✅ Successfully updated Admin password');
      console.log('🔐 Admin can now login with: Admin / Admin123');
    }
    
  } catch (error) {
    console.error('💥 Exception:', error.message);
  }
}

fixAdminPassword();