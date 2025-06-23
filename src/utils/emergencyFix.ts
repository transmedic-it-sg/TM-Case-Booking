// Emergency permission fix - run this manually

// Simple function to force fix the permissions issue
export const emergencyPermissionFix = () => {
  console.log('=== EMERGENCY PERMISSION FIX ===');
  
  // Step 1: Clear all permissions
  localStorage.removeItem('app_runtime_permissions');
  console.log('1. Cleared stored permissions');
  
  // Step 2: Set basic admin permissions manually
  const basicAdminPermissions = [
    { actionId: 'code-table-setup', roleId: 'admin', allowed: true },
    { actionId: 'create-case', roleId: 'admin', allowed: true },
    { actionId: 'view-cases', roleId: 'admin', allowed: true },
    { actionId: 'amend-case', roleId: 'admin', allowed: true },
    { actionId: 'delete-case', roleId: 'admin', allowed: true },
    { actionId: 'edit-sets', roleId: 'admin', allowed: true },
    { actionId: 'booking-calendar', roleId: 'admin', allowed: true },
    { actionId: 'view-users', roleId: 'admin', allowed: true },
    { actionId: 'create-user', roleId: 'admin', allowed: true },
    { actionId: 'edit-user', roleId: 'admin', allowed: true },
    { actionId: 'delete-user', roleId: 'admin', allowed: true },
    { actionId: 'system-settings', roleId: 'admin', allowed: true },
    { actionId: 'backup-restore', roleId: 'admin', allowed: true },
    { actionId: 'audit-logs', roleId: 'admin', allowed: true },
    { actionId: 'export-data', roleId: 'admin', allowed: true },
    { actionId: 'import-data', roleId: 'admin', allowed: true },
    { actionId: 'upload-files', roleId: 'admin', allowed: true },
    { actionId: 'download-files', roleId: 'admin', allowed: true },
    { actionId: 'delete-files', roleId: 'admin', allowed: true },
    { actionId: 'view-reports', roleId: 'admin', allowed: true },
    { actionId: 'process-order', roleId: 'admin', allowed: true },
    { actionId: 'order-processed', roleId: 'admin', allowed: true },
    { actionId: 'pending-delivery-hospital', roleId: 'admin', allowed: true },
    { actionId: 'delivered-hospital', roleId: 'admin', allowed: true },
    { actionId: 'case-completed', roleId: 'admin', allowed: true },
    { actionId: 'delivered-office', roleId: 'admin', allowed: true },
    { actionId: 'to-be-billed', roleId: 'admin', allowed: true }
  ];
  
  localStorage.setItem('app_runtime_permissions', JSON.stringify(basicAdminPermissions));
  console.log('2. Set basic admin permissions');
  
  // Step 3: Refresh page
  console.log('3. Refreshing page...');
  window.location.reload();
};

// Make available globally
(window as any).emergencyPermissionFix = emergencyPermissionFix;

console.log('Emergency fix loaded. Run emergencyPermissionFix() in console to fix permissions.');