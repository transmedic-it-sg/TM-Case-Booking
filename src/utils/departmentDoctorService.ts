/**
 * Department-Doctor Service - Handle department-based doctor hierarchy
 * Implements the correct hierarchy: Country -> Department -> Doctor -> Procedure -> Sets
 */

/**
 * ⚠️ CRITICAL: Uses comprehensive field mappings to prevent database field naming issues
 * 
 * FIELD MAPPING RULES:
 * - Database fields: snake_case (e.g., date_of_surgery, case_booking_id)
 * - TypeScript interfaces: camelCase (e.g., dateOfSurgery, caseBookingId)
 * - ALWAYS use fieldMappings.ts utility instead of hardcoded field names
 * 
 * NEVER use: case_date → USE: date_of_surgery
 * NEVER use: procedure → USE: procedure_type
 * NEVER use: caseId → USE: case_booking_id
 */

import { supabase } from '../lib/supabase';
import { logger } from './logger';
import { normalizeCountry } from './countryUtils';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';

export interface Department {
  id: string;
  name: string;
  description?: string;
  doctor_count: number;
  country?: string;
}

export interface DepartmentDoctor {
  id: string;
  name: string;
  specialties: string[];
  department_id?: string;
  is_active: boolean; // ⚠️ is_active (isActive)
}

export interface DoctorProcedure {
  procedure_type: string; // ⚠️ procedure_type (procedureType) - NOT procedure
}

export interface ProcedureSet {
  item_type: 'surgery_set' | 'implant_box'; // ⚠️ implant_box (implantBox)
  item_id: string;
  item_name: string; // ⚠️ item_name (itemName) - NOT itemname
}

/**
 * Get departments for a specific country with doctor counts
 */
export const getDepartmentsForCountry = async (country: string): Promise<Department[]> => {
  try {
    if (!country || country.trim() === '') {
      logger.warn('getDepartmentsForCountry: Invalid country parameter', { country });
      return [];
    }

    const normalizedCountry = normalizeCountry(country);
    logger.info('Fetching departments for country', { country: normalizedCountry });

    // Use code_tables for country-specific departments
    const { data, error } = await supabase
      .from('code_tables')
      .select(`
        id,
        code,
        display_name
      `)
      .eq('table_type', 'departments')
      .eq('country', normalizedCountry)
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      logger.error('Supabase error fetching departments for country', {
        country: normalizedCountry,
        error: error.message,
        code: error.code,
        details: error.details
      });
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }

    if (!data) {
      logger.warn('No data returned from get_departments_for_country_enhanced', { country: normalizedCountry });
      return [];
    }

    if (data.length === 0) {
      logger.info('No departments found for country', { country: normalizedCountry });
      return [];
    }

    // Map code_tables format to Department format
    const departments = data.map((dept: any) => {
      // Add data validation
      if (!dept.id || !dept.display_name) {
        logger.warn('Invalid department data', { dept });
        return null;
      }

      return {
        id: dept.id,
        name: dept.display_name, // Use display_name as the department name
        description: dept.code || '', // Use code as description
        doctor_count: 0, // Will be calculated separately if needed
        country: normalizedCountry // Always use normalized country
      };
    }).filter(Boolean); // Remove any null entries

    logger.info('Successfully fetched departments', {
      country: normalizedCountry,
      count: departments.length
    });

    return departments as Department[];

  } catch (error) {
    logger.error('Exception in getDepartmentsForCountry', {
      country,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return [];
  }
};

/**
 * Get doctors for a specific department
 */
export const getDoctorsForDepartment = async (departmentName: string, country: string): Promise<DepartmentDoctor[]> => {
  try {
    if (!departmentName || departmentName.trim() === '' || !country || country.trim() === '') {
      logger.warn('getDoctorsForDepartment: Invalid parameters', { departmentName, country });
      return [];
    }

    const normalizedCountry = normalizeCountry(country);
    // CRITICAL FIX: Use direct table query with join since RPC function doesn't exist
    const { data, error } = await supabase
      .from('doctors')
      .select(`
        id,
        name,
        specialties,
        department_id,
        country,
        is_active,
        departments!inner(name)
      `)
      .eq('country', normalizedCountry)
      .eq('departments.name', departmentName.trim())
      .eq('is_active', true)
      .order('name');

    if (error) {
      logger.error('Error fetching doctors for department', {
        departmentName,
        country: normalizedCountry,
        error: error.message
      });
      return [];
    }

    if (!data || data.length === 0) {
      logger.info('No doctors found for department', { departmentName, country: normalizedCountry });
      return [];
    }

    return data.map((doctor: any) => ({
      id: doctor.id,
      name: doctor.name,
      specialties: doctor.specialties || [],
      is_active: true
    }));

  } catch (error) {
    logger.error('Exception in getDoctorsForDepartment', {
      departmentName,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
};

/**
 * Get procedures for a specific doctor (reuse existing function)
 */
export const getProceduresForDoctor = async (doctorId: string, country: string): Promise<DoctorProcedure[]> => {
  try {
    if (!doctorId || !country || country.trim() === '') {
      logger.warn('getProceduresForDoctor: Invalid parameters', { doctorId, country });
      return [];
    }

    const normalizedCountry = normalizeCountry(country);
    // CRITICAL FIX: Use direct table query since RPC function doesn't exist
    const { data, error } = await supabase
      .from('doctor_procedures')
      .select('procedure_type')
      .eq('doctor_id', doctorId)
      .eq('country', normalizedCountry)
      .eq('is_active', true)
      .order('procedure_type');

    if (error) {
      logger.error('Error fetching procedures for doctor', {
        doctorId,
        country: normalizedCountry,
        error: error.message
      });
      return [];
    }

    if (!data || data.length === 0) {
      logger.info('No procedures found for doctor', { doctorId, country: normalizedCountry });
      return [];
    }

    return data.map((proc: any) => ({
      procedure_type: proc.procedure_type
    }));

  } catch (error) {
    logger.error('Exception in getProceduresForDoctor', {
      doctorId,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
};

/**
 * Get sets for a doctor-procedure combination (reuse existing function)
 */
export const getSetsForDoctorProcedure = async (
  doctorId: string,
  procedureType: string,
  country: string
): Promise<ProcedureSet[]> => {
  try {
    if (!doctorId || !procedureType || !country || country.trim() === '') {
      logger.warn('getSetsForDoctorProcedure: Invalid parameters', { doctorId, procedureType, country });
      return [];
    }

    const normalizedCountry = normalizeCountry(country);
    
    // Load surgery sets for this doctor/procedure combination with Edit Sets ordering
    const { data: surgerySets, error: surgeryError } = await supabase
      .from('surgery_sets')
      .select('id, name, sort_order')
      .eq('country', normalizedCountry)
      .eq('doctor_id', doctorId) // ⚠️ doctor_id (doctorId) FK
      .eq('procedure_type', procedureType) // ⚠️ procedure_type (procedureType) - NOT procedure
      .eq('is_active', true) // ⚠️ is_active (isActive)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('name');

    // Load implant boxes for this doctor/procedure combination with Edit Sets ordering
    const { data: implantBoxes, error: implantError } = await supabase
      .from('implant_boxes')
      .select('id, name, sort_order')
      .eq('country', normalizedCountry)
      .eq('doctor_id', doctorId)
      .eq('procedure_type', procedureType)
      .eq('is_active', true)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('name');

    if (surgeryError) {
      logger.error('Error fetching surgery sets for doctor-procedure', {
        doctorId,
        procedureType,
        country: normalizedCountry,
        error: surgeryError.message
      });
    }

    if (implantError) {
      logger.error('Error fetching implant boxes for doctor-procedure', {
        doctorId,
        procedureType,
        country: normalizedCountry,
        error: implantError.message
      });
    }

    // Transform to ProcedureSet format while preserving Edit Sets ordering
    const results: ProcedureSet[] = [];
    
    // Add surgery sets in Edit Sets order
    (surgerySets || []).forEach(set => {
      results.push({
        item_type: 'surgery_set',
        item_id: set.id,
        item_name: set.name
      });
    });
    
    // Add implant boxes in Edit Sets order
    (implantBoxes || []).forEach(box => {
      results.push({
        item_type: 'implant_box',
        item_id: box.id,
        item_name: box.name
      });
    });
    
    logger.info('Loaded sets for doctor-procedure with Edit Sets ordering', {
      doctorId,
      procedureType,
      country: normalizedCountry,
      surgerySetCount: surgerySets?.length || 0,
      implantBoxCount: implantBoxes?.length || 0
    });
    
    return results;

  } catch (error) {
    logger.error('Exception in getSetsForDoctorProcedure', {
      doctorId,
      procedureType,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
};

/**
 * Add doctor to department
 */
export const addDoctorToDepartment = async (
  departmentId: string,
  doctorName: string,
  country: string,
  specialties: string[] = []
): Promise<{ success: boolean; doctorId?: string; error?: string }> => {
  try {
    if (!doctorName || !departmentId || !country) {
      return { success: false, error: 'Missing required parameters' };
    }

    const normalizedCountry = normalizeCountry(country);

    // Check if doctor already exists
    const { data: existingDoctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('name', doctorName)
      .eq('country', normalizedCountry)
      .eq('department_id', departmentId)
      .single();

    if (existingDoctor) {
      return { success: false, error: 'Doctor already exists in this department' };
    }

    // Insert new doctor
    const { data: newDoctor, error: insertError } = await supabase
      .from('doctors')
      .insert({
        name: doctorName,
        country: normalizedCountry,
        department_id: departmentId,
        specialties: specialties,
        is_active: true
      })
      .select('id')
      .single();

    if (insertError || !newDoctor) {
      return { success: false, error: insertError?.message || 'Failed to add doctor' };
    }

    logger.info('Doctor added to department successfully', {
      doctorName,
      departmentId,
      country: normalizedCountry,
      doctorId: newDoctor.id
    });

    return { success: true, doctorId: newDoctor.id };

  } catch (error) {
    logger.error('Exception in addDoctorToDepartment', {
      doctorName,
      departmentId,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return { success: false, error: 'Internal server error' };
  }
};

/**
 * Remove doctor from system
 */
export const removeDoctorFromSystem = async (
  doctorId: string,
  country: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!doctorId || !country) {
      return { success: false, error: 'Missing required parameters' };
    }

    const normalizedCountry = normalizeCountry(country);

    // Set doctor as inactive instead of deleting
    const { error } = await supabase
      .from('doctors')
      .update({ is_active: false })
      .eq('id', doctorId)
      .eq('country', normalizedCountry);

    if (error) {
      return { success: false, error: error.message };
    }

    logger.info('Doctor removed from system successfully', {
      doctorId,
      country: normalizedCountry
    });

    return { success: true };

  } catch (error) {
    logger.error('Exception in removeDoctorFromSystem', {
      doctorId,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return { success: false, error: 'Internal server error' };
  }
};

/**
 * Add procedure to doctor without triggering cache version conflicts
 */
export const addProcedureToDoctor = async (
  doctorId: string,
  procedureType: string,
  country: string
): Promise<boolean> => {
  try {
    if (!doctorId || !procedureType || !country) {
      logger.warn('addProcedureToDoctor: Invalid parameters', { doctorId, procedureType, country });
      return false;
    }

    const normalizedCountry = normalizeCountry(country);

    // Check if procedure already exists
    const { data: existing } = await supabase
      .from('doctor_procedures')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('procedure_type', procedureType.trim())
      .eq('country', normalizedCountry)
      .single();

    if (existing) {
      logger.info('Procedure already exists for doctor', { doctorId, procedureType, country: normalizedCountry });
      return true; // Already exists, consider it success
    }

    const { error } = await supabase
      .from('doctor_procedures')
      .insert({
        doctor_id: doctorId,
        procedure_type: procedureType.trim(),
        country: normalizedCountry,
        is_active: true
      });

    if (error) {
      logger.error('Error adding procedure to doctor', { doctorId, procedureType, country: normalizedCountry, error: error.message });
      return false;
    }

    logger.info('Successfully added procedure to doctor', { doctorId, procedureType, country: normalizedCountry });
    return true;

  } catch (error) {
    logger.error('Exception in addProcedureToDoctor', {
      doctorId,
      procedureType,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};

/**
 * Update procedure for a doctor with error handling
 */
export const updateDoctorProcedure = async (
  doctorId: string,
  oldProcedureType: string,
  newProcedureType: string,
  country: string
): Promise<boolean> => {
  try {
    if (!doctorId || !oldProcedureType || !newProcedureType || !country) {
      logger.warn('updateDoctorProcedure: Invalid parameters', { doctorId, oldProcedureType, newProcedureType, country });
      return false;
    }

    const normalizedCountry = normalizeCountry(country);

    const { error } = await supabase
      .from('doctor_procedures')
      .update({
        procedure_type: newProcedureType.trim()
      })
      .eq('doctor_id', doctorId)
      .eq('procedure_type', oldProcedureType.trim())
      .eq('country', normalizedCountry);

    if (error) {
      logger.error('Error updating doctor procedure', { doctorId, oldProcedureType, newProcedureType, country: normalizedCountry, error: error.message });
      return false;
    }

    logger.info('Successfully updated doctor procedure', { doctorId, oldProcedureType, newProcedureType, country: normalizedCountry });
    return true;

  } catch (error) {
    logger.error('Exception in updateDoctorProcedure', {
      doctorId,
      oldProcedureType,
      newProcedureType,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};

/**
 * Delete procedure from a doctor with error handling
 */
export const deleteDoctorProcedure = async (
  doctorId: string,
  procedureType: string,
  country: string
): Promise<boolean> => {
  try {
    if (!doctorId || !procedureType || !country) {
      logger.warn('deleteDoctorProcedure: Invalid parameters', { doctorId, procedureType, country });
      return false;
    }

    const normalizedCountry = normalizeCountry(country);

    const { error } = await supabase
      .from('doctor_procedures')
      .delete()
      .eq('doctor_id', doctorId)
      .eq('procedure_type', procedureType.trim())
      .eq('country', normalizedCountry);

    if (error) {
      logger.error('Error deleting doctor procedure', { doctorId, procedureType, country: normalizedCountry, error: error.message });
      return false;
    }

    logger.info('Successfully deleted doctor procedure', { doctorId, procedureType, country: normalizedCountry });
    return true;

  } catch (error) {
    logger.error('Exception in deleteDoctorProcedure', {
      doctorId,
      procedureType,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};

/**
 * Add surgery set to doctor-procedure combination
 */
export const addSurgerySetToProcedure = async (
  doctorId: string,
  procedureType: string,
  surgerySetId: string,
  country: string
): Promise<boolean> => {
  try {
    const normalizedCountry = normalizeCountry(country);

    const { error } = await supabase
      .from('doctor_procedure_sets')
      .insert({
        doctor_id: doctorId,
        procedure_type: procedureType.trim(),
        surgery_set_id: surgerySetId,
        country: normalizedCountry
      });

    if (error) {
      logger.error('Error adding surgery set to procedure', { doctorId, procedureType, surgerySetId, country: normalizedCountry, error: error.message });
      return false;
    }

    logger.info('Successfully added surgery set to procedure', { doctorId, procedureType, surgerySetId, country: normalizedCountry });
    return true;

  } catch (error) {
    logger.error('Exception in addSurgerySetToProcedure', {
      doctorId,
      procedureType,
      surgerySetId,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};

/**
 * Add implant box to doctor-procedure combination
 */
export const addImplantBoxToProcedure = async (
  doctorId: string,
  procedureType: string,
  implantBoxId: string,
  country: string
): Promise<boolean> => {
  try {
    const normalizedCountry = normalizeCountry(country);

    const { error } = await supabase
      .from('doctor_procedure_sets')
      .insert({
        doctor_id: doctorId,
        procedure_type: procedureType.trim(),
        implant_box_id: implantBoxId,
        country: normalizedCountry
      });

    if (error) {
      logger.error('Error adding implant box to procedure', { doctorId, procedureType, implantBoxId, country: normalizedCountry, error: error.message });
      return false;
    }

    logger.info('Successfully added implant box to procedure', { doctorId, procedureType, implantBoxId, country: normalizedCountry });
    return true;

  } catch (error) {
    logger.error('Exception in addImplantBoxToProcedure', {
      doctorId,
      procedureType,
      implantBoxId,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};

/**
 * Remove surgery set from doctor-procedure combination
 */
export const removeSurgerySetFromProcedure = async (
  doctorId: string,
  procedureType: string,
  surgerySetId: string,
  country: string
): Promise<boolean> => {
  try {
    const normalizedCountry = normalizeCountry(country);

    const { error } = await supabase
      .from('doctor_procedure_sets')
      .delete()
      .eq('doctor_id', doctorId)
      .eq('procedure_type', procedureType.trim())
      .eq('surgery_set_id', surgerySetId)
      .eq('country', normalizedCountry);

    if (error) {
      logger.error('Error removing surgery set from procedure', { doctorId, procedureType, surgerySetId, country: normalizedCountry, error: error.message });
      return false;
    }

    logger.info('Successfully removed surgery set from procedure', { doctorId, procedureType, surgerySetId, country: normalizedCountry });
    return true;

  } catch (error) {
    logger.error('Exception in removeSurgerySetFromProcedure', {
      doctorId,
      procedureType,
      surgerySetId,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};

/**
 * Remove implant box from doctor-procedure combination
 */
export const removeImplantBoxFromProcedure = async (
  doctorId: string,
  procedureType: string,
  implantBoxId: string,
  country: string
): Promise<boolean> => {
  try {
    const normalizedCountry = normalizeCountry(country);

    const { error } = await supabase
      .from('doctor_procedure_sets')
      .delete()
      .eq('doctor_id', doctorId)
      .eq('procedure_type', procedureType.trim())
      .eq('implant_box_id', implantBoxId)
      .eq('country', normalizedCountry);

    if (error) {
      logger.error('Error removing implant box from procedure', { doctorId, procedureType, implantBoxId, country: normalizedCountry, error: error.message });
      return false;
    }

    logger.info('Successfully removed implant box from procedure', { doctorId, procedureType, implantBoxId, country: normalizedCountry });
    return true;

  } catch (error) {
    logger.error('Exception in removeImplantBoxFromProcedure', {
      doctorId,
      procedureType,
      implantBoxId,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};