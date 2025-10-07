/**
 * Constants Service - Centralized constants management
 * Provides access to dynamic constants from Supabase
 */

import { supabase } from '../lib/supabase';

// interface ConstantsResponse {
//   hospitals: string[];
//   departments: string[];
//   procedureTypes: string[];
//   surgerySets: string[];
//   implantBoxes: string[];
// }

class ConstantsService {
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private isExpired(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return !expiry || Date.now() > expiry;
  }

  private setCache(key: string, value: any): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  async getHospitals(country: string): Promise<string[]> {
    const cacheKey = `hospitals_${country}`;

    if (!this.isExpired(cacheKey)) {
      return this.cache.get(cacheKey) || [];
    }

    try {
      const { data, error } = await supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'hospitals')
        .eq('country', country)
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;

      const hospitals = data?.map(item => item.display_name) || [];
      this.setCache(cacheKey, hospitals);
      return hospitals;
    } catch (error) {
      return this.cache.get(cacheKey) || [];
    }
  }

  async getDepartments(country: string): Promise<string[]> {
    const cacheKey = `departments_${country}`;

    if (!this.isExpired(cacheKey)) {
      return this.cache.get(cacheKey) || [];
    }

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('name')
        .eq('country', country)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const departments = data?.map(item => item.name) || [];
      this.setCache(cacheKey, departments);
      return departments;
    } catch (error) {
      return this.cache.get(cacheKey) || [];
    }
  }

  async getCountries(): Promise<string[]> {
    const cacheKey = 'countries_all';

    if (!this.isExpired(cacheKey)) {
      return this.cache.get(cacheKey) || [];
    }

    try {
      const { data, error } = await supabase
        .from('code_tables')
        .select('display_name')
        .eq('table_type', 'countries')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;

      const countries = data?.map(item => item.display_name) || ['Singapore', 'Malaysia'];
      this.setCache(cacheKey, countries);
      return countries;
    } catch (error) {
      return ['Singapore', 'Malaysia']; // Fallback
    }
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

// Export individual functions for backward compatibility
const service = new ConstantsService();

export const getDepartments = (country: string) => service.getDepartments(country);
export const getHospitals = (country: string) => service.getHospitals(country);
export const getCountries = () => service.getCountries();
export const clearCache = () => service.clearCache();

export default service;