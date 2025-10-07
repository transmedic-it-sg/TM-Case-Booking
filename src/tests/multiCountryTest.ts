/**
 * Multi-Country Functionality Test
 * Verifies that all country-specific features work correctly
 */

import { supabase } from '../lib/supabase';
import { normalizeCountry } from '../utils/countryUtils';

const SUPPORTED_COUNTRIES = [
  'Singapore',
  'Malaysia', 
  'Philippines',
  'Indonesia',
  'Vietnam',
  'Hong Kong',
  'Thailand'
];

interface TestResult {
  country: string;
  departments: boolean;
  doctors: boolean;
  procedures: boolean;
  surgerySets: boolean;
  implantBoxes: boolean;
  junctionTable: boolean;
  overall: boolean;
}

export async function testMultiCountryFunctionality(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  for (const country of SUPPORTED_COUNTRIES) {
    const normalizedCountry = normalizeCountry(country);
    
    const result: TestResult = {
      country: normalizedCountry,
      departments: false,
      doctors: false,
      procedures: false,
      surgerySets: false,
      implantBoxes: false,
      junctionTable: false,
      overall: false
    };
    
    try {
      // Test 1: Departments
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('country', normalizedCountry)
        .eq('is_active', true);
      
      result.departments = !deptError && departments && departments.length > 0;
      
      if (departments && departments.length > 0) {
        const departmentId = departments[0].id;
        
        // Test 2: Doctors
        const { data: doctors, error: docError } = await supabase
          .from('doctors')
          .select('*')
          .eq('country', normalizedCountry)
          .eq('department_id', departmentId)
          .eq('is_active', true);
        
        result.doctors = !docError && doctors && doctors.length > 0;
        
        if (doctors && doctors.length > 0) {
          const doctorId = doctors[0].id;
          
          // Test 3: Procedures
          const { data: procedures, error: procError } = await supabase
            .from('doctor_procedures')
            .select('*')
            .eq('doctor_id', doctorId)
            .eq('country', normalizedCountry)
            .eq('is_active', true);
          
          result.procedures = !procError && procedures && procedures.length > 0;
          
          // Test 4: Surgery Sets
          const { data: surgerySets, error: ssError } = await supabase
            .from('surgery_sets')
            .select('*')
            .eq('country', normalizedCountry)
            .eq('is_active', true);
          
          result.surgerySets = !ssError && surgerySets && surgerySets.length > 0;
          
          // Test 5: Implant Boxes
          const { data: implantBoxes, error: ibError } = await supabase
            .from('implant_boxes')
            .select('*')
            .eq('country', normalizedCountry)
            .eq('is_active', true);
          
          result.implantBoxes = !ibError && implantBoxes && implantBoxes.length > 0;
          
          // Test 6: Junction Table
          const { data: junctionData, error: juncError } = await supabase
            .from('doctor_procedure_sets')
            .select('*')
            .eq('doctor_id', doctorId)
            .eq('country', normalizedCountry);
          
          result.junctionTable = !juncError && junctionData && junctionData.length > 0;
        }
      }
      
      // Overall result
      result.overall = result.departments && result.doctors && result.surgerySets && result.implantBoxes;
      
    } catch (error) {
    }
    
    results.push(result);
  }
  
  // Summary
  
  results.forEach(r => {
    // Test result output removed
  });
  
  const allPassed = results.every(r => r.overall);
  
  return results;
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMultiCountryFunctionality()
    .then(results => {
      const allPassed = results.every(r => r.overall);
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      process.exit(1);
    });
}