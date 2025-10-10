/**
 * Standardized Data Service - Single source of truth for all dropdown data
 * 
 * This service ensures all dropdowns throughout the TM-Case-Booking app
 * link to the same Supabase datasets, preventing data inconsistency.
 * 
 * IMPORTANT: All components should use this service instead of:
 * - departmentDoctorService.ts
 * - supabaseDepartmentService.ts  
 * - Direct code table imports
 * - Hardcoded constants
 */

import { getDepartmentsForCountry as getCodeTableDepartments } from './supabaseCodeTableService';
import { supabase } from '../lib/supabase';
import { getDoctorsForDepartment } from './departmentDoctorService';
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

// Export interfaces for type safety
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

/**
 * SINGLE SOURCE OF TRUTH for departments across the entire application
 * 
 * This function should be used by ALL components that need department data:
 * - CaseBookingForm
 * - UserManagement  
 * - Reports
 * - SimplifiedEmailConfig
 * - CountryGroupedDepartments
 * - EditSets components
 * - Any other component with department dropdowns
 */
export const getStandardizedDepartments = async (country: string): Promise<string[]> => {
  try {
    const normalizedCountry = normalizeCountry(country);
    
    // Use the code_tables service as the single source of truth
    // This ensures ALL department dropdowns show the same data
    const departments = await getCodeTableDepartments(normalizedCountry);
    
    return departments.sort(); // Always return sorted for consistency
  } catch (error) {
    console.error('Error loading standardized departments:', error);
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
      .eq('is_active', true) // ⚠️ is_active (isActive)
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
    
    // Use the existing departmentDoctorService but transform to standardized format
    const doctors = await getDoctorsForDepartment(departmentName, normalizedCountry);
    
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

/**
 * Validation function to ensure components are using the standardized service
 * This can be used in development to catch components using old services
 */
export const validateDataSourceUsage = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 STANDARDIZED DATA SERVICE: All dropdown data sources validated');
    console.log('✅ Use getStandardizedDepartments() for departments');
    console.log('✅ Use getStandardizedCountries() for countries');  
    console.log('✅ Use getStandardizedDoctorsForDepartment() for doctors');
    console.log('⚠️  Do NOT use departmentDoctorService.getDepartmentsForCountry()');
    console.log('⚠️  Do NOT use supabaseDepartmentService.getDepartments()');
    console.log('⚠️  Do NOT use hardcoded constants');
  }
};

// Export the validation function for development use
if (process.env.NODE_ENV === 'development') {
  validateDataSourceUsage();
}