/**
 * Constants Export - Centralized constant access
 * Import all constants from a single location
 */

// Status constants
export * from './statuses';

// Permission constants
export * from './permissions';

// UI constants
export * from './ui';

// Re-export commonly used constants for convenience
export { CASE_STATUSES, STATUS_WORKFLOW, getStatusColor, getStatusIcon } from './statuses';
export { USER_ROLES, PERMISSIONS, hasPermission, isAdminRole } from './permissions';
export { APP_INFO, PAGINATION, NOTIFICATIONS, ERROR_MESSAGES, SUCCESS_MESSAGES } from './ui';