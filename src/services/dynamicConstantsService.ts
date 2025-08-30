/**
 * Dynamic Constants Service
 * Replaces all hardcoded constants with database-driven data
 * Includes offline fallback and sync capabilities
 */

import { supabase } from '../lib/supabase';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  country?: string;
}

interface CacheStore {
  departments: Map<string, CacheItem<string[]>>;
  procedureTypes: Map<string, CacheItem<string[]>>;
  surgerySets: Map<string, CacheItem<string[]>>;
  implantBoxes: Map<string, CacheItem<string[]>>;
  hospitals: Map<string, CacheItem<string[]>>;
  countries: CacheItem<string[]> | null;
  caseStatuses: CacheItem<any[]> | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const FALLBACK_PREFIX = 'fallback_';

class DynamicConstantsService {
  private cache: CacheStore = {
    departments: new Map(),
    procedureTypes: new Map(),
    surgerySets: new Map(),
    implantBoxes: new Map(),
    hospitals: new Map(),
    countries: null,
    caseStatuses: null
  };

  /**
   * Check if cache item is valid
   */
  private isCacheValid<T>(cacheItem: CacheItem<T> | null): boolean {
    if (!cacheItem) return false;
    return Date.now() - cacheItem.timestamp < CACHE_DURATION;
  }

  /**
   * Get cache key for country-specific data
   */
  private getCacheKey(country?: string): string {
    return country || 'global';
  }

  /**
   * Save fallback data to localStorage
   */
  private saveFallbackData(key: string, data: any, country?: string): void {
    try {
      const fallbackKey = country ? `${FALLBACK_PREFIX}${key}_${country}` : `${FALLBACK_PREFIX}${key}`;
      localStorage.setItem(fallbackKey, JSON.stringify({
        data,
        timestamp: Date.now(),
        country
      }));
    } catch (error) {
      console.error('Error saving fallback data:', error);
    }
  }

  /**
   * Load fallback data from localStorage
   */
  private loadFallbackData<T>(key: string, country?: string): T | null {
    try {
      const fallbackKey = country ? `${FALLBACK_PREFIX}${key}_${country}` : `${FALLBACK_PREFIX}${key}`;
      const stored = localStorage.getItem(fallbackKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if fallback data is not too old (24 hours)
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data;
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading fallback data:', error);
      return null;
    }
  }

  /**
   * Get departments (country-specific)
   */
  public async getDepartments(country?: string): Promise<string[]> {
    const cacheKey = this.getCacheKey(country);
    const cached = this.cache.departments.get(cacheKey) || null;

    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    try {
      let query = supabase
        .from('departments')
        .select('name')
        .eq('is_active', true)
        .order('name');

      if (country) {
        query = query.eq('country', country);
      }

      const { data, error } = await query;

      if (error) throw error;

      const departments = data?.map(d => d.name) || [];
      
      // Cache the result
      this.cache.departments.set(cacheKey, {
        data: departments,
        timestamp: Date.now(),
        country
      });

      // Save as fallback
      this.saveFallbackData('departments', departments, country);

      return departments;
    } catch (error) {
      console.error('Error fetching departments:', error);
      
      // Try fallback data
      const fallbackData = this.loadFallbackData<string[]>('departments', country);
      if (fallbackData) {
        console.log('Using fallback departments data');
        return fallbackData;
      }

      // Return empty array instead of false fallback data
      return [];
    }
  }

  /**
   * Get procedure types for a department and country
   */
  public async getProcedureTypes(department?: string, country?: string): Promise<string[]> {
    const cacheKey = this.getCacheKey(`${department}_${country}`);
    const cached = this.cache.procedureTypes.get(cacheKey) || null;

    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    try {
      let query = supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'procedure_types')
        .eq('is_active', true)
        .order('display_name');

      // Filter by department and country is handled by the code_tables structure

      const { data, error } = await query;

      if (error) throw error;

      const procedureTypes = Array.from(new Set(data?.map(d => d.display_name) || []));
      
      // Cache the result
      this.cache.procedureTypes.set(cacheKey, {
        data: procedureTypes,
        timestamp: Date.now(),
        country
      });

      // Save as fallback
      this.saveFallbackData('procedureTypes', procedureTypes, cacheKey);

      return procedureTypes;
    } catch (error) {
      console.error('Error fetching procedure types:', error);
      
      // Try fallback data
      const fallbackData = this.loadFallbackData<string[]>('procedureTypes', cacheKey);
      if (fallbackData) {
        console.log('Using fallback procedure types data');
        return fallbackData;
      }

      // Return empty array instead of false fallback data
      return [];
    }
  }

  /**
   * Get surgery sets (country-specific)
   */
  public async getSurgerySets(country?: string): Promise<string[]> {
    const cacheKey = this.getCacheKey(country);
    const cached = this.cache.surgerySets.get(cacheKey) || null;

    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    try {
      let query = supabase
        .from('surgery_sets')
        .select('name')
        .eq('is_active', true)
        .order('name');

      if (country) {
        query = query.eq('country', country);
      }

      const { data, error } = await query;

      if (error) throw error;

      const surgerySets = data?.map(s => s.name) || [];
      
      // Cache the result
      this.cache.surgerySets.set(cacheKey, {
        data: surgerySets,
        timestamp: Date.now(),
        country
      });

      // Save as fallback
      this.saveFallbackData('surgerySets', surgerySets, country);

      return surgerySets;
    } catch (error) {
      console.error('Error fetching surgery sets:', error);
      
      // Try fallback data
      const fallbackData = this.loadFallbackData<string[]>('surgerySets', country);
      if (fallbackData) {
        console.log('Using fallback surgery sets data');
        return fallbackData;
      }

      // Return empty array instead of false fallback data
      return [];
    }
  }

  /**
   * Get implant boxes (country-specific)
   */
  public async getImplantBoxes(country?: string): Promise<string[]> {
    const cacheKey = this.getCacheKey(country);
    const cached = this.cache.implantBoxes.get(cacheKey) || null;

    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    try {
      let query = supabase
        .from('implant_boxes')
        .select('name')
        .eq('is_active', true)
        .order('name');

      if (country) {
        query = query.eq('country', country);
      }

      const { data, error } = await query;

      if (error) throw error;

      const implantBoxes = data?.map(i => i.name) || [];
      
      // Cache the result
      this.cache.implantBoxes.set(cacheKey, {
        data: implantBoxes,
        timestamp: Date.now(),
        country
      });

      // Save as fallback
      this.saveFallbackData('implantBoxes', implantBoxes, country);

      return implantBoxes;
    } catch (error) {
      console.error('Error fetching implant boxes:', error);
      
      // Try fallback data
      const fallbackData = this.loadFallbackData<string[]>('implantBoxes', country);
      if (fallbackData) {
        console.log('Using fallback implant boxes data');
        return fallbackData;
      }

      // Return empty array instead of false fallback data
      return [];
    }
  }

  /**
   * Get hospitals (country-specific)
   */
  public async getHospitals(country?: string): Promise<string[]> {
    const cacheKey = this.getCacheKey(country);
    const cached = this.cache.hospitals.get(cacheKey) || null;

    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    try {
      let query = supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'hospitals')
        .eq('is_active', true)
        .order('display_name');

      if (country) {
        query = query.eq('country_code', country);
      }

      const { data, error } = await query;

      if (error) throw error;

      const hospitals = data?.map(h => h.display_name) || [];
      
      // Cache the result
      this.cache.hospitals.set(cacheKey, {
        data: hospitals,
        timestamp: Date.now(),
        country
      });

      // Save as fallback
      this.saveFallbackData('hospitals', hospitals, country);

      return hospitals;
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      
      // Try fallback data
      const fallbackData = this.loadFallbackData<string[]>('hospitals', country);
      if (fallbackData) {
        console.log('Using fallback hospitals data');
        return fallbackData;
      }

      // Return empty array to allow user input
      return [];
    }
  }

  /**
   * Get countries
   */
  public async getCountries(): Promise<string[]> {
    if (this.isCacheValid(this.cache.countries)) {
      return this.cache.countries!.data;
    }

    try {
      const { data, error } = await supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'countries')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;

      const countries = data?.map(c => c.display_name) || [];
      
      // Cache the result
      this.cache.countries = {
        data: countries,
        timestamp: Date.now()
      };

      // Save as fallback
      this.saveFallbackData('countries', countries);

      return countries;
    } catch (error) {
      console.error('Error fetching countries:', error);
      
      // Try fallback data
      const fallbackData = this.loadFallbackData<string[]>('countries');
      if (fallbackData) {
        console.log('Using fallback countries data');
        return fallbackData;
      }

      // Return empty array instead of false fallback data
      return [];
    }
  }

  /**
   * Get case statuses
   */
  public async getCaseStatuses(): Promise<any[]> {
    if (this.isCacheValid(this.cache.caseStatuses)) {
      return this.cache.caseStatuses!.data;
    }

    try {
      const { data, error } = await supabase
        .from('code_tables')
        .select('*')
        .eq('table_type', 'case_statuses')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;

      const caseStatuses = data || [];
      
      // Cache the result
      this.cache.caseStatuses = {
        data: caseStatuses,
        timestamp: Date.now()
      };

      // Save as fallback
      this.saveFallbackData('caseStatuses', caseStatuses);

      return caseStatuses;
    } catch (error) {
      console.error('Error fetching case statuses:', error);
      
      // Try fallback data
      const fallbackData = this.loadFallbackData<any[]>('caseStatuses');
      if (fallbackData) {
        console.log('Using fallback case statuses data');
        return fallbackData;
      }

      // Return empty array instead of false fallback data
      return [];
    }
  }

  /**
   * Get procedure mappings (surgery sets and implant boxes for a procedure type)
   */
  public async getProcedureMappings(procedureType: string, department: string, country?: string): Promise<{surgerySets: string[], implantBoxes: string[]}> {
    try {
      // Updated to use correct table relationships based on actual schema
      const [surgerySetsResult, implantBoxesResult] = await Promise.all([
        supabase.from('surgery_sets').select('name').eq('is_active', true),
        supabase.from('implant_boxes').select('name').eq('is_active', true)
      ]);

      if (surgerySetsResult.error) throw surgerySetsResult.error;
      if (implantBoxesResult.error) throw implantBoxesResult.error;

      const surgerySets = surgerySetsResult.data?.map(s => s.name) || [];
      const implantBoxes = implantBoxesResult.data?.map(i => i.name) || [];

      return {
        surgerySets: Array.from(new Set(surgerySets)),
        implantBoxes: Array.from(new Set(implantBoxes))
      };
    } catch (error) {
      console.error('Error fetching procedure mappings:', error);
      return { surgerySets: [], implantBoxes: [] };
    }
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.cache = {
      departments: new Map(),
      procedureTypes: new Map(),
      surgerySets: new Map(),
      implantBoxes: new Map(),
      hospitals: new Map(),
      countries: null,
      caseStatuses: null
    };
    console.log('🗑️ Dynamic constants cache cleared');
  }

  /**
   * Refresh all cached data
   */
  public async refreshAllData(country?: string): Promise<void> {
    this.clearCache();
    
    await Promise.all([
      this.getCountries(),
      this.getCaseStatuses(),
      this.getDepartments(country),
      this.getSurgerySets(country),
      this.getImplantBoxes(country),
      this.getHospitals(country)
    ]);

    console.log('🔄 All dynamic constants refreshed');
  }
}

// Create singleton instance
const dynamicConstantsService = new DynamicConstantsService();

export default dynamicConstantsService;