// Test permission loading and debugging

import { permissions as defaultPermissions, permissionActions } from '../data/permissionMatrixData';

// Function to test and log permission loading
export const testPermissionLoading = () => {
  console.log('=== PERMISSION LOADING TEST ===');
  
  console.log('1. Default permissions from data file:');
  console.log('Total permissions:', defaultPermissions.length);
  
  const adminPerms = defaultPermissions.filter(p => p.roleId === 'admin');
  console.log('Admin permissions count:', adminPerms.length);
  
  const adminCodeTable = adminPerms.find(p => p.actionId === 'code-table-setup');
  console.log('Admin code-table-setup permission:', adminCodeTable);
  
  console.log('2. Permission actions list:');
  console.log('Total actions:', permissionActions.length);
  
  const codeTableAction = permissionActions.find(a => a.id === 'code-table-setup');
  console.log('Code table action definition:', codeTableAction);
  
  console.log('3. Spread operator test:');
  const spreadTest = permissionActions.map(action => ({
    actionId: action.id,
    roleId: 'admin',
    allowed: true
  }));
  console.log('Spread operator result count:', spreadTest.length);
  const spreadCodeTable = spreadTest.find(p => p.actionId === 'code-table-setup');
  console.log('Spread operator code-table-setup:', spreadCodeTable);
  
  console.log('4. LocalStorage current state:');
  const stored = localStorage.getItem('app_runtime_permissions');
  if (stored) {
    const parsedStored = JSON.parse(stored);
    console.log('Stored permissions count:', parsedStored.length);
    const storedAdminCodeTable = parsedStored.find((p: any) => 
      p.roleId === 'admin' && p.actionId === 'code-table-setup'
    );
    console.log('Stored admin code-table-setup:', storedAdminCodeTable);
  } else {
    console.log('No stored permissions found');
  }
  
  console.log('5. System Settings category check:');
  const systemSettingsActions = permissionActions.filter(a => a.category === 'System Settings');
  console.log('System Settings actions:', systemSettingsActions.map(a => a.name));
  
  console.log('6. Permission Matrix filtering test:');
  const categories = Array.from(new Set(permissionActions.map(action => action.category)));
  console.log('All categories:', categories);
  
  console.log('=== END TEST ===');
};

// Make available globally
(window as any).testPermissionLoading = testPermissionLoading;

// Auto-run test
setTimeout(() => {
  console.log('Running automatic permission test...');
  testPermissionLoading();
}, 2000);