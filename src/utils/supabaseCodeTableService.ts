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
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`🎯 Using cached code tables for ${cacheKey}`);
      return cached.data;
    }
    
    // Check if there's already a pending request for this country
    const pendingRequest = pendingRequests.get(cacheKey);
    if (pendingRequest) {
      console.log(`⏳ Waiting for existing request for ${cacheKey}`);
      return await pendingRequest;
    }
    
    console.log(`🔄 Fetching code tables for ${cacheKey}`);
    
    // Create a promise for the fetch operation and store it
    const fetchPromise = (async (): Promise<CodeTable[]> => {
      try {
        // Query the actual code_tables table
        let query = supabase
      .from('code_tables')
      .select('*')
      .eq('is_active', true)
      .order('table_type, display_name');
    
    // Filter by country if specified, or get global data
    if (normalizedCountry) {
      query = query.in('country', ['Global', normalizedCountry]);
    } else {
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
    
    // Group by table_type and transform to CodeTable format
    const grouped: Record<string, SupabaseCodeTableItem[]> = {};
    codeTableData.forEach(item => {
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
    });
    
        console.log(`✅ Successfully loaded and cached ${tables.length} code tables for ${cacheKey}`);
        return tables;
        
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
    
    // Fallback to minimal static data only if database fails
    console.warn('⚠️ Using fallback data due to database error');
    return [
      {
        id: 'countries',
        name: 'Countries',
        description: 'List of available countries', 
        items: ['Singapore', 'Malaysia', 'Philippines', 'Indonesia', 'Vietnam', 'Hong Kong', 'Thailand']
      },
      {
        id: 'departments',
        name: 'Departments',
        description: 'List of medical departments',
        items: ['Cardiology', 'Orthopedics', 'Neurosurgery', 'Oncology', 'Emergency', 'Radiology']
      }
    ];
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
      }
      
      console.log(`✅ Successfully saved ${itemsToInsert.length} code table items`);
    }
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
    
    const { error } = await supabase
      .from('code_tables')
      .insert({
        country: country ? normalizedCountry : 'Global',
        table_type: tableType,
        code: item.toLowerCase().replace(/\s+/g, '_'),
        display_name: item,
        is_active: true
      });
      
    if (error) {
      console.error('Error adding code table item:', error);
      return false;
    }
    
    console.log(`✅ Successfully added ${item} to ${tableType}`);
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
    
    const { error } = await supabase
      .from('code_tables')
      .update({
        code: newItem.toLowerCase().replace(/\s+/g, '_'),
        display_name: newItem
      })
      .eq('country', country ? normalizedCountry : 'Global')
      .eq('table_type', tableType)
      .eq('code', oldCode);
      
    if (error) {
      console.error('Error updating code table item:', error);
      return false;
    }
    
    console.log(`✅ Successfully updated ${oldItem} to ${newItem} in ${tableType}`);
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
    
    const { error } = await supabase
      .from('code_tables')
      .update({ is_active: false })
      .eq('country', country ? normalizedCountry : 'Global')
      .eq('table_type', tableType)
      .eq('code', code);
      
    if (error) {
      console.error('Error removing code table item:', error);
      return false;
    }
    
    console.log(`✅ Successfully removed ${item} from ${tableType}`);
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