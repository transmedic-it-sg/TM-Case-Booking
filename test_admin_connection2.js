const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk2MTMyOCwiZXhwIjoyMDY3NTM3MzI4fQ.cUNZC4bvC1Doi4DGhrPpBxoSebz1ad54tLMeYVKq7I4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('🔍 Testing Supabase connection...\n');
  
  // Test each critical table directly
  const criticalTables = ['users', 'cases', 'permissions', 'categorized_sets', 'case_status_history'];
  
  for (const tableName of criticalTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
        if (error.message.includes('does not exist')) {
          console.log(`   🔧 Need to create ${tableName} table`);
        }
      } else {
        console.log(`✅ ${tableName}: Table exists (${data?.length || 0} rows)`);
      }
    } catch (err) {
      console.log(`❌ ${tableName}: ${err.message}`);
    }
  }
  
  // Check if we can create tables
  console.log('\n🔧 Testing table creation permissions...');
  try {
    // Try to create a simple test table
    const { error } = await supabase.rpc('sql', {
      query: 'CREATE TABLE IF NOT EXISTS test_table (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT);'
    });
    
    if (error) {
      console.log(`❌ Table creation test failed: ${error.message}`);
    } else {
      console.log('✅ Table creation permissions confirmed');
      
      // Clean up test table
      await supabase.rpc('sql', {
        query: 'DROP TABLE IF EXISTS test_table;'
      });
    }
  } catch (err) {
    console.log(`❌ Table creation test failed: ${err.message}`);
  }
  
  console.log('\n📊 Connection test complete!');
}

checkDatabase();