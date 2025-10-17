/**
 * UNIFIED DATA SERVICE COMPREHENSIVE TEST SUITE
 * 
 * Tests the consolidated unifiedDataService for:
 * - All CRUD operations
 * - Field mapping consistency  
 * - Country-based data isolation
 * - Standardized dropdown functions
 * - Legacy compatibility
 * - Performance and caching
 */

import { 
  getUnifiedDepartments,
  getUnifiedDoctorsForDepartment,
  getUnifiedProceduresForDoctor,
  getUnifiedSurgerySets,
  getUnifiedImplantBoxes,
  getStandardizedDepartments,
  getStandardizedCountries,
  getStandardizedDoctorsForDepartment,
  getStandardizedDropdownData,
  getDoctorsForDepartment,
  getDepartmentsForCountry,
  getSetsForDoctorProcedure,
  getCaseQuantities,
  saveCaseQuantities,
  addDoctorToDepartment,
  removeDoctorFromSystem,
  type UnifiedDepartment,
  type UnifiedDoctor,
  type StandardizedDoctor,
  type StandardizedDropdownData,
  type CaseQuantity
} from '../../utils/unifiedDataService';
import { supabase } from '../../lib/supabase';
import { SUPPORTED_COUNTRIES } from '../../utils/countryUtils';

describe('Unified Data Service - Complete Integration Tests', () => {

  // Test data cleanup
  const testDoctorIds: string[] = [];
  const testCaseIds: string[] = [];

  afterAll(async () => {
    // Cleanup test data
    if (testDoctorIds.length > 0) {
      await supabase
        .from('doctors')
        .delete()
        .in('id', testDoctorIds);
    }
    
    if (testCaseIds.length > 0) {
      await supabase
        .from('case_booking_quantities')
        .delete()
        .in('case_booking_id', testCaseIds);
    }
  });

  describe('🌏 Unified Department Functions', () => {
    
    it('should get departments for all supported countries', async () => {
      for (const country of SUPPORTED_COUNTRIES) {
        const departments = await getUnifiedDepartments(country);
        
        expect(Array.isArray(departments)).toBeTruthy();
        console.log(`✅ ${country}: Retrieved ${departments.length} departments`);
        
        // Verify data structure
        departments.forEach(dept => {
          expect(dept).toHaveProperty('id');
          expect(dept).toHaveProperty('name');
          expect(dept).toHaveProperty('country', country);
          expect(dept).toHaveProperty('is_active', true);
          expect(typeof dept.doctor_count).toBe('number');
        });
      }
    });

    it('should return empty array for invalid country', async () => {
      const departments = await getUnifiedDepartments('InvalidCountry');
      expect(departments).toEqual([]);
    });

    it('should match legacy getDepartmentsForCountry function', async () => {
      const testCountry = 'Singapore';
      
      const unifiedResult = await getUnifiedDepartments(testCountry);
      const legacyResult = await getDepartmentsForCountry(testCountry);
      
      expect(unifiedResult.length).toBe(legacyResult.length);
      console.log('✅ Legacy compatibility maintained for getDepartmentsForCountry');
    });
  });

  describe('👨‍⚕️ Unified Doctor Functions', () => {
    
    it('should get doctors for departments across countries', async () => {
      for (const country of ['Singapore', 'Malaysia']) {
        // Get departments first
        const departments = await getUnifiedDepartments(country);
        
        if (departments.length > 0) {
          const testDept = departments[0];
          const doctors = await getUnifiedDoctorsForDepartment(testDept.name, country);
          
          expect(Array.isArray(doctors)).toBeTruthy();
          console.log(`✅ ${country} - ${testDept.name}: Found ${doctors.length} doctors`);
          
          // Verify data structure
          doctors.forEach(doctor => {
            expect(doctor).toHaveProperty('id');
            expect(doctor).toHaveProperty('name');
            expect(doctor).toHaveProperty('country', country);
            expect(doctor).toHaveProperty('department_id', testDept.id);
            expect(doctor).toHaveProperty('department_name', testDept.name);
            expect(doctor).toHaveProperty('is_active', true);
            expect(Array.isArray(doctor.specialties)).toBeTruthy();
          });
        }
      }
    });

    it('should maintain proper department relationships', async () => {
      const testCountry = 'Singapore';
      const departments = await getUnifiedDepartments(testCountry);
      
      if (departments.length > 0) {
        const testDept = departments[0];
        const doctors = await getUnifiedDoctorsForDepartment(testDept.name, testCountry);
        
        // All doctors should belong to the requested department
        doctors.forEach(doctor => {
          expect(doctor.department_id).toBe(testDept.id);
          expect(doctor.department_name).toBe(testDept.name);
        });
        
        console.log(`✅ Department relationship verified: ${doctors.length} doctors belong to ${testDept.name}`);
      }
    });

    it('should match legacy getDoctorsForDepartment function', async () => {
      const testCountry = 'Singapore';
      const departments = await getUnifiedDepartments(testCountry);
      
      if (departments.length > 0) {
        const testDept = departments[0];
        
        const unifiedResult = await getUnifiedDoctorsForDepartment(testDept.name, testCountry);
        const legacyResult = await getDoctorsForDepartment(testDept.name, testCountry);
        
        expect(unifiedResult.length).toBe(legacyResult.length);
        console.log('✅ Legacy compatibility maintained for getDoctorsForDepartment');
      }
    });
  });

  describe('🏥 Unified Procedure and Equipment Functions', () => {
    
    it('should get procedures for doctors', async () => {
      const testCountry = 'Singapore';
      const departments = await getUnifiedDepartments(testCountry);
      
      if (departments.length > 0) {
        const doctors = await getUnifiedDoctorsForDepartment(departments[0].name, testCountry);
        
        if (doctors.length > 0) {
          const testDoctor = doctors[0];
          const procedures = await getUnifiedProceduresForDoctor(testDoctor.id, testCountry);
          
          expect(Array.isArray(procedures)).toBeTruthy();
          console.log(`✅ ${testDoctor.name}: Found ${procedures.length} procedures`);
          
          procedures.forEach(procedure => {
            expect(procedure).toHaveProperty('id');
            expect(procedure).toHaveProperty('doctor_id', testDoctor.id);
            expect(procedure).toHaveProperty('procedure_type');
            expect(procedure).toHaveProperty('country', testCountry);
            expect(procedure).toHaveProperty('is_active', true);
          });
        }
      }
    });

    it('should get surgery sets for doctor and procedure', async () => {
      const testCountry = 'Singapore';
      const departments = await getUnifiedDepartments(testCountry);
      
      if (departments.length > 0) {
        const doctors = await getUnifiedDoctorsForDepartment(departments[0].name, testCountry);
        
        if (doctors.length > 0) {
          const testDoctor = doctors[0];
          const procedures = await getUnifiedProceduresForDoctor(testDoctor.id, testCountry);
          
          if (procedures.length > 0) {
            const testProcedure = procedures[0];
            const surgerySets = await getUnifiedSurgerySets(testDoctor.id, testProcedure.procedure_type, testCountry);
            
            expect(Array.isArray(surgerySets)).toBeTruthy();
            console.log(`✅ ${testDoctor.name} - ${testProcedure.procedure_type}: Found ${surgerySets.length} surgery sets`);
            
            surgerySets.forEach(set => {
              expect(set).toHaveProperty('id');
              expect(set).toHaveProperty('name');
              expect(set).toHaveProperty('doctor_id', testDoctor.id);
              expect(set).toHaveProperty('procedure_type', testProcedure.procedure_type);
              expect(set).toHaveProperty('country', testCountry);
              expect(set).toHaveProperty('is_active', true);
            });
          }
        }
      }
    });

    it('should get implant boxes for doctor and procedure', async () => {
      const testCountry = 'Singapore';
      const departments = await getUnifiedDepartments(testCountry);
      
      if (departments.length > 0) {
        const doctors = await getUnifiedDoctorsForDepartment(departments[0].name, testCountry);
        
        if (doctors.length > 0) {
          const testDoctor = doctors[0];
          const procedures = await getUnifiedProceduresForDoctor(testDoctor.id, testCountry);
          
          if (procedures.length > 0) {
            const testProcedure = procedures[0];
            const implantBoxes = await getUnifiedImplantBoxes(testDoctor.id, testProcedure.procedure_type, testCountry);
            
            expect(Array.isArray(implantBoxes)).toBeTruthy();
            console.log(`✅ ${testDoctor.name} - ${testProcedure.procedure_type}: Found ${implantBoxes.length} implant boxes`);
            
            implantBoxes.forEach(box => {
              expect(box).toHaveProperty('id');
              expect(box).toHaveProperty('name');
              expect(box).toHaveProperty('doctor_id', testDoctor.id);
              expect(box).toHaveProperty('procedure_type', testProcedure.procedure_type);
              expect(box).toHaveProperty('country', testCountry);
              expect(box).toHaveProperty('is_active', true);
            });
          }
        }
      }
    });

    it('should match legacy getSetsForDoctorProcedure function', async () => {
      const testCountry = 'Singapore';
      const departments = await getUnifiedDepartments(testCountry);
      
      if (departments.length > 0) {
        const doctors = await getUnifiedDoctorsForDepartment(departments[0].name, testCountry);
        
        if (doctors.length > 0) {
          const testDoctor = doctors[0];
          const procedures = await getUnifiedProceduresForDoctor(testDoctor.id, testCountry);
          
          if (procedures.length > 0) {
            const testProcedure = procedures[0];
            const legacyResult = await getSetsForDoctorProcedure(testDoctor.id, testProcedure.procedure_type, testCountry);
            
            expect(Array.isArray(legacyResult)).toBeTruthy();
            
            // Verify format matches expected ProcedureSet interface
            legacyResult.forEach(item => {
              expect(item).toHaveProperty('item_type');
              expect(item).toHaveProperty('item_id');
              expect(item).toHaveProperty('item_name');
              expect(['surgery_set', 'implant_box']).toContain(item.item_type);
            });
            
            console.log('✅ Legacy compatibility maintained for getSetsForDoctorProcedure');
          }
        }
      }
    });
  });

  describe('🎯 Standardized Dropdown Functions', () => {
    
    it('should get standardized countries', async () => {
      const countries = await getStandardizedCountries();
      
      expect(Array.isArray(countries)).toBeTruthy();
      expect(countries.length).toBeGreaterThan(0);
      
      // Should include all supported countries
      SUPPORTED_COUNTRIES.forEach(supportedCountry => {
        expect(countries).toContain(supportedCountry);
      });
      
      // Should be sorted
      const sortedCountries = [...countries].sort();
      expect(countries).toEqual(sortedCountries);
      
      console.log(`✅ Standardized countries: ${countries.length} countries retrieved and sorted`);
    });

    it('should get standardized departments for all countries', async () => {
      for (const country of SUPPORTED_COUNTRIES) {
        const departments = await getStandardizedDepartments(country);
        
        expect(Array.isArray(departments)).toBeTruthy();
        
        // Should be sorted
        const sortedDepartments = [...departments].sort();
        expect(departments).toEqual(sortedDepartments);
        
        console.log(`✅ ${country}: ${departments.length} standardized departments`);
      }
    });

    it('should get standardized doctors with proper format', async () => {
      const testCountry = 'Singapore';
      const departments = await getStandardizedDepartments(testCountry);
      
      if (departments.length > 0) {
        const testDept = departments[0];
        const doctors = await getStandardizedDoctorsForDepartment(testDept, testCountry);
        
        expect(Array.isArray(doctors)).toBeTruthy();
        
        doctors.forEach(doctor => {
          expect(doctor).toHaveProperty('id');
          expect(doctor).toHaveProperty('name');
          expect(doctor).toHaveProperty('department', testDept);
          expect(doctor).toHaveProperty('country', testCountry);
          expect(Array.isArray(doctor.specialties)).toBeTruthy();
        });
        
        // Should be sorted by name
        const sortedDoctors = [...doctors].sort((a, b) => a.name.localeCompare(b.name));
        expect(doctors).toEqual(sortedDoctors);
        
        console.log(`✅ ${testCountry} - ${testDept}: ${doctors.length} standardized doctors`);
      }
    });

    it('should get complete standardized dropdown data', async () => {
      const testCountry = 'Singapore';
      const dropdownData = await getStandardizedDropdownData(testCountry);
      
      expect(dropdownData).toHaveProperty('countries');
      expect(dropdownData).toHaveProperty('departments');
      expect(dropdownData).toHaveProperty('doctors');
      
      expect(Array.isArray(dropdownData.countries)).toBeTruthy();
      expect(Array.isArray(dropdownData.departments)).toBeTruthy();
      expect(Array.isArray(dropdownData.doctors)).toBeTruthy();
      
      expect(dropdownData.countries.length).toBeGreaterThan(0);
      expect(dropdownData.departments.length).toBeGreaterThan(0);
      
      console.log(`✅ ${testCountry}: Complete dropdown data - ${dropdownData.countries.length} countries, ${dropdownData.departments.length} departments, ${dropdownData.doctors.length} doctors`);
    });
  });

  describe('💾 Case Quantities Management', () => {
    
    it('should save and retrieve case quantities', async () => {
      // Create test case ID (using timestamp to avoid conflicts)
      const testCaseId = `test-case-${Date.now()}`;
      testCaseIds.push(testCaseId);
      
      const testQuantities: CaseQuantity[] = [
        { item_type: 'surgery_set', item_name: 'Test Surgery Set', quantity: 2 },
        { item_type: 'implant_box', item_name: 'Test Implant Box', quantity: 1 }
      ];
      
      // Save quantities
      const saveResult = await saveCaseQuantities(testCaseId, testQuantities);
      expect(saveResult).toBeTruthy();
      
      // Retrieve quantities
      const retrievedQuantities = await getCaseQuantities(testCaseId);
      expect(retrievedQuantities.length).toBe(testQuantities.length);
      
      // Verify data integrity
      testQuantities.forEach(expected => {
        const found = retrievedQuantities.find(q => 
          q.item_type === expected.item_type && q.item_name === expected.item_name
        );
        expect(found).toBeDefined();
        expect(found?.quantity).toBe(expected.quantity);
      });
      
      console.log(`✅ Case quantities: Saved and retrieved ${retrievedQuantities.length} items`);
    });

    it('should handle empty quantities', async () => {
      const testCaseId = `test-case-empty-${Date.now()}`;
      testCaseIds.push(testCaseId);
      
      const saveResult = await saveCaseQuantities(testCaseId, []);
      expect(saveResult).toBeTruthy();
      
      const retrievedQuantities = await getCaseQuantities(testCaseId);
      expect(retrievedQuantities).toEqual([]);
      
      console.log('✅ Empty case quantities handled correctly');
    });
  });

  describe('🔧 CRUD Operations', () => {
    
    it('should add doctor to department', async () => {
      const testCountry = 'Singapore';
      const departments = await getUnifiedDepartments(testCountry);
      
      if (departments.length > 0) {
        const testDept = departments[0];
        const testDoctorName = `Test Doctor ${Date.now()}`;
        
        const result = await addDoctorToDepartment(testDept.id, testDoctorName, testCountry);
        expect(result).toBeTruthy();
        
        // Verify doctor was added
        const doctors = await getUnifiedDoctorsForDepartment(testDept.name, testCountry);
        const addedDoctor = doctors.find(d => d.name === testDoctorName);
        expect(addedDoctor).toBeDefined();
        
        if (addedDoctor) {
          testDoctorIds.push(addedDoctor.id);
          console.log(`✅ Doctor "${testDoctorName}" added to ${testDept.name}`);
        }
      }
    });

    it('should remove doctor from system', async () => {
      const testCountry = 'Singapore';
      const departments = await getUnifiedDepartments(testCountry);
      
      if (departments.length > 0 && testDoctorIds.length > 0) {
        const testDoctorId = testDoctorIds[0];
        
        const result = await removeDoctorFromSystem(testDoctorId, testCountry);
        expect(result).toBeTruthy();
        
        // Verify doctor is marked as inactive
        const { data: doctor } = await supabase
          .from('doctors')
          .select('is_active')
          .eq('id', testDoctorId)
          .single();
        
        expect(doctor?.is_active).toBeFalsy();
        console.log(`✅ Doctor removed from system (marked inactive)`);
      }
    });
  });

  describe('🚀 Performance and Efficiency', () => {
    
    it('should handle concurrent requests efficiently', async () => {
      const testCountry = 'Singapore';
      const startTime = Date.now();
      
      // Run multiple requests concurrently
      const promises = [
        getUnifiedDepartments(testCountry),
        getStandardizedCountries(),
        getStandardizedDepartments(testCountry)
      ];
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      // All requests should succeed
      results.forEach(result => {
        expect(Array.isArray(result)).toBeTruthy();
      });
      
      console.log(`✅ Concurrent requests completed in ${duration}ms`);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should maintain consistent response times', async () => {
      const testCountry = 'Singapore';
      const iterations = 3;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await getUnifiedDepartments(testCountry);
        const duration = Date.now() - startTime;
        times.push(duration);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      console.log(`✅ Response times: avg=${avgTime.toFixed(0)}ms, min=${minTime}ms, max=${maxTime}ms`);
      
      // Performance expectations
      expect(avgTime).toBeLessThan(5000); // Average under 5 seconds
      expect(maxTime).toBeLessThan(8000); // Max under 8 seconds
    });
  });

  describe('🔒 Data Isolation Verification', () => {
    
    it('should maintain strict country isolation', async () => {
      const testCountries = ['Singapore', 'Malaysia'];
      const countryData: Record<string, any[]> = {};
      
      // Get data for each country
      for (const country of testCountries) {
        const departments = await getUnifiedDepartments(country);
        countryData[country] = departments;
        
        // Verify all departments belong to the correct country
        departments.forEach(dept => {
          expect(dept.country).toBe(country);
        });
      }
      
      console.log('✅ Country isolation verified - all data properly segregated');
      
      // Verify different countries have different data
      if (countryData.Singapore.length > 0 && countryData.Malaysia.length > 0) {
        const sgDeptIds = countryData.Singapore.map((d: any) => d.id);
        const myDeptIds = countryData.Malaysia.map((d: any) => d.id);
        
        // Should not share department IDs
        const overlap = sgDeptIds.filter(id => myDeptIds.includes(id));
        expect(overlap.length).toBe(0);
        
        console.log('✅ No data leakage between countries');
      }
    });
  });

});

// Export test runner for manual execution
export const runUnifiedDataServiceTests = async () => {
  console.log('Running Unified Data Service Tests...\n');
  
  const results: { test: string; status: 'pass' | 'fail'; details?: string }[] = [];

  // Test 1: Basic department loading
  for (const country of SUPPORTED_COUNTRIES.slice(0, 3)) { // Test first 3 countries
    try {
      const departments = await getUnifiedDepartments(country);
      results.push({
        test: `${country} Departments`,
        status: departments.length > 0 ? 'pass' : 'fail',
        details: `${departments.length} departments`
      });
    } catch (error) {
      results.push({
        test: `${country} Departments`,
        status: 'fail',
        details: String(error)
      });
    }
  }

  // Test 2: Standardized dropdown data
  try {
    const countries = await getStandardizedCountries();
    results.push({
      test: 'Standardized Countries',
      status: countries.length >= SUPPORTED_COUNTRIES.length ? 'pass' : 'fail',
      details: `${countries.length} countries`
    });
  } catch (error) {
    results.push({
      test: 'Standardized Countries',
      status: 'fail',
      details: String(error)
    });
  }

  // Test 3: Legacy compatibility
  try {
    const testCountry = 'Singapore';
    const unifiedResult = await getUnifiedDepartments(testCountry);
    const legacyResult = await getDepartmentsForCountry(testCountry);
    
    results.push({
      test: 'Legacy Compatibility',
      status: unifiedResult.length === legacyResult.length ? 'pass' : 'fail',
      details: `Unified: ${unifiedResult.length}, Legacy: ${legacyResult.length}`
    });
  } catch (error) {
    results.push({
      test: 'Legacy Compatibility',
      status: 'fail',
      details: String(error)
    });
  }

  // Print results
  console.log('\n=== Unified Data Service Test Results ===\n');
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.details || result.status}`);
  });

  const passed = results.filter(r => r.status === 'pass').length;
  const total = results.length;
  console.log(`\n=== Summary: ${passed}/${total} tests passed ===\n`);

  return results;
};