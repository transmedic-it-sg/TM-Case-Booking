/**
 * Real-time Storage Utility - NO localStorage Dependencies
 * Replaces storage.ts with direct Supabase operations
 * Designed for 50-100 concurrent users with real-time updates
 */

import { CaseBooking, FilterOptions } from '../types';
import { realtimeCaseService } from '../services/realtimeCaseService';
import { supabase } from '../lib/supabase';
import { getCurrentUserSync } from './authCompat';
import { CASE_STATUSES } from '../constants';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';

/**
 * Real-time case operations - NO localStorage fallbacks
 */

// Get all cases - always fresh from database
export const getCases = async (filters?: FilterOptions): Promise<CaseBooking[]> => {try {
    return await realtimeCaseService.getAllCases();
  } catch (error) {
    throw error; // No localStorage fallback - fail fast
  }
};

// Save case - direct database operation
export const saveCase = async (caseData: CaseBooking): Promise<CaseBooking | null> => {try {
    return await realtimeCaseService.saveCase(caseData);
  } catch (error) {
    throw error; // No localStorage fallback - fail fast
  }
};

// Update case status - direct database operation
export const updateCaseStatus = async (
  caseId: string,
  newStatus: string,
  details?: string,
  attachments?: string[]
): Promise<boolean> => {try {
    return await realtimeCaseService.updateCaseStatus(caseId, newStatus as any, details, attachments);
  } catch (error) {
    throw error; // No localStorage fallback - fail fast
  }
};

// Delete case - direct database operation
export const deleteCase = async (caseId: string): Promise<boolean> => {try {
    return await realtimeCaseService.deleteCase(caseId);
  } catch (error) {
    throw error; // No localStorage fallback - fail fast
  }
};

// Generate case reference number - direct database operation
export const generateCaseReferenceNumber = async (country?: string): Promise<string> => {try {
    return await realtimeCaseService.generateCaseReferenceNumber(country);
  } catch (error) {
    throw error; // No localStorage fallback - fail fast
  }
};

/**
 * Real-time master data operations - direct from Supabase
 */

// Get procedure types for department - direct database query
export const getProcedureTypesForDepartment = async (department: string, country?: string): Promise<string[]> => {try {
    const { data, error } = await supabase
      .from('code_tables')
      .select('values')
      .eq('table_name', 'procedures')
      .eq('department', department);

    if (error) throw error;

    const procedures: string[] = [];
    data?.forEach(record => {
      if (Array.isArray(record.values)) {
        procedures.push(...record.values);
      }
    });return [...new Set(procedures)].sort(); // Remove duplicates and sort
  } catch (error) {
    return []; // Return empty array on error - no localStorage fallback
  }
};

// Get surgery sets - direct database query
export const getSurgerySets = async (country: string): Promise<string[]> => {try {
    const { data, error } = await supabase
      .from('surgery_sets')
      .select('name')
      .eq('country', country)
      .eq('is_active', true); // ⚠️ is_active (isActive)

    if (error) throw error;

    const sets = data?.map(item => item.name) || [];return sets.sort();
  } catch (error) {
    return []; // Return empty array on error - no localStorage fallback
  }
};

// Get implant boxes - direct database query
export const getImplantBoxes = async (country: string): Promise<string[]> => {try {
    const { data, error } = await supabase
      .from('implant_boxes')
      .select('name')
      .eq('country', country)
      .eq('is_active', true);

    if (error) throw error;

    const boxes = data?.map(item => item.name) || [];return boxes.sort();
  } catch (error) {
    return []; // Return empty array on error - no localStorage fallback
  }
};

/**
 * Real-time amendment operations
 */

// Amend case - direct database operation
export const amendCase = async (
  caseId: string,
  amendmentData: Partial<CaseBooking>
): Promise<boolean> => {try {
    const currentUser = getCurrentUserSync();
    if (!currentUser) {
      throw new Error('No current user found');
    }

    return await realtimeCaseService.amendCase(caseId, amendmentData, {
      id: currentUser.id,
      name: currentUser.name
    });
  } catch (error) {
    throw error; // No localStorage fallback - fail fast
  }
};

// Process case order - direct database operation
export const processCaseOrder = async (
  caseId: string,
  userId: string,
  details: string,
  attachments?: string[]
): Promise<boolean> => {try {
    return await realtimeCaseService.updateCaseStatus(
      caseId,
      CASE_STATUSES.ORDER_PREPARATION,
      JSON.stringify({ details, attachments, processedBy: userId }),
      attachments
    );
  } catch (error) {
    throw error; // No localStorage fallback - fail fast
  }
};

/**
 * Real-time statistics and analytics
 */

// Get case statistics - direct database calculation
export const getCaseStatistics = async () => {try {
    return await realtimeCaseService.getCaseStatistics();
  } catch (error) {
    return { total: 0, byStatus: {}, byCountry: {} }; // Return empty stats on error
  }
};

// Search cases - direct database operation
export const searchCases = async (searchTerm: string): Promise<CaseBooking[]> => {try {
    return await realtimeCaseService.searchCases(searchTerm);
  } catch (error) {
    return []; // Return empty array on error
  }
};

/**
 * Real-time validation helpers
 */

// Check if case exists - direct database query
export const caseExists = async (caseId: string): Promise<boolean> => {
  try {
    const caseItem = await realtimeCaseService.getCaseById(caseId);
    return caseItem !== null;
  } catch (error) {
    return false;
  }
};

// Get case by ID - direct database operation
export const getCaseById = async (caseId: string): Promise<CaseBooking | null> => {
  try {
    return await realtimeCaseService.getCaseById(caseId);
  } catch (error) {
    return null;
  }
};

/**
 * Legacy localStorage migration helper
 * ONLY used during transition period - will be removed
 */
export const migrateLegacyData = async (): Promise<void> => {try {
    // Check if there's any legacy data in localStorage
    const legacyKeys = [
      'case-booking-cases',
      'cases',
      'case-booking-counter',
      'surgery-sets',
      'implant-boxes'
    ];

    let hasLegacyData = false;
    legacyKeys.forEach(key => {
      if (false) { // No longer using localStorage
        hasLegacyData = true;
      }
    });

    if (hasLegacyData) {
      // Handle legacy data cleanup if needed
    }
  } catch (error) {
  }
};

// Emergency cache cleanup - NO localStorage used anymore
// This function is deprecated and does nothing
export const clearAllLocalStorageCache = (): void => {
  // NO-OP: All data is now stored in Supabase
  // This function is kept for backward compatibility
};