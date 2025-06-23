// Utility to reset permissions to defaults - for debugging

import { resetPermissions } from './permissions';

// Function to force reset permissions and clear localStorage
export const forceResetPermissions = (): void => {
  try {
    // Clear all permission-related localStorage items
    localStorage.removeItem('app_runtime_permissions');
    localStorage.removeItem('codeTables');
    localStorage.removeItem('permissions');
    
    // Reset using the utility function
    resetPermissions();
    
    console.log('Permissions have been reset to defaults');
    
    // Force page refresh to reload permissions
    window.location.reload();
  } catch (error) {
    console.error('Error resetting permissions:', error);
  }
};

// Function to log current permissions for debugging
export const debugPermissions = (): void => {
  try {
    const stored = localStorage.getItem('app_runtime_permissions');
    console.log('Current stored permissions:', stored ? JSON.parse(stored) : 'None');
    
    const { getRuntimePermissions } = require('./permissions');
    const runtime = getRuntimePermissions();
    console.log('Runtime permissions:', runtime);
    
    // Check specific code-table-setup permissions
    const codeTablePerms = runtime.filter((p: any) => p.actionId === 'code-table-setup');
    console.log('Code Table Setup permissions:', codeTablePerms);
  } catch (error) {
    console.error('Error debugging permissions:', error);
  }
};

// Make functions available globally for console use
(window as any).forceResetPermissions = forceResetPermissions;
(window as any).debugPermissions = debugPermissions;

// Add a simple function to clear localStorage and refresh
(window as any).clearAndRefresh = () => {
  localStorage.clear();
  window.location.reload();
};

// Auto-run on import in development
if (process.env.NODE_ENV === 'development') {
  console.log('Permission debug utilities loaded. Use forceResetPermissions() or debugPermissions() in console.');
}