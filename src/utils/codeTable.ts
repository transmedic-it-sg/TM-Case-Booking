import { COUNTRIES, DEPARTMENTS } from '../types';

export interface CodeTable {
  id: string;
  name: string;
  description: string;
  items: string[];
}

// Get code tables from localStorage with fallback to defaults
export const getCodeTables = (): CodeTable[] => {
  const storedTables = localStorage.getItem('codeTables');
  if (storedTables) {
    try {
      return JSON.parse(storedTables);
    } catch (error) {
      console.error('Error parsing code tables from localStorage:', error);
    }
  }
  
  // Return default code tables if none exist
  return getDefaultCodeTables();
};

// Get default code tables based on types constants
export const getDefaultCodeTables = (): CodeTable[] => {
  return [
    {
      id: 'hospitals',
      name: 'Hospitals',
      description: 'List of available hospitals',
      items: [
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
      ]
    },
    {
      id: 'departments',
      name: 'Departments',
      description: 'Medical departments',
      items: [...DEPARTMENTS]
    },
    {
      id: 'countries',
      name: 'Countries',
      description: 'Supported countries',
      items: [...COUNTRIES]
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

// Get departments list with user filtering
export const getDepartments = (userDepartments?: string[]): string[] => {
  const allDepartments = getCodeTableItems('departments');
  
  // If user has specific departments, filter by those
  if (userDepartments && userDepartments.length > 0) {
    return allDepartments.filter(dept => userDepartments.includes(dept));
  }
  
  return allDepartments;
};

// Get countries list
export const getCountries = (): string[] => {
  return getCodeTableItems('countries');
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
export const saveCodeTables = (tables: CodeTable[]): void => {
  try {
    localStorage.setItem('codeTables', JSON.stringify(tables));
  } catch (error) {
    console.error('Error saving code tables to localStorage:', error);
  }
};

// Initialize code tables if they don't exist
export const initializeCodeTables = (): void => {
  const existingTables = localStorage.getItem('codeTables');
  if (!existingTables) {
    const defaultTables = getDefaultCodeTables();
    saveCodeTables(defaultTables);
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