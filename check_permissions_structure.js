const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk2MTMyOCwiZXhwIjoyMDY3NTM3MzI4fQ.cUNZC4bvC1Doi4DGhrPpBxoSebz1ad54tLMeYVKq7I4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPermissionsStructure() {
  console.log('🔍 Checking permissions table structure...\n');
  
  try {
    // Try different approaches to access the permissions table
    console.log('Method 1: Direct select with count');
    const { data: data1, error: error1 } = await supabase
      .from('permissions')
      .select('*', { count: 'exact', head: true });
    
    console.log('Result 1:', { data: data1, error: error1 });
    
    console.log('\nMethod 2: Direct select without count');
    const { data: data2, error: error2 } = await supabase
      .from('permissions')
      .select('*');
    
    console.log('Result 2:', { data: data2, error: error2 });
    
    console.log('\nMethod 3: Try to describe table columns');
    const { data: data3, error: error3 } = await supabase
      .from('permissions')
      .select('*')
      .limit(0);
    
    console.log('Result 3:', { data: data3, error: error3 });
    
    // If the table exists but is empty, let's try to insert
    if (data2 && Array.isArray(data2) && data2.length === 0) {
      console.log('\n🔧 Table exists but is empty, trying to insert...');
      
      const testPermission = {
        role_id: 'it',
        action_id: 'create-case',
        allowed: true
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('permissions')
        .insert([testPermission])
        .select();
      
      console.log('Insert result:', { data: insertData, error: insertError });
      
      if (insertError) {
        console.log('❌ Insert failed, checking what columns exist...');
        
        // Try different column names
        const possibleStructures = [
          { role_id: 'it', action_id: 'create-case', allowed: true },
          { role: 'it', action: 'create-case', allowed: true },
          { role_name: 'it', action_name: 'create-case', allowed: true },
          { user_role: 'it', permission_action: 'create-case', is_allowed: true }
        ];
        
        for (let i = 0; i < possibleStructures.length; i++) {
          console.log(`\nTrying structure ${i + 1}:`, possibleStructures[i]);
          
          const { data: testData, error: testError } = await supabase
            .from('permissions')
            .insert([possibleStructures[i]])
            .select();
          
          if (!testError) {
            console.log(`✅ Structure ${i + 1} worked!`);
            console.log('Inserted data:', testData);
            break;
          } else {
            console.log(`❌ Structure ${i + 1} failed:`, testError.message);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Check failed:', error);
  }
}

checkPermissionsStructure();