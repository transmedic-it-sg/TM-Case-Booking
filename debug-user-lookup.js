// Debug script to test user lookup function
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://yjnptjdlqbcglhwcpgoz.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqbnB0amRscWJjZ2xod2NwZ296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc2ODk5NzIsImV4cCI6MjA0MzI2NTk3Mn0.uJkBhBK3pI9VCrmJhLEFuGHgU61KhJW12K3YkGWyJXQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserLookup() {
  console.log('Testing user lookup for email: anrong.low@transmedicgroup.com');
  
  // Test direct database query
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('email, name')
    .eq('email', 'anrong.low@transmedicgroup.com');
    
  if (error) {
    console.error('Database error:', error);
  } else {
    console.log('Direct database query result:', profiles);
  }
  
  // Test the lookup logic from userLookup.ts
  const emails = ['anrong.low@transmedicgroup.com'];
  const { data: profilesByEmail } = await supabase
    .from('profiles')
    .select('email, name')
    .in('email', emails);
    
  if (profilesByEmail) {
    console.log('Lookup function result:', profilesByEmail);
    const result = {};
    profilesByEmail.forEach(profile => {
      result[profile.email] = profile.name;
    });
    console.log('Final lookup result:', result);
  }
}

testUserLookup();