/**
 * UNIFIED DATA SERVICE - Single Source of Truth for ALL Table Access
 * 
 * This service replaces ALL department/doctor services to prevent mapping inconsistencies:
 * - departmentDoctorService.ts (REMOVED)
 * - departmentDoctorService_fixed.ts (REMOVED) 
 * - supabaseDepartmentService.ts (REMOVED)
 * - doctorService.ts (REMOVED)
 * - standardizedDataService.ts (REMOVED)
 * 
 * STANDARDIZED TABLE ACCESS PATTERN:
 * departments → doctors → doctor_procedures → surgery_sets/implant_boxes
 * 
 * NEVER use code_tables for doctor lookups - use proper foreign key relationships
 */

import { supabase } from '../lib/supabase';
import { normalizeCountry } from './countryUtils';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  DEPARTMENTS_FIELDS,
  CODE_TABLES_FIELDS,
  getDbField
} from './fieldMappings';
import { getDepartmentsForCountry as getCodeTableDepartments } from './supabaseCodeTableService';

// ========================================
// UNIFIED INTERFACES - Single Definition
// ========================================

export interface UnifiedDepartment {
  id: string;
  name: string;
  country: string;
  description?: string;
  is_active: boolean;
  doctor_count: number;
}

export interface UnifiedDoctor {
  id: string;
  name: string;
  country: string;
  department_id: string;
  department_name: string;
  specialties: string[];
  is_active: boolean;
  sort_order: number;
}

export interface UnifiedProcedure {
  id: string;
  doctor_id: string;
  procedure_type: string;
  country: string;
  is_active: boolean;
}

export interface UnifiedSurgerySet {
  id: string;
  name: string;
  country: string;
  doctor_id: string;
  procedure_type: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
}

export interface UnifiedImplantBox {
  id: string;
  name: string;
  country: string;
  doctor_id: string;
  procedure_type: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
}

// ========================================
// STANDARDIZED DROPDOWN INTERFACES  
// ========================================

export interface StandardizedDepartment {
  name: string;
  country: string;
}

export interface StandardizedDoctor {
  id: string;
  name: string;
  department: string;
  country: string;
  specialties: string[];
}

export interface StandardizedDropdownData {
  countries: string[];
  departments: string[];
  doctors: StandardizedDoctor[];
}

// ========================================
// CORE UNIFIED FUNCTIONS
// ========================================

/**
 * Get all departments for a country using proper table relationships
 */
export const getUnifiedDepartments = async (country: string): Promise<UnifiedDepartment[]> => {
  try {
    const normalizedCountry = normalizeCountry(country);
    
    const { data, error } = await supabase
      .from('departments')
      .select(`
        id,
        name,
        country,
        description,
        ${DEPARTMENTS_FIELDS.isActive},
        doctors!doctors_department_id_fkey(id)
      `)
      .eq('country', normalizedCountry)
      .eq(DEPARTMENTS_FIELDS.isActive, true)
      .order('name');

    if (error) throw error;

    return (data || []).map(dept => ({
      id: dept.id,
      name: dept.name,
      country: dept.country,
      description: dept.description,
      is_active: dept.is_active,
      doctor_count: dept.doctors?.length || 0
    }));
  } catch (error) {
    console.error('❌ UNIFIED SERVICE - Error fetching departments:', error);
    return [];
  }
};

/**
 * Get doctors for a department using proper foreign key relationship
 */
export const getUnifiedDoctorsForDepartment = async (departmentName: string, country: string): Promise<UnifiedDoctor[]> => {
  try {
    const normalizedCountry = normalizeCountry(country);
    
    console.log('🔍 UNIFIED SERVICE - Getting doctors for department:', {
      departmentName,
      country: normalizedCountry,
      timestamp: new Date().toISOString()
    });

    // Step 1: Get department by name
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .eq('country', normalizedCountry)
      .eq('name', departmentName.trim())
      .eq(DEPARTMENTS_FIELDS.isActive, true);

    if (deptError) throw deptError;
    
    if (!departments || departments.length === 0) {
      console.log('⚠️ UNIFIED SERVICE - No department found:', departmentName);
      return [];
    }

    const department = departments[0];
    
    // Step 2: Get doctors linked to this department
    const { data: doctors, error: doctorError } = await supabase
      .from('doctors')
      .select('*')
      .eq('country', normalizedCountry)
      .eq('department_id', department.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (doctorError) throw doctorError;

    const result = (doctors || []).map(doctor => ({
      id: doctor.id,
      name: doctor.name,
      country: doctor.country,
      department_id: doctor.department_id,
      department_name: department.name,
      specialties: doctor.specialties || [],
      is_active: doctor.is_active,
      sort_order: doctor.sort_order || 1
    }));

    console.log('✅ UNIFIED SERVICE - Found doctors:', {
      departmentName,
      count: result.length,
      doctors: result.map(d => d.name)
    });

    return result;
  } catch (error) {
    console.error('❌ UNIFIED SERVICE - Error fetching doctors:', error);
    return [];
  }
};

/**
 * Get procedures for a doctor
 */
export const getUnifiedProceduresForDoctor = async (doctorId: string, country: string): Promise<UnifiedProcedure[]> => {
  try {
    const normalizedCountry = normalizeCountry(country);

    const { data, error } = await supabase
      .from('doctor_procedures')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('country', normalizedCountry)
      .eq('is_active', true)
      .order('procedure_type');

    if (error) throw error;

    return (data || []).map(proc => ({
      id: proc.id,
      doctor_id: proc.doctor_id,
      procedure_type: proc.procedure_type,
      country: proc.country,
      is_active: proc.is_active
    }));
  } catch (error) {
    console.error('❌ UNIFIED SERVICE - Error fetching procedures:', error);
    return [];
  }
};

/**
 * Get surgery sets for doctor and procedure
 */
export const getUnifiedSurgerySets = async (doctorId: string, procedureType: string, country: string): Promise<UnifiedSurgerySet[]> => {
  try {
    const normalizedCountry = normalizeCountry(country);

    const { data, error } = await supabase
      .from('surgery_sets')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('procedure_type', procedureType)
      .eq('country', normalizedCountry)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(set => ({
      id: set.id,
      name: set.name,
      country: set.country,
      doctor_id: set.doctor_id,
      procedure_type: set.procedure_type,
      description: set.description,
      is_active: set.is_active,
      sort_order: set.sort_order || 1
    }));
  } catch (error) {
    console.error('❌ UNIFIED SERVICE - Error fetching surgery sets:', error);
    return [];
  }
};

/**
 * Get implant boxes for doctor and procedure  
 */
export const getUnifiedImplantBoxes = async (doctorId: string, procedureType: string, country: string): Promise<UnifiedImplantBox[]> => {
  try {
    const normalizedCountry = normalizeCountry(country);

    const { data, error } = await supabase
      .from('implant_boxes')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('procedure_type', procedureType)
      .eq('country', normalizedCountry)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(box => ({
      id: box.id,
      name: box.name,
      country: box.country,
      doctor_id: box.doctor_id,
      procedure_type: box.procedure_type,
      description: box.description,
      is_active: box.is_active,
      sort_order: box.sort_order || 1
    }));
  } catch (error) {
    console.error('❌ UNIFIED SERVICE - Error fetching implant boxes:', error);
    return [];
  }
};

// ========================================
// LEGACY COMPATIBILITY TYPES
// ========================================

export interface ProcedureSet {
  item_type: 'surgery_set' | 'implant_box';
  item_id: string;
  item_name: string;
}

export interface CaseQuantity {
  item_type: 'surgery_set' | 'implant_box';
  item_name: string;
  quantity: number;
}

export interface TopItem {
  item_name: string;
  quantity: number;
}

export interface DailyUsage {
  usage_date: string;
  department: string;
  surgery_sets_total: number;
  implant_boxes_total: number;
  country: string;
  top_items?: TopItem[];
}

// ========================================
// STANDARDIZED DROPDOWN FUNCTIONS
// ========================================

/**
 * SINGLE SOURCE OF TRUTH for departments across the entire application
 * This function should be used by ALL components that need department data
 */
export const getStandardizedDepartments = async (country: string): Promise<string[]> => {
  try {
    console.log('🔧 UNIFIED SERVICE DEBUG - getStandardizedDepartments called with country:', country);
    const normalizedCountry = normalizeCountry(country);
    console.log('🔧 UNIFIED SERVICE DEBUG - Normalized country:', normalizedCountry);
    
    // Use the code_tables service as the single source of truth
    const departments = await getCodeTableDepartments(normalizedCountry);
    console.log('🔧 UNIFIED SERVICE DEBUG - Raw departments from getCodeTableDepartments:', departments);
    
    const sortedDepartments = departments.sort();
    console.log('🔧 UNIFIED SERVICE DEBUG - Final sorted departments:', sortedDepartments);
    
    return sortedDepartments; // Always return sorted for consistency
  } catch (error) {
    console.error('🔧 UNIFIED SERVICE DEBUG - Error loading standardized departments:', error);
    return [];
  }
};

/**
 * SINGLE SOURCE OF TRUTH for countries across the entire application
 */
export const getStandardizedCountries = async (): Promise<string[]> => {
  try {
    // Get countries directly from code_tables - single source of truth
    const { data, error } = await supabase
      .from('code_tables')
      .select('display_name')
      .eq('table_type', 'countries')
      .eq(CODE_TABLES_FIELDS.isActive, true)
      .order('display_name');
    
    if (error) {
      console.error('Error loading countries from code_tables:', error);
      return [];
    }
    
    const countries = data?.map(item => item.display_name) || [];
    return countries.sort(); // Always return sorted for consistency
  } catch (error) {
    console.error('Error loading standardized countries:', error);
    return [];
  }
};

/**
 * Get doctors for a department using the standardized approach
 * This ensures doctor data is consistent with department data
 */
export const getStandardizedDoctorsForDepartment = async (
  departmentName: string, 
  country: string
): Promise<StandardizedDoctor[]> => {
  try {
    const normalizedCountry = normalizeCountry(country);
    
    // Use the existing unified service but transform to standardized format
    const doctors = await getUnifiedDoctorsForDepartment(departmentName, normalizedCountry);
    
    // Transform to standardized format
    return doctors.map(doctor => ({
      id: doctor.id,
      name: doctor.name,
      department: departmentName,
      country: normalizedCountry,
      specialties: doctor.specialties || []
    })).sort((a, b) => a.name.localeCompare(b.name));
    
  } catch (error) {
    console.error('Error loading standardized doctors:', error);
    return [];
  }
};

/**
 * Get all dropdown data for a country in a single call
 * This is efficient for forms that need multiple dropdown types
 */
export const getStandardizedDropdownData = async (country: string): Promise<StandardizedDropdownData> => {
  try {
    const normalizedCountry = normalizeCountry(country);
    
    // Load countries and departments in parallel
    const [countries, departments] = await Promise.all([
      getStandardizedCountries(),
      getStandardizedDepartments(normalizedCountry)
    ]);
    
    // Load doctors for all departments
    const doctorPromises = departments.map(dept => 
      getStandardizedDoctorsForDepartment(dept, normalizedCountry)
    );
    
    const doctorResults = await Promise.all(doctorPromises);
    const doctors = doctorResults.flat();
    
    return {
      countries,
      departments,
      doctors
    };
    
  } catch (error) {
    console.error('Error loading standardized dropdown data:', error);
    return {
      countries: [],
      departments: [],
      doctors: []
    };
  }
};

// ========================================
// CONVENIENCE FUNCTIONS
// ========================================

/**
 * Get complete data for a department (departments + doctors + procedures + sets)
 */
export const getUnifiedDepartmentData = async (departmentName: string, country: string) => {
  const doctors = await getUnifiedDoctorsForDepartment(departmentName, country);
  
  const departmentData = {
    departmentName,
    country,
    doctors,
    totalDoctors: doctors.length
  };

  // Get procedures and sets for each doctor
  for (const doctor of doctors) {
    const procedures = await getUnifiedProceduresForDoctor(doctor.id, country);
    (doctor as any).procedures = procedures;
    
    for (const procedure of procedures) {
      const surgerySets = await getUnifiedSurgerySets(doctor.id, procedure.procedure_type, country);
      const implantBoxes = await getUnifiedImplantBoxes(doctor.id, procedure.procedure_type, country);
      
      (procedure as any).surgerySets = surgerySets;
      (procedure as any).implantBoxes = implantBoxes;
    }
  }

  return departmentData;
};

/**
 * Legacy compatibility wrapper - returns full UnifiedDoctor format
 * This allows existing components to work without modification while we transition
 */
export const getDoctorsForDepartment = async (departmentName: string, country: string): Promise<UnifiedDoctor[]> => {
  return await getUnifiedDoctorsForDepartment(departmentName, country);
};

/**
 * Legacy compatibility wrapper for getDepartmentsForCountry
 */
export const getDepartmentsForCountry = async (country: string): Promise<UnifiedDepartment[]> => {
  return await getUnifiedDepartments(country);
};

/**
 * Legacy compatibility wrapper for getSetsForDoctorProcedure
 */
export const getSetsForDoctorProcedure = async (doctorId: string, procedureType: string, country: string): Promise<ProcedureSet[]> => {
  try {
    const [surgerySets, implantBoxes] = await Promise.all([
      getUnifiedSurgerySets(doctorId, procedureType, country),
      getUnifiedImplantBoxes(doctorId, procedureType, country)
    ]);

    const result: ProcedureSet[] = [];

    // Add surgery sets
    surgerySets.forEach(set => {
      result.push({
        item_type: 'surgery_set',
        item_id: set.id,
        item_name: set.name
      });
    });

    // Add implant boxes
    implantBoxes.forEach(box => {
      result.push({
        item_type: 'implant_box',
        item_id: box.id,
        item_name: box.name
      });
    });

    return result;
  } catch (error) {
    console.error('❌ UNIFIED SERVICE - Error in getSetsForDoctorProcedure:', error);
    return [];
  }
};

/**
 * Get daily usage data for a specific date and country
 */
export const getDailyUsageForDate = async (usageDate: string, country: string): Promise<DailyUsage[]> => {
  try {
    const normalizedCountry = normalizeCountry(country);
    
    // Use the correct get_daily_usage function with proper parameters
    const { data, error } = await supabase.rpc('get_daily_usage', {
      country_filter: normalizedCountry,
      department_filter: null,
      start_date: usageDate,
      end_date: usageDate
    });

    if (error) {
      console.error('❌ UNIFIED SERVICE - Error fetching daily usage:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform the raw data into DailyUsage format
    const usageMap: Record<string, DailyUsage> = {};

    data.forEach((item: any) => {
      const key = `${item.usage_date}-${item.department}`;
      
      if (!usageMap[key]) {
        usageMap[key] = {
          usage_date: item.usage_date,
          department: item.department,
          country: item.country,
          surgery_sets_total: 0,
          implant_boxes_total: 0,
          top_items: []
        };
      }

      // Add to totals based on item type
      if (item.item_type === 'surgery_set') {
        usageMap[key].surgery_sets_total += item.total_quantity || 0;
      } else if (item.item_type === 'implant_box') {
        usageMap[key].implant_boxes_total += item.total_quantity || 0;
      }

      // Add to top items list
      if (item.item_name && item.total_quantity > 0) {
        if (!usageMap[key].top_items) {
          usageMap[key].top_items = [];
        }
        usageMap[key].top_items!.push({
          item_name: item.item_name,
          quantity: item.total_quantity
        });
      }
    });

    // Sort top items by quantity and limit to top 5
    Object.values(usageMap).forEach(usage => {
      if (usage.top_items) {
        usage.top_items = usage.top_items
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);
      }
    });

    return Object.values(usageMap);
  } catch (error) {
    console.error('❌ UNIFIED SERVICE - Error in getDailyUsageForDate:', error);
    return [];
  }
};

/**
 * Get case quantities for a case booking
 */
export const getCaseQuantities = async (caseBookingId: string): Promise<CaseQuantity[]> => {
  try {
    const { data, error } = await supabase
      .from('case_booking_quantities')
      .select('*')
      .eq('case_booking_id', caseBookingId)
      .order('item_type')
      .order('item_name');

    if (error) throw error;

    return (data || []).map(item => ({
      item_type: item.item_type as 'surgery_set' | 'implant_box',
      item_name: item.item_name,
      quantity: item.quantity || 1
    }));
  } catch (error) {
    console.error('❌ UNIFIED SERVICE - Error in getCaseQuantities:', error);
    return [];
  }
};

/**
 * Save case quantities for a case booking
 */
export const saveCaseQuantities = async (caseBookingId: string, quantities: CaseQuantity[]): Promise<boolean> => {
  try {
    // Delete existing quantities
    await supabase
      .from('case_booking_quantities')
      .delete()
      .eq('case_booking_id', caseBookingId);

    // Insert new quantities
    if (quantities.length > 0) {
      const { error } = await supabase
        .from('case_booking_quantities')
        .insert(
          quantities.map(q => ({
            case_booking_id: caseBookingId,
            item_type: q.item_type,
            item_name: q.item_name,
            quantity: q.quantity
          }))
        );

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('❌ UNIFIED SERVICE - Error in saveCaseQuantities:', error);
    return false;
  }
};

/**
 * Add doctor to department using proper foreign key relationship
 */
export const addDoctorToDepartment = async (departmentId: string, doctorName: string, country: string): Promise<boolean> => {
  try {
    const normalizedCountry = normalizeCountry(country);
    
    const { error } = await supabase
      .from('doctors')
      .insert({
        name: doctorName.trim(),
        department_id: departmentId,
        country: normalizedCountry,
        is_active: true,
        sort_order: 1,
        specialties: []
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ UNIFIED SERVICE - Error adding doctor to department:', error);
    return false;
  }
};

/**
 * Remove doctor from system
 */
export const removeDoctorFromSystem = async (doctorId: string, country: string): Promise<boolean> => {
  try {
    const normalizedCountry = normalizeCountry(country);
    
    const { error } = await supabase
      .from('doctors')
      .update({ is_active: false })
      .eq('id', doctorId)
      .eq('country', normalizedCountry);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ UNIFIED SERVICE - Error removing doctor from system:', error);
    return false;
  }
};