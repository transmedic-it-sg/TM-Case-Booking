const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk2MTMyOCwiZXhwIjoyMDY3NTM3MzI4fQ.cUNZC4bvC1Doi4DGhrPpBxoSebz1ad54tLMeYVKq7I4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDatabase() {
  console.log('🔧 Fixing database schema and data...\n');
  
  try {
    // 1. Get admin user ID
    console.log('👤 Getting admin user ID...');
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', 'Admin');
    
    if (adminError) {
      console.error('❌ Error getting admin user:', adminError);
      return;
    }
    
    if (adminUsers.length === 0) {
      console.error('❌ Admin user not found');
      return;
    }
    
    const adminUserId = adminUsers[0].id;
    console.log(`✅ Admin user ID: ${adminUserId}`);
    
    // 2. Fix permissions table (clear and repopulate)
    console.log('\n🔐 Fixing permissions...');
    
    // Clear existing permissions
    await supabase.from('permissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
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
      
      // Operations Manager permissions
      { role_id: 'operations-manager', action_id: 'view-cases', allowed: true },
      { role_id: 'operations-manager', action_id: 'process-order', allowed: true },
      { role_id: 'operations-manager', action_id: 'pending-delivery-hospital', allowed: true },
      
      // Sales Role permissions
      { role_id: 'sales', action_id: 'view-cases', allowed: true },
      { role_id: 'sales', action_id: 'case-completed', allowed: true },
      { role_id: 'sales', action_id: 'pending-delivery-office', allowed: true },
      { role_id: 'sales', action_id: 'delivered-office', allowed: true },
      
      // Driver Role permissions
      { role_id: 'driver', action_id: 'view-cases', allowed: true },
      { role_id: 'driver', action_id: 'delivered-hospital', allowed: true },
    ];
    
    const { error: permError } = await supabase
      .from('permissions')
      .insert(defaultPermissions);
    
    if (permError) {
      console.error('❌ Error creating permissions:', permError);
    } else {
      console.log('✅ Default permissions created successfully');
    }
    
    // 3. Test case creation with proper UUID
    console.log('\n📋 Testing case creation with UUID...');
    
    const testCase = {
      case_reference_number: 'TMC-SG-2024-001',
      hospital: 'Singapore General Hospital',
      department: 'Orthopedics',
      date_of_surgery: '2024-01-15',
      procedure_type: 'Knee',
      procedure_name: 'Total Knee Replacement',
      doctor_name: 'Dr. Test',
      surgery_set_selection: ['Knee Surgery Set A'],
      implant_box: ['Knee Implant Box 1'],
      status: 'Case Booked',
      submitted_by: adminUserId, // Use UUID instead of string
      country: 'SG'
    };
    
    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert([testCase])
      .select();
    
    if (caseError) {
      console.error('❌ Error creating test case:', caseError);
    } else {
      console.log('✅ Test case created successfully');
      
      // Create status history for the test case
      const { error: historyError } = await supabase
        .from('case_status_history')
        .insert([{
          case_id: newCase[0].id,
          status: 'Case Booked',
          changed_by: adminUserId, // Use UUID instead of string
          details: 'Test case created'
        }]);
      
      if (historyError) {
        console.error('❌ Error creating status history:', historyError);
      } else {
        console.log('✅ Test case status history created');
      }
    }
    
    // 4. Check if case_counters table exists and initialize it
    console.log('\n🔢 Setting up case counters...');
    
    const { data: counters, error: counterError } = await supabase
      .from('case_counters')
      .select('*');
    
    if (counterError) {
      console.error('❌ case_counters table issue:', counterError);
    } else {
      console.log(`✅ case_counters table accessible (${counters.length} records)`);
      
      // Initialize counters if empty
      if (counters.length === 0) {
        const currentYear = new Date().getFullYear();
        const countries = ['SG', 'MY', 'PH', 'ID', 'VN', 'HK', 'TH'];
        
        const counterData = countries.map(country => ({
          country,
          current_counter: 0,
          year: currentYear
        }));
        
        const { error: insertCounterError } = await supabase
          .from('case_counters')
          .insert(counterData);
        
        if (insertCounterError) {
          console.error('❌ Error initializing counters:', insertCounterError);
        } else {
          console.log('✅ Case counters initialized');
        }
      }
    }
    
    console.log('\n🎉 Database fix complete!');
    console.log('\n📊 Current database state:');
    
    // Show final counts
    const tables = ['users', 'cases', 'permissions', 'categorized_sets', 'case_status_history'];
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`   ${table}: ${count} records`);
      } else {
        console.log(`   ${table}: Error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Database fix failed:', error);
  }
}

fixDatabase();