#!/usr/bin/env node

/**
 * Debug Case Quantities Issue
 * Investigate why quantities are not showing in case cards
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugQuantities() {
  console.log('🔍 DEBUGGING CASE QUANTITIES ISSUE');
  console.log('==================================\n');

  try {
    // 1. Check if case_booking_quantities table exists and has data
    console.log('1. 📊 CHECKING case_booking_quantities TABLE:');
    const { data: quantities, error: qtyError } = await supabase
      .from('case_booking_quantities')
      .select('*')
      .limit(10);

    if (qtyError) {
      console.error('❌ Error accessing case_booking_quantities:', qtyError.message);
      
      // Check if table exists by checking other tables
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .like('table_name', '%quantities%');
      
      if (!tablesError && tables) {
        console.log('📋 Available quantity-related tables:', tables.map(t => t.table_name));
      }
    } else {
      console.log(`✅ Found ${quantities?.length || 0} quantity records`);
      if (quantities && quantities.length > 0) {
        console.log('📋 Sample quantity records:');
        quantities.slice(0, 3).forEach(qty => {
          console.log(`   - Case ID: ${qty.case_booking_id}, Item: ${qty.item_name}, Qty: ${qty.quantity}`);
        });
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 2. Check case_bookings table structure and sample data
    console.log('2. 📋 CHECKING case_bookings TABLE:');
    const { data: cases, error: casesError } = await supabase
      .from('case_bookings')
      .select('id, case_reference_number, surgery_set_selection, implant_box')
      .limit(5);

    if (casesError) {
      console.error('❌ Error accessing case_bookings:', casesError.message);
    } else {
      console.log(`✅ Found ${cases?.length || 0} case records`);
      if (cases && cases.length > 0) {
        console.log('📋 Sample case records:');
        cases.forEach(caseItem => {
          console.log(`   - Case: ${caseItem.case_reference_number}`);
          console.log(`     Surgery Sets: ${JSON.stringify(caseItem.surgery_set_selection)}`);
          console.log(`     Implant Boxes: ${JSON.stringify(caseItem.implant_box)}`);
        });
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Check if quantities are stored in case_bookings table instead
    console.log('3. 🔍 CHECKING FOR QUANTITIES IN CASE_BOOKINGS:');
    
    if (cases && cases.length > 0) {
      const firstCase = cases[0];
      console.log(`📝 Analyzing case: ${firstCase.case_reference_number}`);
      
      // Check all columns that might contain quantity data
      const { data: fullCase, error: fullError } = await supabase
        .from('case_bookings')
        .select('*')
        .eq('id', firstCase.id)
        .single();

      if (!fullError && fullCase) {
        const columns = Object.keys(fullCase);
        const quantityColumns = columns.filter(col => 
          col.toLowerCase().includes('quantity') || 
          col.toLowerCase().includes('qty')
        );
        
        console.log('📊 Quantity-related columns found:', quantityColumns);
        
        // Check if surgery sets or implant boxes contain quantity info
        if (fullCase.surgery_set_selection) {
          console.log('🔧 Surgery set selection structure:', typeof fullCase.surgery_set_selection, fullCase.surgery_set_selection);
        }
        
        if (fullCase.implant_box) {
          console.log('🔧 Implant box structure:', typeof fullCase.implant_box, fullCase.implant_box);
        }
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 4. Test the exact query used in CaseCard component
    console.log('4. 🧪 TESTING CASECARD QUERY LOGIC:');
    
    if (cases && cases.length > 0) {
      const testCase = cases[0];
      console.log(`🎯 Testing with case ID: ${testCase.id}`);
      
      const { data: testQuantities, error: testError } = await supabase
        .from('case_booking_quantities')
        .select('item_name, quantity')
        .eq('case_booking_id', testCase.id);

      if (testError) {
        console.log('❌ Query failed:', testError.message);
      } else {
        console.log(`✅ Query succeeded, found ${testQuantities?.length || 0} quantity records`);
        if (testQuantities && testQuantities.length > 0) {
          testQuantities.forEach(qty => {
            console.log(`   ✓ ${qty.item_name}: ${qty.quantity}`);
          });
        } else {
          console.log('⚠️  No quantities found for this case');
        }
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 5. Check schema to see correct table structure
    console.log('5. 📋 CHECKING DATABASE SCHEMA:');
    
    const { data: schema, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type')
      .in('table_name', ['case_bookings', 'case_booking_quantities'])
      .order('table_name')
      .order('ordinal_position');

    if (!schemaError && schema) {
      const tables = {};
      schema.forEach(col => {
        if (!tables[col.table_name]) tables[col.table_name] = [];
        tables[col.table_name].push(`${col.column_name} (${col.data_type})`);
      });
      
      Object.entries(tables).forEach(([tableName, columns]) => {
        console.log(`📊 ${tableName}:`);
        columns.forEach(col => console.log(`   - ${col}`));
      });
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 6. Provide diagnosis and recommendations
    console.log('6. 🎯 DIAGNOSIS & RECOMMENDATIONS:');
    
    if (qtyError) {
      console.log('❌ ISSUE FOUND: case_booking_quantities table is not accessible');
      console.log('💡 POSSIBLE CAUSES:');
      console.log('   1. Table does not exist');
      console.log('   2. RLS (Row Level Security) is blocking access');
      console.log('   3. Table name is different');
      console.log('   4. Quantities are stored in a different structure');
      
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('   1. Check if quantities are stored in case_bookings table directly');
      console.log('   2. Create case_booking_quantities table if missing');
      console.log('   3. Update RLS policies to allow read access');
      console.log('   4. Modify CaseCard component to use correct data structure');
    } else if (quantities?.length === 0) {
      console.log('⚠️  ISSUE FOUND: case_booking_quantities table exists but has no data');
      console.log('💡 POSSIBLE CAUSES:');
      console.log('   1. Quantities are not being saved when cases are created');
      console.log('   2. Data is being saved to a different table');
      console.log('   3. Case creation process is not saving quantities');
      
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('   1. Check case creation process in CaseBookingForm');
      console.log('   2. Verify quantity saving logic');
      console.log('   3. Check if quantities are embedded in case_bookings JSON fields');
    } else {
      console.log('✅ case_booking_quantities table exists and has data');
      console.log('💡 ISSUE MAY BE:');
      console.log('   1. Frontend component not rendering quantities correctly');
      console.log('   2. Case ID mismatch between tables');
      console.log('   3. React state not updating properly');
      
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('   1. Add debug logging to CaseCard component');
      console.log('   2. Verify case ID matching');
      console.log('   3. Check React useEffect dependencies');
    }

  } catch (error) {
    console.error('💥 DEBUGGING FAILED:', error);
  }
}

debugQuantities();