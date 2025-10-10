#!/usr/bin/env node

/**
 * Test Case Creation Fix
 * Verify that case creation works with correct field mappings
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCaseCreationFix() {
  console.log('🧪 TESTING CASE CREATION FIX');
  console.log('============================\n');

  try {
    // Test with correct field mapping (as used in the actual app)
    console.log('1. 🎯 TESTING WITH CORRECT FIELD MAPPING:');
    
    const correctCaseData = {
      case_reference_number: `FIXED-${Date.now()}`,
      hospital: 'Test Hospital',
      department: 'Orthopedics',
      date_of_surgery: new Date().toISOString().split('T')[0],  // Use correct field name
      procedure_type: 'Test Procedure Type',
      procedure_name: 'Test Procedure Name',
      doctor_name: 'Dr. Test',
      surgery_set_selection: [],
      implant_box: [],
      status: 'Case Booked',
      submitted_by: 'test@example.com',
      country: 'Singapore'
    };

    console.log('📝 Creating case with correct field mapping:', correctCaseData.case_reference_number);
    
    const { data: caseResult, error: caseError } = await supabase
      .from('case_bookings')
      .insert([correctCaseData])
      .select()
      .single();

    if (caseError) {
      console.log('❌ Case creation failed:', caseError.message);
      console.log('🔍 Error details:', caseError);
    } else {
      console.log('✅ Case created successfully:', caseResult.id);
      console.log('📋 Case reference:', caseResult.case_reference_number);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test quantity saving with the fixed function
    if (caseResult && caseResult.id) {
      console.log('2. 🧪 TESTING QUANTITY SAVING WITH FIXED FUNCTION:');
      
      const testQuantities = [
        {
          case_booking_id: caseResult.id,
          item_type: 'surgery_set',
          item_name: 'Test Surgery Set 1',
          quantity: 2
        },
        {
          case_booking_id: caseResult.id,
          item_type: 'implant_box',
          item_name: 'Test Implant Box 1',
          quantity: 1
        }
      ];

      console.log('📝 Saving quantities...');
      const { data: qtyResult, error: qtyError } = await supabase
        .from('case_booking_quantities')
        .insert(testQuantities)
        .select();

      if (qtyError) {
        console.log('❌ Quantity saving failed:', qtyError.message);
      } else {
        console.log('✅ Quantities saved successfully:', qtyResult.length, 'records');
      }

      // Verify quantities can be retrieved
      const { data: retrievedQty, error: retrieveError } = await supabase
        .from('case_booking_quantities')
        .select('item_name, quantity')
        .eq('case_booking_id', caseResult.id);

      if (!retrieveError && retrievedQty) {
        console.log('✅ Quantities retrieved successfully:');
        retrievedQty.forEach(qty => {
          console.log(`   - ${qty.item_name}: ${qty.quantity}`);
        });
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test complete workflow similar to the actual form
    console.log('3. 🎯 TESTING COMPLETE CASE CREATION WORKFLOW:');
    
    const workflowCaseData = {
      case_reference_number: `WORKFLOW-${Date.now()}`,
      hospital: 'Workflow Test Hospital',
      department: 'Neurosurgery',
      date_of_surgery: new Date().toISOString().split('T')[0],
      procedure_type: 'Brain Surgery',
      procedure_name: 'Craniotomy',
      doctor_name: 'Dr. Workflow Test',
      time_of_procedure: '14:30:00',
      surgery_set_selection: ['Set A', 'Set B'],
      implant_box: ['Box 1'],
      special_instruction: 'Test special instructions',
      status: 'Case Booked',
      submitted_by: 'workflow@example.com',
      country: 'Singapore'
    };

    console.log('📝 Creating complete workflow case:', workflowCaseData.case_reference_number);
    
    const { data: workflowResult, error: workflowError } = await supabase
      .from('case_bookings')
      .insert([workflowCaseData])
      .select()
      .single();

    if (workflowError) {
      console.log('❌ Workflow case creation failed:', workflowError.message);
    } else {
      console.log('✅ Workflow case created successfully:', workflowResult.id);
      
      // Add status history
      const { error: historyError } = await supabase
        .from('status_history')
        .insert([{
          case_id: workflowResult.id,
          status: 'Case Booked',
          processed_by: 'workflow@example.com',
          timestamp: new Date().toISOString(),
          details: 'Case created via workflow test'
        }]);

      if (!historyError) {
        console.log('✅ Status history created successfully');
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Summary
    console.log('4. 📊 TEST SUMMARY:');
    
    const successCount = [caseResult, !qtyError, workflowResult].filter(Boolean).length;
    const totalTests = 3;
    
    console.log(`✅ ${successCount}/${totalTests} tests passed`);
    
    if (successCount === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Case creation error is FIXED!');
      console.log('💡 ROOT CAUSE CONFIRMED: Field mapping issue resolved');
      console.log('🔧 SOLUTION VALIDATED: Both case creation and quantity saving work correctly');
    } else {
      console.log('⚠️  Some tests failed, needs further investigation');
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    if (caseResult) {
      await supabase.from('case_booking_quantities').delete().eq('case_booking_id', caseResult.id);
      await supabase.from('status_history').delete().eq('case_id', caseResult.id);
      await supabase.from('case_bookings').delete().eq('id', caseResult.id);
    }
    if (workflowResult) {
      await supabase.from('status_history').delete().eq('case_id', workflowResult.id);
      await supabase.from('case_bookings').delete().eq('id', workflowResult.id);
    }
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('💥 TEST FAILED:', error);
  }
}

testCaseCreationFix();