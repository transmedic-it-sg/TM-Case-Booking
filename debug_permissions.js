const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk2MTMyOCwiZXhwIjoyMDY3NTM3MzI4fQ.cUNZC4bvC1Doi4DGhrPpBxoSebz1ad54tLMeYVKq7I4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugPermissions() {
  console.log('🔍 Debugging permissions table...\n');
  
  try {
    // Try to select from permissions table
    const { data: permData, error: permError } = await supabase
      .from('permissions')
      .select('*');
    
    if (permError) {
      console.error('❌ Error selecting from permissions:', permError);
    } else {
      console.log('✅ Permissions table accessible');
      console.log('📊 Current permissions count:', permData.length);
      if (permData.length > 0) {
        console.log('📋 Sample permissions:');
        permData.slice(0, 5).forEach(perm => {
          console.log(`   ${perm.role_id} -> ${perm.action_id}: ${perm.allowed}`);
        });
      }
    }
    
    // Try to insert a single permission
    console.log('\n🔧 Testing single permission insert...');
    
    const testPermission = {
      role_id: 'it',
      action_id: 'create-case',
      allowed: true
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('permissions')
      .insert([testPermission])
      .select();
    
    if (insertError) {
      console.error('❌ Error inserting permission:', insertError);
    } else {
      console.log('✅ Test permission inserted successfully');
      console.log('📋 Inserted permission:', insertData[0]);
    }
    
    // Check what permissions exist now
    const { data: allPerms, error: allPermsError } = await supabase
      .from('permissions')
      .select('*');
    
    if (!allPermsError) {
      console.log(`\n📊 Total permissions after test: ${allPerms.length}`);
    }
    
    // Try to insert multiple permissions in batch
    console.log('\n🔧 Testing batch permission insert...');
    
    const batchPermissions = [
      { role_id: 'it', action_id: 'view-cases', allowed: true },
      { role_id: 'it', action_id: 'edit-sets', allowed: true },
      { role_id: 'operations', action_id: 'view-cases', allowed: true },
      { role_id: 'operations', action_id: 'process-order', allowed: true },
      { role_id: 'sales', action_id: 'view-cases', allowed: true },
      { role_id: 'sales', action_id: 'case-completed', allowed: true },
      { role_id: 'driver', action_id: 'view-cases', allowed: true },
      { role_id: 'driver', action_id: 'delivered-hospital', allowed: true }
    ];
    
    const { data: batchData, error: batchError } = await supabase
      .from('permissions')
      .insert(batchPermissions)
      .select();
    
    if (batchError) {
      console.error('❌ Error inserting batch permissions:', batchError);
    } else {
      console.log('✅ Batch permissions inserted successfully');
      console.log(`📋 Inserted ${batchData.length} permissions`);
    }
    
    // Final count
    const { data: finalPerms, error: finalPermsError } = await supabase
      .from('permissions')
      .select('*');
    
    if (!finalPermsError) {
      console.log(`\n🎉 Final permissions count: ${finalPerms.length}`);
    }
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

debugPermissions();