/**
 * DATA INTEGRITY MONITORING SYSTEM
 * 
 * Proactive monitoring to prevent data inconsistency issues like the permission mapping problem.
 * This system automatically detects and reports potential data integrity issues.
 */

import { supabase } from '../lib/supabase';
import { DatabaseUtils } from './robustDatabaseOperations';

export interface IntegrityCheckResult {
  tableName: string;
  checkType: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  affectedRecords?: any[];
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface IntegrityReport {
  overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  checks: IntegrityCheckResult[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failures: number;
  };
  recommendations: string[];
}

/**
 * Permission mapping integrity check
 * Prevents issues like the duplicate doctors-edit/doctors-manage mapping
 */
async function checkPermissionMappingIntegrity(): Promise<IntegrityCheckResult> {
  try {
    // Check for duplicate permission mappings that could conflict
    const { data: permissions, error } = await supabase
      .from('permissions')
      .select('role, resource, action, allowed');

    if (error) {
      return {
        tableName: 'permissions',
        checkType: 'mapping_integrity',
        status: 'FAIL',
        message: `Failed to check permission mappings: ${error.message}`,
        timestamp: new Date().toISOString(),
        severity: 'HIGH'
      };
    }

    // Create mapping groups to detect conflicts
    const mappingGroups = new Map<string, any[]>();
    permissions?.forEach(perm => {
      // Simulate the frontend mapping logic to detect conflicts
      const frontendAction = mapToFrontendAction(perm.resource, perm.action);
      const key = `${perm.role}:${frontendAction}`;
      
      if (!mappingGroups.has(key)) {
        mappingGroups.set(key, []);
      }
      mappingGroups.get(key)!.push(perm);
    });

    // Find conflicts (multiple DB entries mapping to same frontend action)
    const conflicts: any[] = [];
    mappingGroups.forEach((entries, key) => {
      if (entries.length > 1) {
        // Check if they have different allowed values
        const allowedValues = [...new Set(entries.map(e => e.allowed))];
        if (allowedValues.length > 1) {
          conflicts.push({ key, entries, conflictType: 'different_allowed_values' });
        }
      }
    });

    if (conflicts.length > 0) {
      return {
        tableName: 'permissions',
        checkType: 'mapping_integrity',
        status: 'FAIL',
        message: `Found ${conflicts.length} permission mapping conflicts`,
        affectedRecords: conflicts,
        timestamp: new Date().toISOString(),
        severity: 'CRITICAL'
      };
    }

    return {
      tableName: 'permissions',
      checkType: 'mapping_integrity',
      status: 'PASS',
      message: 'No permission mapping conflicts detected',
      timestamp: new Date().toISOString(),
      severity: 'LOW'
    };
  } catch (error) {
    return {
      tableName: 'permissions',
      checkType: 'mapping_integrity',
      status: 'FAIL',
      message: `Permission integrity check failed: ${error}`,
      timestamp: new Date().toISOString(),
      severity: 'HIGH'
    };
  }
}

/**
 * Helper function to simulate frontend action mapping
 */
function mapToFrontendAction(resource: string, action: string): string {
  const dbActionId = `${resource}-${action}`;
  
  // This should match the mapping in supabasePermissionService.ts
  const actionMapping: Record<string, string> = {
    'doctors-edit': 'manage-doctors',
    'doctors-manage': 'manage-doctors',
    'procedures-edit': 'manage-procedure-types',
    'procedures-manage': 'manage-procedure-types',
    // Add other mappings as needed
  };
  
  return actionMapping[dbActionId] || dbActionId;
}

/**
 * User data consistency check
 * Prevents soft-deletion and restoration issues
 */
async function checkUserDataConsistency(): Promise<IntegrityCheckResult> {
  try {
    // Check for users with inconsistent deletion states
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, username, email, deleted_at, enabled');

    if (error) {
      return {
        tableName: 'profiles',
        checkType: 'user_consistency',
        status: 'FAIL',
        message: `Failed to check user consistency: ${error.message}`,
        timestamp: new Date().toISOString(),
        severity: 'HIGH'
      };
    }

    const issues: any[] = [];

    // Check for duplicate usernames/emails among active users
    const activeUsers = users?.filter(u => !u.deleted_at) || [];
    const usernameMap = new Map();
    const emailMap = new Map();

    activeUsers.forEach(user => {
      if (usernameMap.has(user.username)) {
        issues.push({
          type: 'duplicate_username',
          username: user.username,
          users: [usernameMap.get(user.username), user]
        });
      } else {
        usernameMap.set(user.username, user);
      }

      if (user.email && emailMap.has(user.email)) {
        issues.push({
          type: 'duplicate_email',
          email: user.email,
          users: [emailMap.get(user.email), user]
        });
      } else if (user.email) {
        emailMap.set(user.email, user);
      }
    });

    // Check for enabled users that are marked as deleted
    const inconsistentUsers = users?.filter(u => u.deleted_at && u.enabled) || [];
    inconsistentUsers.forEach(user => {
      issues.push({
        type: 'enabled_but_deleted',
        user
      });
    });

    if (issues.length > 0) {
      return {
        tableName: 'profiles',
        checkType: 'user_consistency',
        status: 'FAIL',
        message: `Found ${issues.length} user data consistency issues`,
        affectedRecords: issues,
        timestamp: new Date().toISOString(),
        severity: 'HIGH'
      };
    }

    return {
      tableName: 'profiles',
      checkType: 'user_consistency',
      status: 'PASS',
      message: 'No user data consistency issues detected',
      timestamp: new Date().toISOString(),
      severity: 'LOW'
    };
  } catch (error) {
    return {
      tableName: 'profiles',
      checkType: 'user_consistency',
      status: 'FAIL',
      message: `User consistency check failed: ${error}`,
      timestamp: new Date().toISOString(),
      severity: 'HIGH'
    };
  }
}

/**
 * Case reference number uniqueness check
 */
async function checkCaseReferenceUniqueness(): Promise<IntegrityCheckResult> {
  try {
    const { data: duplicates, error } = await supabase.rpc('find_duplicate_case_references');

    if (error) {
      // If the RPC doesn't exist, do a manual check
      const { data: cases, error: fetchError } = await supabase
        .from('case_bookings')
        .select('case_reference_number');

      if (fetchError) {
        return {
          tableName: 'case_bookings',
          checkType: 'reference_uniqueness',
          status: 'FAIL',
          message: `Failed to check case reference uniqueness: ${fetchError.message}`,
          timestamp: new Date().toISOString(),
          severity: 'MEDIUM'
        };
      }

      // Manual duplicate detection
      const refCounts = new Map();
      cases?.forEach(caseItem => {
        const count = refCounts.get(caseItem.case_reference_number) || 0;
        refCounts.set(caseItem.case_reference_number, count + 1);
      });

      const duplicateRefs = Array.from(refCounts.entries())
        .filter(([ref, count]) => count > 1)
        .map(([ref, count]) => ({ case_reference_number: ref, count }));

      if (duplicateRefs.length > 0) {
        return {
          tableName: 'case_bookings',
          checkType: 'reference_uniqueness',
          status: 'FAIL',
          message: `Found ${duplicateRefs.length} duplicate case reference numbers`,
          affectedRecords: duplicateRefs,
          timestamp: new Date().toISOString(),
          severity: 'HIGH'
        };
      }
    }

    return {
      tableName: 'case_bookings',
      checkType: 'reference_uniqueness',
      status: 'PASS',
      message: 'All case reference numbers are unique',
      timestamp: new Date().toISOString(),
      severity: 'LOW'
    };
  } catch (error) {
    return {
      tableName: 'case_bookings',
      checkType: 'reference_uniqueness',
      status: 'FAIL',
      message: `Case reference uniqueness check failed: ${error}`,
      timestamp: new Date().toISOString(),
      severity: 'MEDIUM'
    };
  }
}

/**
 * System settings consistency check
 */
async function checkSystemSettingsConsistency(): Promise<IntegrityCheckResult> {
  try {
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value');

    if (error) {
      return {
        tableName: 'system_settings',
        checkType: 'settings_consistency',
        status: 'FAIL',
        message: `Failed to check system settings: ${error.message}`,
        timestamp: new Date().toISOString(),
        severity: 'MEDIUM'
      };
    }

    // Check for duplicate setting keys
    const keyMap = new Map();
    const duplicates: any[] = [];

    settings?.forEach(setting => {
      if (keyMap.has(setting.setting_key)) {
        duplicates.push({
          setting_key: setting.setting_key,
          existing: keyMap.get(setting.setting_key),
          duplicate: setting
        });
      } else {
        keyMap.set(setting.setting_key, setting);
      }
    });

    if (duplicates.length > 0) {
      return {
        tableName: 'system_settings',
        checkType: 'settings_consistency',
        status: 'FAIL',
        message: `Found ${duplicates.length} duplicate setting keys`,
        affectedRecords: duplicates,
        timestamp: new Date().toISOString(),
        severity: 'MEDIUM'
      };
    }

    return {
      tableName: 'system_settings',
      checkType: 'settings_consistency',
      status: 'PASS',
      message: 'No system settings consistency issues detected',
      timestamp: new Date().toISOString(),
      severity: 'LOW'
    };
  } catch (error) {
    return {
      tableName: 'system_settings',
      checkType: 'settings_consistency',
      status: 'FAIL',
      message: `System settings consistency check failed: ${error}`,
      timestamp: new Date().toISOString(),
      severity: 'MEDIUM'
    };
  }
}

/**
 * Run comprehensive data integrity checks
 */
export async function runDataIntegrityChecks(): Promise<IntegrityReport> {
  const checks = await Promise.all([
    checkPermissionMappingIntegrity(),
    checkUserDataConsistency(),
    checkCaseReferenceUniqueness(),
    checkSystemSettingsConsistency()
  ]);

  const summary = {
    total: checks.length,
    passed: checks.filter(c => c.status === 'PASS').length,
    warnings: checks.filter(c => c.status === 'WARNING').length,
    failures: checks.filter(c => c.status === 'FAIL').length
  };

  const criticalFailures = checks.filter(c => c.status === 'FAIL' && c.severity === 'CRITICAL').length;
  const highFailures = checks.filter(c => c.status === 'FAIL' && c.severity === 'HIGH').length;

  let overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  if (criticalFailures > 0) {
    overallStatus = 'CRITICAL';
  } else if (highFailures > 0 || summary.failures > 0) {
    overallStatus = 'WARNING';
  } else {
    overallStatus = 'HEALTHY';
  }

  const recommendations: string[] = [];
  
  // Generate recommendations based on findings
  if (criticalFailures > 0) {
    recommendations.push('CRITICAL: Immediate action required to resolve data integrity issues');
  }
  if (checks.some(c => c.checkType === 'mapping_integrity' && c.status === 'FAIL')) {
    recommendations.push('Review and clean up duplicate permission mappings');
  }
  if (checks.some(c => c.checkType === 'user_consistency' && c.status === 'FAIL')) {
    recommendations.push('Audit user accounts for consistency issues');
  }
  if (summary.failures === 0 && summary.warnings === 0) {
    recommendations.push('Data integrity is healthy - continue regular monitoring');
  }

  return {
    overallStatus,
    checks,
    summary,
    recommendations
  };
}

/**
 * Schedule periodic integrity checks
 */
export function scheduleIntegrityChecks(intervalMinutes: number = 60): void {
  setInterval(async () => {
    try {
      const report = await runDataIntegrityChecks();
      
      if (report.overallStatus !== 'HEALTHY') {
        console.warn('🚨 DATA INTEGRITY ALERT:', report);
        
        // Here you could send alerts, log to monitoring systems, etc.
        if (report.overallStatus === 'CRITICAL') {
          console.error('🔥 CRITICAL DATA INTEGRITY ISSUES DETECTED:', report.checks.filter(c => c.severity === 'CRITICAL'));
        }
      }
    } catch (error) {
      console.error('❌ DATA INTEGRITY CHECK FAILED:', error);
    }
  }, intervalMinutes * 60 * 1000);
}

// Export monitoring utilities
export const IntegrityMonitor = {
  runDataIntegrityChecks,
  scheduleIntegrityChecks,
  checkPermissionMappingIntegrity,
  checkUserDataConsistency,
  checkCaseReferenceUniqueness,
  checkSystemSettingsConsistency
};