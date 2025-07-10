// Simple test to check Supabase connection
const { createClient } = require('@supabase/supabase-js');

// Read environment variables (you'll need to provide these)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('cases').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error connecting to cases table:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('🔧 The "cases" table does not exist. Schema needs to be created.');
      }
    } else {
      console.log('✅ Successfully connected to cases table');
      console.log('📊 Cases count:', data);
    }
    
    // Test permissions table
    const { data: permData, error: permError } = await supabase.from('permissions').select('count', { count: 'exact', head: true });
    
    if (permError) {
      console.error('❌ Error connecting to permissions table:', permError.message);
      if (permError.message.includes('does not exist')) {
        console.log('🔧 The "permissions" table does not exist. Schema needs to be created.');
      }
    } else {
      console.log('✅ Successfully connected to permissions table');
      console.log('📊 Permissions count:', permData);
    }
    
    // Test users table
    const { data: userData, error: userError } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (userError) {
      console.error('❌ Error connecting to users table:', userError.message);
      if (userError.message.includes('does not exist')) {
        console.log('🔧 The "users" table does not exist. Schema needs to be created.');
      }
    } else {
      console.log('✅ Successfully connected to users table');
      console.log('📊 Users count:', userData);
    }
    
  } catch (error) {
    console.error('💥 Connection test failed:', error);
  }
}

testConnection();