// =====================================================
// DATA VALIDATION SERVICE - PREVENT EMPTY DATABASE ISSUES
// =====================================================
// This service ensures data integrity and prevents application failures
// =====================================================

import { supabase } from '../lib/supabase';

interface DataValidationResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  crossCountryContamination?: string[];
}

interface DatabaseHealthStatus {
  tablesExist: boolean;
  hasCountries: boolean;
  hasDepartments: boolean;
  hasHospitals: boolean;
  hasProcedureTypes: boolean;
  departmentCoverage: { [country: string]: number };
  hospitalCoverage: { [country: string]: number };
  dataIntegrityIssues: string[];
}

interface CrossCountryContaminationCheck {
  hasContamination: boolean;
  contaminationDetails: {
    departments: { country: string; contaminatedWith: string[] }[];
    hospitals: { country: string; contaminatedWith: string[] }[];
    cases: { country: string; contaminatedWith: string[] }[];
  };
  severity: 'none' | 'low' | 'medium' | 'high';
  recommendations: string[];
}

export class DataValidationService {
  
  /**
   * Comprehensive database health check
   */
  static async checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
    try {
      console.log('🔍 Starting comprehensive database health check...');

      // Check if code_tables exists
      const { error: tableError } = await supabase
        .from('code_tables')
        .select('count', { count: 'exact', head: true });

      if (tableError) {
        console.error('❌ code_tables table does not exist:', tableError);
        return {
          tablesExist: false,
          hasCountries: false,
          hasDepartments: false,
          hasHospitals: false,
          hasProcedureTypes: false,
          departmentCoverage: {},
          hospitalCoverage: {},
          dataIntegrityIssues: ['code_tables table does not exist']
        };
      }

      // Check data by type
      const { data: dataCheck, error: dataError } = await supabase
        .from('code_tables')
        .select('table_type, country')
        .eq('is_active', true);

      if (dataError) {
        console.error('❌ Error checking data:', dataError);
        throw dataError;
      }

      const countries = dataCheck?.filter(item => item.table_type === 'countries') || [];
      const departments = dataCheck?.filter(item => item.table_type === 'departments') || [];
      const hospitals = dataCheck?.filter(item => item.table_type === 'hospitals') || [];
      const procedureTypes = dataCheck?.filter(item => item.table_type === 'procedure_types') || [];

      // Calculate coverage by country
      const departmentCoverage: { [country: string]: number } = {};
      const hospitalCoverage: { [country: string]: number } = {};

      departments.forEach(dept => {
        departmentCoverage[dept.country] = (departmentCoverage[dept.country] || 0) + 1;
      });

      hospitals.forEach(hosp => {
        hospitalCoverage[hosp.country] = (hospitalCoverage[hosp.country] || 0) + 1;
      });

      // Check for data integrity issues
      const dataIntegrityIssues: string[] = [];
      
      // Check for potential cross-country contamination
      const contaminationCheck = await DataValidationService.checkCrossCountryContamination();
      if (contaminationCheck.hasContamination) {
        dataIntegrityIssues.push(`Cross-country data contamination detected (${contaminationCheck.severity} severity)`);
      }

      const status: DatabaseHealthStatus = {
        tablesExist: true,
        hasCountries: countries.length > 0,
        hasDepartments: departments.length > 0,
        hasHospitals: hospitals.length > 0,
        hasProcedureTypes: procedureTypes.length > 0,
        departmentCoverage,
        hospitalCoverage,
        dataIntegrityIssues
      };

      console.log('✅ Database health check completed:', status);
      return status;

    } catch (error) {
      console.error('❌ Database health check failed:', error);
      throw error;
    }
  }

  /**
   * Validate specific country has required data
   */
  static async validateCountryData(country: string): Promise<DataValidationResult> {
    try {
      console.log(`🔍 Validating data for country: ${country}`);

      const { data, error } = await supabase
        .from('code_tables')
        .select('table_type, display_name')
        .eq('country', country)
        .eq('is_active', true);

      if (error) {
        console.error(`❌ Error validating ${country} data:`, error);
        throw error;
      }

      const departments = data?.filter(item => item.table_type === 'departments') || [];
      const hospitals = data?.filter(item => item.table_type === 'hospitals') || [];

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check minimum requirements
      if (departments.length === 0) {
        issues.push(`No departments found for ${country}`);
        recommendations.push(`Add departments for ${country} using Code Table Setup`);
      }

      if (hospitals.length === 0) {
        issues.push(`No hospitals found for ${country}`);
        recommendations.push(`Add hospitals for ${country} using Code Table Setup`);
      }

      if (departments.length < 3) {
        issues.push(`Only ${departments.length} departments found for ${country} (recommended: at least 3)`);
        recommendations.push(`Add more departments for better user assignment options`);
      }

      if (hospitals.length < 2) {
        issues.push(`Only ${hospitals.length} hospitals found for ${country} (recommended: at least 2)`);
        recommendations.push(`Add more hospitals for better case booking options`);
      }

      const result: DataValidationResult = {
        isValid: issues.length === 0,
        issues,
        recommendations
      };

      console.log(`✅ Country validation completed for ${country}:`, result);
      return result;

    } catch (error) {
      console.error(`❌ Country validation failed for ${country}:`, error);
      throw error;
    }
  }

  /**
   * Auto-fix empty database by populating essential data
   */
  static async autoFixEmptyDatabase(): Promise<boolean> {
    try {
      console.log('🔧 Auto-fixing empty database...');

      const healthStatus = await this.checkDatabaseHealth();

      if (!healthStatus.tablesExist) {
        console.error('❌ Cannot auto-fix: code_tables table does not exist');
        return false;
      }

      // Check if database is truly empty
      const isEmpty = !healthStatus.hasCountries && !healthStatus.hasDepartments && !healthStatus.hasHospitals;

      if (!isEmpty) {
        console.log('ℹ️ Database is not empty, skipping auto-fix');
        return true;
      }

      console.log('⚠️ Empty database detected, populating essential data...');

      // Populate essential countries
      const countries = [
        { code: 'SGP', name: 'Singapore' },
        { code: 'MYS', name: 'Malaysia' },
        { code: 'PHL', name: 'Philippines' }
      ];

      // Populate essential departments for each country
      const departments = ['Cardiology', 'Orthopedics', 'Emergency', 'Radiology'];

      // Populate essential hospitals for each country
      const hospitalsByCountry = {
        'Singapore': ['Singapore General Hospital', 'National University Hospital'],
        'Malaysia': ['Hospital Kuala Lumpur', 'University Malaya Medical Centre'],
        'Philippines': ['Philippine General Hospital', 'St. Luke\'s Medical Center']
      };

      // Insert countries
      for (const country of countries) {
        await supabase
          .from('code_tables')
          .upsert({
            table_type: 'countries',
            country: 'Global',
            code: country.code,
            display_name: country.name,
            is_active: true
          });
      }

      // Insert departments and hospitals
      for (const country of countries) {
        // Insert departments
        for (const dept of departments) {
          await supabase
            .from('code_tables')
            .upsert({
              table_type: 'departments',
              country: country.name,
              code: dept.toLowerCase().replace(/\s+/g, '_'),
              display_name: dept,
              is_active: true
            });
        }

        // Insert hospitals
        const hospitals = hospitalsByCountry[country.name as keyof typeof hospitalsByCountry] || [];
        for (const hospital of hospitals) {
          await supabase
            .from('code_tables')
            .upsert({
              table_type: 'hospitals',
              country: country.name,
              code: hospital.toLowerCase().replace(/\s+/g, '_'),
              display_name: hospital,
              is_active: true
            });
        }
      }

      console.log('✅ Auto-fix completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Auto-fix failed:', error);
      return false;
    }
  }

  /**
   * Validate user department assignments
   */
  static async validateUserAssignments(): Promise<DataValidationResult> {
    try {
      console.log('🔍 Validating user department assignments...');

      // Try to get users, but handle permission errors gracefully
      let users;
      try {
        const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
        
        if (userError) {
          console.warn('⚠️ Cannot fetch users (likely insufficient permissions):', userError.message);
          // Return a non-blocking result instead of throwing
          return {
            isValid: true,
            issues: [],
            recommendations: ['User validation skipped due to insufficient admin permissions']
          };
        }
        users = usersData;
      } catch (permissionError) {
        console.warn('⚠️ User validation skipped due to permission restrictions');
        return {
          isValid: true,
          issues: [],
          recommendations: ['User validation requires admin API access']
        };
      }

      // Get all existing departments
      const { data: departments, error: deptError } = await supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'departments')
        .eq('is_active', true);

      if (deptError) {
        console.error('❌ Error fetching departments:', deptError);
        throw deptError;
      }

      const existingDepartments = new Set(departments?.map(d => d.display_name) || []);
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check each user's assignments
      users.users.forEach(user => {
        const userDepartments = user.user_metadata?.departments || [];
        
        if (Array.isArray(userDepartments)) {
          userDepartments.forEach(assignedDept => {
            if (!existingDepartments.has(assignedDept)) {
              issues.push(`User ${user.email} assigned to non-existent department: ${assignedDept}`);
              recommendations.push(`Either create department "${assignedDept}" or update user assignments`);
            }
          });
        }
      });

      const result: DataValidationResult = {
        isValid: issues.length === 0,
        issues,
        recommendations
      };

      console.log('✅ User assignment validation completed:', result);
      return result;

    } catch (error) {
      console.error('❌ User assignment validation failed:', error);
      throw error;
    }
  }

  /**
   * Comprehensive validation of entire system
   */
  static async validateSystem(): Promise<{
    overall: DataValidationResult;
    byCountry: { [country: string]: DataValidationResult };
    userAssignments: DataValidationResult;
    healthStatus: DatabaseHealthStatus;
  }> {
    try {
      console.log('🔍 Starting comprehensive system validation...');

      const healthStatus = await this.checkDatabaseHealth();
      const userAssignments = await this.validateUserAssignments();

      // Get all countries to validate
      const { data: countries, error } = await supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'countries')
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      const byCountry: { [country: string]: DataValidationResult } = {};
      
      for (const country of countries || []) {
        byCountry[country.display_name] = await this.validateCountryData(country.display_name);
      }

      // Calculate overall result
      const allIssues: string[] = [];
      const allRecommendations: string[] = [];

      Object.values(byCountry).forEach(validation => {
        allIssues.push(...validation.issues);
        allRecommendations.push(...validation.recommendations);
      });

      allIssues.push(...userAssignments.issues);
      allRecommendations.push(...userAssignments.recommendations);

      const overall: DataValidationResult = {
        isValid: allIssues.length === 0,
        issues: allIssues,
        recommendations: allRecommendations
      };

      console.log('✅ Comprehensive system validation completed');
      
      return {
        overall,
        byCountry,
        userAssignments,
        healthStatus
      };

    } catch (error) {
      console.error('❌ System validation failed:', error);
      throw error;
    }
  }

  /**
   * CRITICAL: Check for cross-country data contamination
   * This prevents users from seeing data from other countries due to caching issues,
   * database inconsistencies, or programming errors
   */
  static async checkCrossCountryContamination(): Promise<CrossCountryContaminationCheck> {
    try {
      console.log('🔍 Checking for cross-country data contamination...');

      const contaminationDetails = {
        departments: [] as { country: string; contaminatedWith: string[] }[],
        hospitals: [] as { country: string; contaminatedWith: string[] }[],
        cases: [] as { country: string; contaminatedWith: string[] }[]
      };

      // 1. Check department contamination
      // Find departments that appear in multiple countries (except Global fallbacks)
      const { data: allDepartments, error: deptError } = await supabase
        .from('code_tables')
        .select('display_name, country')
        .eq('table_type', 'departments')
        .eq('is_active', true)
        .neq('country', 'Global'); // Exclude Global fallbacks

      if (deptError) {
        console.error('Error checking department contamination:', deptError);
        throw deptError;
      }

      // Group departments by name to find cross-country duplicates
      const deptsByName = new Map<string, string[]>();
      (allDepartments || []).forEach(dept => {
        if (!deptsByName.has(dept.display_name)) {
          deptsByName.set(dept.display_name, []);
        }
        deptsByName.get(dept.display_name)!.push(dept.country);
      });

      // Identify contamination
      deptsByName.forEach((countries, deptName) => {
        if (countries.length > 1) {
          countries.forEach(country => {
            const otherCountries = countries.filter(c => c !== country);
            const existingEntry = contaminationDetails.departments.find(d => d.country === country);
            if (existingEntry) {
              existingEntry.contaminatedWith.push(...otherCountries.map(c => `${deptName} (from ${c})`));
            } else {
              contaminationDetails.departments.push({
                country,
                contaminatedWith: otherCountries.map(c => `${deptName} (from ${c})`)
              });
            }
          });
        }
      });

      // 2. Check hospital contamination
      const { data: allHospitals, error: hospError } = await supabase
        .from('code_tables')
        .select('display_name, country')
        .eq('table_type', 'hospitals')
        .eq('is_active', true)
        .neq('country', 'Global');

      if (hospError) {
        console.error('Error checking hospital contamination:', hospError);
        throw hospError;
      }

      const hospsByName = new Map<string, string[]>();
      (allHospitals || []).forEach(hosp => {
        if (!hospsByName.has(hosp.display_name)) {
          hospsByName.set(hosp.display_name, []);
        }
        hospsByName.get(hosp.display_name)!.push(hosp.country);
      });

      hospsByName.forEach((countries, hospName) => {
        if (countries.length > 1) {
          countries.forEach(country => {
            const otherCountries = countries.filter(c => c !== country);
            const existingEntry = contaminationDetails.hospitals.find(h => h.country === country);
            if (existingEntry) {
              existingEntry.contaminatedWith.push(...otherCountries.map(c => `${hospName} (from ${c})`));
            } else {
              contaminationDetails.hospitals.push({
                country,
                contaminatedWith: otherCountries.map(c => `${hospName} (from ${c})`)
              });
            }
          });
        }
      });

      // 3. Check case booking contamination
      // Look for cases where department/hospital doesn't match the case's country
      const { data: casesWithDetails, error: casesError } = await supabase
        .from('case_bookings')
        .select('id, country, department, hospital_name')
        .limit(500); // Sample recent cases to avoid performance issues

      if (casesError) {
        console.error('Error checking case contamination:', casesError);
        throw casesError;
      }

      // Check each case for cross-country contamination
      for (const caseItem of casesWithDetails || []) {
        const contaminationIssues: string[] = [];

        // Check if department exists in the case's country
        const { data: deptCheck } = await supabase
          .from('code_tables')
          .select('display_name')
          .eq('table_type', 'departments')
          .eq('country', caseItem.country)
          .eq('display_name', caseItem.department)
          .eq('is_active', true);

        if (!deptCheck || deptCheck.length === 0) {
          // Check if department exists in other countries
          const { data: deptInOtherCountries } = await supabase
            .from('code_tables')
            .select('country')
            .eq('table_type', 'departments')
            .eq('display_name', caseItem.department)
            .eq('is_active', true)
            .neq('country', caseItem.country);

          if (deptInOtherCountries && deptInOtherCountries.length > 0) {
            contaminationIssues.push(`Department ${caseItem.department} from ${deptInOtherCountries.map(d => d.country).join(', ')}`);
          }
        }

        // Check if hospital exists in the case's country
        if (caseItem.hospital_name) {
          const { data: hospCheck } = await supabase
            .from('code_tables')
            .select('display_name')
            .eq('table_type', 'hospitals')
            .eq('country', caseItem.country)
            .eq('display_name', caseItem.hospital_name)
            .eq('is_active', true);

          if (!hospCheck || hospCheck.length === 0) {
            const { data: hospInOtherCountries } = await supabase
              .from('code_tables')
              .select('country')
              .eq('table_type', 'hospitals')
              .eq('display_name', caseItem.hospital_name)
              .eq('is_active', true)
              .neq('country', caseItem.country);

            if (hospInOtherCountries && hospInOtherCountries.length > 0) {
              contaminationIssues.push(`Hospital ${caseItem.hospital_name} from ${hospInOtherCountries.map(h => h.country).join(', ')}`);
            }
          }
        }

        if (contaminationIssues.length > 0) {
          const existingEntry = contaminationDetails.cases.find(c => c.country === caseItem.country);
          if (existingEntry) {
            existingEntry.contaminatedWith.push(...contaminationIssues);
          } else {
            contaminationDetails.cases.push({
              country: caseItem.country,
              contaminatedWith: contaminationIssues
            });
          }
        }
      }

      // Calculate severity
      const totalContamination = 
        contaminationDetails.departments.length +
        contaminationDetails.hospitals.length +
        contaminationDetails.cases.length;

      let severity: 'none' | 'low' | 'medium' | 'high' = 'none';
      if (totalContamination > 0) {
        if (contaminationDetails.cases.length > 0) {
          severity = 'high'; // Case contamination is critical
        } else if (totalContamination > 5) {
          severity = 'medium';
        } else {
          severity = 'low';
        }
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (totalContamination > 0) {
        recommendations.push('Review and clean up duplicate entries across countries');
        recommendations.push('Implement stricter validation in data entry forms');
        recommendations.push('Add country-specific data validation in the application');
        
        if (contaminationDetails.cases.length > 0) {
          recommendations.push('URGENT: Review case bookings for data integrity issues');
          recommendations.push('Consider implementing case data migration to fix contamination');
        }
      }

      const result: CrossCountryContaminationCheck = {
        hasContamination: totalContamination > 0,
        contaminationDetails,
        severity,
        recommendations
      };

      console.log('✅ Cross-country contamination check completed:', result);
      return result;

    } catch (error) {
      console.error('❌ Cross-country contamination check failed:', error);
      throw error;
    }
  }
}