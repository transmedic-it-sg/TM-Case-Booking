/**
 * CRUD Operations Verification - Comprehensive Testing
 * Tests all Create, Read, Update, Delete operations across the entire application
 * Ensures data integrity after the comprehensive cleanup
 */

import { supabase } from '../lib/supabase';
import { realtimeCaseService } from '../services/realtimeCaseService';

interface CRUDTestResult {
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  table: string;
  success: boolean;
  error?: string;
  details?: any;
}

interface VerificationReport {
  totalTests: number;
  passed: number;
  failed: number;
  results: CRUDTestResult[];
  summary: {
    tables: string[];
    operations: Record<string, number>;
    criticalIssues: string[];
  };
}

class CRUDVerificationService {
  private results: CRUDTestResult[] = [];

  private addResult(operation: CRUDTestResult['operation'], table: string, success: boolean, error?: string, details?: any): void {
    this.results.push({
      operation,
      table,
      success,
      error,
      details
    });

    const status = success ? '✅' : '❌';}

  async verifyAllCRUDOperations(): Promise<VerificationReport> {this.results = [];

    // Test all core tables
    await this.testCaseBookings();
    await this.testProfiles();
    await this.testDepartments();
    await this.testDoctors();
    await this.testProcedures();
    await this.testSurgerySets();
    await this.testImplantBoxes();
    await this.testSystemSettings();
    await this.testPermissions();
    await this.testAuditLogs();

    return this.generateReport();
  }

  private async testCaseBookings(): Promise<void> {// CREATE
    try {
      const testCase = {
        case_reference_number: `TEST_${Date.now()}`,
        hospital: 'Test Hospital',
        department: 'Test Department',
        date_of_surgery: new Date().toISOString().split('T')[0],
        procedure_type: 'Test Procedure',
        procedure_name: 'Test Procedure Name',
        submitted_by: 'Test User',
        country: 'Singapore',
        status: 'Case Booked' as const
      };

      const savedCase = await realtimeCaseService.saveCase(testCase as any);
      this.addResult('CREATE', 'case_bookings', !!savedCase, undefined, { caseId: savedCase?.id });

      if (savedCase) {
        // READ
        const fetchedCase = await realtimeCaseService.getCaseById(savedCase.id);
        this.addResult('READ', 'case_bookings', !!fetchedCase);

        // UPDATE
        const updated = await realtimeCaseService.updateCaseStatus(savedCase.id, 'Order Preparation');
        this.addResult('UPDATE', 'case_bookings', updated);

        // DELETE
        const deleted = await realtimeCaseService.deleteCase(savedCase.id);
        this.addResult('DELETE', 'case_bookings', deleted);
      }
    } catch (error) {
      this.addResult('CREATE', 'case_bookings', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testProfiles(): Promise<void> {// READ (existing profiles)
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      this.addResult('READ', 'profiles', !error && !!profiles, error?.message);

      if (profiles && profiles.length > 0) {
        // UPDATE (safe update)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', profiles[0].id);

        this.addResult('UPDATE', 'profiles', !updateError, updateError?.message);
      }

      // CREATE test user (will be cleaned up)
      const testUsername = `test_user_${Date.now()}`;
      const { data: newUser, error: createError } = await supabase
        .from('profiles')
        .insert({
          username: testUsername,
          name: 'Test User',
          password_hash: 'test_hash',
          role: 'operations',
          countries: ['Singapore'],
          departments: ['Test'],
          enabled: false
        })
        .select()
        .single();

      this.addResult('CREATE', 'profiles', !createError && !!newUser, createError?.message);

      // DELETE test user
      if (newUser) {
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', newUser.id);

        this.addResult('DELETE', 'profiles', !deleteError, deleteError?.message);
      }

    } catch (error) {
      this.addResult('READ', 'profiles', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testDepartments(): Promise<void> {// READ
    try {
      const { data: departments, error } = await supabase
        .from('departments')
        .select('*')
        .limit(5);

      this.addResult('READ', 'departments', !error, error?.message);

      // CREATE test department
      const testName = `Test Department ${Date.now()}`;
      const { data: newDept, error: createError } = await supabase
        .from('departments')
        .insert({
          name: testName,
          country: 'Singapore',
          description: 'Test department for CRUD verification',
          is_active: true
        })
        .select()
        .single();

      this.addResult('CREATE', 'departments', !createError && !!newDept, createError?.message);

      if (newDept) {
        // UPDATE
        const { error: updateError } = await supabase
          .from('departments')
          .update({ description: 'Updated test department' })
          .eq('id', newDept.id);

        this.addResult('UPDATE', 'departments', !updateError, updateError?.message);

        // DELETE
        const { error: deleteError } = await supabase
          .from('departments')
          .delete()
          .eq('id', newDept.id);

        this.addResult('DELETE', 'departments', !deleteError, deleteError?.message);
      }

    } catch (error) {
      this.addResult('READ', 'departments', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testDoctors(): Promise<void> {// Get a department first
    const { data: departments } = await supabase
      .from('departments')
      .select('id')
      .eq('country', 'Singapore')
      .limit(1);

    if (!departments || departments.length === 0) {
      this.addResult('READ', 'doctors', false, 'No departments available for doctor testing');
      return;
    }

    // READ
    try {
      const { data: doctors, error } = await supabase
        .from('doctors')
        .select('*')
        .limit(5);

      this.addResult('READ', 'doctors', !error, error?.message);

      // CREATE test doctor
      const testName = `Test Doctor ${Date.now()}`;
      const { data: newDoctor, error: createError } = await supabase
        .from('doctors')
        .insert({
          name: testName,
          country: 'Singapore',
          department_id: departments[0].id,
          specialties: ['Test Specialty'],
          is_active: true
        })
        .select()
        .single();

      this.addResult('CREATE', 'doctors', !createError && !!newDoctor, createError?.message);

      if (newDoctor) {
        // UPDATE
        const { error: updateError } = await supabase
          .from('doctors')
          .update({ specialties: ['Updated Specialty'] })
          .eq('id', newDoctor.id);

        this.addResult('UPDATE', 'doctors', !updateError, updateError?.message);

        // DELETE
        const { error: deleteError } = await supabase
          .from('doctors')
          .delete()
          .eq('id', newDoctor.id);

        this.addResult('DELETE', 'doctors', !deleteError, deleteError?.message);
      }

    } catch (error) {
      this.addResult('READ', 'doctors', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testProcedures(): Promise<void> {// Get a doctor first
    const { data: doctors } = await supabase
      .from('doctors')
      .select('id')
      .eq('country', 'Singapore')
      .limit(1);

    if (!doctors || doctors.length === 0) {
      this.addResult('READ', 'doctor_procedures', false, 'No doctors available for procedure testing');
      return;
    }

    // READ
    try {
      const { data: procedures, error } = await supabase
        .from('doctor_procedures')
        .select('*')
        .limit(5);

      this.addResult('READ', 'doctor_procedures', !error, error?.message);

      // CREATE test procedure
      const testProcedure = `Test Procedure ${Date.now()}`;
      const { data: newProcedure, error: createError } = await supabase
        .from('doctor_procedures')
        .insert({
          doctor_id: doctors[0].id,
          procedure_type: testProcedure,
          country: 'Singapore',
          is_active: true
        })
        .select()
        .single();

      this.addResult('CREATE', 'doctor_procedures', !createError && !!newProcedure, createError?.message);

      if (newProcedure) {
        // UPDATE
        const { error: updateError } = await supabase
          .from('doctor_procedures')
          .update({ is_active: false })
          .eq('id', newProcedure.id);

        this.addResult('UPDATE', 'doctor_procedures', !updateError, updateError?.message);

        // DELETE
        const { error: deleteError } = await supabase
          .from('doctor_procedures')
          .delete()
          .eq('id', newProcedure.id);

        this.addResult('DELETE', 'doctor_procedures', !deleteError, deleteError?.message);
      }

    } catch (error) {
      this.addResult('READ', 'doctor_procedures', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testSurgerySets(): Promise<void> {// READ
    try {
      const { data: sets, error } = await supabase
        .from('surgery_sets')
        .select('*')
        .limit(5);

      this.addResult('READ', 'surgery_sets', !error, error?.message);

      // CREATE test surgery set
      const testName = `Test Surgery Set ${Date.now()}`;
      const { data: newSet, error: createError } = await supabase
        .from('surgery_sets')
        .insert({
          name: testName,
          country: 'Singapore',
          is_active: true
        })
        .select()
        .single();

      this.addResult('CREATE', 'surgery_sets', !createError && !!newSet, createError?.message);

      if (newSet) {
        // UPDATE
        const { error: updateError } = await supabase
          .from('surgery_sets')
          .update({ is_active: false })
          .eq('id', newSet.id);

        this.addResult('UPDATE', 'surgery_sets', !updateError, updateError?.message);

        // DELETE
        const { error: deleteError } = await supabase
          .from('surgery_sets')
          .delete()
          .eq('id', newSet.id);

        this.addResult('DELETE', 'surgery_sets', !deleteError, deleteError?.message);
      }

    } catch (error) {
      this.addResult('READ', 'surgery_sets', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testImplantBoxes(): Promise<void> {// READ
    try {
      const { data: boxes, error } = await supabase
        .from('implant_boxes')
        .select('*')
        .limit(5);

      this.addResult('READ', 'implant_boxes', !error, error?.message);

      // CREATE test implant box
      const testName = `Test Implant Box ${Date.now()}`;
      const { data: newBox, error: createError } = await supabase
        .from('implant_boxes')
        .insert({
          name: testName,
          country: 'Singapore',
          is_active: true
        })
        .select()
        .single();

      this.addResult('CREATE', 'implant_boxes', !createError && !!newBox, createError?.message);

      if (newBox) {
        // UPDATE
        const { error: updateError } = await supabase
          .from('implant_boxes')
          .update({ is_active: false })
          .eq('id', newBox.id);

        this.addResult('UPDATE', 'implant_boxes', !updateError, updateError?.message);

        // DELETE
        const { error: deleteError } = await supabase
          .from('implant_boxes')
          .delete()
          .eq('id', newBox.id);

        this.addResult('DELETE', 'implant_boxes', !deleteError, deleteError?.message);
      }

    } catch (error) {
      this.addResult('READ', 'implant_boxes', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testSystemSettings(): Promise<void> {// READ
    try {
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('*')
        .limit(5);

      this.addResult('READ', 'system_settings', !error, error?.message);

      // CREATE test setting
      const testKey = `test_setting_${Date.now()}`;
      const { data: newSetting, error: createError } = await supabase
        .from('system_settings')
        .insert({
          setting_key: testKey,
          setting_value: { test: true },
          description: 'Test setting for CRUD verification'
        })
        .select()
        .single();

      this.addResult('CREATE', 'system_settings', !createError && !!newSetting, createError?.message);

      if (newSetting) {
        // UPDATE
        const { error: updateError } = await supabase
          .from('system_settings')
          .update({ setting_value: { test: false, updated: true } })
          .eq('id', newSetting.id);

        this.addResult('UPDATE', 'system_settings', !updateError, updateError?.message);

        // DELETE
        const { error: deleteError } = await supabase
          .from('system_settings')
          .delete()
          .eq('id', newSetting.id);

        this.addResult('DELETE', 'system_settings', !deleteError, deleteError?.message);
      }

    } catch (error) {
      this.addResult('READ', 'system_settings', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testPermissions(): Promise<void> {// READ
    try {
      const { data: permissions, error } = await supabase
        .from('permissions')
        .select('*')
        .limit(5);

      this.addResult('READ', 'permissions', !error, error?.message);

      // CREATE test permission (will be cleaned up)
      const { data: newPermission, error: createError } = await supabase
        .from('permissions')
        .insert({
          role: 'test-role',
          resource: 'test-resource',
          action: 'test-action',
          allowed: true
        })
        .select()
        .single();

      this.addResult('CREATE', 'permissions', !createError && !!newPermission, createError?.message);

      if (newPermission) {
        // UPDATE
        const { error: updateError } = await supabase
          .from('permissions')
          .update({ allowed: false })
          .eq('id', newPermission.id);

        this.addResult('UPDATE', 'permissions', !updateError, updateError?.message);

        // DELETE
        const { error: deleteError } = await supabase
          .from('permissions')
          .delete()
          .eq('id', newPermission.id);

        this.addResult('DELETE', 'permissions', !deleteError, deleteError?.message);
      }

    } catch (error) {
      this.addResult('READ', 'permissions', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testAuditLogs(): Promise<void> {// READ
    try {
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .limit(5);

      this.addResult('READ', 'audit_logs', !error, error?.message);

      // CREATE test audit log
      const testId = `test_audit_${Date.now()}`;
      const { data: newLog, error: createError } = await supabase
        .from('audit_logs')
        .insert({
          id: testId,
          timestamp: new Date().toISOString(),
          user_name: 'Test User',
          user_id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
          user_role: 'operations',
          action: 'crud_verification',
          category: 'testing',
          target: 'audit_logs',
          details: 'CRUD verification test',
          ip_address: '127.0.0.1',
          status: 'success'
        })
        .select()
        .single();

      this.addResult('CREATE', 'audit_logs', !createError && !!newLog, createError?.message);

      if (newLog) {
        // UPDATE (audit logs are typically append-only, but testing update capability)
        const { error: updateError } = await supabase
          .from('audit_logs')
          .update({ details: 'Updated CRUD verification test' })
          .eq('id', newLog.id);

        this.addResult('UPDATE', 'audit_logs', !updateError, updateError?.message);

        // DELETE (clean up test data)
        const { error: deleteError } = await supabase
          .from('audit_logs')
          .delete()
          .eq('id', newLog.id);

        this.addResult('DELETE', 'audit_logs', !deleteError, deleteError?.message);
      }

    } catch (error) {
      this.addResult('READ', 'audit_logs', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private generateReport(): VerificationReport {
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;

    const tables = [...new Set(this.results.map(r => r.table))];
    const operations = this.results.reduce((acc, r) => {
      acc[r.operation] = (acc[r.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const criticalIssues = this.results
      .filter(r => !r.success && ['case_bookings', 'profiles', 'permissions'].includes(r.table))
      .map(r => `${r.operation} on ${r.table}: ${r.error}`);

    const report: VerificationReport = {
      totalTests: this.results.length,
      passed,
      failed,
      results: this.results,
      summary: {
        tables,
        operations,
        criticalIssues
      }
    };

    // Log summary
    const successRate = (passed / this.results.length * 100).toFixed(1);
    // // // console.log(`📊 Verification complete: ${passed}/${this.results.length} tests passed (${successRate}%)`);

    if (criticalIssues.length > 0) {
      // // // console.warn('🚨 Critical issues detected:');
      criticalIssues.forEach(issue => {
        // // // console.warn(`❌ ${issue}`);
      });
    }

    return report;
  }
}

export default new CRUDVerificationService();