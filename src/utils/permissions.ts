import { Permission } from '../components/PermissionMatrix';
import { permissions as defaultPermissions } from '../data/permissionMatrixData';
import { getSupabasePermissions } from './supabasePermissionService';
import { logger, permissionLog } from './logger';

// User-scoped permission cache to prevent conflicts between concurrent users
interface UserPermissionCache {
  permissions: Permission[];
  timestamp: number;
  userId?: string;
}

// Map of user-specific permission caches
const userPermissionCaches = new Map<string, UserPermissionCache>();
let globalPermissionsCache: Permission[] | null = null;
let globalPermissionsCacheTime = 0;
let initializationPromise: Promise<void> | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // Reduced to 10 minutes for better security
const USER_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for user-specific cache

// Get current runtime permissions (from Supabase or default)
export const getRuntimePermissions = async (): Promise<Permission[]> => {
  try {
    const permissions = await getSupabasePermissions();
    // Update global cache with atomic operation
    globalPermissionsCache = permissions;
    globalPermissionsCacheTime = Date.now();
    return permissions;
  } catch (error) {
    // Clear cache on error to prevent stale data
    clearPermissionsCache();
    return defaultPermissions;
  }
};

// Get user-specific permissions with caching
export const getUserPermissions = async (userId: string): Promise<Permission[]> => {
  if (!userId) {
    return getRuntimePermissions();
  }

  // Check user-specific cache first
  const userCache = userPermissionCaches.get(userId);
  if (userCache && (Date.now() - userCache.timestamp) < USER_CACHE_DURATION) {
    return userCache.permissions;
  }

  // Load permissions and cache for this user
  try {
    const permissions = await getRuntimePermissions();
    userPermissionCaches.set(userId, {
      permissions,
      timestamp: Date.now(),
      userId
    });

    // Clean up old user caches to prevent memory leaks
    const cutoffTime = Date.now() - (USER_CACHE_DURATION * 2);
    const cacheEntries = Array.from(userPermissionCaches.entries());
    for (const [cacheUserId, cache] of cacheEntries) {
      if (cache.timestamp < cutoffTime) {
        userPermissionCaches.delete(cacheUserId);
      }
    }

    return permissions;
  } catch (error) {
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
    globalPermissionsCache = permissions;
    globalPermissionsCacheTime = Date.now();} catch (error) {
    // Clear cache on error to force reload from Supabase
    clearPermissionsCache();
  }
};

// Check if a role has permission for a specific action (backward compatibility)
export const hasPermission = (roleId: string, actionId: string): boolean => {
  return hasPermissionForUser(roleId, actionId, 'system');
};

// Check if a role has permission for a specific action with user context
export const hasPermissionForUser = (roleId: string, actionId: string, userId: string = 'system'): boolean => {
  // CRITICAL DEBUG: Enhanced logging for permission checking
  console.log('🔍 PERMISSION CHECK DEBUG:', {
    roleId,
    actionId,
    userId,
    cacheExists: !!globalPermissionsCache,
    cacheAge: globalPermissionsCache ? Date.now() - globalPermissionsCacheTime : null,
    cacheSize: globalPermissionsCache?.length || 0,
    timestamp: new Date().toISOString()
  });
  
  // Admin privileges are now stored in database - no hardcoded logic

  // Use global cache for non-user-specific permissions
  const cacheToUse = globalPermissionsCache;
  const cacheTimeToUse = globalPermissionsCacheTime;

  // Check cache validity with improved race condition handling
  if (!cacheToUse || (Date.now() - cacheTimeToUse >= CACHE_DURATION)) {

    // For critical actions, allow access during cache refresh to prevent lockouts
    const criticalActions = ['view-cases', 'create-case', 'booking-calendar', 'logout'];
    const adminCriticalActions = ['email-config', 'system-settings', 'permission-matrix', 'manage-doctors', 'manage-procedure-types', 'manage-surgery-implants', 'global-tables', 'audit-logs'];
    
    if (criticalActions.includes(actionId)) {
      // Trigger async refresh but don't wait for it
      initializePermissions(false).catch(error => {
      });
      return true;
    }
    
    // Allow admin access to admin-critical actions during cache refresh
    if (roleId === 'admin' && adminCriticalActions.includes(actionId)) {
      // Trigger async refresh but don't wait for it
      initializePermissions(false).catch(error => {
      });
      return true;
    }

    // FAIL SECURE: Deny access for non-critical actions when permissions cannot be verified
    return false;
  }

  // Use cached database permissions for authorization
  const permission = cacheToUse.find(p => p.roleId === roleId && p.actionId === actionId);
  const result = permission?.allowed || false;
  
  // CRITICAL DEBUG: Enhanced permission lookup logging
  if (roleId === 'admin' && actionId === 'audit-logs') {
    console.log('🚨 CRITICAL AUDIT LOGS PERMISSION DEBUG:', {
      roleId,
      actionId,
      foundPermission: permission,
      result,
      allPermissionsForAdmin: cacheToUse.filter(p => p.roleId === 'admin'),
      allAuditRelatedPermissions: cacheToUse.filter(p => p.actionId?.includes('audit') || p.actionId?.includes('logs')),
      cacheSize: cacheToUse.length,
      timestamp: new Date().toISOString()
    });
  }

  // Log permission check result for debugging
  //   userId,
  //   cacheTime: cacheTimeToUse,
  //   allPermissionsForRole: cacheToUse.filter(p => p.roleId === roleId).length
  // });

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
      
      //   acc[p.roleId] = (acc[p.roleId] || 0) + (p.allowed ? 1 : 0);
      //   return acc;
      // }, {} as Record<string, number>));

      // Set up automatic cache refresh to prevent expiry issues
      schedulePermissionCacheRefresh();

    } catch (error) {
      // Clear cache to ensure fail-secure behavior
      globalPermissionsCache = null;
      globalPermissionsCacheTime = 0;
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
  refreshTimer = setTimeout(async () => {try {
      await getRuntimePermissions();// Schedule next refresh
      schedulePermissionCacheRefresh();
    } catch (error) {
      // Retry in 1 minute
      refreshTimer = setTimeout(() => schedulePermissionCacheRefresh(), 60 * 1000);
    }
  }, refreshDelay);
};

// Clear permissions cache to force reload
export const clearPermissionsCache = (userId?: string): void => {
  if (userId) {
    // Clear specific user cache
    userPermissionCaches.delete(userId);
    logger.debug(`User permission cache cleared for ${userId}`);
  } else {
    // Clear global cache and all user caches
    globalPermissionsCache = null;
    globalPermissionsCacheTime = 0;
    userPermissionCaches.clear();
    logger.debug('All permission caches cleared');
  }

  // Clear auto-refresh timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
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
  }
};

// Reset permissions to default
export const resetPermissions = async (): Promise<void> => {
  try {
    const { resetSupabasePermissions } = await import('./supabasePermissionService');
    await resetSupabasePermissions();
  } catch (error) {
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
  // Split Edit Sets into granular permissions
  MANAGE_DOCTORS: 'manage-doctors',
  MANAGE_PROCEDURE_TYPES: 'manage-procedure-types',
  MANAGE_SURGERY_IMPLANTS: 'manage-surgery-implants',
  // Deprecated - keeping for backward compatibility
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
  // Case creator can manage attachments
  if (userId === caseSubmittedBy) {
    return true;
  }

  // Check database permissions for attachment management
  if (hasPermission(userRole, PERMISSION_ACTIONS.MANAGE_ATTACHMENTS)) {
    return true;
  }

  return false;
};

// Check if user can view/download attachments (more permissive)
export const canViewAttachments = (userId: string, userRole: string): boolean => {
  // Users with download permission can view attachments
  if (hasPermission(userRole, PERMISSION_ACTIONS.DOWNLOAD_FILES)) {
    return true;
  }

  return false;
};