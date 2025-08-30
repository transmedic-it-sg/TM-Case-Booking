/**
 * Supabase Department Service
 * Handles department-specific procedure types and categorized sets
 */

import { supabase } from '../lib/supabase';
import { getCountryForDatabase, getCountryVariations } from './countryDatabaseCompatibility';

// Types
export interface Department {
  id: string;
  name: string;
  country: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentProcedureType {
  id: string;
  department_id: string;
  procedure_type: string;
  country: string;
  is_active: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface SurgerySet {
  id: string;
  name: string;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ImplantBox {
  id: string;
  name: string;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentCategorizedSet {
  id: string;
  department_id: string;
  procedure_type: string;
  surgery_set_id: string | null;
  implant_box_id: string | null;
  country: string;
  created_at: string;
  updated_at: string;
  surgery_set?: SurgerySet;
  implant_box?: ImplantBox;
}

export interface CategorizedSetsResult {
  [procedureType: string]: {
    surgerySets: string[];
    implantBoxes: string[];
  };
}

// =============================================================================
// DEPARTMENT OPERATIONS
// =============================================================================

/**
 * Get all departments for a country from the departments table
 */
export const getDepartments = async (country?: string): Promise<Department[]> => {
  try {
    // console.log('🔍 Getting departments from Supabase:', { country });
    
    let query = supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    // Filter by country if specified - use flexible matching for compatibility
    if (country) {
      const countryVariations = getCountryVariations(country);
      query = query.in('country', countryVariations);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }

    // console.log('✅ Found departments in Supabase:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error in getDepartments:', error);
    throw error;
  }
};

/**
 * Add a new department
 */
export const addDepartment = async (name: string, country: string, description?: string): Promise<Department> => {
  try {
    const dbCountry = getCountryForDatabase(country);
    const { data, error } = await supabase
      .from('departments')
      .insert({
        name,
        country: dbCountry,
        description,
        is_active: true
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error adding department:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in addDepartment:', error);
    throw error;
  }
};

// =============================================================================
// PROCEDURE TYPE OPERATIONS
// =============================================================================

/**
 * Get procedure types for a specific department from the database
 */
export const getProcedureTypesForDepartment = async (departmentName: string, country: string): Promise<string[]> => {
  try {
    const countryVariations = getCountryVariations(country);
    // console.log('🔍 Getting procedure types for:', { departmentName, country, countryVariations });
    
    // First, get the department ID - use flexible country matching
    const { data: departments } = await supabase
      .from('departments')
      .select('id')
      .eq('name', departmentName)
      .in('country', countryVariations)
      .eq('is_active', true);
    
    if (!departments || departments.length === 0) {
      console.warn('Department not found in database:', { departmentName, country });
      return [];
    }
    
    const departmentId = departments[0].id;
    
    // Get procedure types from database - use flexible country matching
    const { data, error } = await supabase
      .from('department_procedure_types')
      .select('procedure_type')
      .eq('department_id', departmentId)
      .in('country', countryVariations)
      .eq('is_active', true)
      .eq('is_hidden', false)
      .order('procedure_type');
    
    if (error) {
      console.error('Error fetching procedure types:', error);
      return [];
    }
    
    const dbProcedureTypes = data?.map(item => item.procedure_type) || [];
    
    // If no procedure types in database, return empty array
    if (dbProcedureTypes.length === 0) {
      console.log('No procedure types configured for department:', { departmentName, country });
      return [];
    }
    
    console.log('✅ Found procedure types in Supabase:', dbProcedureTypes.length);
    return dbProcedureTypes;
  } catch (error) {
    console.error('Error in getProcedureTypesForDepartment:', error);
    return [];
  }
};

/**
 * Get default procedure types based on department name
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getDefaultProcedureTypesForDepartment = (departmentName: string, country: string = 'MY'): string[] => {
  // Simplified - only 3 procedure types per department
  const departmentSpecific: Record<string, string[]> = {
    'Cardiology': [
      'Cardiac Catheterization',
      'Heart Surgery', 
      'Diagnostic Cardiology'
    ],
    'Orthopedics': [
      'Joint Replacement',
      'Fracture Repair',
      'Arthroscopy'
    ],
    'Neurosurgery': [
      'Brain Surgery',
      'Spinal Surgery',
      'Tumor Removal'
    ],
    'Emergency': [
      'Trauma Care',
      'Emergency Surgery',
      'Critical Care'
    ],
    'Radiology': [
      'CT Scan',
      'MRI',
      'X-Ray'
    ],
    'Oncology': [
      'Chemotherapy',
      'Radiation Therapy',
      'Tumor Resection'
    ],
    'Anesthesiology': [
      'General Anesthesia',
      'Regional Anesthesia',
      'Pain Management'
    ],
    'Gastroenterology': [
      'Endoscopy',
      'Colonoscopy',
      'Therapeutic Endoscopy'
    ],
    'Nephrology': [
      'Dialysis',
      'Kidney Biopsy',
      'Renal Replacement'
    ],
    'Pulmonology': [
      'Bronchoscopy',
      'Pulmonary Function Test',
      'Respiratory Therapy'
    ]
  };

  // Return exactly 3 types for each department, or generic types if department not found
  const specific = departmentSpecific[departmentName] || [
    'General Procedure',
    'Diagnostic Procedure', 
    'Therapeutic Procedure'
  ];
  
  return specific;
};

/**
 * Add procedure type to a department in the database
 */
export const addProcedureTypeToDepartment = async (
  departmentName: string, 
  procedureType: string, 
  country: string
): Promise<boolean> => {
  try {
    const dbCountry = getCountryForDatabase(country);
    console.log('🔍 Adding procedure type to Supabase:', { departmentName, procedureType, country, dbCountry });
    
    // First, get the department ID
    const { data: departments } = await supabase
      .from('departments')
      .select('id')
      .eq('name', departmentName)
      .eq('country', dbCountry)
      .eq('is_active', true);
    
    if (!departments || departments.length === 0) {
      console.error('Department not found:', { departmentName, country });
      return false;
    }
    
    const departmentId = departments[0].id;
    
    // Check if procedure type already exists
    const { data: existing } = await supabase
      .from('department_procedure_types')
      .select('id')
      .eq('department_id', departmentId)
      .eq('procedure_type', procedureType)
      .eq('country', dbCountry);
    
    if (existing && existing.length > 0) {
      console.log('⚠️ Procedure type already exists:', procedureType);
      return true;
    }
    
    // Insert the new procedure type
    const { error } = await supabase
      .from('department_procedure_types')
      .insert({
        department_id: departmentId,
        procedure_type: procedureType,
        country: dbCountry,
        is_active: true,
        is_hidden: false
      });

    if (error) {
      console.error('Error adding procedure type:', error);
      return false;
    }

    console.log('✅ Successfully added procedure type to Supabase');
    
    // Update cache version to notify other users
    try {
      const { forceCacheVersionUpdate } = await import('./cacheVersionService');
      await forceCacheVersionUpdate(
        dbCountry, 
        'procedure_types',
        `Added procedure type: ${procedureType} to ${departmentName}`,
        'system'
      );
      console.log(`📢 Cache version updated for ${dbCountry}:procedure_types`);
    } catch (cacheError) {
      console.error('Failed to update cache version:', cacheError);
    }
    
    return true;
  } catch (error) {
    console.error('Error in addProcedureTypeToDepartment:', error);
    return false;
  }
};


/**
 * Remove procedure type from a department in the database
 */
export const removeProcedureTypeFromDepartment = async (
  departmentName: string, 
  procedureType: string, 
  country: string
): Promise<boolean> => {
  try {
    const dbCountry = getCountryForDatabase(country);
    console.log('🔍 Removing procedure type from Supabase:', { departmentName, procedureType, country, dbCountry });
    
    // First, get the department ID
    const { data: departments } = await supabase
      .from('departments')
      .select('id')
      .eq('name', departmentName)
      .eq('country', dbCountry)
      .eq('is_active', true);
    
    if (!departments || departments.length === 0) {
      console.error('Department not found:', { departmentName, country });
      return false;
    }
    
    const departmentId = departments[0].id;
    
    // Remove the procedure type from database
    const { data, error } = await supabase
      .from('department_procedure_types')
      .delete()
      .eq('department_id', departmentId)
      .eq('procedure_type', procedureType)
      .eq('country', dbCountry)
      .select();
    
    if (error) {
      console.error('Error removing procedure type:', error);
      return false;
    }
    
    // Check if anything was actually deleted
    if (!data || data.length === 0) {
      console.warn('No procedure type was deleted - it may not have existed:', { departmentId, procedureType, country: dbCountry });
      return false;
    }
    
    console.log('✅ Successfully removed procedure type from Supabase:', data.length, 'rows deleted');
    
    // Update cache version to notify other users
    try {
      const { forceCacheVersionUpdate } = await import('./cacheVersionService');
      await forceCacheVersionUpdate(
        dbCountry, 
        'procedure_types',
        `Removed procedure type: ${procedureType} from ${departmentName}`,
        'system'
      );
      console.log(`📢 Cache version updated for ${dbCountry}:procedure_types`);
    } catch (cacheError) {
      console.error('Failed to update cache version:', cacheError);
    }
    
    return true;
  } catch (error) {
    console.error('Error in removeProcedureTypeFromDepartment:', error);
    return false;
  }
};

// =============================================================================
// CATEGORIZED SETS OPERATIONS
// =============================================================================

// Simple cache for categorized sets to prevent excessive API calls
const categorizedSetsCache = new Map<string, { data: CategorizedSetsResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get categorized sets for a specific department from the database
 */
export const getCategorizedSetsForDepartment = async (
  departmentName: string, 
  country: string
): Promise<CategorizedSetsResult> => {
  try {
    const dbCountry = getCountryForDatabase(country);
    const cacheKey = `${departmentName}-${dbCountry}`;
    
    // Check cache first
    const cached = categorizedSetsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('🎯 Using cached categorized sets for:', { departmentName, country: dbCountry });
      return cached.data;
    }
    
    const countryVariations = getCountryVariations(country);
    console.log('🔍 Getting categorized sets from Supabase:', { departmentName, country, dbCountry, countryVariations });
    
    // First, get the department ID - use normalized country
    const { data: departments } = await supabase
      .from('departments')
      .select('id')
      .eq('name', departmentName)
      .eq('country', dbCountry)
      .eq('is_active', true);
    
    if (!departments || departments.length === 0) {
      console.warn('Department not found for categorized sets');
      return {};
    }
    
    const departmentId = departments[0].id;
    
    // Get categorized sets from database - use normalized country
    const { data, error } = await supabase
      .from('department_categorized_sets')
      .select(`
        procedure_type,
        surgery_set:surgery_sets(name),
        implant_box:implant_boxes(name)
      `)
      .eq('department_id', departmentId)
      .eq('country', dbCountry);
    
    if (error) {
      console.error('Error fetching categorized sets:', error);
      return {};
    }
    
    // Transform the data into the expected format
    const result: CategorizedSetsResult = {};
    
    for (const item of data || []) {
      if (!result[item.procedure_type]) {
        result[item.procedure_type] = {
          surgerySets: [],
          implantBoxes: []
        };
      }
      
      if (item.surgery_set && (item.surgery_set as any).name) {
        result[item.procedure_type].surgerySets.push((item.surgery_set as any).name);
      }
      
      if (item.implant_box && (item.implant_box as any).name) {
        result[item.procedure_type].implantBoxes.push((item.implant_box as any).name);
      }
    }
    
    console.log('✅ Found categorized sets in Supabase:', Object.keys(result).length, 'procedure types');
    
    // Cache the result
    categorizedSetsCache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    return result;
  } catch (error) {
    console.error('Error reading categorized sets from Supabase:', error);
    return {};
  }
};

/**
 * Save categorized sets for a department to the database
 */
export const saveCategorizedSetsForDepartment = async (
  departmentName: string,
  categorizedSets: CategorizedSetsResult,
  country: string
): Promise<void> => {
  try {
    const dbCountry = getCountryForDatabase(country);
    console.log('💾 Saving categorized sets to Supabase:', { departmentName, country, dbCountry, setsCount: Object.keys(categorizedSets).length });
    
    // First, get the department ID
    const { data: departments } = await supabase
      .from('departments')
      .select('id')
      .eq('name', departmentName)
      .eq('country', dbCountry)
      .eq('is_active', true);
    
    if (!departments || departments.length === 0) {
      throw new Error(`Department not found: ${departmentName} in ${country}`);
    }
    
    const departmentId = departments[0].id;
    
    // First, get existing categorized sets to minimize database operations
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: _existingSets } = await supabase
      .from('department_categorized_sets')
      .select('id, procedure_type, surgery_set_id, implant_box_id')
      .eq('department_id', departmentId)
      .eq('country', dbCountry);
    
    // Prepare inserts for new categorized sets
    const inserts = [];
    
    // Collect all unique surgery set names and implant box names
    const allSurgerySetNames = new Set<string>();
    const allImplantBoxNames = new Set<string>();
    
    for (const sets of Object.values(categorizedSets)) {
      sets.surgerySets?.forEach(name => allSurgerySetNames.add(name));
      sets.implantBoxes?.forEach(name => allImplantBoxNames.add(name));
    }
    
    // Fetch all surgery sets in one query
    const surgerySetMap = new Map<string, string>();
    if (allSurgerySetNames.size > 0) {
      const { data: surgerySets } = await supabase
        .from('surgery_sets')
        .select('id, name')
        .in('name', Array.from(allSurgerySetNames))
        .eq('country', dbCountry)
        .eq('is_active', true);
      
      surgerySets?.forEach(set => surgerySetMap.set(set.name, set.id));
    }
    
    // Fetch all implant boxes in one query
    const implantBoxMap = new Map<string, string>();
    if (allImplantBoxNames.size > 0) {
      const { data: implantBoxes } = await supabase
        .from('implant_boxes')
        .select('id, name')
        .in('name', Array.from(allImplantBoxNames))
        .eq('country', dbCountry)
        .eq('is_active', true);
      
      implantBoxes?.forEach(box => implantBoxMap.set(box.name, box.id));
    }
    
    // Track missing items for logging
    const missingSurgerySets: string[] = [];
    const missingImplantBoxes: string[] = [];
    
    // Now build the inserts using the maps
    for (const [procedureType, sets] of Object.entries(categorizedSets)) {
      // Add surgery sets
      for (const surgerySetName of sets.surgerySets || []) {
        const surgerySetId = surgerySetMap.get(surgerySetName);
        if (surgerySetId) {
          inserts.push({
            department_id: departmentId,
            procedure_type: procedureType,
            surgery_set_id: surgerySetId,
            implant_box_id: null,
            country: dbCountry
          });
        } else {
          missingSurgerySets.push(surgerySetName);
          console.warn(`Surgery set not found in database: "${surgerySetName}" for country ${dbCountry}`);
        }
      }
      
      // Add implant boxes
      for (const implantBoxName of sets.implantBoxes || []) {
        const implantBoxId = implantBoxMap.get(implantBoxName);
        if (implantBoxId) {
          inserts.push({
            department_id: departmentId,
            procedure_type: procedureType,
            surgery_set_id: null,
            implant_box_id: implantBoxId,
            country: dbCountry
          });
        } else {
          missingImplantBoxes.push(implantBoxName);
          console.warn(`Implant box not found in database: "${implantBoxName}" for country ${dbCountry}`);
        }
      }
    }
    
    // Create missing surgery sets
    if (missingSurgerySets.length > 0) {
      console.log(`📦 Creating ${missingSurgerySets.length} missing surgery sets for ${dbCountry}`);
      const newSurgerySets = missingSurgerySets.map(name => ({
        name,
        country: dbCountry,
        is_active: true
      }));
      
      const { data: createdSurgerySets, error: surgerySetError } = await supabase
        .from('surgery_sets')
        .insert(newSurgerySets)
        .select('id, name');
        
      if (surgerySetError) {
        console.error('Error creating surgery sets:', surgerySetError);
      } else {
        console.log(`✅ Created ${createdSurgerySets?.length || 0} new surgery sets`);
        // Add created surgery sets to our map
        createdSurgerySets?.forEach(set => surgerySetMap.set(set.name, set.id));
      }
    }
    
    // Create missing implant boxes
    if (missingImplantBoxes.length > 0) {
      console.log(`📦 Creating ${missingImplantBoxes.length} missing implant boxes for ${dbCountry}`);
      const newImplantBoxes = missingImplantBoxes.map(name => ({
        name,
        country: dbCountry,
        is_active: true
      }));
      
      const { data: createdImplantBoxes, error: implantBoxError } = await supabase
        .from('implant_boxes')
        .insert(newImplantBoxes)
        .select('id, name');
        
      if (implantBoxError) {
        console.error('Error creating implant boxes:', implantBoxError);
      } else {
        console.log(`✅ Created ${createdImplantBoxes?.length || 0} new implant boxes`);
        // Add created implant boxes to our map
        createdImplantBoxes?.forEach(box => implantBoxMap.set(box.name, box.id));
      }
    }
    
    // Now rebuild inserts with newly created items
    const finalInserts: any[] = [];
    console.log('🔍 DEBUG: Processing categorizedSets entries:', Object.keys(categorizedSets));
    for (const [procedureType, sets] of Object.entries(categorizedSets)) {
      console.log(`🔍 DEBUG: Processing ${procedureType}:`, {
        surgerySets: sets.surgerySets?.length || 0,
        implantBoxes: sets.implantBoxes?.length || 0,
        surgerySetNames: sets.surgerySets,
        implantBoxNames: sets.implantBoxes
      });
      // Add surgery sets (now with created ones)
      for (const surgerySetName of sets.surgerySets || []) {
        const surgerySetId = surgerySetMap.get(surgerySetName);
        console.log(`🔍 DEBUG: Surgery set "${surgerySetName}" -> ID: ${surgerySetId}`);
        if (surgerySetId) {
          const insertData = {
            department_id: departmentId,
            procedure_type: procedureType,
            surgery_set_id: surgerySetId,
            implant_box_id: null,
            country: dbCountry
          };
          console.log('➕ Adding surgery set insert:', insertData);
          finalInserts.push(insertData);
        } else {
          console.error(`Still missing surgery set after creation: "${surgerySetName}"`);
        }
      }
      
      // Add implant boxes (now with created ones)  
      for (const implantBoxName of sets.implantBoxes || []) {
        const implantBoxId = implantBoxMap.get(implantBoxName);
        console.log(`🔍 DEBUG: Implant box "${implantBoxName}" -> ID: ${implantBoxId}`);
        if (implantBoxId) {
          const insertData = {
            department_id: departmentId,
            procedure_type: procedureType,
            surgery_set_id: null,
            implant_box_id: implantBoxId,
            country: dbCountry
          };
          console.log('➕ Adding implant box insert:', insertData);
          finalInserts.push(insertData);
        } else {
          console.error(`Still missing implant box after creation: "${implantBoxName}"`);
        }
      }
    }
    
    // Use single atomic operation to prevent race conditions
    // Delete all existing categorized sets for this department and insert new ones in one operation
    try {
      // First delete existing sets for this department/country combination
      const { error: deleteError } = await supabase
        .from('department_categorized_sets')
        .delete()
        .eq('department_id', departmentId)
        .eq('country', dbCountry);
      
      if (deleteError) {
        throw new Error(`Failed to delete existing categorized sets: ${deleteError.message}`);
      }
      
      // Then insert new sets (only if we have data to insert)
      if (finalInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('department_categorized_sets')
          .insert(finalInserts);
        
        if (insertError) {
          throw new Error(`Failed to insert new categorized sets: ${insertError.message}`);
        }
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
    
    console.log('✅ Successfully saved categorized sets to Supabase:', finalInserts.length, 'records');
    
    // Update cache version to notify other users about Edit Sets changes
    try {
      const { forceCacheVersionUpdate } = await import('./cacheVersionService');
      await forceCacheVersionUpdate(
        dbCountry, 
        'edit_sets',
        `Updated Edit Sets for ${departmentName}`,
        'system' // Could be enhanced with actual user info
      );
      console.log(`📢 Cache version updated for ${dbCountry}:edit_sets`);
    } catch (cacheError) {
      console.error('Failed to update cache version:', cacheError);
    }
    
    // Invalidate cache for this department/country
    const cacheKey = `${departmentName}-${dbCountry}`;
    categorizedSetsCache.delete(cacheKey);
    
    // Log what was saved for debugging
    for (const [procedureType, sets] of Object.entries(categorizedSets)) {
      console.log(`  📋 ${procedureType}:`, {
        surgerySets: sets.surgerySets?.length || 0,
        implantBoxes: sets.implantBoxes?.length || 0
      });
    }
  } catch (error) {
    console.error('Error saving categorized sets to Supabase:', error);
    throw error;
  }
};

// =============================================================================
// SURGERY SETS AND IMPLANT BOXES OPERATIONS
// =============================================================================

/**
 * Get all surgery sets for a country from the database
 */
export const getSurgerySets = async (country: string): Promise<string[]> => {
  try {
    const countryVariations = getCountryVariations(country);
    console.log('🔍 Getting surgery sets from Supabase for:', country, countryVariations);
    
    const { data, error } = await supabase
      .from('surgery_sets')
      .select('name')
      .in('country', countryVariations)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching surgery sets:', error);
      throw error;
    }

    const sets = data?.map(item => item.name) || [];
    console.log('✅ Found surgery sets in Supabase:', sets.length);
    return sets;
  } catch (error) {
    console.error('Error in getSurgerySets:', error);
    return [];
  }
};

/**
 * Get all implant boxes for a country from the database
 */
export const getImplantBoxes = async (country: string): Promise<string[]> => {
  try {
    const countryVariations = getCountryVariations(country);
    console.log('🔍 Getting implant boxes from Supabase for:', country, countryVariations);
    
    const { data, error } = await supabase
      .from('implant_boxes')
      .select('name')
      .in('country', countryVariations)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching implant boxes:', error);
      throw error;
    }

    const boxes = data?.map(item => item.name) || [];
    console.log('✅ Found implant boxes in Supabase:', boxes.length);
    return boxes;
  } catch (error) {
    console.error('Error in getImplantBoxes:', error);
    return [];
  }
};

/**
 * Add a new surgery set
 */
export const addSurgerySet = async (name: string, country: string): Promise<boolean> => {
  try {
    const dbCountry = getCountryForDatabase(country);
    const { error } = await supabase
      .from('surgery_sets')
      .insert({
        name,
        country: dbCountry,
        is_active: true
      });

    if (error) {
      console.error('Error adding surgery set:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addSurgerySet:', error);
    return false;
  }
};

/**
 * Add a new implant box
 */
export const addImplantBox = async (name: string, country: string): Promise<boolean> => {
  try {
    const dbCountry = getCountryForDatabase(country);
    const { error } = await supabase
      .from('implant_boxes')
      .insert({
        name,
        country: dbCountry,
        is_active: true
      });

    if (error) {
      console.error('Error adding implant box:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addImplantBox:', error);
    return false;
  }
};