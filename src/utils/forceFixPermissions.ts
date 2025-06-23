// Force fix all permission issues

export const forceFixAllPermissions = () => {
  console.log('=== FORCE FIXING ALL PERMISSIONS ===');
  
  // Clear everything
  localStorage.clear();
  
  // Create complete admin permissions manually
  const completeAdminPermissions = [
    // Case Management
    { actionId: 'create-case', roleId: 'admin', allowed: true },
    { actionId: 'view-cases', roleId: 'admin', allowed: true },
    { actionId: 'amend-case', roleId: 'admin', allowed: true },
    { actionId: 'delete-case', roleId: 'admin', allowed: true },
    { actionId: 'edit-sets', roleId: 'admin', allowed: true },
    { actionId: 'booking-calendar', roleId: 'admin', allowed: true },
    
    // Status Transitions
    { actionId: 'process-order', roleId: 'admin', allowed: true },
    { actionId: 'order-processed', roleId: 'admin', allowed: true },
    { actionId: 'pending-delivery-hospital', roleId: 'admin', allowed: true },
    { actionId: 'delivered-hospital', roleId: 'admin', allowed: true },
    { actionId: 'case-completed', roleId: 'admin', allowed: true },
    { actionId: 'delivered-office', roleId: 'admin', allowed: true },
    { actionId: 'to-be-billed', roleId: 'admin', allowed: true },
    
    // Data Operations
    { actionId: 'export-data', roleId: 'admin', allowed: true },
    { actionId: 'import-data', roleId: 'admin', allowed: true },
    { actionId: 'view-reports', roleId: 'admin', allowed: true },
    
    // User Management
    { actionId: 'create-user', roleId: 'admin', allowed: true },
    { actionId: 'edit-user', roleId: 'admin', allowed: true },
    { actionId: 'delete-user', roleId: 'admin', allowed: true },
    { actionId: 'view-users', roleId: 'admin', allowed: true },
    { actionId: 'enable-disable-user', roleId: 'admin', allowed: true },
    
    // System Settings - THE CRITICAL ONES
    { actionId: 'system-settings', roleId: 'admin', allowed: true },
    { actionId: 'code-table-setup', roleId: 'admin', allowed: true },
    { actionId: 'backup-restore', roleId: 'admin', allowed: true },
    { actionId: 'audit-logs', roleId: 'admin', allowed: true },
    
    // File Operations
    { actionId: 'upload-files', roleId: 'admin', allowed: true },
    { actionId: 'download-files', roleId: 'admin', allowed: true },
    { actionId: 'delete-files', roleId: 'admin', allowed: true },
    
    // Add IT permissions too
    { actionId: 'code-table-setup', roleId: 'it', allowed: true },
    { actionId: 'system-settings', roleId: 'it', allowed: true },
    { actionId: 'view-users', roleId: 'it', allowed: true },
    { actionId: 'create-user', roleId: 'it', allowed: true },
    { actionId: 'edit-user', roleId: 'it', allowed: true },
    { actionId: 'delete-user', roleId: 'it', allowed: true },
    { actionId: 'enable-disable-user', roleId: 'it', allowed: true },
    { actionId: 'backup-restore', roleId: 'it', allowed: true },
    { actionId: 'audit-logs', roleId: 'it', allowed: true },
    { actionId: 'view-cases', roleId: 'it', allowed: true },
    { actionId: 'edit-sets', roleId: 'it', allowed: true },
    { actionId: 'import-data', roleId: 'it', allowed: true },
    { actionId: 'export-data', roleId: 'it', allowed: true },
    { actionId: 'upload-files', roleId: 'it', allowed: true },
    { actionId: 'download-files', roleId: 'it', allowed: true },
    { actionId: 'delete-files', roleId: 'it', allowed: true },
    { actionId: 'view-reports', roleId: 'it', allowed: true }
  ];
  
  // Save the complete permissions
  localStorage.setItem('app_runtime_permissions', JSON.stringify(completeAdminPermissions));
  
  console.log('✅ Set', completeAdminPermissions.length, 'permissions');
  console.log('✅ Admin code-table-setup:', completeAdminPermissions.find(p => p.roleId === 'admin' && p.actionId === 'code-table-setup'));
  console.log('✅ Admin system-settings:', completeAdminPermissions.find(p => p.roleId === 'admin' && p.actionId === 'system-settings'));
  
  // Refresh page
  console.log('🔄 Refreshing page...');
  window.location.reload();
};

// Make globally available
(window as any).forceFixAllPermissions = forceFixAllPermissions;

console.log('🚨 Emergency fix loaded! Run forceFixAllPermissions() to fix all permission issues.');