/**
 * Department-Doctor Service - Handle department-based doctor hierarchy
 * Implements the correct hierarchy: Country -> Department -> Doctor -> Procedure -> Sets
 */

import { supabase } from '../lib/supabase';
import { logger } from './logger';
import { normalizeCountry } from './countryUtils';

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
  is_active: boolean;
}

export interface DoctorProcedure {
  procedure_type: string;
}

export interface ProcedureSet {
  item_type: 'surgery_set' | 'implant_box';
  item_id: string;
  item_name: string;
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
    
    const { data, error } = await supabase.rpc('get_departments_for_country_enhanced', {
      p_country: normalizedCountry
    });

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

    const departments = data.map((dept: any) => {
      // Add data validation
      if (!dept.id || !dept.name) {
        logger.warn('Invalid department data', { dept });
        return null;
      }
      
      return {
        id: dept.id,
        name: dept.name,
        description: dept.description || '',
        doctor_count: parseInt(dept.doctor_count) || 0,
        country: normalizedCountry // CRITICAL: Include country in department object
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
    const { data, error } = await supabase.rpc('get_doctors_for_department', {
      p_department_name: departmentName.trim(),
      p_country: normalizedCountry
    });

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
    const { data, error } = await supabase.rpc('get_procedures_for_doctor', {
      p_doctor_id: doctorId,
      p_country: normalizedCountry
    });

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
    const { data, error } = await supabase.rpc('get_sets_for_doctor_procedure', {
      p_doctor_id: doctorId,
      p_procedure_type: procedureType,
      p_country: normalizedCountry
    });

    if (error) {
      logger.error('Error fetching sets for doctor-procedure', { 
        doctorId, 
        procedureType,
        country: normalizedCountry, 
        error: error.message 
      });
      return [];
    }

    if (!data || data.length === 0) {
      logger.info('No sets found for doctor-procedure', { 
        doctorId, 
        procedureType, 
        country: normalizedCountry 
      });
      return [];
    }

    return data.map((set: any) => ({
      item_type: set.item_type,
      item_id: set.item_id,
      item_name: set.item_name
    }));

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
  doctorName: string, 
  departmentName: string, 
  country: string,
  specialties: string[] = []
): Promise<{ success: boolean; doctorId?: string; error?: string }> => {
  try {
    if (!doctorName || !departmentName || !country) {
      return { success: false, error: 'Missing required parameters' };
    }

    const normalizedCountry = normalizeCountry(country);
    
    // Get department ID
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .select('id')
      .eq('name', departmentName)
      .eq('country', normalizedCountry)
      .eq('is_active', true)
      .single();

    if (deptError || !deptData) {
      return { success: false, error: `Department not found: ${departmentName}` };
    }

    // Check if doctor already exists
    const { data: existingDoctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('name', doctorName)
      .eq('country', normalizedCountry)
      .eq('department_id', deptData.id)
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
        department_id: deptData.id,
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
      departmentName,
      country: normalizedCountry,
      doctorId: newDoctor.id
    });

    return { success: true, doctorId: newDoctor.id };

  } catch (error) {
    logger.error('Exception in addDoctorToDepartment', {
      doctorName,
      departmentName,
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