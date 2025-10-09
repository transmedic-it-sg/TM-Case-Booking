#!/usr/bin/env node

/**
 * Emergency Password Fix Script
 * Properly hash the password for anrong.low user
 */

const bcrypt = require('bcryptjs');

async function hashPassword(plainPassword) {
  const saltRounds = 12;
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

async function main() {
  const password = 'Tmsg@123';
  
  console.log('🔐 Generating secure password hash...');
  
  try {
    const hashedPassword = await hashPassword(password);
    
    console.log('✅ Password hash generated successfully');
    console.log('\n📋 SQL Update Query:');
    console.log(`UPDATE profiles SET password_hash = '${hashedPassword}' WHERE username = 'anrong.low';`);
    console.log('\n🔧 Use this SQL to update your password in Supabase');
    
    // Also test the hash works
    console.log('\n🧪 Testing hash verification...');
    const isValid = await bcrypt.compare(password, hashedPassword);
    console.log(`Verification test: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.error('❌ Failed to generate password hash:', error.message);
  }
}

main();