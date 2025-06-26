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
      canViewAllCases: hasPermission(userRole, PERMISSION_ACTIONS.VIEW_ALL_CASES),
      canCreateCase: hasPermission(userRole, PERMISSION_ACTIONS.CREATE_CASE),
      canEditCase: hasPermission(userRole, PERMISSION_ACTIONS.EDIT_CASE),
      canDeleteCase: hasPermission(userRole, PERMISSION_ACTIONS.DELETE_CASE),
      
      // Workflow permissions
      canProcessOrder: hasPermission(userRole, PERMISSION_ACTIONS.PROCESS_ORDER),
      canMarkDelivered: hasPermission(userRole, PERMISSION_ACTIONS.MARK_DELIVERED),
      canReceiveOrder: hasPermission(userRole, PERMISSION_ACTIONS.RECEIVE_ORDER),
      canCompleteCase: hasPermission(userRole, PERMISSION_ACTIONS.COMPLETE_CASE),
      canDeliverToOffice: hasPermission(userRole, PERMISSION_ACTIONS.DELIVER_TO_OFFICE),
      canMarkToBilled: hasPermission(userRole, PERMISSION_ACTIONS.MARK_TO_BILLED),
      
      // Admin permissions
      canViewAuditLogs: hasPermission(userRole, PERMISSION_ACTIONS.AUDIT_LOGS),
      canManageUsers: hasPermission(userRole, PERMISSION_ACTIONS.MANAGE_USERS),
      canManagePermissions: hasPermission(userRole, PERMISSION_ACTIONS.MANAGE_PERMISSIONS),
      canViewSettings: hasPermission(userRole, PERMISSION_ACTIONS.VIEW_SETTINGS),
      canManageCodeTables: hasPermission(userRole, PERMISSION_ACTIONS.MANAGE_CODE_TABLES),
      
      // Role checks
      isAdmin: userRole === 'admin',
      isOperations: userRole === 'operations',
      isOperationsManager: userRole === 'operation-manager',
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