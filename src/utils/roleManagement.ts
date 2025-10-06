import { Role, Permission } from '../components/PermissionMatrix';

// LocalStorage keys
const CUSTOM_ROLES_KEY = 'case-booking-custom-roles';
const CUSTOM_PERMISSIONS_KEY = 'case-booking-custom-permissions';

/**
 * Save custom roles to localStorage
 */
export const saveCustomRoles = (roles: Role[]): void => {
  try {
    // Roles stored in profiles table);
  } catch (error) {
    // // // console.error('Error saving custom roles:', error);
    throw new Error('Failed to save custom roles');
  }
};

/**
 * Load custom roles from localStorage
 */
export const loadCustomRoles = (): Role[] => {
  try {
    const savedRoles = null /* Use Supabase profiles table */;
    return savedRoles ? JSON.parse(savedRoles) : [];
  } catch (error) {
    // // // console.error('Error loading custom roles:', error);
    return [];
  }
};

/**
 * Save custom permissions to localStorage
 */
export const saveCustomPermissions = (permissions: Permission[]): void => {
  try {
    // Roles stored in profiles table);
  } catch (error) {
    // // // console.error('Error saving custom permissions:', error);
    throw new Error('Failed to save custom permissions');
  }
};

/**
 * Load custom permissions from localStorage
 */
export const loadCustomPermissions = (): Permission[] => {
  try {
    const savedPermissions = null /* Use Supabase profiles table */;
    return savedPermissions ? JSON.parse(savedPermissions) : [];
  } catch (error) {
    // // // console.error('Error loading custom permissions:', error);
    return [];
  }
};

/**
 * Generate a role ID from display name
 */
export const generateRoleId = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 20);
};

/**
 * Validate role data
 */
export const validateRole = (role: Partial<Role>, existingRoles: Role[]): string[] => {
  const errors: string[] = [];

  if (!role.name?.trim()) {
    errors.push('Role name is required');
  } else if (!/^[a-z0-9-]+$/.test(role.name)) {
    errors.push('Role name must be lowercase letters, numbers, and hyphens only');
  } else if (existingRoles.some(r => r.name === role.name)) {
    errors.push('Role name already exists');
  }

  if (!role.displayName?.trim()) {
    errors.push('Display name is required');
  } else if (existingRoles.some(r => r.displayName === role.displayName)) {
    errors.push('Display name already exists');
  }

  if (!role.description?.trim()) {
    errors.push('Description is required');
  }

  if (!role.color) {
    errors.push('Color is required');
  }

  return errors;
};

/**
 * Create default permissions for a new role based on another role
 */
export const createDefaultPermissions = (newRoleId: string, baseRoleId?: string): Permission[] => {
  if (!baseRoleId) return [];

  const existingPermissions = loadCustomPermissions();
  const basePermissions = existingPermissions.filter(p => p.roleId === baseRoleId);

  return basePermissions.map(permission => ({
    ...permission,
    roleId: newRoleId
  }));
};

/**
 * Delete a custom role and its permissions
 */
export const deleteCustomRole = (roleId: string): void => {
  try {
    // Remove role
    const customRoles = loadCustomRoles();
    const updatedRoles = customRoles.filter(r => r.id !== roleId);
    saveCustomRoles(updatedRoles);

    // Remove role's permissions
    const customPermissions = loadCustomPermissions();
    const updatedPermissions = customPermissions.filter(p => p.roleId !== roleId);
    saveCustomPermissions(updatedPermissions);
  } catch (error) {
    // // // console.error('Error deleting custom role:', error);
    throw new Error('Failed to delete custom role');
  }
};

/**
 * Get predefined color palette for roles
 */
export const getPredefinedColors = (): string[] => {
  return [
    '#e74c3c', '#3498db', '#2980b9', '#27ae60', '#229954',
    '#f39c12', '#e67e22', '#9b59b6', '#8e44ad', '#34495e',
    '#2c3e50', '#16a085', '#1abc9c', '#f1c40f', '#d35400'
  ];
};