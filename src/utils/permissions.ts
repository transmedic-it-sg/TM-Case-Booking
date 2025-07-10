import { Permission } from '../components/PermissionMatrix';
import { permissions as defaultPermissions } from '../data/permissionMatrixData';
import { getSupabasePermissions } from './supabasePermissionService';

// Cache for permissions to avoid repeated async calls
let permissionsCache: Permission[] | null = null;
let permissionsCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get current runtime permissions (from Supabase or default)
export const getRuntimePermissions = async (): Promise<Permission[]> => {
  try {
    const permissions = await getSupabasePermissions();
    // Update cache
    permissionsCache = permissions;
    permissionsCacheTime = Date.now();
    return permissions;
  } catch (error) {
    console.error('Error loading runtime permissions:', error);
    return defaultPermissions;
  }
};

// Save runtime permissions to Supabase
export const saveRuntimePermissions = async (permissions: Permission[]): Promise<void> => {
  try {
    const { saveSupabasePermissions } = await import('./supabasePermissionService');
    await saveSupabasePermissions(permissions);
    // Clear cache first, then update with new permissions
    clearPermissionsCache();
    permissionsCache = permissions;
    permissionsCacheTime = Date.now();
    console.log('Permissions saved and cache updated');
  } catch (error) {
    console.error('Error saving runtime permissions:', error);
    // Clear cache on error to force reload from Supabase
    clearPermissionsCache();
  }
};

// Check if a role has permission for a specific action
export const hasPermission = (roleId: string, actionId: string): boolean => {
  // Admin has all permissions
  if (roleId === 'admin') {
    return true;
  }
  
  // Use cached permissions if available and not expired
  let permissionsToCheck = defaultPermissions;
  if (permissionsCache && (Date.now() - permissionsCacheTime < CACHE_DURATION)) {
    permissionsToCheck = permissionsCache;
    // console.log(`Using cached permissions for ${roleId} - ${actionId}`);
  } else {
    // console.log(`Using default permissions for ${roleId} - ${actionId} (cache expired or not available)`);
  }
  
  const permission = permissionsToCheck.find(p => p.roleId === roleId && p.actionId === actionId);
  const result = permission?.allowed || false;
  
  // Debug logging for IT role permissions
  if (roleId === 'it' && ['create-case', 'code-table-setup', 'view-users', 'email-config', 'audit-logs'].includes(actionId)) {
    console.log(`Permission check for IT ${actionId}: ${result}`, {
      roleId,
      actionId,
      permission,
      usingCache: permissionsCache && (Date.now() - permissionsCacheTime < CACHE_DURATION),
      cacheTime: permissionsCacheTime,
      now: Date.now(),
      cacheAge: Date.now() - permissionsCacheTime,
      cacheDuration: CACHE_DURATION
    });
  }
  
  return result;
};

// Initialize permissions cache
export const initializePermissions = async (): Promise<void> => {
  try {
    await getRuntimePermissions();
  } catch (error) {
    console.error('Error initializing permissions:', error);
  }
};

// Clear permissions cache to force reload
export const clearPermissionsCache = (): void => {
  permissionsCache = null;
  permissionsCacheTime = 0;
  console.log('Permissions cache cleared');
};

// Get all permissions for a specific role
export const getRolePermissions = (roleId: string): Permission[] => {
  return defaultPermissions.filter(p => p.roleId === roleId && p.allowed);
};

// Update a specific permission
export const updatePermission = async (roleId: string, actionId: string, allowed: boolean): Promise<void> => {
  try {
    const { updateSupabasePermission } = await import('./supabasePermissionService');
    await updateSupabasePermission(roleId, actionId, allowed);
  } catch (error) {
    console.error('Error updating permission:', error);
  }
};

// Reset permissions to default
export const resetPermissions = async (): Promise<void> => {
  try {
    const { resetSupabasePermissions } = await import('./supabasePermissionService');
    await resetSupabasePermissions();
  } catch (error) {
    console.error('Error resetting permissions:', error);
  }
};

// Permission action IDs for easy reference
export const PERMISSION_ACTIONS = {
  // Case Management
  CREATE_CASE: 'create-case',
  VIEW_CASES: 'view-cases',
  AMEND_CASE: 'amend-case',
  DELETE_CASE: 'delete-case',
  CANCEL_CASE: 'cancel-case',
  EDIT_SETS: 'edit-sets',
  BOOKING_CALENDAR: 'booking-calendar',
  
  // Status Transitions
  PROCESS_ORDER: 'process-order',
  ORDER_PROCESSED: 'order-processed',
  PENDING_DELIVERY_HOSPITAL: 'pending-delivery-hospital',
  DELIVERED_HOSPITAL: 'delivered-hospital',
  CASE_COMPLETED: 'case-completed',
  PENDING_DELIVERY_OFFICE: 'pending-delivery-office',
  DELIVERED_OFFICE: 'delivered-office',
  TO_BE_BILLED: 'to-be-billed',
  CASE_CLOSED: 'case-closed',
  
  // User Management
  CREATE_USER: 'create-user',
  EDIT_USER: 'edit-user',
  DELETE_USER: 'delete-user',
  VIEW_USERS: 'view-users',
  ENABLE_DISABLE_USER: 'enable-disable-user',
  
  // System Settings
  SYSTEM_SETTINGS: 'system-settings',
  EMAIL_CONFIG: 'email-config',
  CODE_TABLE_SETUP: 'code-table-setup',
  BACKUP_RESTORE: 'backup-restore',
  AUDIT_LOGS: 'audit-logs',
  
  // Data Operations
  EXPORT_DATA: 'export-data',
  IMPORT_DATA: 'import-data',
  VIEW_REPORTS: 'view-reports',
  
  // File Operations
  UPLOAD_FILES: 'upload-files',
  DOWNLOAD_FILES: 'download-files',
  DELETE_FILES: 'delete-files'
} as const;