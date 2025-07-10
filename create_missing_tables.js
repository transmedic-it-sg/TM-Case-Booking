const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk2MTMyOCwiZXhwIjoyMDY3NTM3MzI4fQ.cUNZC4bvC1Doi4DGhrPpBxoSebz1ad54tLMeYVKq7I4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMissingTables() {
  console.log('🔧 Creating missing tables and fixing column issues...\n');
  
  try {
    // First, let's check the actual structure of existing tables
    console.log('📋 Checking existing table structures...');
    
    // Check categorized_sets table structure
    const { data: setsData, error: setsError } = await supabase
      .from('categorized_sets')
      .select('*')
      .limit(1);
    
    if (setsError) {
      console.error('❌ Error checking categorized_sets:', setsError);
    } else {
      console.log('✅ categorized_sets table structure:');
      if (setsData.length > 0) {
        console.log('   Columns:', Object.keys(setsData[0]));
      }
    }
    
    // Check case_counters table structure
    const { data: countersData, error: countersError } = await supabase
      .from('case_counters')
      .select('*')
      .limit(1);
    
    if (countersError) {
      console.error('❌ Error checking case_counters:', countersError);
    } else {
      console.log('✅ case_counters table structure:');
      if (countersData.length > 0) {
        console.log('   Columns:', Object.keys(countersData[0]));
      }
    }
    
    // Now let's create the permissions table through the Supabase client
    // Since I can't use raw SQL, I'll try to create it by inserting data
    console.log('\n🔧 Creating permissions table...');
    
    // Try to insert a test permission to see if the table exists with the right structure
    const testPermission = {
      id: '00000000-0000-0000-0000-000000000000', // dummy ID
      role_id: 'it',
      action_id: 'create-case',
      allowed: true
    };
    
    const { data: permTestData, error: permTestError } = await supabase
      .from('permissions')
      .insert([testPermission])
      .select();
    
    if (permTestError) {
      console.error('❌ Permissions table structure issue:', permTestError);
      console.log('🔧 The permissions table needs to be created manually in Supabase dashboard');
      
      console.log('\n📋 Required permissions table structure:');
      console.log('CREATE TABLE permissions (');
      console.log('  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
      console.log('  role_id VARCHAR(50) NOT NULL,');
      console.log('  action_id VARCHAR(100) NOT NULL,');
      console.log('  allowed BOOLEAN NOT NULL DEFAULT false,');
      console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  UNIQUE(role_id, action_id)');
      console.log(');');
      
    } else {
      console.log('✅ Permissions table structure is correct');
      
      // Delete the test record
      await supabase
        .from('permissions')
        .delete()
        .eq('id', '00000000-0000-0000-0000-000000000000');
      
      // Now insert real permissions
      console.log('🔧 Inserting default permissions...');
      
      const defaultPermissions = [
        // IT Role permissions
        { role_id: 'it', action_id: 'create-case', allowed: true },
        { role_id: 'it', action_id: 'view-cases', allowed: true },
        { role_id: 'it', action_id: 'amend-case', allowed: true },
        { role_id: 'it', action_id: 'delete-case', allowed: true },
        { role_id: 'it', action_id: 'edit-sets', allowed: true },
        { role_id: 'it', action_id: 'booking-calendar', allowed: true },
        
        // Operations Role permissions
        { role_id: 'operations', action_id: 'view-cases', allowed: true },
        { role_id: 'operations', action_id: 'process-order', allowed: true },
        { role_id: 'operations', action_id: 'pending-delivery-hospital', allowed: true },
        
        // Sales Role permissions
        { role_id: 'sales', action_id: 'view-cases', allowed: true },
        { role_id: 'sales', action_id: 'case-completed', allowed: true },
        { role_id: 'sales', action_id: 'delivered-office', allowed: true },
        
        // Driver Role permissions
        { role_id: 'driver', action_id: 'view-cases', allowed: true },
        { role_id: 'driver', action_id: 'delivered-hospital', allowed: true },
      ];
      
      const { data: permData, error: permError } = await supabase
        .from('permissions')
        .insert(defaultPermissions)
        .select();
      
      if (permError) {
        console.error('❌ Error inserting permissions:', permError);
      } else {
        console.log(`✅ Inserted ${permData.length} default permissions`);
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

createMissingTables();