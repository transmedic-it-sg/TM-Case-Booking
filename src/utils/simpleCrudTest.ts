/**
 * Simple CRUD Test - Direct database testing
 * Tests core CRUD operations without complex imports
 */

import { supabase } from '../lib/supabase';

interface TestResult {
  table: string;
  operation: string;
  success: boolean;
  error?: string;
}

export async function runSimpleCRUDTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];// Test 1: System Settings (Simple table)
  try {
    // READ
    const { data: settings, error: readError } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1);

    results.push({
      table: 'system_settings',
      operation: 'READ',
      success: !readError,
      error: readError?.message
    });

    // CREATE
    const testKey = `crud_test_${Date.now()}`;
    const { data: newSetting, error: createError } = await supabase
      .from('system_settings')
      .insert({
        setting_key: testKey,
        setting_value: { test: true },
        description: 'CRUD test setting'
      })
      .select()
      .single();

    results.push({
      table: 'system_settings',
      operation: 'CREATE',
      success: !createError && !!newSetting,
      error: createError?.message
    });

    if (newSetting) {
      // UPDATE
      const { error: updateError } = await supabase
        .from('system_settings')
        .update({ setting_value: { test: false, updated: true } })
        .eq('id', newSetting.id);

      results.push({
        table: 'system_settings',
        operation: 'UPDATE',
        success: !updateError,
        error: updateError?.message
      });

      // DELETE
      const { error: deleteError } = await supabase
        .from('system_settings')
        .delete()
        .eq('id', newSetting.id);

      results.push({
        table: 'system_settings',
        operation: 'DELETE',
        success: !deleteError,
        error: deleteError?.message
      });
    }
  } catch (error) {
    results.push({
      table: 'system_settings',
      operation: 'ALL',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 2: Profiles (Critical table)
  try {
    // READ
    const { data: profiles, error: readError } = await supabase
      .from('profiles')
      .select('id, username, role')
      .limit(1);

    results.push({
      table: 'profiles',
      operation: 'READ',
      success: !readError,
      error: readError?.message
    });

    // Safe UPDATE (just update timestamp on first user)
    if (profiles && profiles.length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', profiles[0].id);

      results.push({
        table: 'profiles',
        operation: 'UPDATE',
        success: !updateError,
        error: updateError?.message
      });
    }
  } catch (error) {
    results.push({
      table: 'profiles',
      operation: 'READ/UPDATE',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 3: Departments
  try {
    // READ
    const { data: departments, error: readError } = await supabase
      .from('departments')
      .select('*')
      .limit(5);

    results.push({
      table: 'departments',
      operation: 'READ',
      success: !readError,
      error: readError?.message
    });

    // CREATE test department
    const testName = `CRUD Test Dept ${Date.now()}`;
    const { data: newDept, error: createError } = await supabase
      .from('departments')
      .insert({
        name: testName,
        country: 'Singapore',
        description: 'CRUD test department',
        is_active: true
      })
      .select()
      .single();

    results.push({
      table: 'departments',
      operation: 'CREATE',
      success: !createError && !!newDept,
      error: createError?.message
    });

    if (newDept) {
      // UPDATE
      const { error: updateError } = await supabase
        .from('departments')
        .update({ description: 'Updated CRUD test department' })
        .eq('id', newDept.id);

      results.push({
        table: 'departments',
        operation: 'UPDATE',
        success: !updateError,
        error: updateError?.message
      });

      // DELETE
      const { error: deleteError } = await supabase
        .from('departments')
        .delete()
        .eq('id', newDept.id);

      results.push({
        table: 'departments',
        operation: 'DELETE',
        success: !deleteError,
        error: deleteError?.message
      });
    }
  } catch (error) {
    results.push({
      table: 'departments',
      operation: 'ALL',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 4: Surgery Sets
  try {
    // READ
    const { data: sets, error: readError } = await supabase
      .from('surgery_sets')
      .select('*')
      .limit(5);

    results.push({
      table: 'surgery_sets',
      operation: 'READ',
      success: !readError,
      error: readError?.message
    });

    // CREATE test surgery set
    const testName = `CRUD Test Set ${Date.now()}`;
    const { data: newSet, error: createError } = await supabase
      .from('surgery_sets')
      .insert({
        name: testName,
        country: 'Singapore',
        is_active: true
      })
      .select()
      .single();

    results.push({
      table: 'surgery_sets',
      operation: 'CREATE',
      success: !createError && !!newSet,
      error: createError?.message
    });

    if (newSet) {
      // UPDATE
      const { error: updateError } = await supabase
        .from('surgery_sets')
        .update({ is_active: false })
        .eq('id', newSet.id);

      results.push({
        table: 'surgery_sets',
        operation: 'UPDATE',
        success: !updateError,
        error: updateError?.message
      });

      // DELETE
      const { error: deleteError } = await supabase
        .from('surgery_sets')
        .delete()
        .eq('id', newSet.id);

      results.push({
        table: 'surgery_sets',
        operation: 'DELETE',
        success: !deleteError,
        error: deleteError?.message
      });
    }
  } catch (error) {
    results.push({
      table: 'surgery_sets',
      operation: 'ALL',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 5: Case Bookings (Most critical)
  try {
    // READ
    const { data: cases, error: readError } = await supabase
      .from('case_bookings')
      .select('id, case_reference_number, status')
      .limit(5);

    results.push({
      table: 'case_bookings',
      operation: 'READ',
      success: !readError,
      error: readError?.message
    });

    // CREATE test case
    const testRef = `CRUD_TEST_${Date.now()}`;
    const { data: newCase, error: createError } = await supabase
      .from('case_bookings')
      .insert({
        case_reference_number: testRef,
        hospital: 'CRUD Test Hospital',
        department: 'Test Department',
        date_of_surgery: new Date().toISOString().split('T')[0],
        procedure_type: 'CRUD Test Procedure',
        procedure_name: 'CRUD Test Procedure Name',
        submitted_by: 'CRUD Test User',
        country: 'Singapore',
        status: 'Case Booked'
      })
      .select()
      .single();

    results.push({
      table: 'case_bookings',
      operation: 'CREATE',
      success: !createError && !!newCase,
      error: createError?.message
    });

    if (newCase) {
      // UPDATE
      const { error: updateError } = await supabase
        .from('case_bookings')
        .update({ status: 'Order Preparation' })
        .eq('id', newCase.id);

      results.push({
        table: 'case_bookings',
        operation: 'UPDATE',
        success: !updateError,
        error: updateError?.message
      });

      // DELETE
      const { error: deleteError } = await supabase
        .from('case_bookings')
        .delete()
        .eq('id', newCase.id);

      results.push({
        table: 'case_bookings',
        operation: 'DELETE',
        success: !deleteError,
        error: deleteError?.message
      });
    }
  } catch (error) {
    results.push({
      table: 'case_bookings',
      operation: 'ALL',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Generate summary
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  const successRate = ((passed / total) * 100).toFixed(1);
  
  console.log(`\n📊 CRUD Test Summary: ${passed}/${total} tests passed (${successRate}%)`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const errorInfo = result.error ? ` (${result.error})` : '';
    console.log(`${status} ${result.table} ${result.operation}${errorInfo}`);
  });

  // Check for critical failures
  const criticalFailures = results.filter(r =>
    !r.success &&
    (r.table === 'case_bookings' || r.table === 'profiles') &&
    r.operation === 'READ'
  );

  if (criticalFailures.length > 0) {
    console.warn('🚨 Critical failures detected:');
    criticalFailures.forEach(failure => {
      console.warn(`❌ ${failure.table} ${failure.operation}: ${failure.error}`);
    });
  }

  return results;
}

export default runSimpleCRUDTests;