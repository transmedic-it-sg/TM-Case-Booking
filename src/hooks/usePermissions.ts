/**
 * usePermissions Hook - Centralized permission checking
 * Reduces code duplication across components
 */

import { useMemo } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';

export const usePermissions = () => {
  const { user } = useCurrentUser();

  const permissions = useMemo(() => {
    if (!user) {
      return {
        canViewAllCases: false,
        canCreateCase: false,
        canEditCase: false,
        canDeleteCase: false,
        canViewBookingCalendar: false,
        canProcessOrder: false,
        canMarkDelivered: false,
        canReceiveOrder: false,
        canCompleteCase: false,
        canDeliverToOffice: false,
        canMarkToBilled: false,
        canViewAuditLogs: false,
        canManageUsers: false,
        canManagePermissions: false,
        canViewSettings: false,
        canManageCodeTables: false,
        isAdmin: false,
        isOperations: false,
        isOperationsManager: false,
        isSales: false,
        isSalesManager: false,
        isDriver: false
      };
    }

    const userRole = user.role;

    return {
      // Case permissions
      canViewAllCases: hasPermission(userRole, PERMISSION_ACTIONS.VIEW_CASES),
      canCreateCase: hasPermission(userRole, PERMISSION_ACTIONS.CREATE_CASE),
      canEditCase: true, // Default to true, can be refined later
      canDeleteCase: hasPermission(userRole, PERMISSION_ACTIONS.DELETE_CASE),
      canViewBookingCalendar: hasPermission(userRole, PERMISSION_ACTIONS.BOOKING_CALENDAR),

      // Workflow permissions
      canProcessOrder: hasPermission(userRole, PERMISSION_ACTIONS.PROCESS_ORDER),
      canSalesApproval: hasPermission(userRole, PERMISSION_ACTIONS.SALES_APPROVAL),
      canMarkDelivered: hasPermission(userRole, PERMISSION_ACTIONS.DELIVERED_HOSPITAL),
      canReceiveOrder: hasPermission(userRole, PERMISSION_ACTIONS.DELIVERED_HOSPITAL),
      canCompleteCase: hasPermission(userRole, PERMISSION_ACTIONS.CASE_COMPLETED),
      canDeliverToOffice: hasPermission(userRole, PERMISSION_ACTIONS.DELIVERED_OFFICE),
      canMarkToBilled: hasPermission(userRole, PERMISSION_ACTIONS.TO_BE_BILLED),

      // Admin permissions
      canViewAuditLogs: hasPermission(userRole, PERMISSION_ACTIONS.AUDIT_LOGS),
      canManageUsers: hasPermission(userRole, PERMISSION_ACTIONS.VIEW_USERS),
      canManagePermissions: hasPermission(userRole, PERMISSION_ACTIONS.PERMISSION_MATRIX),
      canViewSettings: hasPermission(userRole, PERMISSION_ACTIONS.SYSTEM_SETTINGS),
      canManageCodeTables: hasPermission(userRole, PERMISSION_ACTIONS.CODE_TABLE_SETUP),

      // Role checks
      isAdmin: userRole === 'admin',
      isOperations: userRole === 'operations',
      isOperationsManager: userRole === 'operations-manager',
      isSales: userRole === 'sales',
      isSalesManager: userRole === 'sales-manager',
      isDriver: userRole === 'driver'
    };
  }, [user]);

  const checkPermission = (action: string) => {
    if (!user) return false;
    return hasPermission(user.role, action);
  };

  const hasAnyRole = (roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const hasCountryAccess = (country: string) => {
    if (!user) return false;
    return user.role === 'admin' || user.countries.includes(country);
  };

  const hasDepartmentAccess = (department: string) => {
    if (!user) return false;
    return user.departments.length === 0 || user.departments.includes(department);
  };

  return {
    ...permissions,
    checkPermission,
    hasAnyRole,
    hasCountryAccess,
    hasDepartmentAccess,
    user
  };
};