/**
 * Data Cleanup Service
 * Handles orphaned data when departments/countries are removed from code tables
 */

import { supabase } from '../lib/supabase';

interface CleanupReport {
  orphanedCases: number;
  orphanedUsers: number;
  cleanedCases: number;
  cleanedUsers: number;
  errors: string[];
}

interface OrphanedData {
  cases: any[];
  users: any[];
  totalCases: number;
  totalUsers: number;
}

export class DataCleanupService {
  
  /**
   * Find all orphaned data (cases/users referencing non-existent departments)
   */
  static async findOrphanedData(country?: string): Promise<OrphanedData> {
    console.log('🔍 Scanning for orphaned data...');
    
    try {
      // Get current valid departments for the country
      let validDepartmentsQuery = supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'departments')
        .eq('is_active', true);
      
      if (country) {
        validDepartmentsQuery = validDepartmentsQuery.eq('country_code', country);
      }
      
      const { data: validDepartments, error: deptError } = await validDepartmentsQuery;
      
      if (deptError) {
        throw new Error(`Failed to get valid departments: ${deptError.message}`);
      }
      
      const validDeptNames = (validDepartments || []).map(d => d.display_name);
      console.log('✅ Valid departments:', validDeptNames);
      
      // Find orphaned cases
      let casesQuery = supabase
        .from('cases')
        .select('id, case_reference_number, department, country, created_at');
      
      if (country) {
        casesQuery = casesQuery.eq('country', country);
      }
      
      const { data: allCases, error: casesError } = await casesQuery;
      
      if (casesError) {
        throw new Error(`Failed to get cases: ${casesError.message}`);
      }
      
      const orphanedCases = (allCases || []).filter(c => 
        c.department && !validDeptNames.includes(c.department)
      );
      
      // Find orphaned user department assignments
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, name, departments, countries, role');
      
      if (usersError) {
        throw new Error(`Failed to get users: ${usersError.message}`);
      }
      
      const orphanedUsers = (allUsers || []).filter(u => {
        if (!u.departments || u.role === 'admin') return false;
        
        // Check if user has any invalid department assignments
        return u.departments.some((dept: string) => !validDeptNames.includes(dept));
      });
      
      console.log(`📊 Found ${orphanedCases.length} orphaned cases and ${orphanedUsers.length} users with invalid departments`);
      
      return {
        cases: orphanedCases,
        users: orphanedUsers,
        totalCases: (allCases || []).length,
        totalUsers: (allUsers || []).length
      };
      
    } catch (error) {
      console.error('❌ Error finding orphaned data:', error);
      throw error;
    }
  }
  
  /**
   * Clean orphaned cases by updating them to use the first valid department
   */
  static async cleanOrphanedCases(orphanedCases: any[], fallbackDepartment?: string): Promise<number> {
    if (orphanedCases.length === 0) return 0;
    
    console.log(`🧹 Cleaning ${orphanedCases.length} orphaned cases...`);
    
    // Get the first valid department as fallback if not specified
    if (!fallbackDepartment) {
      const { data: validDepartments } = await supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'departments')
        .eq('is_active', true)
        .limit(1);
      
      fallbackDepartment = validDepartments?.[0]?.display_name || 'General';
    }
    
    let cleanedCount = 0;
    
    for (const caseItem of orphanedCases) {
      try {
        const { error } = await supabase
          .from('cases')
          .update({ 
            department: fallbackDepartment,
            updated_at: new Date().toISOString()
          })
          .eq('id', caseItem.id);
        
        if (error) {
          console.error(`❌ Failed to clean case ${caseItem.case_reference_number}:`, error);
        } else {
          cleanedCount++;
          console.log(`✅ Updated case ${caseItem.case_reference_number}: ${caseItem.department} → ${fallbackDepartment}`);
        }
      } catch (error) {
        console.error(`❌ Error cleaning case ${caseItem.case_reference_number}:`, error);
      }
    }
    
    return cleanedCount;
  }
  
  /**
   * Clean orphaned user department assignments
   */
  static async cleanOrphanedUsers(orphanedUsers: any[], validDepartments: string[]): Promise<number> {
    if (orphanedUsers.length === 0) return 0;
    
    console.log(`🧹 Cleaning ${orphanedUsers.length} users with invalid department assignments...`);
    
    let cleanedCount = 0;
    
    for (const user of orphanedUsers) {
      try {
        // Filter out invalid departments, keep only valid ones
        const cleanedDepartments = (user.departments || []).filter((dept: string) => 
          validDepartments.includes(dept)
        );
        
        // If no valid departments remain, assign the first valid one
        if (cleanedDepartments.length === 0 && validDepartments.length > 0) {
          cleanedDepartments.push(validDepartments[0]);
        }
        
        const { error } = await supabase
          .from('profiles')
          .update({ 
            departments: cleanedDepartments,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        
        if (error) {
          console.error(`❌ Failed to clean user ${user.username}:`, error);
        } else {
          cleanedCount++;
          console.log(`✅ Updated user ${user.username}: departments cleaned`);
        }
      } catch (error) {
        console.error(`❌ Error cleaning user ${user.username}:`, error);
      }
    }
    
    return cleanedCount;
  }
  
  /**
   * Run comprehensive data cleanup
   */
  static async runCleanup(country?: string, fallbackDepartment?: string): Promise<CleanupReport> {
    console.log('🚀 Starting comprehensive data cleanup...');
    
    const report: CleanupReport = {
      orphanedCases: 0,
      orphanedUsers: 0,
      cleanedCases: 0,
      cleanedUsers: 0,
      errors: []
    };
    
    try {
      // Find orphaned data
      const orphanedData = await this.findOrphanedData(country);
      report.orphanedCases = orphanedData.cases.length;
      report.orphanedUsers = orphanedData.users.length;
      
      if (report.orphanedCases === 0 && report.orphanedUsers === 0) {
        console.log('✅ No orphaned data found - database is clean!');
        return report;
      }
      
      // Get valid departments for user cleanup
      let validDepartmentsQuery = supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'departments')
        .eq('is_active', true);
      
      if (country) {
        validDepartmentsQuery = validDepartmentsQuery.eq('country_code', country);
      }
      
      const { data: validDepartments } = await validDepartmentsQuery;
      const validDeptNames = (validDepartments || []).map(d => d.display_name);
      
      // Clean orphaned cases
      if (orphanedData.cases.length > 0) {
        report.cleanedCases = await this.cleanOrphanedCases(orphanedData.cases, fallbackDepartment);
      }
      
      // Clean orphaned users
      if (orphanedData.users.length > 0) {
        report.cleanedUsers = await this.cleanOrphanedUsers(orphanedData.users, validDeptNames);
      }
      
      console.log('🎉 Data cleanup completed:', report);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      report.errors.push(errorMsg);
      console.error('❌ Data cleanup failed:', errorMsg);
    }
    
    return report;
  }
  
  /**
   * Generate a preview of what would be cleaned (dry run)
   */
  static async previewCleanup(country?: string): Promise<{
    summary: string;
    details: {
      orphanedCases: any[];
      orphanedUsers: any[];
      validDepartments: string[];
    };
  }> {
    const orphanedData = await this.findOrphanedData(country);
    
    let validDepartmentsQuery = supabase
      .from('code_tables')
      .select('display_name')
      .eq('table_type', 'departments')
      .eq('is_active', true);
    
    if (country) {
      validDepartmentsQuery = validDepartmentsQuery.eq('country_code', country);
    }
    
    const { data: validDepartments } = await validDepartmentsQuery;
    const validDeptNames = (validDepartments || []).map(d => d.display_name);
    
    const summary = `
📊 Cleanup Preview ${country ? `(${country})` : '(All Countries)'}:
• ${orphanedData.cases.length} orphaned cases will be updated
• ${orphanedData.users.length} users with invalid departments will be cleaned
• ${validDeptNames.length} valid departments available
• Total cases in database: ${orphanedData.totalCases}
• Total users in database: ${orphanedData.totalUsers}
    `;
    
    return {
      summary,
      details: {
        orphanedCases: orphanedData.cases,
        orphanedUsers: orphanedData.users,
        validDepartments: validDeptNames
      }
    };
  }
}

// Convenience functions for direct import
export const findOrphanedData = DataCleanupService.findOrphanedData;
export const runCleanup = DataCleanupService.runCleanup;
export const previewCleanup = DataCleanupService.previewCleanup;