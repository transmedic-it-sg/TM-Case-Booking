import { Role, PermissionAction, Permission } from '../components/PermissionMatrix';

// Define all roles in the system
export const roles: Role[] = [
  {
    id: 'admin',
    name: 'admin',
    displayName: 'Admin',
    description: 'Full system access - has all permissions by default',
    color: '#e74c3c'
  },
  {
    id: 'operations',
    name: 'operations',
    displayName: 'Operations',
    description: 'Order processing',
    color: '#3498db'
  },
  {
    id: 'operations-manager',
    name: 'operations-manager',
    displayName: 'Operations Manager',
    description: 'Operations oversight',
    color: '#2980b9'
  },
  {
    id: 'sales',
    name: 'sales',
    displayName: 'Sales',
    description: 'Case completion',
    color: '#27ae60'
  },
  {
    id: 'sales-manager',
    name: 'sales-manager',
    displayName: 'Sales Manager',
    description: 'Sales oversight',
    color: '#229954'
  },
  {
    id: 'driver',
    name: 'driver',
    displayName: 'Driver',
    description: 'Delivery operations',
    color: '#f39c12'
  },
  {
    id: 'it',
    name: 'it',
    displayName: 'IT',
    description: 'Technical support',
    color: '#9b59b6'
  }
];

// Roles for matrix display (excluding Admin since Admin has all permissions)
export const matrixRoles: Role[] = roles.filter(role => role.id !== 'admin');

// Define all permission actions
export const permissionActions: PermissionAction[] = [
  // Case Management
  {
    id: 'create-case',
    name: 'Create Case',
    description: 'Create new medical case bookings with complete details including hospital, department, surgery date, procedure type, and special instructions. Essential for case submission workflow.',
    category: 'Case Management'
  },
  {
    id: 'view-cases',
    name: 'View Cases',
    description: 'Access case listings, view detailed case information, status history, and case progress. Includes filtering by department, country, and date ranges within user permissions.',
    category: 'Case Management'
  },
  {
    id: 'amend-case',
    name: 'Amend Case',
    description: 'Modify existing case booking details including procedures, dates, special instructions, and requirements. Changes are tracked with user attribution and audit trail.',
    category: 'Case Management'
  },
  {
    id: 'update-case-status',
    name: 'Update Case Status',
    description: 'Change case status through workflow transitions. Track status history and maintain audit trails for all status changes.',
    category: 'Case Management'
  },
  {
    id: 'delete-case',
    name: 'Delete Case',
    description: 'Permanently remove case bookings from the system. High-privilege action with full audit logging. Typically restricted to administrative roles only.',
    category: 'Case Management'
  },
  {
    id: 'edit-sets',
    name: 'Edit Sets',
    description: 'Manage surgery sets and implant boxes for procedure types. Configure available surgical instruments and implant options for specific medical procedures and specialties.',
    category: 'Case Management'
  },

  // Status Transitions
  {
    id: 'process-order',
    name: 'Process Order',
    description: 'Case Booked → Order Preparation',
    category: 'Status Transitions'
  },
  {
    id: 'order-processed',
    name: 'Order Processed',
    description: 'Order Preparation → Order Prepared',
    category: 'Status Transitions'
  },
  {
    id: 'sales-approval',
    name: 'Sales Approval',
    description: 'Order Prepared → Sales Approval',
    category: 'Status Transitions'
  },
  {
    id: 'pending-delivery-hospital',
    name: 'Pending Delivery (Hospital)',
    description: 'Sales Approval → Pending Delivery (Hospital)',
    category: 'Status Transitions'
  },
  {
    id: 'delivered-hospital',
    name: 'Delivered (Hospital)',
    description: 'Pending Delivery → Delivered (Hospital)',
    category: 'Status Transitions'
  },
  {
    id: 'case-completed',
    name: 'Case Completed',
    description: 'Delivered (Hospital) → Case Completed',
    category: 'Status Transitions'
  },
  {
    id: 'pending-delivery-office',
    name: 'Pending Delivery (Office)',
    description: 'Case Completed → Pending Delivery (Office)',
    category: 'Status Transitions'
  },
  {
    id: 'delivered-office',
    name: 'Delivered (Office)',
    description: 'Pending Delivery (Office) → Delivered (Office)',
    category: 'Status Transitions'
  },
  {
    id: 'to-be-billed',
    name: 'To be Billed',
    description: 'Delivered (Office) → To be Billed',
    category: 'Status Transitions'
  },
  {
    id: 'case-closed',
    name: 'Case Closed',
    description: 'To be Billed → Case Closed',
    category: 'Status Transitions'
  },
  {
    id: 'cancel-case',
    name: 'Cancel Case',
    description: 'Cancel cases in Process Order, Order Processed, Pending Delivery, or Delivered status',
    category: 'Case Management'
  },

  // Data Operations
  {
    id: 'export-data',
    name: 'Export Data',
    description: 'Export case data to external formats',
    category: 'Data Operations'
  },
  {
    id: 'import-data',
    name: 'Import Data',
    description: 'Import case data from external sources',
    category: 'Data Operations'
  },
  {
    id: 'view-reports',
    name: 'View Reports',
    description: 'Access reporting and analytics',
    category: 'Data Operations'
  },

  // User Management
  {
    id: 'create-user',
    name: 'Create User',
    description: 'Add new users to the system',
    category: 'User Management'
  },
  {
    id: 'edit-user',
    name: 'Edit User',
    description: 'Modify user details and permissions',
    category: 'User Management'
  },
  {
    id: 'edit-countries',
    name: 'Edit Countries',
    description: 'Assign and modify user country access permissions. Control which countries and regions users can access for case management and data viewing. Essential for multi-regional access control.',
    category: 'User Management'
  },
  {
    id: 'reset-password',
    name: 'Reset Password',
    description: 'Reset user passwords with temporary passwords. Users will be required to change temporary passwords on next login.',
    category: 'User Management'
  },
  {
    id: 'delete-user',
    name: 'Delete User',
    description: 'Remove users from the system',
    category: 'User Management'
  },
  {
    id: 'view-users',
    name: 'View Users',
    description: 'View user listings and details',
    category: 'User Management'
  },
  {
    id: 'enable-disable-user',
    name: 'Enable/Disable User',
    description: 'Enable or disable user login access',
    category: 'User Management'
  },

  // System Settings
  {
    id: 'system-settings',
    name: 'System Settings',
    description: 'Configure system-wide settings',
    category: 'System Settings'
  },
  {
    id: 'email-config',
    name: 'Email Configuration',
    description: 'Configure SMTP settings and email notifications by country',
    category: 'System Settings'
  },
  {
    id: 'code-table-setup',
    name: 'Code Table Setup',
    description: 'Access and manage system code tables including hospitals, departments, and reference data. Configure country-specific and global lookup tables used throughout the application.',
    category: 'Code Table Management'
  },
  {
    id: 'global-tables',
    name: 'Global Tables',
    description: 'Manage global code tables that apply across all countries such as countries list, procedure types, and system-wide reference data. Requires additional confirmation for modifications.',
    category: 'Code Table Management'
  },
  {
    id: 'booking-calendar',
    name: 'Booking Calendar',
    description: 'View and manage booking calendar',
    category: 'Case Management'
  },
  {
    id: 'backup-restore',
    name: 'Backup & Restore',
    description: 'Manage system backups and restoration',
    category: 'System Settings'
  },
  {
    id: 'audit-logs',
    name: 'Audit Logs',
    description: 'View system audit trail and logs',
    category: 'System Settings'
  },
  {
    id: 'permission-matrix',
    name: 'Permission Matrix',
    description: 'Manage user permissions and role assignments',
    category: 'System Settings'
  },

  // File Operations
  {
    id: 'upload-files',
    name: 'Upload Files',
    description: 'Upload images and documents',
    category: 'File Operations'
  },
  {
    id: 'download-files',
    name: 'Download Files',
    description: 'Download attached files and documents',
    category: 'File Operations'
  },
  {
    id: 'delete-files',
    name: 'Delete Files',
    description: 'Remove uploaded files and attachments',
    category: 'File Operations'
  },
  {
    id: 'manage-attachments',
    name: 'Manage Attachments',
    description: 'Modify, replace, and manage case attachments beyond basic upload/download',
    category: 'File Operations'
  },

  // Notification Management - REMOVED: Notification settings should be freely accessible to all users
];

// Define the permission matrix
// NOTE: Admin permissions are handled by hardcoded logic in permissions.ts
// This matrix only defines permissions for manageable roles
export const permissions: Permission[] = [
  // Operations - Order processing and case management
  { actionId: 'create-case', roleId: 'operations', allowed: true },
  { actionId: 'view-cases', roleId: 'operations', allowed: true },
  { actionId: 'amend-case', roleId: 'operations', allowed: true },
  { actionId: 'update-case-status', roleId: 'operations', allowed: true },
  { actionId: 'booking-calendar', roleId: 'operations', allowed: true },
  { actionId: 'process-order', roleId: 'operations', allowed: true },
  { actionId: 'order-processed', roleId: 'operations', allowed: true },
  { actionId: 'pending-delivery-hospital', roleId: 'operations', allowed: true },
  { actionId: 'upload-files', roleId: 'operations', allowed: true },
  { actionId: 'download-files', roleId: 'operations', allowed: true },
  { actionId: 'view-reports', roleId: 'operations', allowed: true },

  // Operations Manager - Operations + additional oversight
  { actionId: 'create-case', roleId: 'operations-manager', allowed: true },
  { actionId: 'view-cases', roleId: 'operations-manager', allowed: true },
  { actionId: 'amend-case', roleId: 'operations-manager', allowed: true },
  { actionId: 'update-case-status', roleId: 'operations-manager', allowed: true },
  { actionId: 'delete-case', roleId: 'operations-manager', allowed: true },
  { actionId: 'edit-sets', roleId: 'operations-manager', allowed: true },
  { actionId: 'booking-calendar', roleId: 'operations-manager', allowed: true },
  { actionId: 'process-order', roleId: 'operations-manager', allowed: true },
  { actionId: 'order-processed', roleId: 'operations-manager', allowed: true },
  { actionId: 'pending-delivery-hospital', roleId: 'operations-manager', allowed: true },
  { actionId: 'upload-files', roleId: 'operations-manager', allowed: true },
  { actionId: 'download-files', roleId: 'operations-manager', allowed: true },
  { actionId: 'manage-attachments', roleId: 'operations-manager', allowed: true },
  { actionId: 'view-reports', roleId: 'operations-manager', allowed: true },
  { actionId: 'export-data', roleId: 'operations-manager', allowed: true },
  { actionId: 'cancel-case', roleId: 'operations-manager', allowed: true },

  // Sales - Case completion and office delivery
  { actionId: 'create-case', roleId: 'sales', allowed: true },
  { actionId: 'view-cases', roleId: 'sales', allowed: true },
  { actionId: 'amend-case', roleId: 'sales', allowed: true },
  { actionId: 'update-case-status', roleId: 'sales', allowed: true },
  { actionId: 'booking-calendar', roleId: 'sales', allowed: true },
  { actionId: 'sales-approval', roleId: 'sales', allowed: true },
  { actionId: 'case-completed', roleId: 'sales', allowed: true },
  { actionId: 'pending-delivery-office', roleId: 'sales', allowed: true },
  { actionId: 'delivered-office', roleId: 'sales', allowed: true },
  { actionId: 'to-be-billed', roleId: 'sales', allowed: true },
  { actionId: 'case-closed', roleId: 'sales', allowed: true },
  { actionId: 'upload-files', roleId: 'sales', allowed: true },
  { actionId: 'download-files', roleId: 'sales', allowed: true },
  { actionId: 'view-reports', roleId: 'sales', allowed: true },

  // Sales Manager - Sales + additional oversight
  { actionId: 'create-case', roleId: 'sales-manager', allowed: true },
  { actionId: 'view-cases', roleId: 'sales-manager', allowed: true },
  { actionId: 'amend-case', roleId: 'sales-manager', allowed: true },
  { actionId: 'update-case-status', roleId: 'sales-manager', allowed: true },
  { actionId: 'booking-calendar', roleId: 'sales-manager', allowed: true },
  { actionId: 'sales-approval', roleId: 'sales-manager', allowed: true },
  { actionId: 'case-completed', roleId: 'sales-manager', allowed: true },
  { actionId: 'pending-delivery-office', roleId: 'sales-manager', allowed: true },
  { actionId: 'delivered-office', roleId: 'sales-manager', allowed: true },
  { actionId: 'to-be-billed', roleId: 'sales-manager', allowed: true },
  { actionId: 'case-closed', roleId: 'sales-manager', allowed: true },
  { actionId: 'upload-files', roleId: 'sales-manager', allowed: true },
  { actionId: 'download-files', roleId: 'sales-manager', allowed: true },
  { actionId: 'manage-attachments', roleId: 'sales-manager', allowed: true },
  { actionId: 'view-reports', roleId: 'sales-manager', allowed: true },
  { actionId: 'export-data', roleId: 'sales-manager', allowed: true },

  // Driver - Delivery operations only
  { actionId: 'view-cases', roleId: 'driver', allowed: true },
  { actionId: 'update-case-status', roleId: 'driver', allowed: true },
  { actionId: 'booking-calendar', roleId: 'driver', allowed: true },
  { actionId: 'pending-delivery-hospital', roleId: 'driver', allowed: true },
  { actionId: 'delivered-hospital', roleId: 'driver', allowed: true },
  { actionId: 'pending-delivery-office', roleId: 'driver', allowed: true },
  { actionId: 'delivered-office', roleId: 'driver', allowed: true },
  { actionId: 'to-be-billed', roleId: 'driver', allowed: true },
  { actionId: 'case-closed', roleId: 'driver', allowed: true },
  { actionId: 'upload-files', roleId: 'driver', allowed: true },
  { actionId: 'download-files', roleId: 'driver', allowed: true },

  // IT - System management and technical support + user management + status transitions
  { actionId: 'view-cases', roleId: 'it', allowed: true },
  { actionId: 'create-case', roleId: 'it', allowed: true },
  { actionId: 'amend-case', roleId: 'it', allowed: true },
  { actionId: 'update-case-status', roleId: 'it', allowed: true },
  { actionId: 'edit-sets', roleId: 'it', allowed: true },
  { actionId: 'process-order', roleId: 'it', allowed: true },
  { actionId: 'order-processed', roleId: 'it', allowed: true },
  { actionId: 'pending-delivery-hospital', roleId: 'it', allowed: true },
  { actionId: 'delivered-hospital', roleId: 'it', allowed: true },
  { actionId: 'case-completed', roleId: 'it', allowed: true },
  { actionId: 'pending-delivery-office', roleId: 'it', allowed: true },
  { actionId: 'delivered-office', roleId: 'it', allowed: true },
  { actionId: 'to-be-billed', roleId: 'it', allowed: true },
  { actionId: 'case-closed', roleId: 'it', allowed: true },
  { actionId: 'view-users', roleId: 'it', allowed: true },
  { actionId: 'create-user', roleId: 'it', allowed: true },
  { actionId: 'edit-user', roleId: 'it', allowed: true },
  { actionId: 'edit-countries', roleId: 'it', allowed: false },
  { actionId: 'reset-password', roleId: 'it', allowed: true },
  { actionId: 'delete-user', roleId: 'it', allowed: true },
  { actionId: 'enable-disable-user', roleId: 'it', allowed: true },
  { actionId: 'system-settings', roleId: 'it', allowed: true },
  { actionId: 'email-config', roleId: 'it', allowed: true },
  { actionId: 'code-table-setup', roleId: 'it', allowed: true },
  { actionId: 'global-tables', roleId: 'it', allowed: true },
  { actionId: 'backup-restore', roleId: 'it', allowed: true },
  { actionId: 'audit-logs', roleId: 'it', allowed: true },
  { actionId: 'import-data', roleId: 'it', allowed: true },
  { actionId: 'export-data', roleId: 'it', allowed: true },
  { actionId: 'upload-files', roleId: 'it', allowed: true },
  { actionId: 'download-files', roleId: 'it', allowed: true },
  { actionId: 'delete-files', roleId: 'it', allowed: true },
  { actionId: 'view-reports', roleId: 'it', allowed: true }
];

// Get all roles including custom ones
export const getAllRoles = (): Role[] => {
    // For now, return default roles only to prevent localStorage security issues
  // Custom roles should be managed through database instead of localStorage
  console.warn('Custom roles temporarily disabled for security - using default roles only');
  return roles;
};

// Get all roles for matrix display (excluding admin, including custom)
export const getAllMatrixRoles = (): Role[] => {
  const allRoles = getAllRoles();
  return allRoles.filter(role => role.id !== 'admin');
};

// Get all permissions including custom role permissions
export const getAllPermissions = (): Permission[] => {
    // For now, return default permissions only to prevent localStorage security issues
  // Custom permissions should be managed through database instead of localStorage
  console.warn('Custom permissions temporarily disabled for security - using default permissions only');
  return permissions;
};

// Helper function to check if a role has permission for an action
export const hasPermission = (roleId: string, actionId: string): boolean => {
  const allPermissions = getAllPermissions();
  const permission = allPermissions.find(p => p.roleId === roleId && p.actionId === actionId);
  return permission?.allowed || false;
};

// Helper function to get all permissions for a role
export const getRolePermissions = (roleId: string): Permission[] => {
  const allPermissions = getAllPermissions();
  return allPermissions.filter(p => p.roleId === roleId && p.allowed);
};

// Helper function to get all roles that have permission for an action
export const getRolesWithPermission = (actionId: string): Role[] => {
  const allPermissions = getAllPermissions();
  const allRoles = getAllRoles();
  const roleIds = allPermissions
    .filter(p => p.actionId === actionId && p.allowed)
    .map(p => p.roleId);

  return allRoles.filter(role => roleIds.includes(role.id));
};