// Emergency fix for Code Table Setup permissions

import { permissions as defaultPermissions } from '../data/permissionMatrixData';

// Function to specifically fix code-table-setup permissions
export const fixCodeTablePermissions = (): void => {
  try {
    console.log('Fixing Code Table Setup permissions...');
    
    // Get current permissions from localStorage
    const storedPermissions = localStorage.getItem('app_runtime_permissions');
    let currentPermissions = storedPermissions ? JSON.parse(storedPermissions) : [];
    
    // Find all code-table-setup permissions that should exist
    const codeTablePerms = defaultPermissions.filter(p => p.actionId === 'code-table-setup');
    console.log('Expected code-table-setup permissions:', codeTablePerms);
    
    // Remove existing code-table-setup permissions
    currentPermissions = currentPermissions.filter((p: any) => p.actionId !== 'code-table-setup');
    
    // Add the correct code-table-setup permissions
    currentPermissions.push(...codeTablePerms);
    
    // Save back to localStorage
    localStorage.setItem('app_runtime_permissions', JSON.stringify(currentPermissions));
    
    console.log('Code Table Setup permissions fixed!');
    console.log('Updated permissions:', currentPermissions.filter((p: any) => p.actionId === 'code-table-setup'));
    
    // Force page refresh
    window.location.reload();
  } catch (error) {
    console.error('Error fixing code table permissions:', error);
  }
};

// Make function available globally for console use
(window as any).fixCodeTablePermissions = fixCodeTablePermissions;

// Auto-run immediately to fix the issue
setTimeout(() => {
  // Check if permissions need fixing
  const storedPermissions = localStorage.getItem('app_runtime_permissions');
  console.log('Checking permissions...', storedPermissions);
  
  if (storedPermissions) {
    const permissions = JSON.parse(storedPermissions);
    const adminCodeTablePerm = permissions.find((p: any) => 
      p.roleId === 'admin' && p.actionId === 'code-table-setup' && p.allowed === true
    );
    
    console.log('Admin code-table-setup permission found:', adminCodeTablePerm);
    
    if (!adminCodeTablePerm) {
      console.log('Admin code-table-setup permission missing, auto-fixing...');
      fixCodeTablePermissions();
    }
  } else {
    console.log('No stored permissions found, they may need to be initialized');
  }
}, 1000);