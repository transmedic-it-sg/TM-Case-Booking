const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk2MTMyOCwiZXhwIjoyMDY3NTM3MzI4fQ.cUNZC4bvC1Doi4DGhrPpBxoSebz1ad54tLMeYVKq7I4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('🔍 Checking Supabase database state...\n');
  
  try {
    // List all tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('❌ Error fetching tables:', tablesError);
      return;
    }
    
    console.log('📋 Current tables in database:');
    if (tables.length === 0) {
      console.log('   No tables found - database is empty');
    } else {
      tables.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    }
    
    console.log('\n🔬 Testing critical tables...\n');
    
    // Test each critical table
    const criticalTables = ['users', 'cases', 'permissions', 'categorized_sets', 'case_status_history'];
    
    for (const tableName of criticalTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: Table exists (${data?.length || 0} rows)`);
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`);
      }
    }
    
    // Test permissions table specifically
    console.log('\n🔐 Testing permissions table...');
    try {
      const { data: permData, error: permError } = await supabase
        .from('permissions')
        .select('*');
      
      if (permError) {
        console.log(`❌ permissions: ${permError.message}`);
      } else {
        console.log(`✅ permissions: ${permData?.length || 0} permission records found`);
        if (permData && permData.length > 0) {
          console.log('   Sample permissions:');
          permData.slice(0, 3).forEach(perm => {
            console.log(`   - ${perm.role_id} -> ${perm.action_id}: ${perm.allowed}`);
          });
        }
      }
    } catch (err) {
      console.log(`❌ permissions: ${err.message}`);
    }
    
  } catch (error) {
    console.error('💥 Database check failed:', error);
  }
}

checkDatabase();