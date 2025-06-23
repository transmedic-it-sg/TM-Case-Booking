// Direct check of permission data integrity

import { permissions as defaultPermissions, permissionActions } from '../data/permissionMatrixData';

export const checkPermissionIntegrity = () => {
  console.log('=== PERMISSION DATA INTEGRITY CHECK ===');
  
  // Check if code-table-setup action exists
  const codeTableAction = permissionActions.find(a => a.id === 'code-table-setup');
  console.log('1. Code Table Setup Action:', codeTableAction);
  
  // Check admin permissions for code-table-setup
  const adminCodeTablePerms = defaultPermissions.filter(p => 
    p.roleId === 'admin' && p.actionId === 'code-table-setup'
  );
  console.log('2. Admin Code Table Setup Permissions:', adminCodeTablePerms);
  
  // Check all admin permissions
  const allAdminPerms = defaultPermissions.filter(p => p.roleId === 'admin');
  console.log('3. Total Admin Permissions:', allAdminPerms.length);
  console.log('Admin permission actions:', allAdminPerms.map(p => p.actionId));
  
  // Check all System Settings permissions
  const systemSettingsActions = permissionActions.filter(a => a.category === 'System Settings');
  console.log('4. System Settings Actions:', systemSettingsActions.map(a => a.id));
  
  const adminSystemSettingsPerms = defaultPermissions.filter(p => 
    p.roleId === 'admin' && 
    systemSettingsActions.some(a => a.id === p.actionId)
  );
  console.log('5. Admin System Settings Permissions:', adminSystemSettingsPerms);
  
  // Check if there are duplicate permissions
  const duplicates = [];
  for (let i = 0; i < defaultPermissions.length; i++) {
    for (let j = i + 1; j < defaultPermissions.length; j++) {
      if (defaultPermissions[i].roleId === defaultPermissions[j].roleId && 
          defaultPermissions[i].actionId === defaultPermissions[j].actionId) {
        duplicates.push(`${defaultPermissions[i].roleId}:${defaultPermissions[i].actionId}`);
      }
    }
  }
  console.log('6. Duplicate Permissions:', duplicates);
  
  console.log('=== END CHECK ===');
  
  return {
    codeTableAction,
    adminCodeTablePerms,
    totalAdminPerms: allAdminPerms.length,
    systemSettingsActions: systemSettingsActions.length,
    adminSystemSettingsPerms: adminSystemSettingsPerms.length,
    duplicates: duplicates.length
  };
};

// Make available globally
(window as any).checkPermissionIntegrity = checkPermissionIntegrity;

// Auto-run
setTimeout(() => {
  checkPermissionIntegrity();
}, 1500);