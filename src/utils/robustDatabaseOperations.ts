/**
 * ROBUST DATABASE OPERATIONS UTILITY
 * 
 * Provides enhanced database operation wrappers to prevent common issues:
 * 1. .single() operations returning null after successful updates
 * 2. Race conditions in database operations
 * 3. Inconsistent error handling
 * 
 * USE THIS FOR ALL CRITICAL DATABASE OPERATIONS
 */

import { supabase } from '../lib/supabase';
import { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';

// Enhanced error types
export interface DatabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
  originalError?: PostgrestError;
}

// Configuration for robust operations
export interface RobustOperationConfig {
  maxRetries?: number;
  retryDelay?: number;
  failureMode?: 'throw' | 'return-null' | 'return-default';
  defaultValue?: any;
  logErrors?: boolean;
}

// Default configuration
const DEFAULT_CONFIG: RobustOperationConfig = {
  maxRetries: 3,
  retryDelay: 100,
  failureMode: 'throw',
  logErrors: true
};

/**
 * Enhanced .single() operation with retry logic and null prevention
 */
export async function robustSingle<T>(
  query: any,
  config: RobustOperationConfig = {}
): Promise<T | null> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: DatabaseError | null = null;

  for (let attempt = 1; attempt <= (finalConfig.maxRetries || 1); attempt++) {
    try {
      // Add small delay between retries (except first attempt)
      if (attempt > 1 && finalConfig.retryDelay) {
        await new Promise(resolve => setTimeout(resolve, (finalConfig.retryDelay || 100) * attempt));
      }

      const response: PostgrestSingleResponse<T> = await query.single();
      
      if (response.error) {
        // Handle known error codes
        if (response.error.code === 'PGRST116') {
          // No data found - this is expected behavior
          return null;
        }
        
        throw {
          ...new Error(response.error.message),
          code: response.error.code,
          details: response.error.details,
          hint: response.error.hint,
          originalError: response.error
        } as DatabaseError;
      }

      if (response.data === null && attempt < (finalConfig.maxRetries || 1)) {
        // Data is null but no error - retry (could be race condition)
        if (finalConfig.logErrors) {
          console.warn(`🔄 ROBUST SINGLE - Null data on attempt ${attempt}, retrying...`);
        }
        continue;
      }

      return response.data;
    } catch (error) {
      lastError = error as DatabaseError;
      
      if (finalConfig.logErrors) {
        console.error(`❌ ROBUST SINGLE - Attempt ${attempt} failed:`, error);
      }

      // If this is the last attempt, handle failure mode
      if (attempt === finalConfig.maxRetries) {
        break;
      }
    }
  }

  // Handle failure modes
  switch (finalConfig.failureMode) {
    case 'return-null':
      return null;
    case 'return-default':
      return finalConfig.defaultValue || null;
    case 'throw':
    default:
      throw lastError || new Error('Database operation failed after retries');
  }
}

/**
 * Enhanced upsert operation with conflict resolution
 */
export async function robustUpsert<T>(
  table: string,
  data: any,
  conflictColumns: string | string[],
  config: RobustOperationConfig = {}
): Promise<T[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  try {
    const { data: result, error } = await supabase
      .from(table)
      .upsert(data, {
        onConflict: Array.isArray(conflictColumns) ? conflictColumns.join(',') : conflictColumns,
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      throw {
        ...new Error(error.message),
        code: error.code,
        details: error.details,
        hint: error.hint,
        originalError: error
      } as DatabaseError;
    }

    return result || [];
  } catch (error) {
    if (finalConfig.logErrors) {
      console.error('❌ ROBUST UPSERT - Operation failed:', error);
    }
    
    if (finalConfig.failureMode === 'return-null') {
      return [];
    }
    throw error;
  }
}

/**
 * Enhanced update operation with verification
 */
export async function robustUpdateWithVerification<T>(
  table: string,
  updateData: any,
  whereClause: any,
  config: RobustOperationConfig = {}
): Promise<T | null> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  try {
    // Perform update
    const { error: updateError } = await supabase
      .from(table)
      .update(updateData)
      .match(whereClause);

    if (updateError) {
      throw {
        ...new Error(updateError.message),
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
        originalError: updateError
      } as DatabaseError;
    }

    // Add delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, finalConfig.retryDelay || 100));

    // Verify update by fetching
    return await robustSingle<T>(
      supabase.from(table).select('*').match(whereClause),
      { ...config, failureMode: 'return-null' }
    );
  } catch (error) {
    if (finalConfig.logErrors) {
      console.error('❌ ROBUST UPDATE - Operation failed:', error);
    }
    throw error;
  }
}

/**
 * Enhanced transaction-like operation with rollback capability
 */
export async function robustTransaction<T>(
  operations: Array<() => Promise<any>>,
  rollbackOperations: Array<() => Promise<any>> = [],
  config: RobustOperationConfig = {}
): Promise<T[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const results: any[] = [];
  
  try {
    for (const operation of operations) {
      const result = await operation();
      results.push(result);
    }
    return results;
  } catch (error) {
    if (finalConfig.logErrors) {
      console.error('❌ ROBUST TRANSACTION - Operation failed, attempting rollback:', error);
    }
    
    // Attempt rollback operations in reverse order
    for (let i = rollbackOperations.length - 1; i >= 0; i--) {
      try {
        await rollbackOperations[i]();
      } catch (rollbackError) {
        if (finalConfig.logErrors) {
          console.error('❌ ROBUST TRANSACTION - Rollback operation failed:', rollbackError);
        }
      }
    }
    
    throw error;
  }
}

/**
 * Data consistency validator
 */
export async function validateDataConsistency<T>(
  table: string,
  uniqueFields: string[],
  config: RobustOperationConfig = {}
): Promise<{ isConsistent: boolean; duplicates: any[] }> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  try {
    const fieldsList = uniqueFields.join(', ');
    const groupByClause = uniqueFields.join(', ');
    
    // This would need to be implemented as a stored procedure or complex query
    // For now, we'll do a simplified check
    const { data, error } = await supabase
      .from(table)
      .select(fieldsList);

    if (error) {
      throw error;
    }

    // Group by unique fields and find duplicates
    const groupedData = new Map();
    const duplicates: any[] = [];

    data?.forEach(row => {
      const key = uniqueFields.map(field => (row as any)[field]).join('|');
      if (groupedData.has(key)) {
        duplicates.push(row);
      } else {
        groupedData.set(key, row);
      }
    });

    return {
      isConsistent: duplicates.length === 0,
      duplicates
    };
  } catch (error) {
    if (finalConfig.logErrors) {
      console.error('❌ DATA CONSISTENCY - Validation failed:', error);
    }
    throw error;
  }
}

// Export utility functions for common patterns
export const DatabaseUtils = {
  robustSingle,
  robustUpsert,
  robustUpdateWithVerification,
  robustTransaction,
  validateDataConsistency,
  
  // Common error code handlers
  isNotFoundError: (error: any) => error?.code === 'PGRST116',
  isConflictError: (error: any) => error?.code === '23505' || error?.message?.includes('409'),
  isDuplicateError: (error: any) => error?.code === '23505',
  isConstraintError: (error: any) => error?.code === '23514',
  
  // Common retry configurations
  RETRY_CONFIGS: {
    CRITICAL: { maxRetries: 5, retryDelay: 200, logErrors: true },
    STANDARD: { maxRetries: 3, retryDelay: 100, logErrors: true },
    FAST: { maxRetries: 2, retryDelay: 50, logErrors: false }
  }
};