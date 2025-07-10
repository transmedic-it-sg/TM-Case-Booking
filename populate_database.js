const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk2MTMyOCwiZXhwIjoyMDY3NTM3MzI4fQ.cUNZC4bvC1Doi4DGhrPpBxoSebz1ad54tLMeYVKq7I4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function populateDatabase() {
  console.log('🔧 Populating database with essential data...\n');
  
  try {
    // 1. Check and create admin user
    console.log('👤 Setting up admin user...');
    const { data: existingUsers, error: userCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'Admin');
    
    if (userCheckError) {
      console.error('❌ Error checking users:', userCheckError);
    } else if (existingUsers.length === 0) {
      const { data: newUser, error: userCreateError } = await supabase
        .from('users')
        .insert([{
          username: 'Admin',
          password: 'Admin',
          role: 'admin',
          name: 'Administrator',
          departments: [],
          countries: ['Singapore', 'Malaysia', 'Philippines', 'Indonesia', 'Vietnam', 'Hong Kong', 'Thailand'],
          enabled: true
        }])
        .select();
      
      if (userCreateError) {
        console.error('❌ Error creating admin user:', userCreateError);
      } else {
        console.log('✅ Admin user created successfully');
      }
    } else {
      console.log('✅ Admin user already exists');
    }
    
    // 2. Set up default permissions
    console.log('\n🔐 Setting up default permissions...');
    
    // Define default permissions
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
      
      // Admin has all permissions (handled in code)
    ];
    
    // Clear existing permissions first
    await supabase.from('permissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Insert default permissions
    const { error: permError } = await supabase
      .from('permissions')
      .insert(defaultPermissions);
    
    if (permError) {
      console.error('❌ Error creating permissions:', permError);
    } else {
      console.log('✅ Default permissions created successfully');
    }
    
    // 3. Set up sample categorized sets
    console.log('\n🛠️ Setting up sample categorized sets...');
    
    const sampleCategorizedSets = [
      {
        country: 'SG',
        procedure_type: 'Knee',
        surgery_sets: ['Knee Surgery Set A', 'Knee Surgery Set B', 'Basic Knee Tools'],
        implant_boxes: ['Knee Implant Box 1', 'Knee Implant Box 2', 'Knee Revision Kit']
      },
      {
        country: 'SG',
        procedure_type: 'Hip',
        surgery_sets: ['Hip Surgery Set A', 'Hip Surgery Set B', 'Hip Revision Tools'],
        implant_boxes: ['Hip Implant Box 1', 'Hip Implant Box 2', 'Hip Ceramic Kit']
      },
      {
        country: 'SG',
        procedure_type: 'Spine',
        surgery_sets: ['Spine Surgery Set A', 'Spine Surgery Set B', 'Spinal Fusion Tools'],
        implant_boxes: ['Spine Implant Box 1', 'Spine Implant Box 2', 'Cervical Spine Kit']
      }
    ];
    
    // Clear existing categorized sets
    await supabase.from('categorized_sets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    const { error: setsError } = await supabase
      .from('categorized_sets')
      .insert(sampleCategorizedSets);
    
    if (setsError) {
      console.error('❌ Error creating categorized sets:', setsError);
    } else {
      console.log('✅ Sample categorized sets created successfully');
    }
    
    // 4. Test case creation
    console.log('\n📋 Testing case creation...');
    
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
      submitted_by: 'Admin',
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
          changed_by: 'Admin',
          details: 'Test case created'
        }]);
      
      if (historyError) {
        console.error('❌ Error creating status history:', historyError);
      } else {
        console.log('✅ Test case status history created');
      }
    }
    
    console.log('\n🎉 Database setup complete!');
    console.log('\n📊 Current database state:');
    
    // Show final counts
    const tables = ['users', 'cases', 'permissions', 'categorized_sets'];
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`   ${table}: ${count} records`);
      }
    }
    
  } catch (error) {
    console.error('💥 Database setup failed:', error);
  }
}

populateDatabase();