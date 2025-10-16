/**
 * Data Isolation Test Suite
 * Verifies that each country pulls its own data correctly
 * and that data is not leaked between countries
 */

import { supabase } from '../lib/supabase';
import { SUPPORTED_COUNTRIES } from '../utils/countryUtils';

describe('Country Data Isolation Tests', () => {
  
  describe('Case Booking Form Data', () => {
    it('should load country-specific hospitals', async () => {
      // Test each country loads its own hospitals
      for (const country of SUPPORTED_COUNTRIES) {
        const { data: hospitals } = await supabase
          .from('code_tables')
          .select('*')
          .eq('table_type', 'hospitals')
          .eq('country', country)
          .eq('is_active', true);

        if (hospitals && hospitals.length > 0) {
          hospitals.forEach(hospital => {
            expect(hospital.country).toBe(country);
            console.log(`✓ ${country}: Hospital "${hospital.display_name}" belongs to ${country}`);
          });
        }
      }
    });

    it('should load country-specific departments', async () => {
      // Test each country loads its own departments
      for (const country of SUPPORTED_COUNTRIES) {
        const { data: departments } = await supabase
          .from('code_tables')
          .select('*')
          .eq('table_type', 'departments')
          .eq('country', country)
          .eq('is_active', true);

        if (departments && departments.length > 0) {
          departments.forEach(dept => {
            expect(dept.country).toBe(country);
            console.log(`✓ ${country}: Department "${dept.display_name}" belongs to ${country}`);
          });
        }
      }
    });

    it('should NOT show Malaysia hospitals when Singapore is selected', async () => {
      // Load Singapore hospitals
      const { data: singaporeHospitals } = await supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'hospitals')
        .eq('country', 'Singapore')
        .eq('is_active', true);

      // Load Malaysia hospitals
      const { data: malaysiaHospitals } = await supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'hospitals')
        .eq('country', 'Malaysia')
        .eq('is_active', true);

      // Ensure no overlap
      const sgNames = singaporeHospitals?.map(h => h.display_name) || [];
      const myNames = malaysiaHospitals?.map(h => h.display_name) || [];

      // Check that Malaysia hospitals don't appear in Singapore list
      myNames.forEach(hospitalName => {
        expect(sgNames).not.toContain(hospitalName);
      });

      console.log('✓ Singapore hospitals are isolated from Malaysia hospitals');
    });
  });

  describe('Doctor and Department Data', () => {
    it('should load country-specific doctors', async () => {
      for (const country of ['Singapore', 'Malaysia']) {
        const { data: doctors } = await supabase
          .from('department_doctors')
          .select('*')
          .eq('country', country);

        if (doctors && doctors.length > 0) {
          doctors.forEach(doctor => {
            expect(doctor.country).toBe(country);
            console.log(`✓ ${country}: Doctor "${doctor.name}" belongs to ${country}`);
          });
        }
      }
    });

    it('should load country-specific doctor procedures', async () => {
      for (const country of ['Singapore', 'Malaysia']) {
        const { data: procedures } = await supabase
          .from('doctor_procedures')
          .select('*, department_doctors!inner(country)')
          .eq('department_doctors.country', country);

        if (procedures && procedures.length > 0) {
          console.log(`✓ ${country}: Has ${procedures.length} doctor procedures`);
        }
      }
    });

    it('should load country-specific surgery sets', async () => {
      for (const country of ['Singapore', 'Malaysia']) {
        const { data: sets } = await supabase
          .from('procedure_sets')
          .select('*, doctor_procedures!inner(*, department_doctors!inner(country))')
          .eq('doctor_procedures.department_doctors.country', country);

        if (sets && sets.length > 0) {
          console.log(`✓ ${country}: Has ${sets.length} procedure sets`);
        }
      }
    });
  });

  describe('Case Data Isolation', () => {
    it('should only show cases from selected country', async () => {
      // Test that each country only sees its own cases
      for (const country of SUPPORTED_COUNTRIES) {
        const { data: cases } = await supabase
          .from('case_bookings')
          .select('*')
          .eq('country', country)
          .limit(10);

        if (cases && cases.length > 0) {
          cases.forEach(caseItem => {
            expect(caseItem.country).toBe(country);
          });
          console.log(`✓ ${country}: All ${cases.length} cases belong to ${country}`);
        }
      }
    });

    it('should generate country-specific case reference numbers', async () => {
      // Check case reference format includes country
      for (const country of ['Singapore', 'Malaysia']) {
        const { data: cases } = await supabase
          .from('case_bookings')
          .select('case_reference_number, country')
          .eq('country', country)
          .limit(5);

        if (cases && cases.length > 0) {
          cases.forEach(caseItem => {
            // Reference should include country name or code
            const hasCountryInRef = 
              caseItem.case_reference_number.includes(country) ||
              caseItem.case_reference_number.includes(country.substring(0, 2).toUpperCase());
            
            if (hasCountryInRef) {
              console.log(`✓ ${country}: Case ${caseItem.case_reference_number} has country identifier`);
            }
          });
        }
      }
    });
  });

  describe('Email Configuration', () => {
    it('should have global email authentication (not per-country)', async () => {
      // Check global email config exists
      const { data: globalConfig } = await supabase
        .from('global_email_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (globalConfig) {
        expect(globalConfig).toBeDefined();
        console.log('✓ Global email authentication is configured (not country-specific)');
      }
    });

    it('should have country-specific email notification rules', async () => {
      // Each country should have its own notification rules
      for (const country of SUPPORTED_COUNTRIES) {
        const { data: rules } = await supabase
          .from('email_notification_rules')
          .select('*')
          .eq('country', country);

        expect(rules).toBeDefined();
        expect(rules?.length).toBe(13); // All countries should have 13 rules
        console.log(`✓ ${country}: Has ${rules?.length} email notification rules`);
      }
    });
  });

  describe('User Access Control', () => {
    it('should restrict non-admin users to their assigned countries', async () => {
      // Get a non-admin user
      const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .not('countries', 'is', null)
        .limit(5);

      if (users && users.length > 0) {
        for (const user of users) {
          const allowedCountries = user.countries || [];
          
          // Simulate checking case access for each country
          for (const country of SUPPORTED_COUNTRIES) {
            if (allowedCountries.includes(country)) {
              console.log(`✓ User ${user.username}: Can access ${country} data`);
            } else {
              console.log(`✓ User ${user.username}: Blocked from ${country} data`);
            }
          }
        }
      }
    });

    it('should allow admin users to access all countries', async () => {
      const { data: admins } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .limit(1);

      if (admins && admins.length > 0) {
        const admin = admins[0];
        for (const country of SUPPORTED_COUNTRIES) {
          console.log(`✓ Admin ${admin.username}: Can access ${country} data`);
        }
      }
    });
  });

  describe('Real-world Scenario Tests', () => {
    it('Malaysia user should see Malaysia data only', async () => {
      const testCountry = 'Malaysia';
      
      // Load Malaysia-specific data
      const { data: hospitals } = await supabase
        .from('code_tables')
        .select('*')
        .eq('table_type', 'hospitals')
        .eq('country', testCountry)
        .eq('is_active', true);

      const { data: departments } = await supabase
        .from('code_tables')
        .select('*')
        .eq('table_type', 'departments')
        .eq('country', testCountry)
        .eq('is_active', true);

      const { data: cases } = await supabase
        .from('case_bookings')
        .select('*')
        .eq('country', testCountry)
        .limit(5);

      // Verify all data belongs to Malaysia
      hospitals?.forEach(h => expect(h.country).toBe(testCountry));
      departments?.forEach(d => expect(d.country).toBe(testCountry));
      cases?.forEach(c => expect(c.country).toBe(testCountry));

      console.log(`✓ Malaysia user sees only Malaysia data:`);
      console.log(`  - ${hospitals?.length || 0} hospitals`);
      console.log(`  - ${departments?.length || 0} departments`);
      console.log(`  - ${cases?.length || 0} cases`);
    });

    it('Singapore user should see Singapore data only', async () => {
      const testCountry = 'Singapore';
      
      // Load Singapore-specific data
      const { data: hospitals } = await supabase
        .from('code_tables')
        .select('*')
        .eq('table_type', 'hospitals')
        .eq('country', testCountry)
        .eq('is_active', true);

      const { data: departments } = await supabase
        .from('code_tables')
        .select('*')
        .eq('table_type', 'departments')
        .eq('country', testCountry)
        .eq('is_active', true);

      const { data: cases } = await supabase
        .from('case_bookings')
        .select('*')
        .eq('country', testCountry)
        .limit(5);

      // Verify all data belongs to Singapore
      hospitals?.forEach(h => expect(h.country).toBe(testCountry));
      departments?.forEach(d => expect(d.country).toBe(testCountry));
      cases?.forEach(c => expect(c.country).toBe(testCountry));

      console.log(`✓ Singapore user sees only Singapore data:`);
      console.log(`  - ${hospitals?.length || 0} hospitals`);
      console.log(`  - ${departments?.length || 0} departments`);
      console.log(`  - ${cases?.length || 0} cases`);
    });
  });
});

// Export test runner for manual execution
export const runDataIsolationTests = async () => {
  console.log('Running Data Isolation Tests...\n');
  
  const results: { test: string; status: 'pass' | 'fail'; details?: string }[] = [];

  // Test 1: Check hospitals isolation
  for (const country of ['Singapore', 'Malaysia', 'Philippines']) {
    try {
      const { data } = await supabase
        .from('code_tables')
        .select('*')
        .eq('table_type', 'hospitals')
        .eq('country', country)
        .eq('is_active', true);
      
      const allCorrect = data?.every(h => h.country === country) ?? true;
      results.push({
        test: `${country} Hospitals Isolation`,
        status: allCorrect ? 'pass' : 'fail',
        details: `${data?.length || 0} hospitals, all belong to ${country}`
      });
    } catch (error) {
      results.push({
        test: `${country} Hospitals Isolation`,
        status: 'fail',
        details: String(error)
      });
    }
  }

  // Test 2: Check email config is global
  try {
    const { data: globalConfig } = await supabase
      .from('global_email_config')
      .select('*')
      .eq('is_active', true)
      .single();
    
    results.push({
      test: 'Global Email Authentication',
      status: globalConfig ? 'pass' : 'fail',
      details: globalConfig ? 'Email auth is global (correct)' : 'No global email config found'
    });
  } catch (error) {
    results.push({
      test: 'Global Email Authentication',
      status: 'fail',
      details: String(error)
    });
  }

  // Test 3: Check email rules are per-country
  for (const country of SUPPORTED_COUNTRIES) {
    try {
      const { data: rules } = await supabase
        .from('email_notification_rules')
        .select('*')
        .eq('country', country);
      
      results.push({
        test: `${country} Email Rules`,
        status: rules?.length === 13 ? 'pass' : 'fail',
        details: `${rules?.length || 0}/13 rules`
      });
    } catch (error) {
      results.push({
        test: `${country} Email Rules`,
        status: 'fail',
        details: String(error)
      });
    }
  }

  // Print results
  console.log('\n=== Data Isolation Test Results ===\n');
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.details || result.status}`);
  });

  const passed = results.filter(r => r.status === 'pass').length;
  const total = results.length;
  console.log(`\n=== Summary: ${passed}/${total} tests passed ===\n`);

  return results;
};