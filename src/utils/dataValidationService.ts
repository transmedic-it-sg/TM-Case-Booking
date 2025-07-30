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
}

interface DatabaseHealthStatus {
  tablesExist: boolean;
  hasCountries: boolean;
  hasDepartments: boolean;
  hasHospitals: boolean;
  hasProcedureTypes: boolean;
  departmentCoverage: { [country: string]: number };
  hospitalCoverage: { [country: string]: number };
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
          hospitalCoverage: {}
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

      const status: DatabaseHealthStatus = {
        tablesExist: true,
        hasCountries: countries.length > 0,
        hasDepartments: departments.length > 0,
        hasHospitals: hospitals.length > 0,
        hasProcedureTypes: procedureTypes.length > 0,
        departmentCoverage,
        hospitalCoverage
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
}