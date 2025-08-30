/**
 * Audit Service - Separate audit logging system for tracking all user activities
 * This is independent of the notification system and stores all activity permanently
 */

import { supabase } from '../lib/supabase';
import { getSystemConfig } from './systemSettingsService';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  userId: string;
  userRole: string;
  action: string;
  category: string;
  target: string;
  details: string;
  ipAddress: string;
  status: 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
  country?: string;
  department?: string;
}

export type AuditCategory = 
  | 'Authentication'
  | 'User Management'
  | 'Case Management'
  | 'Status Change'
  | 'Security'
  | 'System'
  | 'Permission'
  | 'Data Export'
  | 'Code Table'
  | 'Email Configuration'
  | 'Attachment Management';

const AUDIT_LOGS_KEY = 'audit-logs';

/**
 * Add an audit log entry
 */
export const addAuditLog = async (
  user: string,
  userId: string,
  userRole: string,
  action: string,
  category: AuditCategory,
  target: string,
  details: string,
  status: 'success' | 'warning' | 'error' = 'success',
  metadata?: Record<string, any>,
  country?: string,
  department?: string
): Promise<void> => {
  try {
    const auditEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      user,
      userId,
      userRole,
      action,
      category,
      target,
      details,
      ipAddress: await getClientIP(),
      status,
      metadata,
      country,
      department
    };

    // Save to Supabase
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        id: auditEntry.id,
        timestamp: auditEntry.timestamp,
        user_name: auditEntry.user,
        user_id: auditEntry.userId,
        user_role: auditEntry.userRole,
        action: auditEntry.action,
        category: auditEntry.category,
        target: auditEntry.target,
        details: auditEntry.details,
        ip_address: auditEntry.ipAddress,
        status: auditEntry.status,
        metadata: auditEntry.metadata,
        country: auditEntry.country,
        department: auditEntry.department
      }]);

    if (error) {
      // Only fall back to localStorage if it's a network issue or table doesn't exist
      if (error.message && (error.message.includes('Failed to fetch') || 
          error.message.includes('network') || 
          error.message.includes('does not exist'))) {
        console.warn('Network error or table missing, falling back to localStorage');
        
        // Fallback to localStorage
        const existingLogs = await getAuditLogsFromLocalStorage();
        const updatedLogs = [auditEntry, ...existingLogs];
        
        // Keep only the latest 1000 audit entries to prevent localStorage bloat
        const trimmedLogs = updatedLogs.slice(0, 1000);
        
        localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(trimmedLogs));
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('Failed to add audit log:', error);
  }
};

/**
 * Get all audit logs
 */
export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
  try {
    // Get from Supabase
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (error) {
      // Only fall back to localStorage if it's a network issue or table doesn't exist
      if (error.message && (error.message.includes('Failed to fetch') || 
          error.message.includes('network') || 
          error.message.includes('does not exist'))) {
        console.warn('Network error or table missing, falling back to localStorage');
        return await getAuditLogsFromLocalStorage();
      }
      throw error;
    }

    // Transform Supabase data to AuditLogEntry format
    const supabaseLogs: AuditLogEntry[] = data.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      user: log.user_name,
      userId: log.user_id,
      userRole: log.user_role,
      action: log.action,
      category: log.category,
      target: log.target,
      details: log.details,
      ipAddress: log.ip_address,
      status: log.status,
      metadata: log.metadata,
      country: log.country,
      department: log.department
    }));

    return supabaseLogs;
  } catch (error) {
    console.error('Failed to load audit logs from Supabase:', error);
    return await getAuditLogsFromLocalStorage();
  }
};

/**
 * Get audit logs from localStorage (fallback)
 */
const getAuditLogsFromLocalStorage = async (): Promise<AuditLogEntry[]> => {
  try {
    const logs = localStorage.getItem(AUDIT_LOGS_KEY);
    if (logs) {
      return JSON.parse(logs);
    }
    return [];
  } catch (error) {
    console.error('Failed to load audit logs from localStorage:', error);
    return [];
  }
};

/**
 * Get audit logs filtered by criteria
 */
export const getFilteredAuditLogs = async (filters: {
  userId?: string;
  userRole?: string;
  category?: string;
  action?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  country?: string;
  department?: string;
}): Promise<AuditLogEntry[]> => {
  const allLogs = await getAuditLogs();
  
  return allLogs.filter(log => {
    if (filters.userId && log.userId !== filters.userId) return false;
    if (filters.userRole && log.userRole !== filters.userRole) return false;
    if (filters.category && log.category !== filters.category) return false;
    if (filters.action && !log.action.toLowerCase().includes(filters.action.toLowerCase())) return false;
    if (filters.status && log.status !== filters.status) return false;
    if (filters.country && log.country !== filters.country) return false;
    if (filters.department && log.department !== filters.department) return false;
    
    if (filters.dateFrom) {
      if (new Date(log.timestamp) < new Date(filters.dateFrom)) return false;
    }
    
    if (filters.dateTo) {
      if (new Date(log.timestamp) > new Date(filters.dateTo + 'T23:59:59')) return false;
    }
    
    return true;
  });
};

/**
 * Clear old audit logs (admin only) - clears logs older than configured retention period
 */
export const clearOldAuditLogs = async (): Promise<number> => {
  try {
    // Get system configuration for audit log retention
    const config = await getSystemConfig();
    const retentionDays = config.auditLogRetention || 90; // Default to 90 days if not configured
    
    // Calculate cutoff date based on configured retention period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffDateString = cutoffDate.toISOString();
    
    console.log(`Clearing audit logs older than ${retentionDays} days (${cutoffDateString})`);
    
    // Delete from Supabase
    const { data: logsToDelete, error: selectError } = await supabase
      .from('audit_logs')
      .select('id')
      .lt('timestamp', cutoffDateString);
    
    if (selectError) {
      console.error('Error finding old audit logs:', selectError);
      throw selectError;
    }
    
    const deletedCount = logsToDelete?.length || 0;
    
    if (deletedCount > 0) {
      const { error: deleteError } = await supabase
        .from('audit_logs')
        .delete()
        .lt('timestamp', cutoffDateString);
      
      if (deleteError) {
        console.error('Error deleting old audit logs:', deleteError);
        throw deleteError;
      }
      
      console.log(`Successfully cleared ${deletedCount} old audit logs from Supabase`);
    } else {
      console.log('No old audit logs found to clear');
    }
    
    // Also clear from localStorage as backup
    try {
      const localLogs = await getAuditLogsFromLocalStorage();
      const filteredLocalLogs = localLogs.filter(log => 
        new Date(log.timestamp) > cutoffDate
      );
      localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(filteredLocalLogs));
      console.log('Also cleared old logs from localStorage');
    } catch (localError) {
      console.warn('Could not clear localStorage audit logs:', localError);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Failed to clear old audit logs:', error);
    return 0;
  }
};

/**
 * Export audit logs to JSON
 */
export const exportAuditLogs = async (filters?: any): Promise<string> => {
  const logs = filters ? await getFilteredAuditLogs(filters) : await getAuditLogs();
  return JSON.stringify(logs, null, 2);
};

/**
 * Get client IP address (simplified for demo)
 */
const getClientIP = async (): Promise<string> => {
  // In a real application, you would get the actual client IP
  // For demo purposes, we'll use a placeholder
  return '192.168.1.100';
};

/**
 * Convenience functions for common audit actions
 */

// Authentication audit logs
export const auditLogin = async (user: string, userId: string, userRole: string, country?: string) => {
  await addAuditLog(
    user, 
    userId, 
    userRole, 
    'User Login', 
    'Authentication', 
    'Authentication System', 
    `User ${user} logged in successfully`,
    'success',
    { loginMethod: 'username/password' },
    country
  );
};

export const auditLogout = async (user: string, userId: string, userRole: string, country?: string) => {
  await addAuditLog(
    user, 
    userId, 
    userRole, 
    'User Logout', 
    'Authentication', 
    'Authentication System', 
    `User ${user} logged out`,
    'success',
    {},
    country
  );
};

export const auditFailedLogin = async (username: string, reason: string) => {
  await addAuditLog(
    username, 
    'unknown', 
    'unknown', 
    'Failed Login', 
    'Security', 
    'Authentication System', 
    `Failed login attempt for ${username}: ${reason}`,
    'error',
    { failureReason: reason }
  );
};

// Case management audit logs
export const auditCaseCreated = async (user: string, userId: string, userRole: string, caseId: string, caseRef: string, country?: string, department?: string) => {
  await addAuditLog(
    user, 
    userId, 
    userRole, 
    'Case Created', 
    'Case Management', 
    caseRef, 
    `Case ${caseRef} created by ${user}`,
    'success',
    { caseId },
    country,
    department
  );
};

export const auditCaseStatusChange = async (user: string, userId: string, userRole: string, caseRef: string, oldStatus: string, newStatus: string, country?: string, department?: string) => {
  await addAuditLog(
    user, 
    userId, 
    userRole, 
    'Status Changed', 
    'Status Change', 
    caseRef, 
    `Case ${caseRef} status changed from ${oldStatus} to ${newStatus}`,
    'success',
    { oldStatus, newStatus },
    country,
    department
  );
};

export const auditCaseAmended = async (user: string, userId: string, userRole: string, caseRef: string, changes: string[], country?: string, department?: string) => {
  await addAuditLog(
    user, 
    userId, 
    userRole, 
    'Case Amended', 
    'Case Management', 
    caseRef, 
    `Case ${caseRef} amended: ${changes.join(', ')}`,
    'success',
    { changes },
    country,
    department
  );
};

export const auditCaseDeleted = async (user: string, userId: string, userRole: string, caseRef: string, country?: string, department?: string) => {
  await addAuditLog(
    user, 
    userId, 
    userRole, 
    'Case Deleted', 
    'Case Management', 
    caseRef, 
    `Case ${caseRef} deleted by ${user}`,
    'warning',
    {},
    country,
    department
  );
};

// User management audit logs
export const auditUserCreated = async (actor: string, actorId: string, actorRole: string, targetUser: string, targetRole: string, targetCountries: string[]) => {
  await addAuditLog(
    actor, 
    actorId, 
    actorRole, 
    'User Created', 
    'User Management', 
    targetUser, 
    `User ${targetUser} created with role ${targetRole}`,
    'success',
    { targetRole, targetCountries }
  );
};

export const auditUserUpdated = async (actor: string, actorId: string, actorRole: string, targetUser: string, changes: string[]) => {
  await addAuditLog(
    actor, 
    actorId, 
    actorRole, 
    'User Updated', 
    'User Management', 
    targetUser, 
    `User ${targetUser} updated: ${changes.join(', ')}`,
    'success',
    { changes }
  );
};

export const auditUserDeleted = async (actor: string, actorId: string, actorRole: string, targetUser: string) => {
  await addAuditLog(
    actor, 
    actorId, 
    actorRole, 
    'User Deleted', 
    'User Management', 
    targetUser, 
    `User ${targetUser} deleted by ${actor}`,
    'warning'
  );
};

export const auditPasswordReset = async (actor: string, actorId: string, actorRole: string, targetUser: string) => {
  await addAuditLog(
    actor, 
    actorId, 
    actorRole, 
    'Password Reset', 
    'Security', 
    targetUser, 
    `Password reset for user ${targetUser} by ${actor}`,
    'warning'
  );
};

// Permission audit logs
export const auditPermissionChange = async (actor: string, actorId: string, actorRole: string, targetRole: string, permission: string, granted: boolean) => {
  await addAuditLog(
    actor, 
    actorId, 
    actorRole, 
    'Permission Changed', 
    'Permission', 
    targetRole, 
    `Permission ${permission} ${granted ? 'granted to' : 'revoked from'} role ${targetRole}`,
    'success',
    { permission, granted }
  );
};

// Data export audit logs
export const auditDataExport = async (user: string, userId: string, userRole: string, dataType: string, filters: any, recordCount: number, country?: string) => {
  await addAuditLog(
    user, 
    userId, 
    userRole, 
    'Data Export', 
    'Data Export', 
    dataType, 
    `${user} exported ${recordCount} records of ${dataType}`,
    'success',
    { filters, recordCount },
    country
  );
};

// Code table audit logs
export const auditCodeTableChange = async (user: string, userId: string, userRole: string, table: string, action: string, details: string, country?: string) => {
  await addAuditLog(
    user, 
    userId, 
    userRole, 
    `Code Table ${action}`, 
    'Code Table', 
    table, 
    details,
    'success',
    { table, action },
    country
  );
};

// Attachment management audit logs
export const auditAttachmentChange = async (
  user: string, 
  userId: string, 
  userRole: string, 
  caseId: string, 
  action: 'add' | 'delete' | 'replace', 
  fileName: string, 
  country: string
) => {
  const actionMap = {
    add: 'Added Attachment',
    delete: 'Deleted Attachment',
    replace: 'Replaced Attachment'
  };

  await addAuditLog(
    user, 
    userId, 
    userRole, 
    actionMap[action], 
    'Attachment Management', 
    caseId, 
    `${actionMap[action]}: ${fileName}`,
    'success',
    { action, fileName, caseId },
    country
  );
};