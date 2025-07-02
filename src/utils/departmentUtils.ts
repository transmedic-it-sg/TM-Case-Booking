/**
 * Department Utilities - Standardized department comparison logic
 * Handles both legacy format ("General Surgery") and new format ("Singapore:General Surgery")
 */

/**
 * Normalize department name by removing country prefix if present
 * @param department - Department name (e.g., "Singapore:General Surgery" or "General Surgery")
 * @returns Normalized department name without country prefix
 */
export const normalizeDepartmentName = (department: string): string => {
  if (!department) return '';
  
  // Check if department has country prefix (contains colon)
  if (department.includes(':')) {
    const parts = department.split(':');
    // Return the part after the colon (department name)
    return parts.length > 1 ? parts[1].trim() : department;
  }
  
  return department.trim();
};

/**
 * Check if user has access to a specific department
 * @param userDepartments - Array of user's departments (may have country prefixes)
 * @param targetDepartment - Department to check access for
 * @returns true if user has access to the department
 */
export const userHasDepartmentAccess = (
  userDepartments: string[] | undefined, 
  targetDepartment: string
): boolean => {
  if (!userDepartments || userDepartments.length === 0) return false;
  if (!targetDepartment) return false;
  
  const normalizedTarget = normalizeDepartmentName(targetDepartment);
  
  return userDepartments.some(userDept => {
    const normalizedUserDept = normalizeDepartmentName(userDept);
    return normalizedUserDept === normalizedTarget;
  });
};

/**
 * Check if user has access to any of the specified departments
 * @param userDepartments - Array of user's departments
 * @param targetDepartments - Array of departments to check access for
 * @returns true if user has access to at least one department
 */
export const userHasAnyDepartmentAccess = (
  userDepartments: string[] | undefined,
  targetDepartments: string[]
): boolean => {
  if (!userDepartments || userDepartments.length === 0) return false;
  if (!targetDepartments || targetDepartments.length === 0) return true; // No filter means allow all
  
  return targetDepartments.some(targetDept => 
    userHasDepartmentAccess(userDepartments, targetDept)
  );
};

/**
 * Filter departments array to include only those matching the target country
 * @param departments - Array of departments (may have country prefixes)
 * @param country - Target country to filter by
 * @returns Array of departments for the specified country
 */
export const filterDepartmentsByCountry = (
  departments: string[],
  country: string
): string[] => {
  if (!departments || departments.length === 0) return [];
  if (!country) return departments;
  
  return departments.filter(dept => {
    if (dept.includes(':')) {
      const [deptCountry] = dept.split(':');
      return deptCountry.trim() === country;
    }
    // If no country prefix, include all departments
    return true;
  });
};

/**
 * Get normalized department names from a list (removes country prefixes)
 * @param departments - Array of departments (may have country prefixes)
 * @returns Array of normalized department names
 */
export const getNormalizedDepartmentNames = (departments: string[]): string[] => {
  if (!departments || departments.length === 0) return [];
  
  return departments.map(dept => normalizeDepartmentName(dept));
};

/**
 * Check if two department names refer to the same department
 * (handles country prefix differences)
 * @param dept1 - First department name
 * @param dept2 - Second department name  
 * @returns true if they refer to the same department
 */
export const departmentsMatch = (dept1: string, dept2: string): boolean => {
  if (!dept1 || !dept2) return false;
  
  const normalized1 = normalizeDepartmentName(dept1);
  const normalized2 = normalizeDepartmentName(dept2);
  
  return normalized1 === normalized2;
};

/**
 * Validate department name format
 * @param department - Department name to validate
 * @returns object with validation result and error message if any
 */
export const validateDepartmentFormat = (department: string): {
  isValid: boolean;
  error?: string;
} => {
  if (!department || typeof department !== 'string') {
    return { isValid: false, error: 'Department name is required' };
  }
  
  const trimmed = department.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Department name cannot be empty' };
  }
  
  // Check for multiple colons (only one colon allowed for country:department format)
  const colonCount = (trimmed.match(/:/g) || []).length;
  if (colonCount > 1) {
    return { isValid: false, error: 'Department name format invalid: only one colon allowed for country:department format' };
  }
  
  // If it has a colon, validate both parts exist
  if (colonCount === 1) {
    const [country, dept] = trimmed.split(':');
    if (!country.trim() || !dept.trim()) {
      return { isValid: false, error: 'Both country and department parts must be non-empty in country:department format' };
    }
  }
  
  return { isValid: true };
};

/**
 * Convert legacy department format to country-prefixed format
 * @param department - Department name
 * @param country - Country to add as prefix
 * @returns Department in country:department format
 */
export const addCountryPrefixToDepartment = (
  department: string,
  country: string
): string => {
  if (!department || !country) return department;
  
  // If already has country prefix, return as-is
  if (department.includes(':')) return department;
  
  return `${country}:${department}`;
};