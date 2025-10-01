// DEPRECATED: This file is being replaced by Supabase-based services
// All functions now delegate to the proper Supabase services

// DEPARTMENTS constant removed - use database-driven departments instead
import { SUPPORTED_COUNTRIES } from './countryUtils';

export interface CodeTable {
  id: string;
  name: string;
  description: string;
  items: string[];
}

// DEPRECATED: Use Supabase services instead
export const getCodeTables = (country?: string): CodeTable[] => {
  console.warn('getCodeTables is deprecated. Use Supabase services instead.');
  // Return basic fallback data for legacy compatibility
  return getDefaultCodeTables(country);
};

// Get default code tables based on types constants
export const getDefaultCodeTables = (country?: string): CodeTable[] => {
  const defaultHospitals = getDefaultHospitalsForCountry(country);

  return [
    {
      id: 'hospitals',
      name: 'Hospitals',
      description: 'List of available hospitals',
      items: defaultHospitals
    },
    {
      id: 'departments',
      name: 'Departments',
      description: 'Medical departments (use database service instead)',
      items: [] // Use Supabase department service instead
    },
    {
      id: 'countries',
      name: 'Countries',
      description: 'Supported countries',
      items: [...SUPPORTED_COUNTRIES]
    }
  ];
};

// Get specific code table by ID
export const getCodeTable = (tableId: string): CodeTable | undefined => {
  const tables = getCodeTables();
  return tables.find(table => table.id === tableId);
};

// Get items from a specific code table
export const getCodeTableItems = (tableId: string): string[] => {
  const table = getCodeTable(tableId);
  return table?.items || [];
};

// Get hospitals list
export const getHospitals = (): string[] => {
  return getCodeTableItems('hospitals');
};

// Get hospitals list for a specific country
export const getHospitalsForCountry = (country: string): string[] => {
  const countryTables = getCodeTables(country);
  const hospitalTable = countryTables.find(table => table.id === 'hospitals');
  return hospitalTable?.items || [];
};

// Get departments list with user filtering
export const getDepartments = (userDepartments?: string[]): string[] => {
  const allDepartments = getCodeTableItems('departments');

  // If user has specific departments, filter by those
  if (userDepartments && userDepartments.length > 0) {
    return allDepartments.filter(dept => userDepartments.includes(dept));
  }

  return allDepartments;
};

// DEPRECATED: Use SUPPORTED_COUNTRIES from countryUtils instead
export const getCountries = (): string[] => {
  console.warn('getCountries from codeTable is deprecated. Use SUPPORTED_COUNTRIES from countryUtils instead.');
  return [...SUPPORTED_COUNTRIES];
};

// Get departments by country for User Access Matrix
export const getDepartmentsByCountry = (): Record<string, string[]> => {
  const countries = getCountries();
  const departmentsByCountry: Record<string, string[]> = {};

  // Get departments for each country from country-specific storage
  countries.forEach(country => {
    try {
      const countryTables = getCodeTables(country);
      const departmentsTable = countryTables.find(table => table.id === 'departments');
      departmentsByCountry[country] = departmentsTable?.items || [];
    } catch (error) {
      console.error(`Error loading departments for ${country}:`, error);
      departmentsByCountry[country] = [];
    }
  });

  return departmentsByCountry;
};

// Get all departments from all countries (for backward compatibility)
export const getAllDepartmentsFromAllCountries = (): string[] => {
  const departmentsByCountry = getDepartmentsByCountry();
  const allDepartments = new Set<string>();

  Object.values(departmentsByCountry).forEach(departments => {
    departments.forEach(dept => allDepartments.add(dept));
  });

  return Array.from(allDepartments).sort();
};

// Get departments for specific countries
export const getDepartmentsForCountries = (countries: string[]): string[] => {
  const departmentsByCountry = getDepartmentsByCountry();
  const departments = new Set<string>();

  countries.forEach(country => {
    if (departmentsByCountry[country]) {
      departmentsByCountry[country].forEach(dept => departments.add(dept));
    }
  });

  return Array.from(departments).sort();
};

// Department isolation utilities for country-specific department tracking
export const createCountryDepartmentId = (country: string, department: string): string => {
  return `${country}:${department}`;
};

export const parseCountryDepartmentId = (departmentId: string): { country: string; department: string } => {
  if (departmentId.includes(':')) {
    const [country, department] = departmentId.split(':', 2);
    return { country, department };
  }
  // Backward compatibility - treat as global department
  return { country: '', department: departmentId };
};

export const isCountrySpecificDepartment = (departmentId: string): boolean => {
  return departmentId.includes(':');
};

export const getPlainDepartmentName = (departmentId: string): string => {
  const { department } = parseCountryDepartmentId(departmentId);
  return department;
};

export const getCountryFromDepartmentId = (departmentId: string): string => {
  const { country } = parseCountryDepartmentId(departmentId);
  return country;
};

// Convert legacy departments to country-specific format
export const migrateDepartmentsToCountrySpecific = (
  departments: string[],
  userCountries: string[]
): string[] => {
  const migratedDepartments: string[] = [];

  departments.forEach(dept => {
    if (isCountrySpecificDepartment(dept)) {
      // Already in new format
      migratedDepartments.push(dept);
    } else {
      // Legacy format - convert to country-specific for each user country
      userCountries.forEach(country => {
        const countryDepartments = getDepartmentsForCountries([country]);
        if (countryDepartments.includes(dept)) {
          migratedDepartments.push(createCountryDepartmentId(country, dept));
        }
      });
    }
  });

  return migratedDepartments;
};

// Get departments for display in forms (backward compatible)
export const getDepartmentNamesForUser = (
  userDepartments: string[],
  userCountries: string[]
): string[] => {
  const departmentNames = new Set<string>();

  userDepartments.forEach(dept => {
    if (isCountrySpecificDepartment(dept)) {
      const { country, department } = parseCountryDepartmentId(dept);
      if (userCountries.includes(country)) {
        departmentNames.add(department);
      }
    } else {
      // Legacy department - include if it exists in user's countries
      const availableDepts = getDepartmentsForCountries(userCountries);
      if (availableDepts.includes(dept)) {
        departmentNames.add(dept);
      }
    }
  });

  return Array.from(departmentNames).sort();
};

// Get countries filtered by user's assigned countries
export const getUserCountries = (userCountries?: string[]): string[] => {
  const allCountries = getCountries();

  // If user has specific countries, filter by those
  if (userCountries && userCountries.length > 0) {
    return allCountries.filter(country => userCountries.includes(country));
  }

  return allCountries;
};

// Save code tables to localStorage
export const saveCodeTables = (tables: CodeTable[], country?: string): void => {
  try {
    const storageKey = country ? `codeTables-${country}` : 'codeTables';
    // Code tables fetched from Supabase);
  } catch (error) {
    console.error('Error saving code tables to localStorage:', error);
  }
};

// Initialize code tables if they don't exist or if corrupted
export const initializeCodeTables = (): void => {
  const existingTables = null /* Use Supabase tables */;
  if (!existingTables) {
    const defaultTables = getDefaultCodeTables();
    saveCodeTables(defaultTables);
  } else {
    // Check if countries table is corrupted (missing countries)
    try {
      const tables = JSON.parse(existingTables);
      const countriesTable = tables.find((table: CodeTable) => table.id === 'countries');
      const defaultCountries = getDefaultCodeTables().find(table => table.id === 'countries');

      // If countries table exists but has fewer items than default, reset to defaults
      if (countriesTable && defaultCountries && countriesTable.items.length < defaultCountries.items.length) {const defaultTables = getDefaultCodeTables();
        saveCodeTables(defaultTables);
      }
    } catch (error) {
      console.error('Error checking code tables, resetting to defaults:', error);
      const defaultTables = getDefaultCodeTables();
      saveCodeTables(defaultTables);
    }
  }
};

// Initialize country-specific code tables
export const initializeCountryCodeTables = (country: string): void => {
  const storageKey = `codeTables-${country}`;
  const existingTables = null /* Use Supabase tables */;

  if (!existingTables) {
    // Create country-specific tables with default data for that country
    const defaultTables = getDefaultCodeTables(country);
    // Only save country-based tables (exclude countries table which is global)
    const countryBasedTables = defaultTables.filter(table => table.id !== 'countries');
    saveCodeTables(countryBasedTables, country);} else {
    // Validate existing country tables
    try {
      const tables = JSON.parse(existingTables);
      const hospitalsTable = tables.find((table: CodeTable) => table.id === 'hospitals');

      // If hospitals table doesn't exist, reinitialize
      if (!hospitalsTable) {const defaultTables = getDefaultCodeTables(country);
        const countryBasedTables = defaultTables.filter(table => table.id !== 'countries');
        saveCodeTables(countryBasedTables, country);
      }
    } catch (error) {
      console.error(`Error parsing country code tables for ${country}, reinitializing:`, error);
      const defaultTables = getDefaultCodeTables(country);
      const countryBasedTables = defaultTables.filter(table => table.id !== 'countries');
      saveCodeTables(countryBasedTables, country);
    }
  }
};

// Add item to a code table
export const addCodeTableItem = (tableId: string, item: string): boolean => {
  try {
    const tables = getCodeTables();
    const tableIndex = tables.findIndex(table => table.id === tableId);

    if (tableIndex === -1) return false;

    // Check if item already exists
    if (tables[tableIndex].items.includes(item)) return false;

    tables[tableIndex].items.push(item);
    saveCodeTables(tables);
    return true;
  } catch (error) {
    console.error('Error adding item to code table:', error);
    return false;
  }
};

// Remove item from a code table
export const removeCodeTableItem = (tableId: string, item: string): boolean => {
  try {
    const tables = getCodeTables();
    const tableIndex = tables.findIndex(table => table.id === tableId);

    if (tableIndex === -1) return false;

    tables[tableIndex].items = tables[tableIndex].items.filter(i => i !== item);
    saveCodeTables(tables);
    return true;
  } catch (error) {
    console.error('Error removing item from code table:', error);
    return false;
  }
};

// Update item in a code table
export const updateCodeTableItem = (tableId: string, oldItem: string, newItem: string): boolean => {
  try {
    const tables = getCodeTables();
    const tableIndex = tables.findIndex(table => table.id === tableId);

    if (tableIndex === -1) return false;

    const itemIndex = tables[tableIndex].items.findIndex(item => item === oldItem);
    if (itemIndex === -1) return false;

    // Check if new item already exists (and it's different from old item)
    if (newItem !== oldItem && tables[tableIndex].items.includes(newItem)) return false;

    tables[tableIndex].items[itemIndex] = newItem;
    saveCodeTables(tables);
    return true;
  } catch (error) {
    console.error('Error updating item in code table:', error);
    return false;
  }
};

// Get default hospitals for a specific country
export const getDefaultHospitalsForCountry = (country?: string): string[] => {
  switch (country) {
    case 'Singapore':
      return [
        'Singapore General Hospital',
        'Mount Elizabeth Hospital',
        'Raffles Hospital',
        'National University Hospital',
        'Changi General Hospital',
        'Tan Tock Seng Hospital',
        'KK Women\'s and Children\'s Hospital',
        'Institute of Mental Health',
        'National Cancer Centre Singapore',
        'Singapore National Eye Centre'
      ];
    case 'Malaysia':
      return [
        'Kuala Lumpur Hospital',
        'University Malaya Medical Centre',
        'Gleneagles Kuala Lumpur',
        'Pantai Hospital Kuala Lumpur',
        'Prince Court Medical Centre',
        'Sunway Medical Centre',
        'Hospital Sultanah Aminah',
        'Penang General Hospital'
      ];
    case 'Philippines':
      return [
        'Philippine General Hospital',
        'St. Luke\'s Medical Center',
        'The Medical City',
        'Makati Medical Center',
        'Asian Hospital and Medical Center',
        'Cardinal Santos Medical Center',
        'Jose Reyes Memorial Medical Center'
      ];
    case 'Indonesia':
      return [
        'Cipto Mangunkusumo Hospital',
        'Siloam Hospitals',
        'RS Pondok Indah',
        'Mayapada Hospital',
        'MRCCC Siloam Hospitals Semanggi',
        'Jakarta Heart Center',
        'Rumah Sakit Premier Bintaro'
      ];
    case 'Vietnam':
      return [
        'Cho Ray Hospital',
        'Bach Mai Hospital',
        'Vinmec Central Park',
        'FV Hospital',
        'University Medical Center HCMC',
        'Gia Dinh People\'s Hospital',
        'Columbia Asia Saigon'
      ];
    case 'Hong Kong':
      return [
        'Queen Mary Hospital',
        'Prince of Wales Hospital',
        'Hong Kong Sanatorium & Hospital',
        'Baptist Hospital',
        'Gleneagles Hong Kong Hospital',
        'Union Hospital',
        'St. Paul\'s Hospital'
      ];
    case 'Thailand':
      return [
        'Siriraj Hospital',
        'Chulalongkorn Hospital',
        'Bumrungrad International Hospital',
        'Bangkok Hospital',
        'Samitivej Hospital',
        'BNH Hospital',
        'Ramathibodi Hospital'
      ];
    default:
      return [
        'Singapore General Hospital',
        'Mount Elizabeth Hospital',
        'Raffles Hospital',
        'National University Hospital'
      ];
  }
};

// Update saveCodeTables to support country-specific storage
export const saveCodeTablesForCountry = (tables: CodeTable[], country?: string): void => {
  try {
    const storageKey = country ? `codeTables-${country}` : 'codeTables';
    // Code tables fetched from Supabase);
  } catch (error) {
    console.error('Error saving code tables to localStorage:', error);
  }
};