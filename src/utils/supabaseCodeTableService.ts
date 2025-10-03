import { supabase } from '../lib/supabase';
import { normalizeCountry } from './countryUtils';

// Add caching to prevent excessive database requests
interface CacheEntry {
  data: CodeTable[];
  timestamp: number;
  country: string | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const codeTableCache = new Map<string, CacheEntry>();

// Track pending requests to avoid duplicate fetches
const pendingRequests = new Map<string, Promise<CodeTable[]>>();

// Interface matching the database structure
export interface SupabaseCodeTableItem {
  id: string;
  country: string | null;
  table_type: string;
  code: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Interface matching the frontend CodeTable structure
export interface CodeTable {
  id: string;
  name: string;
  description: string;
  items: string[];
}

/**
 * Helper function to normalize country names for database operations
 * Always returns 'Global' for global tables or the normalized country name
 */
const normalizeCountryForDB = (country?: string): string => {
  if (!country) return 'Global';
  // Use the imported normalizeCountry function for consistency
  return normalizeCountry(country);
};

/**
 * Get code tables from Supabase database
 * Now uses the real code_tables table that was created
 */
export const getSupabaseCodeTables = async (country?: string): Promise<CodeTable[]> => {
  try {
    const normalizedCountry = country ? normalizeCountryForDB(country) : null;
    const cacheKey = normalizedCountry || 'Global';

    // Check cache first
    const cached = codeTableCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {return cached.data;
    }

    // Check if there's already a pending request for this country
    const pendingRequest = pendingRequests.get(cacheKey);
    if (pendingRequest) {return await pendingRequest;
    }// Create a promise for the fetch operation and store it
    const fetchPromise = (async (): Promise<CodeTable[]> => {
      try {
        // Query the actual code_tables table
        let query = supabase
      .from('code_tables')
      .select('*')
      .eq('is_active', true)
      .order('table_type, display_name');

    // Apply country filter based on data model:
    // - countries: Always Global
    // - departments/hospitals: Country-specific only
    if (normalizedCountry) {
      // For a specific country request, we need different logic per table type
      // We'll filter in the grouping logic below since SQL doesn't easily support this
      query = query.in('country', ['Global', normalizedCountry]);
    } else {
      // For global request, only get Global data (countries)
      query = query.eq('country', 'Global');
    }

    const { data: codeTableData, error } = await query;

    if (error) {
      console.error('❌ Error fetching code tables:', error);
      throw error;
    }

    if (!codeTableData || codeTableData.length === 0) {
      console.warn('⚠️ No code table data found');
      return [];
    }

    // Apply data model filtering rules:
    // - countries: Always from Global
    // - departments: Always from specific country (never Global)
    // - hospitals: Always from specific country (never Global)
    const filteredData = codeTableData.filter(item => {
      if (item.table_type === 'countries') {
        // Countries always come from Global
        return item.country === 'Global';
      } else if (item.table_type === 'departments' || item.table_type === 'hospitals') {
        // Departments and hospitals are country-specific
        if (normalizedCountry) {
          // For a specific country, only return that country's data
          return item.country === normalizedCountry;
        } else {
          // For global request, don't return departments/hospitals
          return false;
        }
      }
      // For any other table types, use existing logic
      return normalizedCountry ? (item.country === 'Global' || item.country === normalizedCountry) : item.country === 'Global';
    });

    // Group by table_type and transform to CodeTable format
    const grouped: Record<string, SupabaseCodeTableItem[]> = {};
    filteredData.forEach(item => {
      if (!grouped[item.table_type]) {
        grouped[item.table_type] = [];
      }
      grouped[item.table_type].push(item);
    });

    // Transform to CodeTable format
    const tables: CodeTable[] = Object.entries(grouped).map(([tableType, items]) => ({
      id: tableType,
      name: getTableDisplayName(tableType),
      description: getTableDescription(tableType),
      items: items.map(item => item.display_name).sort()
    }));

    // Cache the result
    codeTableCache.set(cacheKey, {
      data: tables,
      timestamp: Date.now(),
      country: normalizedCountry
    });return tables;

      } catch (error) {
        console.error('❌ Error fetching code tables:', error);
        throw error;
      }
    })();

    // Store the promise in pendingRequests
    pendingRequests.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      // Clean up the pending request
      pendingRequests.delete(cacheKey);
    }

  } catch (error) {
    console.error('❌ Error in getSupabaseCodeTables:', error);

    // Return empty array instead of false fallback data
    return [];
  }
};

/**
 * Save code tables to Supabase
 */
export const saveSupabaseCodeTables = async (
  codeTables: CodeTable[],
  country?: string
): Promise<void> => {
  try {
    const normalizedCountry = normalizeCountryForDB(country);

    // Convert CodeTable format to database format
    const itemsToInsert: Omit<SupabaseCodeTableItem, 'id' | 'created_at' | 'updated_at'>[] = [];

    codeTables.forEach(table => {
      table.items.forEach(item => {
        itemsToInsert.push({
          country: country ? normalizedCountry : 'Global',
          table_type: table.id,
          code: item.toLowerCase().replace(/\s+/g, '_'),
          display_name: item,
          is_active: true
        });
      });
    });

    if (itemsToInsert.length > 0) {
      const { error } = await supabase
        .from('code_tables')
        .upsert(itemsToInsert, {
          onConflict: 'country,table_type,code'
        });

      if (error) {
        console.error('Error saving code tables:', error);
        throw error;
      }}
  } catch (error) {
    console.error('Error in saveSupabaseCodeTables:', error);
    throw error;
  }
};

/**
 * Add a single item to a code table
 */
export const addSupabaseCodeTableItem = async (
  tableType: string,
  item: string,
  country?: string
): Promise<boolean> => {
  try {
    const normalizedCountry = normalizeCountryForDB(country);

    // Apply correct data model logic:
    // - countries: Always add to Global
    // - departments/hospitals: Always add to specific country
    let targetCountry: string;
    if (tableType === 'countries') {
      targetCountry = 'Global';
    } else if (tableType === 'departments' || tableType === 'hospitals') {
      if (!country) {
        console.error('Country is required for departments/hospitals addition');
        return false;
      }
      targetCountry = normalizedCountry;
    } else {
      // Fallback for other table types
      targetCountry = country ? normalizedCountry : 'Global';
    }

    const { error } = await supabase
      .from('code_tables')
      .insert({
        country: targetCountry,
        table_type: tableType,
        code: item.toLowerCase().replace(/\s+/g, '_'),
        display_name: item,
        is_active: true
      });

    if (error) {
      console.error('Error adding code table item:', error);
      return false;
    }

    // Clear cache to ensure UI updates immediately
    const cacheKey = normalizedCountry || 'Global';
    codeTableCache.delete(cacheKey);
    pendingRequests.delete(cacheKey);

    // Also clear department-specific cache if this is a departments table
    if (tableType === 'departments') {
      departmentCache.clear();
      departmentPendingRequests.clear();
    }

    return true;
  } catch (error) {
    console.error('Error in addSupabaseCodeTableItem:', error);
    return false;
  }
};

/**
 * Update a code table item
 */
export const updateSupabaseCodeTableItem = async (
  tableType: string,
  oldItem: string,
  newItem: string,
  country?: string
): Promise<boolean> => {
  try {
    const normalizedCountry = normalizeCountryForDB(country);
    const oldCode = oldItem.toLowerCase().replace(/\s+/g, '_');

    // Apply correct data model logic:
    // - countries: Always update in Global
    // - departments/hospitals: Always update in specific country
    let targetCountry: string;
    if (tableType === 'countries') {
      targetCountry = 'Global';
    } else if (tableType === 'departments' || tableType === 'hospitals') {
      if (!country) {
        console.error('Country is required for departments/hospitals update');
        return false;
      }
      targetCountry = normalizedCountry;
    } else {
      // Fallback for other table types
      targetCountry = country ? normalizedCountry : 'Global';
    }

    const { error } = await supabase
      .from('code_tables')
      .update({
        code: newItem.toLowerCase().replace(/\s+/g, '_'),
        display_name: newItem
      })
      .eq('country', targetCountry)
      .eq('table_type', tableType)
      .eq('code', oldCode);

    if (error) {
      console.error('Error updating code table item:', error);
      return false;
    }

    // Clear cache to ensure UI updates immediately
    const cacheKey = normalizedCountry || 'Global';
    codeTableCache.delete(cacheKey);
    pendingRequests.delete(cacheKey);

    // Also clear department-specific cache if this is a departments table
    if (tableType === 'departments') {
      departmentCache.clear();
      departmentPendingRequests.clear();
    }

    return true;
  } catch (error) {
    console.error('Error in updateSupabaseCodeTableItem:', error);
    return false;
  }
};

/**
 * Remove a code table item (mark as inactive)
 */
export const removeSupabaseCodeTableItem = async (
  tableType: string,
  item: string,
  country?: string
): Promise<boolean> => {
  try {
    const normalizedCountry = normalizeCountryForDB(country);
    const code = item.toLowerCase().replace(/\s+/g, '_');

    // Apply correct data model logic:
    // - countries: Always delete from Global
    // - departments/hospitals: Always delete from specific country
    let targetCountry: string;
    if (tableType === 'countries') {
      targetCountry = 'Global';
    } else if (tableType === 'departments' || tableType === 'hospitals') {
      if (!country) {
        console.error('Country is required for departments/hospitals deletion');
        return false;
      }
      targetCountry = normalizedCountry;
    } else {
      // Fallback for other table types
      targetCountry = country ? normalizedCountry : 'Global';
    }

    const result = await supabase
      .from('code_tables')
      .update({ is_active: false })
      .eq('country', targetCountry)
      .eq('table_type', tableType)
      .eq('code', code);

    if (result.error) {
      console.error('Error removing code table item:', result.error);
      return false;
    }

    // Clear cache to ensure UI updates immediately
    const cacheKey = normalizedCountry || 'Global';
    codeTableCache.delete(cacheKey);
    pendingRequests.delete(cacheKey);

    // Also clear department-specific cache if this is a departments table
    if (tableType === 'departments') {
      departmentCache.clear();
      departmentPendingRequests.clear();}

    return true;
  } catch (error) {
    console.error('Error in removeSupabaseCodeTableItem:', error);
    return false;
  }
};

/**
 * Helper function to get display name for table type
 */
function getTableDisplayName(tableType: string): string {
  const displayNames: Record<string, string> = {
    countries: 'Countries',
    hospitals: 'Hospitals',
    departments: 'Departments'
  };
  return displayNames[tableType] || tableType.charAt(0).toUpperCase() + tableType.slice(1);
}

/**
 * Helper function to get description for table type
 */
function getTableDescription(tableType: string): string {
  const descriptions: Record<string, string> = {
    countries: 'List of available countries',
    hospitals: 'List of hospitals for this country',
    departments: 'List of medical departments'
  };
  return descriptions[tableType] || `List of ${tableType}`;
}

/**
 * Clear the code table cache for debugging
 */
export const clearCodeTableCache = (): void => {
  codeTableCache.clear();
  pendingRequests.clear();};

/**
 * Force refresh code tables by clearing cache and fetching fresh data
 */
export const forceRefreshCodeTables = async (country?: string): Promise<CodeTable[]> => {
  const normalizedCountry = country ? normalizeCountryForDB(country) : null;
  const cacheKey = normalizedCountry || 'Global';

  // Clear cache for this country
  codeTableCache.delete(cacheKey);
  pendingRequests.delete(cacheKey);return await getSupabaseCodeTables(country);
};

// Department-specific cache to prevent excessive requests
const departmentCache = new Map<string, { data: string[]; timestamp: number }>();
const departmentPendingRequests = new Map<string, Promise<string[]>>();

/**
 * Get departments for a country from code_tables (CORRECT METHOD)
 * This should be used instead of the departments table
 */
export const getDepartmentsForCountry = async (country: string): Promise<string[]> => {
  try {
    const normalizedCountry = normalizeCountryForDB(country);
    const cacheKey = `departments_${normalizedCountry}`;

    // Check cache first
    const cached = departmentCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    // Check if there's already a pending request
    const pendingRequest = departmentPendingRequests.get(cacheKey);
    if (pendingRequest) {
      return await pendingRequest;
    }

    // Create a promise for the fetch operation
    const fetchPromise = (async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'departments')
        .eq('country', normalizedCountry) // Departments are ONLY country-specific, not Global
        .eq('is_active', true)
        .order('display_name');

      if (error) {
        console.error('Error fetching departments from code_tables:', error);
        throw error;
      }

      const departments = data?.map(item => item.display_name) || [];

      // Cache the result
      departmentCache.set(cacheKey, {
        data: departments,
        timestamp: Date.now()
      });

      return departments;
    })();

    // Store the promise in pendingRequests
    departmentPendingRequests.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      // Clean up the pending request
      departmentPendingRequests.delete(cacheKey);
    }

  } catch (error) {
    console.error('Error in getDepartmentsForCountry:', error);
    return [];
  }
};

/**
 * Get hospitals for a country from code_tables
 */
export const getHospitalsForCountry = async (country: string): Promise<string[]> => {
  try {const { data, error } = await supabase
      .from('code_tables')
      .select('display_name')
      .eq('table_type', 'hospitals')
      .eq('country', country)
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      console.error('Error fetching hospitals from code_tables:', error);
      throw error;
    }

    const hospitals = data?.map(item => item.display_name) || [];return hospitals;

  } catch (error) {
    console.error('Error in getHospitalsForCountry:', error);
    return [];
  }
};