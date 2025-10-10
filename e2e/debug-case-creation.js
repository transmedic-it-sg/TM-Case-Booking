#!/usr/bin/env node

/**
 * Debug Case Creation Error
 * Investigate why case creation shows error even though it saves successfully
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCaseCreation() {
  console.log('🔍 DEBUGGING CASE CREATION ERROR');
  console.log('=================================\n');

  try {
    // 1. Test basic case creation without additional steps
    console.log('1. 🧪 TESTING BASIC CASE CREATION:');
    
    const testCaseData = {
      case_reference_number: `TEST-${Date.now()}`,
      hospital: 'Test Hospital',
      doctor_name: 'Dr. Test',
      procedure: 'Test Procedure',
      case_date: new Date().toISOString().split('T')[0],
      country: 'Singapore',
      department: 'Orthopedics',
      status: 'pending',
      surgery_set_selection: [],
      implant_box: []
    };

    console.log('📝 Creating test case:', testCaseData.case_reference_number);
    
    const { data: caseResult, error: caseError } = await supabase
      .from('case_bookings')
      .insert([testCaseData])
      .select()
      .single();

    if (caseError) {
      console.log('❌ Case creation failed:', caseError.message);
      console.log('🔍 Error details:', caseError);
    } else {
      console.log('✅ Case created successfully:', caseResult.id);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 2. Test case creation with surgery sets and implant boxes
    console.log('2. 🧪 TESTING CASE CREATION WITH SELECTIONS:');
    
    const complexCaseData = {
      case_reference_number: `COMPLEX-${Date.now()}`,
      hospital: 'Test Hospital',
      doctor_name: 'Dr. Test',
      procedure: 'Test Procedure',
      case_date: new Date().toISOString().split('T')[0],
      country: 'Singapore',
      department: 'Orthopedics',
      status: 'pending',
      surgery_set_selection: [
        { item_id: 'set1', item_name: 'Test Surgery Set 1' },
        { item_id: 'set2', item_name: 'Test Surgery Set 2' }
      ],
      implant_box: [
        { item_id: 'box1', item_name: 'Test Implant Box 1' }
      ]
    };

    console.log('📝 Creating complex test case:', complexCaseData.case_reference_number);
    
    const { data: complexResult, error: complexError } = await supabase
      .from('case_bookings')
      .insert([complexCaseData])
      .select()
      .single();

    if (complexError) {
      console.log('❌ Complex case creation failed:', complexError.message);
      console.log('🔍 Error details:', complexError);
    } else {
      console.log('✅ Complex case created successfully:', complexResult.id);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Check table constraints and triggers
    console.log('3. 📋 CHECKING TABLE CONSTRAINTS:');
    
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'case_bookings')
      .eq('table_schema', 'public');

    if (!constraintError && constraints) {
      console.log('📊 case_bookings table constraints:');
      constraints.forEach(constraint => {
        console.log(`   - ${constraint.constraint_name}: ${constraint.constraint_type}`);
      });
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 4. Check for triggers that might cause issues
    console.log('4. 🔧 CHECKING DATABASE TRIGGERS:');
    
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, action_timing')
      .eq('event_object_table', 'case_bookings')
      .eq('event_object_schema', 'public');

    if (!triggerError && triggers) {
      console.log('⚡ case_bookings table triggers:');
      if (triggers.length === 0) {
        console.log('   No triggers found');
      } else {
        triggers.forEach(trigger => {
          console.log(`   - ${trigger.trigger_name}: ${trigger.action_timing} ${trigger.event_manipulation}`);
        });
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 5. Test the exact case creation flow from the form
    console.log('5. 🎯 TESTING FORM-LIKE CASE CREATION:');
    
    const formCaseData = {
      case_reference_number: `FORM-${Date.now()}`,
      hospital: 'Test Hospital',
      doctor_name: 'Dr. Test',
      procedure: 'Test Procedure',
      case_date: new Date().toISOString().split('T')[0],
      country: 'Singapore',
      department: 'Orthopedics',
      status: 'pending',
      created_by: 'test@example.com',
      updated_by: 'test@example.com',
      surgery_set_selection: JSON.stringify([
        { item_id: 'set1', item_name: 'Test Surgery Set 1', quantity: 2 },
        { item_id: 'set2', item_name: 'Test Surgery Set 2', quantity: 1 }
      ]),
      implant_box: JSON.stringify([
        { item_id: 'box1', item_name: 'Test Implant Box 1', quantity: 1 }
      ])
    };

    console.log('📝 Creating form-style test case:', formCaseData.case_reference_number);
    
    const { data: formResult, error: formError } = await supabase
      .from('case_bookings')
      .insert([formCaseData])
      .select()
      .single();

    if (formError) {
      console.log('❌ Form case creation failed:', formError.message);
      console.log('🔍 Error details:', formError);
      
      // Check specific column issues
      console.log('\n🔍 Checking column types and requirements...');
      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'case_bookings')
        .order('ordinal_position');

      if (!colError && columns) {
        console.log('📊 case_bookings column structure:');
        columns.forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
        });
      }
    } else {
      console.log('✅ Form case created successfully:', formResult.id);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 6. Provide diagnosis
    console.log('6. 🎯 DIAGNOSIS:');
    
    const hasErrors = caseError || complexError || formError;
    
    if (!hasErrors) {
      console.log('✅ ALL CASE CREATION TESTS PASSED');
      console.log('💡 POSSIBLE CAUSES OF ERROR MESSAGE:');
      console.log('   1. Frontend validation logic showing false errors');
      console.log('   2. Asynchronous state updates not completing');
      console.log('   3. Error handling in form submission logic');
      console.log('   4. Network timeout or race conditions');
      console.log('   5. Success callback not being called properly');
    } else {
      console.log('❌ ERRORS FOUND IN CASE CREATION');
      console.log('🔧 RECOMMENDED FIXES:');
      console.log('   1. Check required fields and data types');
      console.log('   2. Verify JSON field formatting');
      console.log('   3. Check database constraints');
      console.log('   4. Review RLS policies');
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    if (caseResult) {
      await supabase.from('case_bookings').delete().eq('id', caseResult.id);
    }
    if (complexResult) {
      await supabase.from('case_bookings').delete().eq('id', complexResult.id);
    }
    if (formResult) {
      await supabase.from('case_bookings').delete().eq('id', formResult.id);
    }
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('💥 DEBUG FAILED:', error);
  }
}

debugCaseCreation();