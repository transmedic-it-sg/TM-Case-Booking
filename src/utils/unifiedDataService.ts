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
        is_active,
        doctors!doctors_department_id_fkey(id)
      `)
      .eq('country', normalizedCountry)
      .eq('is_active', true)
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
      .eq('is_active', true);

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
 * Legacy compatibility wrapper - returns data in old format
 * This allows existing components to work without modification while we transition
 */
export const getDoctorsForDepartment = async (departmentName: string, country: string) => {
  const doctors = await getUnifiedDoctorsForDepartment(departmentName, country);
  
  // Convert to legacy format for backward compatibility
  return doctors.map(doctor => ({
    id: doctor.id,
    name: doctor.name,
    specialties: doctor.specialties,
    department_id: doctor.department_id,
    is_active: doctor.is_active
  }));
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