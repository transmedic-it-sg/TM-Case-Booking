import { CodeTable } from './codeTable';
import { User } from '../types';

/**
 * Categorize code tables into global and country-based
 */
export const categorizeCodeTables = (tables: CodeTable[]) => {
  const countryBased: CodeTable[] = [];
  const global: CodeTable[] = [];

  tables.forEach(table => {
    if (table.id === 'countries') {
      // Countries is global
      global.push(table);
    } else if (table.id === 'hospitals' || table.id === 'departments') {
      // Hospitals and Departments are country-based
      countryBased.push(table);
    } else {
      // Default to country-based for future tables
      countryBased.push(table);
    }
  });

  return { countryBased, global };
};

/**
 * Filter code tables based on user's country access (VIEW ONLY - don't modify original data)
 */
export const getFilteredTablesForUser = (tables: CodeTable[], currentUser: User | null): CodeTable[] => {
  if (!currentUser) return tables;

  // Admin and IT can see and modify all tables
  if (currentUser.role === 'admin' || currentUser.role === 'it') {
    return tables;
  }

  // For other users, filter based on their assigned countries (VIEW ONLY)
  return tables.map(table => {
    if (table.id === 'countries' && currentUser.countries && currentUser.countries.length > 0) {
      // Filter countries based on user's assigned countries FOR DISPLAY ONLY
      return {
        ...table,
        items: table.items.filter(country => currentUser.countries?.includes(country))
      };
    }
    return table;
  });
};

/**
 * Validate code table item
 */
export const validateCodeTableItem = (itemName: string, currentTable: CodeTable | undefined): string[] => {
  const errors: string[] = [];

  if (!itemName.trim()) {
    errors.push('Item name is required');
  }

  if (!currentTable) {
    errors.push('No table selected');
    return errors;
  }

  if (currentTable.items.includes(itemName.trim())) {
    errors.push('This item already exists in the table');
  }

  if (itemName.trim().length < 1) {
    errors.push('Item name must be at least 1 character');
  }

  if (itemName.trim().length > 100) {
    errors.push('Item name must be less than 100 characters');
  }

  return errors;
};

/**
 * Get user's accessible countries
 */
export const getUserAccessibleCountries = (availableCountries: string[], currentUser: User | null): string[] => {
  if (!currentUser) return [];

  // Admin and IT can access all countries
  if (currentUser.role === 'admin' || currentUser.role === 'it') {
    return availableCountries;
  }

  // Other users can only access their assigned countries
  return availableCountries.filter(country => currentUser.countries?.includes(country));
};

/**
 * Check if deletion requires special confirmation (global tables)
 */
export const requiresDoubleConfirmation = (selectedCategory: 'global' | 'country'): boolean => {
  return selectedCategory === 'global';
};

/**
 * Generate confirmation messages for item deletion
 */
export const getDeleteConfirmationMessages = (
  itemName: string,
  tableName: string,
  isGlobal: boolean,
  selectedCountry?: string
) => {
  if (isGlobal) {
    return {
      first: {
        title: '⚠️ Global Table Warning',
        message: `⚠️ WARNING: You are about to delete "${itemName}" from ${tableName}.\n\nThis is a GLOBAL table that affects ALL countries!\n\nAre you sure you want to continue?`
      },
      second: {
        title: '🚨 Final Confirmation Required',
        message: `🚨 FINAL CONFIRMATION\n\nDeleting "${itemName}" from the global ${tableName} table will:\n\n• Remove it from ALL countries permanently\n• Potentially affect existing users and data\n• Cannot be undone\n\nThis action is irreversible.`
      }
    };
  } else {
    return {
      single: {
        title: 'Delete Item',
        message: `Are you sure you want to delete "${itemName}" from ${tableName}?\n\nThis will only affect ${selectedCountry} and cannot be undone.`
      }
    };
  }
};