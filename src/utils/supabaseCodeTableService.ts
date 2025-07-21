import { supabase } from '../lib/supabase';

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
 * Helper function to get country code from country name
 */
const getCountryCode = (country: string): string => {
  const countryMap: { [key: string]: string } = {
    'Singapore': 'SG',
    'Malaysia': 'MY',
    'Philippines': 'PH',
    'Indonesia': 'ID',
    'Vietnam': 'VN',
    'Hong Kong': 'HK',
    'Thailand': 'TH'
  };
  return countryMap[country] || (country.length <= 3 ? country : 'GLB');
};

/**
 * Get code tables from Supabase and transform to frontend format
 */
export const getSupabaseCodeTables = async (country?: string): Promise<CodeTable[]> => {
  try {
    let query = supabase
      .from('code_tables')
      .select('*')
      .eq('is_active', true)
      .order('table_type, display_name');

    // If country is specified, filter by country
    if (country) {
      query = query.eq('country', getCountryCode(country));
    } else {
      // For global tables, get records where country is 'GLB'
      query = query.eq('country', 'GLB');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching code tables from Supabase:', error);
      throw error;
    }

    if (!data) return [];

    // If no global tables exist, initialize them
    if (!country && data.length === 0) {
      console.log('No global tables found, initializing default global tables...');
      await initializeDefaultGlobalTables();
      
      // Re-fetch after initialization
      const { data: newData, error: newError } = await query;
      if (newError) {
        console.error('Error fetching code tables after initialization:', newError);
        throw newError;
      }
      return transformCodeTableData(newData || []);
    }

    return transformCodeTableData(data);
  } catch (error) {
    console.error('Error in getSupabaseCodeTables:', error);
    throw error;
  }
};

/**
 * Transform raw Supabase data to CodeTable format
 */
const transformCodeTableData = (data: SupabaseCodeTableItem[]): CodeTable[] => {
  // Group by table_type and transform to CodeTable format
  const grouped: Record<string, SupabaseCodeTableItem[]> = {};
  data.forEach(item => {
    if (!grouped[item.table_type]) {
      grouped[item.table_type] = [];
    }
    grouped[item.table_type].push(item);
  });

  // Transform to CodeTable format
  const codeTables: CodeTable[] = Object.entries(grouped).map(([tableType, items]) => ({
    id: tableType,
    name: getTableDisplayName(tableType),
    description: getTableDescription(tableType),
    items: items.map(item => item.display_name).sort()
  }));

  return codeTables;
};

/**
 * Initialize default global tables if they don't exist
 */
const initializeDefaultGlobalTables = async (): Promise<void> => {
  try {
    // Default countries
    const defaultCountries = [
      'Singapore', 'Malaysia', 'Philippines', 'Indonesia', 
      'Vietnam', 'Hong Kong', 'Thailand', 'Global'
    ];
    
    // Default procedure types
    const defaultProcedureTypes = [
      'Knee', 'Head', 'Hip', 'Hands', 'Neck', 'Spine'
    ];
    
    // Insert countries
    for (const country of defaultCountries) {
      try {
        await addSupabaseCodeTableItem('countries', country);
      } catch (error) {
        console.error(`Error adding country ${country}:`, error);
      }
    }
    
    // Insert procedure types
    for (const procedureType of defaultProcedureTypes) {
      try {
        await addSupabaseCodeTableItem('procedure_types', procedureType);
      } catch (error) {
        console.error(`Error adding procedure type ${procedureType}:`, error);
      }
    }
    
    console.log('Default global tables initialized successfully');
  } catch (error) {
    console.error('Error initializing default global tables:', error);
    throw error;
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
    for (const codeTable of codeTables) {
      // Get existing items for this table type and country
      let query = supabase
        .from('code_tables')
        .select('*')
        .eq('table_type', codeTable.id);

      if (country) {
        query = query.eq('country', getCountryCode(country));
      } else {
        query = query.eq('country', 'GLB');
      }

      const { data: existingItems, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching existing items:', fetchError);
        throw fetchError;
      }

      const existingItemsMap = new Map(
        (existingItems || []).map(item => [item.display_name, item])
      );

      // Determine what needs to be added, updated, or removed
      const newItems = codeTable.items.filter(item => !existingItemsMap.has(item));
      const removedItems = Array.from(existingItemsMap.keys()).filter(
        existingItem => !codeTable.items.includes(existingItem)
      );

      // Add new items
      if (newItems.length > 0) {
        const itemsToInsert = newItems.map(item => {
          const insertData: any = {
            table_type: codeTable.id,
            code: generateCode(item),
            display_name: item,
            is_active: true
          };
          
          // Set country appropriately
          if (country && country !== null && country !== 'null' && country !== '') {
            insertData.country = getCountryCode(country);
          } else {
            insertData.country = 'GLB';
          }
          
          return insertData;
        });

        const { error: insertError } = await supabase
          .from('code_tables')
          .insert(itemsToInsert);

        if (insertError) {
          console.error('Error inserting new items:', insertError);
          throw insertError;
        }
      }

      // Mark removed items as inactive
      if (removedItems.length > 0) {
        const idsToDeactivate = removedItems.map(item => existingItemsMap.get(item)!.id);

        const { error: updateError } = await supabase
          .from('code_tables')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in('id', idsToDeactivate);

        if (updateError) {
          console.error('Error deactivating items:', updateError);
          throw updateError;
        }
      }
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
    // Check if item already exists
    let query = supabase
      .from('code_tables')
      .select('id')
      .eq('table_type', tableType)
      .eq('display_name', item)
      .eq('is_active', true);

    // For global tables like 'countries', use 'GLB' as country value
    if (tableType === 'countries') {
      query = query.eq('country', 'GLB');
    } else if (country && country !== null && country !== 'null') {
      query = query.eq('country', country);
    } else {
      // For other global tables, use 'GLB' as default
      query = query.eq('country', 'GLB');
    }

    const { data: existing, error: checkError } = await query;

    if (checkError) {
      console.error('Error checking existing item:', checkError);
      throw checkError;
    }

    if (existing && existing.length > 0) {
      // Item already exists
      return false;
    }

    // Insert new item
    const insertData: any = {
      table_type: tableType,
      code: generateCode(item),
      display_name: item,
      is_active: true
    };
    
    // For global tables like 'countries', set a special value to indicate global
    if (tableType === 'countries') {
      insertData.country = 'GLB';
    } else if (country && country !== null && country !== 'null' && country !== '') {
      // For country-specific tables, set the country code
      insertData.country = country;
    } else {
      // For other global tables, use 'GLB' as default
      insertData.country = 'GLB';
    }
    
    const { error: insertError } = await supabase
      .from('code_tables')
      .insert(insertData);

    if (insertError) {
      console.error('Error inserting item:', insertError);
      throw insertError;
    }

    return true;
  } catch (error) {
    console.error('Error in addSupabaseCodeTableItem:', error);
    throw error;
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
    // Find the existing item
    let query = supabase
      .from('code_tables')
      .select('id')
      .eq('table_type', tableType)
      .eq('display_name', oldItem)
      .eq('is_active', true);

    if (country) {
      query = query.eq('country', getCountryCode(country));
    } else {
      query = query.eq('country', 'GLB');
    }

    const { data: existing, error: findError } = await query;

    if (findError) {
      console.error('Error finding existing item:', findError);
      throw findError;
    }

    if (!existing || existing.length === 0) {
      return false;
    }

    // Check if new name already exists
    let checkQuery = supabase
      .from('code_tables')
      .select('id')
      .eq('table_type', tableType)
      .eq('display_name', newItem)
      .eq('is_active', true)
      .neq('id', existing[0].id);

    if (country && country !== null && country !== 'null' && country !== '') {
      checkQuery = checkQuery.eq('country', country);
    } else {
      checkQuery = checkQuery.eq('country', 'GLB');
    }

    const { data: duplicate, error: checkError } = await checkQuery;

    if (checkError) {
      console.error('Error checking for duplicates:', checkError);
      throw checkError;
    }

    if (duplicate && duplicate.length > 0) {
      // New name already exists
      return false;
    }

    // Update the item
    const { error: updateError } = await supabase
      .from('code_tables')
      .update({
        display_name: newItem,
        code: generateCode(newItem),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing[0].id);

    if (updateError) {
      console.error('Error updating item:', updateError);
      throw updateError;
    }

    return true;
  } catch (error) {
    console.error('Error in updateSupabaseCodeTableItem:', error);
    throw error;
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
    // Find the existing item
    let query = supabase
      .from('code_tables')
      .select('id')
      .eq('table_type', tableType)
      .eq('display_name', item)
      .eq('is_active', true);

    if (country) {
      query = query.eq('country', getCountryCode(country));
    } else {
      query = query.eq('country', 'GLB');
    }

    const { data: existing, error: findError } = await query;

    if (findError) {
      console.error('Error finding existing item:', findError);
      throw findError;
    }

    if (!existing || existing.length === 0) {
      return false;
    }

    // Mark as inactive
    const { error: updateError } = await supabase
      .from('code_tables')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing[0].id);

    if (updateError) {
      console.error('Error deactivating item:', updateError);
      throw updateError;
    }

    return true;
  } catch (error) {
    console.error('Error in removeSupabaseCodeTableItem:', error);
    throw error;
  }
};

/**
 * Helper function to generate a code from display name
 */
function generateCode(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

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
 * Seed departments for a specific country
 */
export const seedDepartmentsForCountry = async (country: string): Promise<void> => {
  const DEPARTMENTS = [
    'Cardiology',
    'Orthopedics', 
    'Neurosurgery',
    'Oncology',
    'Emergency',
    'Radiology',
    'General Surgery',
    'Pediatrics'
  ];
  
  try {
    console.log(`Seeding departments for ${country}...`);
    
    for (const department of DEPARTMENTS) {
      try {
        const exists = await supabase
          .from('code_tables')
          .select('id')
          .eq('table_type', 'departments')
          .eq('display_name', department)
          .eq('country', getCountryCode(country))
          .eq('is_active', true);
          
        if (!exists.data || exists.data.length === 0) {
          await addSupabaseCodeTableItem('departments', department, country);
          console.log(`Added department: ${department} for ${country}`);
        }
      } catch (error) {
        console.error(`Error adding department ${department} for ${country}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error seeding departments for ${country}:`, error);
  }
};