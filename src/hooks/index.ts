/**
 * Hooks Export - Centralized hook access
 * Import all custom hooks from a single location
 */

export { useCurrentUser } from './useCurrentUser';
// export { useCases, useFilteredCases, useCasesByStatus, useCaseById } from './useCases'; // DISABLED - Replaced with useRealtimeCases
export { useRealtimeCases, useFilteredRealtimeCases } from './useRealtimeCases';
export { useRealtimeUsers } from './useRealtimeUsers';
export { useRealtimeDepartments } from './useRealtimeDepartments';
export { useRealtimePermissions } from './useRealtimePermissions';
export { useRealtimeSettings } from './useRealtimeSettings';
export { useNotifications } from './useNotifications';
export { usePermissions } from './usePermissions';
export { useDebounce, useDebouncedCallback } from './useDebounce';