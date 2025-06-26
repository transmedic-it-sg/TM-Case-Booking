/**
 * Permission Constants - Centralized permission definitions
 * Replaces scattered permission strings throughout the app
 */

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  OPERATIONS: 'operations',
  OPERATIONS_MANAGER: 'operation-manager',
  SALES: 'sales',
  SALES_MANAGER: 'sales-manager',
  DRIVER: 'driver',
  IT: 'it'
} as const;

// Permission Actions (matching existing PERMISSION_ACTIONS)
export const PERMISSIONS = {
  // Case Management
  VIEW_ALL_CASES: 'view_all_cases',
  CREATE_CASE: 'create_case',
  EDIT_CASE: 'edit_case',
  DELETE_CASE: 'delete_case',
  AMEND_CASE: 'amend_case',
  
  // Workflow Actions
  PROCESS_ORDER: 'process_order',
  MARK_DELIVERED: 'mark_delivered_hospital',
  RECEIVE_ORDER: 'receive_order_hospital',
  COMPLETE_CASE: 'complete_case',
  DELIVER_TO_OFFICE: 'deliver_to_office',
  MARK_TO_BILLED: 'mark_to_billed',
  
  // Administrative
  MANAGE_USERS: 'manage_users',
  MANAGE_PERMISSIONS: 'manage_permissions',
  VIEW_SETTINGS: 'view_settings',
  MANAGE_CODE_TABLES: 'manage_code_tables',
  AUDIT_LOGS: 'view_audit_logs',
  
  // System
  BACKUP_RESTORE: 'backup_restore',
  SYSTEM_CONFIG: 'system_configuration'
} as const;

// Role Permission Matrix
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    // All permissions for admin
    ...Object.values(PERMISSIONS)
  ],
  
  [USER_ROLES.OPERATIONS]: [
    PERMISSIONS.VIEW_ALL_CASES,
    PERMISSIONS.CREATE_CASE,
    PERMISSIONS.EDIT_CASE,
    PERMISSIONS.PROCESS_ORDER,
    PERMISSIONS.MARK_DELIVERED,
    PERMISSIONS.MARK_TO_BILLED
  ],
  
  [USER_ROLES.OPERATIONS_MANAGER]: [
    PERMISSIONS.VIEW_ALL_CASES,
    PERMISSIONS.CREATE_CASE,
    PERMISSIONS.EDIT_CASE,
    PERMISSIONS.DELETE_CASE,
    PERMISSIONS.AMEND_CASE,
    PERMISSIONS.PROCESS_ORDER,
    PERMISSIONS.MARK_DELIVERED,
    PERMISSIONS.MARK_TO_BILLED,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.AUDIT_LOGS
  ],
  
  [USER_ROLES.SALES]: [
    PERMISSIONS.VIEW_ALL_CASES,
    PERMISSIONS.CREATE_CASE,
    PERMISSIONS.EDIT_CASE,
    PERMISSIONS.COMPLETE_CASE,
    PERMISSIONS.DELIVER_TO_OFFICE,
    PERMISSIONS.MARK_TO_BILLED
  ],
  
  [USER_ROLES.SALES_MANAGER]: [
    PERMISSIONS.VIEW_ALL_CASES,
    PERMISSIONS.CREATE_CASE,
    PERMISSIONS.EDIT_CASE,
    PERMISSIONS.DELETE_CASE,
    PERMISSIONS.AMEND_CASE,
    PERMISSIONS.COMPLETE_CASE,
    PERMISSIONS.DELIVER_TO_OFFICE,
    PERMISSIONS.MARK_TO_BILLED,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.AUDIT_LOGS
  ],
  
  [USER_ROLES.DRIVER]: [
    PERMISSIONS.VIEW_ALL_CASES,
    PERMISSIONS.RECEIVE_ORDER,
    PERMISSIONS.MARK_TO_BILLED
  ],
  
  [USER_ROLES.IT]: [
    PERMISSIONS.VIEW_ALL_CASES,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.MANAGE_CODE_TABLES,
    PERMISSIONS.AUDIT_LOGS,
    PERMISSIONS.BACKUP_RESTORE,
    PERMISSIONS.SYSTEM_CONFIG
  ]
} as const;

// Permission Categories for UI grouping
export const PERMISSION_CATEGORIES = {
  CASE_MANAGEMENT: {
    name: 'Case Management',
    permissions: [
      PERMISSIONS.VIEW_ALL_CASES,
      PERMISSIONS.CREATE_CASE,
      PERMISSIONS.EDIT_CASE,
      PERMISSIONS.DELETE_CASE,
      PERMISSIONS.AMEND_CASE
    ]
  },
  WORKFLOW: {
    name: 'Workflow Actions',
    permissions: [
      PERMISSIONS.PROCESS_ORDER,
      PERMISSIONS.MARK_DELIVERED,
      PERMISSIONS.RECEIVE_ORDER,
      PERMISSIONS.COMPLETE_CASE,
      PERMISSIONS.DELIVER_TO_OFFICE,
      PERMISSIONS.MARK_TO_BILLED
    ]
  },
  ADMINISTRATION: {
    name: 'Administration',
    permissions: [
      PERMISSIONS.MANAGE_USERS,
      PERMISSIONS.MANAGE_PERMISSIONS,
      PERMISSIONS.VIEW_SETTINGS,
      PERMISSIONS.MANAGE_CODE_TABLES,
      PERMISSIONS.AUDIT_LOGS
    ]
  },
  SYSTEM: {
    name: 'System',
    permissions: [
      PERMISSIONS.BACKUP_RESTORE,
      PERMISSIONS.SYSTEM_CONFIG
    ]
  }
} as const;

// Permission Labels
export const PERMISSION_LABELS = {
  [PERMISSIONS.VIEW_ALL_CASES]: 'View All Cases',
  [PERMISSIONS.CREATE_CASE]: 'Create Cases',
  [PERMISSIONS.EDIT_CASE]: 'Edit Cases',
  [PERMISSIONS.DELETE_CASE]: 'Delete Cases',
  [PERMISSIONS.AMEND_CASE]: 'Amend Cases',
  [PERMISSIONS.PROCESS_ORDER]: 'Process Orders',
  [PERMISSIONS.MARK_DELIVERED]: 'Mark as Delivered to Hospital',
  [PERMISSIONS.RECEIVE_ORDER]: 'Receive Orders at Hospital',
  [PERMISSIONS.COMPLETE_CASE]: 'Complete Cases',
  [PERMISSIONS.DELIVER_TO_OFFICE]: 'Deliver to Office',
  [PERMISSIONS.MARK_TO_BILLED]: 'Mark as To be Billed',
  [PERMISSIONS.MANAGE_USERS]: 'Manage Users',
  [PERMISSIONS.MANAGE_PERMISSIONS]: 'Manage Permissions',
  [PERMISSIONS.VIEW_SETTINGS]: 'View Settings',
  [PERMISSIONS.MANAGE_CODE_TABLES]: 'Manage Code Tables',
  [PERMISSIONS.AUDIT_LOGS]: 'View Audit Logs',
  [PERMISSIONS.BACKUP_RESTORE]: 'Backup & Restore',
  [PERMISSIONS.SYSTEM_CONFIG]: 'System Configuration'
} as const;

// Permission Descriptions
export const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.VIEW_ALL_CASES]: 'View and search all cases in the system',
  [PERMISSIONS.CREATE_CASE]: 'Create new case bookings',
  [PERMISSIONS.EDIT_CASE]: 'Edit existing case details',
  [PERMISSIONS.DELETE_CASE]: 'Delete cases from the system',
  [PERMISSIONS.AMEND_CASE]: 'Make amendments to submitted cases',
  [PERMISSIONS.PROCESS_ORDER]: 'Process case orders for preparation',
  [PERMISSIONS.MARK_DELIVERED]: 'Mark orders as delivered to hospital',
  [PERMISSIONS.RECEIVE_ORDER]: 'Confirm order receipt at hospital',
  [PERMISSIONS.COMPLETE_CASE]: 'Mark surgical cases as completed',
  [PERMISSIONS.DELIVER_TO_OFFICE]: 'Mark equipment as delivered to office',
  [PERMISSIONS.MARK_TO_BILLED]: 'Mark cases as ready for billing',
  [PERMISSIONS.MANAGE_USERS]: 'Create, edit, and delete user accounts',
  [PERMISSIONS.MANAGE_PERMISSIONS]: 'Assign and modify user permissions',
  [PERMISSIONS.VIEW_SETTINGS]: 'Access application settings',
  [PERMISSIONS.MANAGE_CODE_TABLES]: 'Manage hospitals, departments, and procedures',
  [PERMISSIONS.AUDIT_LOGS]: 'View system audit logs and activity',
  [PERMISSIONS.BACKUP_RESTORE]: 'Perform system backup and restore operations',
  [PERMISSIONS.SYSTEM_CONFIG]: 'Configure system-level settings'
} as const;

// Helper functions
export const hasPermission = (userRole: string, permission: string): boolean => {
  const rolePermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS];
  return rolePermissions ? rolePermissions.includes(permission as any) : false;
};

export const getRolePermissions = (role: string): readonly string[] => {
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
};

export const getPermissionLabel = (permission: string): string => {
  return PERMISSION_LABELS[permission as keyof typeof PERMISSION_LABELS] || permission;
};

export const getPermissionDescription = (permission: string): string => {
  return PERMISSION_DESCRIPTIONS[permission as keyof typeof PERMISSION_DESCRIPTIONS] || '';
};

export const isAdminRole = (role: string): boolean => {
  return role === USER_ROLES.ADMIN;
};

export const isManagerRole = (role: string): boolean => {
  return role === USER_ROLES.OPERATIONS_MANAGER || role === USER_ROLES.SALES_MANAGER;
};

export const canManageUsers = (role: string): boolean => {
  return hasPermission(role, PERMISSIONS.MANAGE_USERS);
};

export const canViewAuditLogs = (role: string): boolean => {
  return hasPermission(role, PERMISSIONS.AUDIT_LOGS);
};