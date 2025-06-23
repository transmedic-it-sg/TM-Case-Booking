import { Permission } from '../components/PermissionMatrix';

// Storage key for runtime permissions
const RUNTIME_PERMISSIONS_KEY = 'app_runtime_permissions';

// Default permissions - these will be used if no runtime permissions are set
import { permissions as defaultPermissions } from '../data/permissionMatrixData';

// Get current runtime permissions (from localStorage or default)
export const getRuntimePermissions = (): Permission[] => {
  try {
    const stored = localStorage.getItem(RUNTIME_PERMISSIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading runtime permissions:', error);
  }
  return defaultPermissions;
};

// Save runtime permissions to localStorage
export const saveRuntimePermissions = (permissions: Permission[]): void => {
  try {
    localStorage.setItem(RUNTIME_PERMISSIONS_KEY, JSON.stringify(permissions));
  } catch (error) {
    console.error('Error saving runtime permissions:', error);
  }
};

// Check if a role has permission for a specific action
export const hasPermission = (roleId: string, actionId: string): boolean => {
  const permissions = getRuntimePermissions();
  const permission = permissions.find(p => p.roleId === roleId && p.actionId === actionId);
  return permission?.allowed || false;
};

// Get all permissions for a specific role
export const getRolePermissions = (roleId: string): Permission[] => {
  const permissions = getRuntimePermissions();
  return permissions.filter(p => p.roleId === roleId && p.allowed);
};

// Update a specific permission
export const updatePermission = (roleId: string, actionId: string, allowed: boolean): void => {
  const permissions = getRuntimePermissions();
  const existingIndex = permissions.findIndex(p => p.roleId === roleId && p.actionId === actionId);
  
  if (existingIndex >= 0) {
    permissions[existingIndex] = { ...permissions[existingIndex], allowed };
  } else {
    permissions.push({ roleId, actionId, allowed });
  }
  
  saveRuntimePermissions(permissions);
};

// Reset permissions to default
export const resetPermissions = (): void => {
  localStorage.removeItem(RUNTIME_PERMISSIONS_KEY);
};

// Permission action IDs for easy reference
export const PERMISSION_ACTIONS = {
  // Case Management
  CREATE_CASE: 'create-case',
  VIEW_CASES: 'view-cases',
  AMEND_CASE: 'amend-case',
  DELETE_CASE: 'delete-case',
  EDIT_SETS: 'edit-sets',
  
  // Status Transitions
  PROCESS_ORDER: 'process-order',
  ORDER_PROCESSED: 'order-processed',
  PENDING_DELIVERY_HOSPITAL: 'pending-delivery-hospital',
  DELIVERED_HOSPITAL: 'delivered-hospital',
  CASE_COMPLETED: 'case-completed',
  DELIVERED_OFFICE: 'delivered-office',
  TO_BE_BILLED: 'to-be-billed',
  
  // User Management
  CREATE_USER: 'create-user',
  EDIT_USER: 'edit-user',
  DELETE_USER: 'delete-user',
  VIEW_USERS: 'view-users',
  ENABLE_DISABLE_USER: 'enable-disable-user',
  
  // System Settings
  SYSTEM_SETTINGS: 'system-settings',
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