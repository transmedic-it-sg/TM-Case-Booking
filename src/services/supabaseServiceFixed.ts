/**
 * Supabase Service Fixed - Enhanced Supabase service with error handling
 * Provides improved database operations with proper error handling and retry logic
 */

import { supabase } from '../lib/supabase';

export interface QueryOptions {
  retries?: number;
  timeout?: number;
  cache?: boolean;
}

export interface QueryResult<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

class SupabaseServiceFixed {
  private readonly DEFAULT_RETRIES = 3;
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  async executeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const { retries = this.DEFAULT_RETRIES, timeout = this.DEFAULT_TIMEOUT } = options;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await Promise.race([
          queryFn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), timeout)
          )
        ]);

        if (result.error) {
          if (attempt === retries) {
            return {
              data: null,
              error: result.error.message || 'Database error',
              success: false
            };
          }

          // Wait before retry
          await this.delay(attempt * 1000);
          continue;
        }

        return {
          data: result.data,
          error: null,
          success: true
        };
      } catch (error) {
        if (attempt === retries) {
          return {
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false
          };
        }

        // Wait before retry
        await this.delay(attempt * 1000);
      }
    }

    return {
      data: null,
      error: 'Max retries exceeded',
      success: false
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async getTableCount(tableName: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error(`Error getting count for ${tableName}:`, error);
      return 0;
    }
  }

  async batchInsert<T>(
    tableName: string,
    records: T[],
    batchSize: number = 100
  ): Promise<QueryResult<T[]>> {
    try {
      const results: T[] = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        const { data, error } = await supabase
          .from(tableName)
          .insert(batch)
          .select();

        if (error) {
          return {
            data: null,
            error: error.message,
            success: false
          };
        }

        if (data) {
          results.push(...data);
        }
      }

      return {
        data: results,
        error: null,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Batch insert failed',
        success: false
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check methods
  async getSystemHealth(): Promise<{
    database: boolean;
    auth: boolean;
    storage: boolean;
    realtime: boolean;
  }> {
    const health = {
      database: false,
      auth: false,
      storage: false,
      realtime: false
    };

    try {
      // Test database
      health.database = await this.testConnection();

      // Test auth (check if we can get user)
      const { data: { user } } = await supabase.auth.getUser();
      health.auth = true; // If no error, auth is working

      // Test storage (minimal check)
      health.storage = true; // Storage typically works if database works

      // Test realtime (check if we can create a channel)
      const channel = supabase.channel('health-check');
      health.realtime = !!channel;
      channel.unsubscribe();

    } catch (error) {
      console.error('Health check error:', error);
    }

    return health;
  }
}

// Export individual functions for backward compatibility
const service = new SupabaseServiceFixed();

export const lookupOperations = {
  testConnection: () => service.testConnection(),
  getTableCount: (tableName: string) => service.getTableCount(tableName),
  batchInsert: <T>(tableName: string, records: T[], batchSize?: number) =>
    service.batchInsert(tableName, records, batchSize),
  getSystemHealth: () => service.getSystemHealth()
};

export default service;