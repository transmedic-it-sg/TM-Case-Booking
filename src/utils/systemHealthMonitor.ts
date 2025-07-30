// =====================================================
// SYSTEM HEALTH MONITORING - PREVENT FUTURE ISSUES
// =====================================================
// This monitors system health and alerts to potential problems
// =====================================================

import { supabase } from '../lib/supabase';
import { DataValidationService } from './dataValidationService';

interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
  timestamp: string;
  details: {
    database: boolean;
    userData: boolean;
    permissions: boolean;
    dataIntegrity: boolean;
  };
}

interface SystemMetrics {
  totalUsers: number;
  totalCases: number;
  totalDepartments: number;
  totalHospitals: number;
  countriesWithData: number;
  orphanedAssignments: number;
  lastHealthCheck: string;
}

export class SystemHealthMonitor {
  
  /**
   * Perform comprehensive system health check
   */
  static async performHealthCheck(): Promise<HealthCheckResult> {
    console.log('🔍 Starting system health monitoring...');
    
    const timestamp = new Date().toISOString();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    const details = {
      database: false,
      userData: false,
      permissions: false,
      dataIntegrity: false
    };

    try {
      // 1. Database connectivity and structure
      console.log('🔍 Checking database connectivity...');
      try {
        const { error } = await supabase
          .from('code_tables')
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          issues.push('Database connectivity failed');
          recommendations.push('Check Supabase connection and credentials');
          status = 'critical';
        } else {
          details.database = true;
          console.log('✅ Database connectivity: OK');
        }
      } catch (error) {
        issues.push('Database connection error');
        status = 'critical';
      }

      // 2. Data completeness check
      if (details.database) {
        console.log('🔍 Checking data completeness...');
        const healthStatus = await DataValidationService.checkDatabaseHealth();
        
        if (!healthStatus.hasDepartments) {
          issues.push('No departments found in database');
          recommendations.push('Run COMPLETE_SYSTEM_RESTORATION.sql to populate data');
          status = status === 'healthy' ? 'critical' : status;
        }
        
        if (!healthStatus.hasHospitals) {
          issues.push('No hospitals found in database');
          recommendations.push('Run COMPLETE_SYSTEM_RESTORATION.sql to populate data');
          status = status === 'healthy' ? 'critical' : status;
        }
        
        // Check country coverage
        const countries = Object.keys(healthStatus.departmentCoverage);
        if (countries.length < 3) {
          issues.push(`Only ${countries.length} countries have department data (expected: 7)`);
          recommendations.push('Add departments for missing countries');
          status = status === 'healthy' ? 'warning' : status;
        }
        
        details.userData = healthStatus.hasDepartments && healthStatus.hasHospitals;
      }

      // 3. User assignment validation
      console.log('🔍 Checking user assignments...');
      try {
        const userValidation = await DataValidationService.validateUserAssignments();
        
        if (!userValidation.isValid) {
          issues.push(...userValidation.issues);
          recommendations.push(...userValidation.recommendations);
          status = status === 'healthy' ? 'warning' : status;
        } else {
          details.permissions = true;
        }
      } catch (error) {
        issues.push('User assignment validation failed');
        status = status === 'healthy' ? 'warning' : status;
      }

      // 4. Data integrity checks
      console.log('🔍 Checking data integrity...');
      try {
        const { data: integrityCheck, error } = await supabase
          .from('code_tables')
          .select('*')
          .or('display_name.is.null,country.is.null,table_type.is.null');
        
        if (error) {
          issues.push('Data integrity check failed');
          status = status === 'healthy' ? 'warning' : status;
        } else if (integrityCheck && integrityCheck.length > 0) {
          issues.push(`${integrityCheck.length} records with null critical fields`);
          recommendations.push('Clean up records with missing data');
          status = status === 'healthy' ? 'warning' : status;
        } else {
          details.dataIntegrity = true;
        }
      } catch (error) {
        issues.push('Data integrity check error');
        status = status === 'healthy' ? 'warning' : status;
      }

      console.log(`✅ Health check completed with status: ${status}`);
      
      return {
        status,
        issues,
        recommendations,
        timestamp,
        details
      };

    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        status: 'critical',
        issues: ['Health check system failure'],
        recommendations: ['Contact system administrator'],
        timestamp,
        details: {
          database: false,
          userData: false,
          permissions: false,
          dataIntegrity: false
        }
      };
    }
  }

  /**
   * Get system metrics
   */
  static async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      console.log('📊 Collecting system metrics...');

      // Get user count
      const { data: users } = await supabase.auth.admin.listUsers();
      const totalUsers = users?.users?.length || 0;

      // Get case count (if cases table exists)
      let totalCases = 0;
      try {
        const { count } = await supabase
          .from('cases')
          .select('*', { count: 'exact', head: true });
        totalCases = count || 0;
      } catch {
        // Cases table might not exist
        totalCases = 0;
      }

      // Get department count
      const { count: deptCount } = await supabase
        .from('code_tables')
        .select('*', { count: 'exact', head: true })
        .eq('table_type', 'departments')
        .eq('is_active', true);
      const totalDepartments = deptCount || 0;

      // Get hospital count
      const { count: hospCount } = await supabase
        .from('code_tables')
        .select('*', { count: 'exact', head: true })
        .eq('table_type', 'hospitals')
        .eq('is_active', true);
      const totalHospitals = hospCount || 0;

      // Get countries with data
      const { data: countries } = await supabase
        .from('code_tables')
        .select('country')
        .eq('table_type', 'departments')
        .eq('is_active', true);
      
      const uniqueCountries = new Set(countries?.map(c => c.country) || []);
      const countriesWithData = uniqueCountries.size;

      // Check for orphaned assignments
      const userValidation = await DataValidationService.validateUserAssignments();
      const orphanedAssignments = userValidation.issues.length;

      return {
        totalUsers,
        totalCases,
        totalDepartments,
        totalHospitals,
        countriesWithData,
        orphanedAssignments,
        lastHealthCheck: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error collecting metrics:', error);
      return {
        totalUsers: 0,
        totalCases: 0,
        totalDepartments: 0,
        totalHospitals: 0,
        countriesWithData: 0,
        orphanedAssignments: 0,
        lastHealthCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Auto-fix common issues
   */
  static async autoFixIssues(): Promise<{ fixed: string[], failed: string[] }> {
    console.log('🔧 Starting auto-fix procedures...');
    
    const fixed: string[] = [];
    const failed: string[] = [];

    try {
      // 1. Fix empty database
      const healthStatus = await DataValidationService.checkDatabaseHealth();
      
      if (!healthStatus.hasDepartments || !healthStatus.hasHospitals) {
        console.log('🔧 Attempting to fix empty database...');
        const autoFixResult = await DataValidationService.autoFixEmptyDatabase();
        
        if (autoFixResult) {
          fixed.push('Populated empty database with essential data');
        } else {
          failed.push('Failed to populate empty database');
        }
      }

      // 2. Clean up null data
      try {
        const { error } = await supabase
          .from('code_tables')
          .delete()
          .or('display_name.is.null,country.is.null,table_type.is.null');
        
        if (!error) {
          fixed.push('Cleaned up records with null critical fields');
        } else {
          failed.push('Failed to clean up null records');
        }
      } catch (error) {
        failed.push('Error during null data cleanup');
      }

      // 3. Ensure all countries have basic departments
      const countries = ['Singapore', 'Malaysia', 'Philippines'];
      const basicDepartments = ['Cardiology', 'Emergency', 'Orthopedics'];
      
      for (const country of countries) {
        for (const department of basicDepartments) {
          try {
            const { data: existing } = await supabase
              .from('code_tables')
              .select('id')
              .eq('table_type', 'departments')
              .eq('country', country)
              .eq('display_name', department)
              .eq('is_active', true);
            
            if (!existing || existing.length === 0) {
              const { error } = await supabase
                .from('code_tables')
                .insert({
                  table_type: 'departments',
                  country: country,
                  code: department.toLowerCase(),
                  display_name: department,
                  is_active: true
                });
              
              if (!error) {
                fixed.push(`Added ${department} department for ${country}`);
              }
            }
          } catch (error) {
            failed.push(`Failed to ensure ${department} for ${country}`);
          }
        }
      }

      console.log(`✅ Auto-fix completed: ${fixed.length} fixed, ${failed.length} failed`);
      return { fixed, failed };

    } catch (error) {
      console.error('❌ Auto-fix failed:', error);
      return { fixed, failed: ['Auto-fix system error'] };
    }
  }

  /**
   * Schedule periodic health checks
   */
  static startHealthMonitoring(intervalMinutes: number = 30): void {
    console.log(`🔍 Starting health monitoring every ${intervalMinutes} minutes`);
    
    // Initial check
    this.performHealthCheck().then(result => {
      console.log('Initial health check:', result);
      
      if (result.status === 'critical') {
        console.warn('🚨 Critical issues detected, attempting auto-fix...');
        this.autoFixIssues();
      }
    });

    // Periodic checks
    setInterval(async () => {
      const result = await this.performHealthCheck();
      
      if (result.status === 'critical') {
        console.warn('🚨 Critical issues detected during monitoring');
        // Could trigger notifications or auto-fix here
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Generate health report
   */
  static async generateHealthReport(): Promise<string> {
    const healthCheck = await this.performHealthCheck();
    const metrics = await this.getSystemMetrics();
    
    const report = `
# System Health Report
Generated: ${new Date().toLocaleString()}

## Overall Status: ${healthCheck.status.toUpperCase()}

## System Metrics
- Users: ${metrics.totalUsers}
- Cases: ${metrics.totalCases}
- Departments: ${metrics.totalDepartments}
- Hospitals: ${metrics.totalHospitals}
- Countries with Data: ${metrics.countriesWithData}
- Orphaned Assignments: ${metrics.orphanedAssignments}

## Health Details
- Database: ${healthCheck.details.database ? '✅' : '❌'}
- User Data: ${healthCheck.details.userData ? '✅' : '❌'}
- Permissions: ${healthCheck.details.permissions ? '✅' : '❌'}
- Data Integrity: ${healthCheck.details.dataIntegrity ? '✅' : '❌'}

## Issues Found
${healthCheck.issues.length === 0 ? 'None' : healthCheck.issues.map(issue => `- ${issue}`).join('\n')}

## Recommendations
${healthCheck.recommendations.length === 0 ? 'None' : healthCheck.recommendations.map(rec => `- ${rec}`).join('\n')}
`;

    return report;
  }
}