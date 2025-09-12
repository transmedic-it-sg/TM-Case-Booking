import { Permission } from '../components/PermissionMatrix';
import { permissions as defaultPermissions } from '../data/permissionMatrixData';
import { getSupabasePermissions } from './supabasePermissionService';
import { logger, permissionLog } from './logger';

// Cache for permissions to avoid repeated async calls
let permissionsCache: Permission[] | null = null;
let permissionsCacheTime = 0;
let initializationPromise: Promise<void> | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes - Extended for stability

// Get current runtime permissions (from Supabase or default)
export const getRuntimePermissions = async (): Promise<Permission[]> => {
  try {
    const permissions = await getSupabasePermissions();
    // Update cache
    permissionsCache = permissions;
    permissionsCacheTime = Date.now();
    return permissions;
  } catch (error) {
    console.error('Error loading runtime permissions, using defaults:', error);
    // Clear cache on error to prevent stale data
    clearPermissionsCache();
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
  
  // Admin has all permissions (hardcoded as root user) - ALWAYS ALLOW
  if (roleId === 'admin') {
    permissionLog('Admin access granted', { role: roleId, action: actionId });
    return true;
  }
  
  // For all other roles, use database permissions with improved fallback
  if (!permissionsCache || (Date.now() - permissionsCacheTime >= CACHE_DURATION)) {
    console.warn(`🔄 Permission cache expired for ${roleId} - ${actionId}: Attempting refresh...`);
    
    // Trigger async re-initialization without blocking
    initializePermissions(false).catch(error => {
      console.error('❌ Failed to refresh permissions cache:', error);
    });
    
    // Allow access for critical actions during cache refresh to prevent lockouts
    const criticalActions = ['view-cases', 'create-case', 'booking-calendar'];
    if (criticalActions.includes(actionId)) {
      console.warn(`⚠️ Allowing critical action ${actionId} during cache refresh`);
      return true;
    }
    
    // FAIL SECURE: Deny access for non-critical actions when permissions cannot be verified
    console.warn(`🔒 Permission DENIED for ${roleId} - ${actionId}: Cache unavailable and not a critical action`);
    return false;
  }
  
  // Use cached database permissions for authorization
  const permission = permissionsCache.find(p => p.roleId === roleId && p.actionId === actionId);
  const result = permission?.allowed || false;
  
  console.log('🔍 Permission lookup result:', {
    roleId,
    actionId,
    permissionFound: !!permission,
    permissionData: permission,
    result,
    allPermissionsForRole: permissionsCache.filter(p => p.roleId === roleId),
    allActionsInCache: Array.from(new Set(permissionsCache.map(p => p.actionId))).sort()
  });
  
  
  return result;
};

// Initialize permissions cache - force refresh on app start for browser refresh scenarios
export const initializePermissions = async (forceRefresh: boolean = false): Promise<void> => {
  // If there's already an initialization in progress and not forcing refresh, wait for it
  if (initializationPromise && !forceRefresh) {
    return initializationPromise;
  }
  
  // If forcing refresh, clear the existing promise
  if (forceRefresh) {
    initializationPromise = null;
  }
  
  // Create new initialization promise
  initializationPromise = (async () => {
    try {
      // Clear cache if force refresh is requested (e.g., on login or app startup)
      if (forceRefresh) {
        clearPermissionsCache();
      }
      
      const permissions = await getRuntimePermissions();
      console.log('✅ Permissions system initialized successfully');
      console.log(`📊 Loaded ${permissions.length} permissions from database`);
      console.log('🔍 Permission breakdown by role:', 
        permissions.reduce((acc, p) => {
          acc[p.roleId] = (acc[p.roleId] || 0) + (p.allowed ? 1 : 0);
          return acc;
        }, {} as Record<string, number>)
      );
      
      // Set up automatic cache refresh to prevent expiry issues
      schedulePermissionCacheRefresh();
      
    } catch (error) {
      console.error('❌ Error initializing permissions system:', error);
      console.error('🚨 SECURITY WARNING: Permission system failed to initialize - access will be denied to all non-admin users');
      // Clear cache to ensure fail-secure behavior
      permissionsCache = null;
      permissionsCacheTime = 0;
    } finally {
      // Clear the promise when done
      initializationPromise = null;
    }
  })();
  
  return initializationPromise;
};

// Auto-refresh permissions cache before expiry
let refreshTimer: NodeJS.Timeout | null = null;

const schedulePermissionCacheRefresh = () => {
  // Clear existing timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  
  // Schedule refresh 5 minutes before expiry
  const refreshDelay = CACHE_DURATION - (5 * 60 * 1000);
  refreshTimer = setTimeout(async () => {
    console.log('🔄 Auto-refreshing permissions cache to prevent expiry...');
    try {
      await getRuntimePermissions();
      console.log('✅ Permissions cache auto-refreshed successfully');
      // Schedule next refresh
      schedulePermissionCacheRefresh();
    } catch (error) {
      console.error('❌ Failed to auto-refresh permissions cache:', error);
      // Retry in 1 minute
      refreshTimer = setTimeout(() => schedulePermissionCacheRefresh(), 60 * 1000);
    }
  }, refreshDelay);
};

// Clear permissions cache to force reload
export const clearPermissionsCache = (): void => {
  permissionsCache = null;
  permissionsCacheTime = 0;
  
  // Clear auto-refresh timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  
  logger.debug('Permissions cache cleared');
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
  UPDATE_CASE_STATUS: 'update-case-status',
  CANCEL_CASE: 'cancel-case',
  EDIT_SETS: 'edit-sets',
  BOOKING_CALENDAR: 'booking-calendar',
  
  // Status Transitions
  PROCESS_ORDER: 'process-order',
  ORDER_PROCESSED: 'order-processed',
  SALES_APPROVAL: 'sales-approval',
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
  RESET_PASSWORD: 'reset-password',
  EDIT_COUNTRIES: 'edit-countries',
  GLOBAL_TABLES: 'global-tables',
  
  // System Settings
  SYSTEM_SETTINGS: 'system-settings',
  EMAIL_CONFIG: 'email-config',
  CODE_TABLE_SETUP: 'code-table-setup',
  BACKUP_RESTORE: 'backup-restore',
  AUDIT_LOGS: 'audit-logs',
  PERMISSION_MATRIX: 'permission-matrix',
  
  // Data Operations
  EXPORT_DATA: 'export-data',
  IMPORT_DATA: 'import-data',
  VIEW_REPORTS: 'view-reports',
  
  // File Operations
  UPLOAD_FILES: 'upload-files',
  DOWNLOAD_FILES: 'download-files',
  DELETE_FILES: 'delete-files',
  MANAGE_ATTACHMENTS: 'manage-attachments'
} as const;

// Check if user can manage attachments for a specific case
export const canManageAttachments = (userId: string, userRole: string, caseSubmittedBy: string): boolean => {
  // Admin can manage all attachments
  if (userRole === 'admin') {
    return true;
  }
  
  // Case creator can manage attachments
  if (userId === caseSubmittedBy) {
    return true;
  }
  
  // Managers can manage attachments (manager role or users with MANAGE_ATTACHMENTS permission)
  if (userRole === 'manager' || hasPermission(userRole, PERMISSION_ACTIONS.MANAGE_ATTACHMENTS)) {
    return true;
  }
  
  return false;
};

// Check if user can view/download attachments (more permissive)
export const canViewAttachments = (userId: string, userRole: string): boolean => {
  // Admin can view all attachments
  if (userRole === 'admin') {
    return true;
  }
  
  // Users with download permission can view attachments
  if (hasPermission(userRole, PERMISSION_ACTIONS.DOWNLOAD_FILES)) {
    return true;
  }
  
  return false;
};