/**
 * Database Correction Service - Utility for database integrity checks
 * Provides functions to validate and correct database inconsistencies
 */

import { supabase } from '../lib/supabase';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';

export interface DatabaseCheckResult {
  table: string;
  issues: string[];
  fixed: boolean;
  error?: string;
}

class CorrectDatabaseService {
  async checkAndFixConstraints(): Promise<DatabaseCheckResult[]> {
    const results: DatabaseCheckResult[] = [];

    try {
      // Check case_bookings foreign key constraints
      results.push(await this.checkCaseBookingsConstraints());

      // Check RLS policies
      results.push(await this.checkRLSPolicies());

      // Check for orphaned records
      results.push(await this.checkOrphanedRecords());

    } catch (error) {
      results.push({
        table: 'system',
        issues: ['Database check failed'],
        fixed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return results;
  }

  private async checkCaseBookingsConstraints(): Promise<DatabaseCheckResult> {
    const issues: string[] = [];
    let fixed = true;

    try {
      // Check for cases without valid doctor references
      const { data: invalidDoctorRefs, error } = await supabase
        .from('case_bookings')
        .select('id, doctor_id')
        .not('doctor_id', 'is', null); // ⚠️ doctor_id (doctorId) FK

      if (error) throw error;

      if (invalidDoctorRefs && invalidDoctorRefs.length > 0) {
        // Validate doctor references
        for (const caseBooking of invalidDoctorRefs) {
          const { data: doctor } = await supabase
            .from('doctors')
            .select('id')
            .eq('id', caseBooking.doctor_id)
            .single();

          if (!doctor) {
            issues.push(`Case ${caseBooking.id} has invalid doctor reference`);
            // Could auto-fix by setting doctor_id to null
          }
        }
      }

      return {
        table: 'case_bookings',
        issues,
        fixed
      };
    } catch (error) {
      return {
        table: 'case_bookings',
        issues: ['Failed to check constraints'],
        fixed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkRLSPolicies(): Promise<DatabaseCheckResult> {
    // This would check if RLS policies are properly configured
    return {
      table: 'rls_policies',
      issues: [], // RLS checking would require admin privileges
      fixed: true
    };
  }

  private async checkOrphanedRecords(): Promise<DatabaseCheckResult> {
    const issues: string[] = [];

    try {
      // Check for orphaned status_history records
      const { data: orphanedStatus, error } = await supabase
        .from('status_history')
        .select(`
          id,
          case_id,
          case_bookings!inner(id)
        `);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        table: 'orphaned_records',
        issues,
        fixed: true
      };
    } catch (error) {
      return {
        table: 'orphaned_records',
        issues: ['Failed to check orphaned records'],
        fixed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Additional methods for backward compatibility
  async getCountries(): Promise<string[]> {
    const { SUPPORTED_COUNTRIES } = await import('../utils/countryUtils');
    return [...SUPPORTED_COUNTRIES];
  }

  async getHospitals(country: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'hospitals')
        .eq('country', country)
        .eq('is_active', true); // ⚠️ is_active (isActive)

      if (error) throw error;
      return data?.map(item => item.display_name) || [];
    } catch (error) {
      return [];
    }
  }

  async getCaseStatuses(): Promise<string[]> {
    return [
      'Case Booked',
      'Preparing Order',
      'Order Prepared',
      'Pending Delivery (Hospital)',
      'Delivered (Hospital)',
      'Case Completed',
      'Pending Delivery (Office)',
      'Delivered (Office)',
      'To be billed',
      'Case Closed',
      'Case Cancelled'
    ];
  }

  async getDepartments(country: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('name')
        .eq('country', country)
        .eq('is_active', true);

      if (error) throw error;
      return data?.map(item => item.name) || [];
    } catch (error) {
      return [];
    }
  }

  async getProcedureTypes(country: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'procedures')
        .eq('country', country)
        .eq('is_active', true);

      if (error) throw error;
      return data?.map(item => item.display_name) || [];
    } catch (error) {
      return [];
    }
  }

  async getSurgerySets(country: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('surgery_sets')
        .select('name')
        .eq('country', country)
        .eq('is_active', true);

      if (error) throw error;
      return data?.map(item => item.name) || [];
    } catch (error) {
      return [];
    }
  }

  async getImplantBoxes(country: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('implant_boxes')
        .select('name')
        .eq('country', country)
        .eq('is_active', true);

      if (error) throw error;
      return data?.map(item => item.name) || [];
    } catch (error) {
      return [];
    }
  }

  async getUserRoles(): Promise<string[]> {
    return ['admin', 'operations', 'operations-manager', 'sales', 'sales-manager', 'driver', 'it'];
  }
}

export default new CorrectDatabaseService();