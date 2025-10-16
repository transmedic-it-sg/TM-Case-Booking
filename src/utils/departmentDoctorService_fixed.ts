/**
 * FIXED Department-Doctor Service - Corrected department-based doctor hierarchy
 * Implements the correct hierarchy: Country -> Department -> Doctor -> Procedure -> Sets
 */

import { supabase } from '../lib/supabase';
import { logger } from './logger';
import { normalizeCountry } from './countryUtils';

export interface DepartmentDoctor {
  id: string;
  name: string;
  specialties: string[];
  department_id?: string;
  is_active: boolean;
}

/**
 * CRITICAL FIX: Get doctors for department using proper relationship lookup
 * Issue identified: Previous logic was inconsistent between code_tables and departments table
 */
export const getDoctorsForDepartment = async (departmentName: string, country: string): Promise<DepartmentDoctor[]> => {
  console.log('👩‍⚕️ DOCTOR LOOKUP FIXED - Starting search:', {
    departmentName,
    country,
    timestamp: new Date().toISOString()
  });
  
  try {
    if (!departmentName || departmentName.trim() === '' || !country || country.trim() === '') {
      console.log('❌ DOCTOR LOOKUP FIXED - Invalid parameters:', { departmentName, country });
      return [];
    }

    const normalizedCountry = normalizeCountry(country);
    console.log('🔍 DOCTOR LOOKUP FIXED - Normalized values:', {
      originalDepartment: departmentName,
      trimmedDepartment: departmentName.trim(),
      originalCountry: country,
      normalizedCountry
    });

    // Step 1: Find the department in the departments table by name
    console.log('🔍 DOCTOR LOOKUP FIXED - Step 1: Finding department in departments table');
    
    const { data: departmentRecords, error: deptsError } = await supabase
      .from('departments')
      .select('id, name, code_table_id')
      .eq('country', normalizedCountry)
      .eq('name', departmentName.trim())
      .eq('is_active', true);
    
    if (deptsError) {
      console.error('❌ DOCTOR LOOKUP FIXED - Department lookup failed:', deptsError);
      return [];
    }
    
    console.log('🏥 DOCTOR LOOKUP FIXED - Department records found:', {
      searchTerm: departmentName.trim(),
      foundDepartments: departmentRecords?.length || 0,
      departments: departmentRecords
    });
    
    // Step 2: Get doctors linked to these departments
    console.log('🔍 DOCTOR LOOKUP FIXED - Step 2: Finding doctors for department');
    
    if (departmentRecords && departmentRecords.length > 0) {
      const departmentIds = departmentRecords.map(dept => dept.id);
      
      const { data: linkedDoctors, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .eq('country', normalizedCountry)
        .in('department_id', departmentIds)
        .eq('is_active', true)
        .order('name');
      
      console.log('👥 DOCTOR LOOKUP FIXED - Linked doctors found:', {
        departmentIds,
        linkedDoctors: linkedDoctors?.length || 0,
        doctors: linkedDoctors
      });
      
      if (doctorError) {
        console.error('❌ DOCTOR LOOKUP FIXED - Linked doctors query failed:', doctorError);
        return [];
      }
      
      if (linkedDoctors && linkedDoctors.length > 0) {
        console.log('✅ DOCTOR LOOKUP FIXED - Returning linked doctors:', linkedDoctors);
        
        return linkedDoctors.map((doctor: any) => ({
          id: doctor.id,
          name: doctor.name,
          specialties: doctor.specialties || [],
          department_id: doctor.department_id,
          is_active: doctor.is_active
        }));
      }
    }
    
    // Step 3: Fallback - Try to find doctors by specialty matching
    console.log('⚠️ DOCTOR LOOKUP FIXED - No linked doctors found, trying specialty matching');
    
    const { data: allDoctors, error: allDoctorError } = await supabase
      .from('doctors')
      .select('*')
      .eq('country', normalizedCountry)
      .eq('is_active', true)
      .order('name');
    
    if (allDoctorError || !allDoctors) {
      console.error('❌ DOCTOR LOOKUP FIXED - All doctors query failed:', allDoctorError);
      return [];
    }
    
    // Filter doctors that have matching specialties
    const matchingDoctors = allDoctors.filter(doctor => {
      if (!doctor.specialties || doctor.specialties.length === 0) {
        return false;
      }
      
      const departmentLower = departmentName.toLowerCase().trim();
      return doctor.specialties.some((specialty: string) => 
        specialty.toLowerCase().includes(departmentLower) ||
        departmentLower.includes(specialty.toLowerCase())
      );
    });
    
    console.log('🎯 DOCTOR LOOKUP FIXED - Specialty matching result:', {
      departmentName: departmentName.trim(),
      totalDoctors: allDoctors.length,
      matchingDoctors: matchingDoctors.length,
      finalDoctors: matchingDoctors
    });
    
    console.log('✅ DOCTOR LOOKUP FIXED - Returning matched doctors:', matchingDoctors);
    
    return matchingDoctors.map((doctor: any) => ({
      id: doctor.id,
      name: doctor.name,
      specialties: doctor.specialties || [],
      department_id: doctor.department_id,
      is_active: doctor.is_active
    }));

  } catch (error) {
    console.error('❌ DOCTOR LOOKUP FIXED - Exception occurred:', error);
    logger.error('Exception in getDoctorsForDepartment FIXED', {
      departmentName,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
};