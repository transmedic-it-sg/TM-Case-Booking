/**
 * Dynamic Constants Service - Real-time constants management
 * Provides dynamic access to constants with real-time updates
 */

import { supabase } from '../lib/supabase';

interface DynamicConstant {
  key: string;
  value: any;
  country?: string;
  enabled: boolean;
}

class DynamicConstantsService {
  private cache: Map<string, DynamicConstant> = new Map();
  private subscribers: Map<string, ((value: any) => void)[]> = new Map();

  async getDynamicConstant(key: string, country?: string): Promise<any> {
    const cacheKey = country ? `${key}_${country}` : key;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached.value;
    }

    try {
      let query = supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', key)
        .single();

      const { data, error } = await query;

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      const value = data?.setting_value || null;

      // Cache the result
      this.cache.set(cacheKey, {
        key,
        value,
        country,
        enabled: true
      });

      return value;
    } catch (error) {
      // // // console.error(`Error fetching dynamic constant ${key}:`, error);
      return null;
    }
  }

  async setDynamicConstant(key: string, value: any, country?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: key,
          setting_value: value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });

      if (error) throw error;

      // Update cache
      const cacheKey = country ? `${key}_${country}` : key;
      this.cache.set(cacheKey, {
        key,
        value,
        country,
        enabled: true
      });

      // Notify subscribers
      this.notifySubscribers(key, value);

      return true;
    } catch (error) {
      // // // console.error(`Error setting dynamic constant ${key}:`, error);
      return false;
    }
  }

  subscribe(key: string, callback: (value: any) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }

    this.subscribers.get(key)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private notifySubscribers(key: string, value: any): void {
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => callback(value));
    }
  }

  async getCountries(): Promise<string[]> {
    try {
      const countries = await this.getDynamicConstant('available_countries');
      return countries || ['Singapore', 'Malaysia'];
    } catch (error) {
      // // // console.error('Error fetching countries:', error);
      return ['Singapore', 'Malaysia'];
    }
  }

  async getCaseStatuses(): Promise<string[]> {
    try {
      const statuses = await this.getDynamicConstant('case_statuses');
      return statuses || [
        'Case Booked',
        'Order Preparation',
        'Order Prepared',
        'Pending Delivery (Hospital)',
        'Delivered (Hospital)',
        'Case Completed',
        'Pending Delivery (Office)',
        'Delivered (Office)',
        'To be billed',
        'Case Closed',
        'Case Cancelled'
      ];
    } catch (error) {
      // // // console.error('Error fetching case statuses:', error);
      return ['Case Booked', 'Order Preparation', 'Order Prepared', 'Case Completed', 'Case Closed'];
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

const dynamicConstantsService = new DynamicConstantsService();
export default dynamicConstantsService;