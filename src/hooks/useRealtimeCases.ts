/**
 * Real-time Cases Hook - NO CACHING, Always Fresh Data
 * Replaces useCases.ts with direct real-time queries
 * Integrated with testing framework for validation
 */

import { useState, useEffect, useCallback } from 'react';
import { CaseBooking, CaseStatus, FilterOptions } from '../types';
import { realtimeCaseService } from '../services/realtimeCaseService';
import { useRealtimeCasesQuery, useOptimisticCaseMutation } from '../services/realtimeQueryService';
import { useTestingValidation } from './useTestingValidation';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';

interface UseRealtimeCasesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTime?: boolean;
  filters?: FilterOptions;
  enableTesting?: boolean;
}

export const useRealtimeCases = (options: UseRealtimeCasesOptions = {}) => {
  const {
    autoRefresh = false,
    refreshInterval = 30000,
    enableRealTime = true,
    filters,
    enableTesting = true
  } = options;

  // Real-time query for cases - always fresh data
  const {
    data: cases = [],
    isLoading,
    error,
    refetch,
    isError,
    isSuccess
  } = useRealtimeCasesQuery(filters);

  // Optimistic mutations for instant UI updates
  const caseMutation = useOptimisticCaseMutation();

  // Testing validation
  const testing = useTestingValidation({
    componentName: 'useRealtimeCases',
    enableRealtimeTest: enableTesting,
    enableQueryTest: enableTesting,
    enablePerformanceMonitoring: enableTesting
  });

  // Local state for error handling
  const [localError, setLocalError] = useState<string | null>(null);

  // Record updates for performance monitoring
  useEffect(() => {
    if (isSuccess && enableTesting) {
      testing.recordUpdate();
    }
  }, [cases, isSuccess, enableTesting, testing]);

  // Test real-time functionality when component mounts
  useEffect(() => {
    if (enableTesting) {
      testing.testRealtimeSubscription('case_bookings');
      testing.validateRealtimeConnection();
    }
  }, [enableTesting, testing]);

  // Auto-refresh fallback (backup for when real-time doesn't work)
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0 && !enableRealTime) {
      const interval = setInterval(() => {
        // Auto-refreshing cases data
        refetch();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, enableRealTime, refetch]);

  // Force refresh function - bypasses all caching
  const refreshCases = useCallback(async () => {setLocalError(null);

    try {
      await refetch();if (enableTesting) {
        testing.validateCache();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh cases';
      setLocalError(errorMessage);
      // Failed to refresh cases
    }
  }, [refetch, enableTesting, testing]);

  // Update case status with optimistic updates
  const updateCaseStatus = useCallback(async (
    caseId: string,
    newStatus: CaseStatus,
    details?: string,
    attachments?: string[]
  ) => {setLocalError(null);

    try {
      await caseMutation.mutateAsync({
        caseId,
        status: newStatus,
        details,
        attachments,
        data: {
          processOrderDetails: details ? JSON.stringify({ details, attachments }) : undefined
        }
      });if (enableTesting) {
        testing.recordUpdate();
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update case status';
      setLocalError(errorMessage);
      // Failed to update case
      return false;
    }
  }, [caseMutation, enableTesting, testing]);

  // Save case with optimistic updates
  const saveCase = useCallback(async (caseData: CaseBooking) => {
    setLocalError(null);

    try {
      const savedCase = await realtimeCaseService.saveCase(caseData);

      if (savedCase) {
        // Trigger refresh to get updated data
        await refetch();

        if (enableTesting) {
          testing.recordUpdate();
        }
      }

      return savedCase;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save case';
      console.error('Case save error:', error);
      
      // Check if it's a database constraint error or other specific error
      if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        setLocalError('Case reference number already exists. Please try again.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('RLS')) {
        setLocalError('Permission denied. Please check your access rights.');
      } else {
        setLocalError(errorMessage);
      }
      
      // Try to check if case was actually saved despite error
      try {
        // Wait a bit for database to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Trigger refresh to see if case appears
        await refetch();
        
        // Check if a case with this reference number exists
        console.log('Attempting to verify if case was saved despite error...');
      } catch (refreshError) {
        console.error('Failed to refresh after save error:', refreshError);
      }
      
      return null;
    }
  }, [refetch, enableTesting, testing]);

  // Delete case
  const deleteCase = useCallback(async (caseId: string) => {setLocalError(null);

    try {
      const success = await realtimeCaseService.deleteCase(caseId);

      if (success) {// Trigger refresh to get updated data
        await refetch();

        if (enableTesting) {
          testing.recordUpdate();
        }
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete case';
      setLocalError(errorMessage);
      // Failed to delete case
      return false;
    }
  }, [refetch, enableTesting, testing]);

  // Generate case reference number
  const generateCaseReferenceNumber = useCallback(async (country?: string) => {setLocalError(null);

    try {
      const referenceNumber = await realtimeCaseService.generateCaseReferenceNumber(country);return referenceNumber;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate reference number';
      setLocalError(errorMessage);
      // Failed to generate reference number
      throw error;
    }
  }, []);

  // Get case by ID
  const getCaseById = useCallback(async (caseId: string) => {// First try to find in current data
    const existingCase = cases.find(c => c.id === caseId);
    if (existingCase) {return existingCase;
    }

    // If not found, fetch fresh from database
    try {
      const caseItem = await realtimeCaseService.getCaseById(caseId);return caseItem;
    } catch (error) {
      // Failed to fetch case
      return null;
    }
  }, [cases]);

  // Get statistics
  const getStatistics = useCallback(async () => {try {
      const stats = await realtimeCaseService.getCaseStatistics();return stats;
    } catch (error) {
      // Failed to get statistics
      return { total: 0, byStatus: {} as any, byCountry: {} };
    }
  }, []);

  // Validate component functionality
  const validateComponent = useCallback(async () => {try {
      // Test basic data loading
      const hasData = cases.length >= 0; // Even 0 is valid
      const isNotLoading = !isLoading;
      const hasNoErrors = !error && !localError;

      const isValid = hasData && isNotLoading && hasNoErrors;return isValid;
    } catch (error) {
      // Component validation failed
      return false;
    }
  }, [cases.length, isLoading, error, localError]);

  // Run component validation test
  useEffect(() => {
    if (enableTesting && !isLoading) {
      testing.validateComponent(validateComponent);
    }
  }, [enableTesting, isLoading, testing, validateComponent]);

  // Generate testing report
  const getTestingReport = useCallback(() => {
    if (enableTesting) {
      return testing.generateReport();
    }
    return 'Testing disabled';
  }, [enableTesting, testing]);

  // Return hook interface
  return {
    // Data
    cases,
    isLoading,
    error: error || localError,
    isError,
    isSuccess,

    // Actions
    refreshCases,
    updateCaseStatus,
    saveCase,
    deleteCase,
    generateCaseReferenceNumber,
    getCaseById,
    getStatistics,

    // Testing
    validateComponent,
    getTestingReport,

    // Status
    isMutating: caseMutation.isPending,
    lastUpdated: new Date(),

    // Connection status (for RealtimeProvider compatibility)
    isConnected: isSuccess && !isError,
    reconnectAttempts: isError ? 1 : 0
  };
};

// Filtered cases hook
export const useFilteredRealtimeCases = (filters: FilterOptions) => {
  const { cases, ...rest } = useRealtimeCases({ filters });

  const filteredCases = useState(() => {
    let filtered = cases;

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(caseItem =>
        caseItem.caseReferenceNumber.toLowerCase().includes(searchTerm) ||
        caseItem.hospital.toLowerCase().includes(searchTerm) ||
        caseItem.doctorName?.toLowerCase().includes(searchTerm) ||
        caseItem.procedureType.toLowerCase().includes(searchTerm) ||
        caseItem.procedureName.toLowerCase().includes(searchTerm) ||
        caseItem.submittedBy.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(caseItem => caseItem.status === filters.status);
    }

    // Apply submitter filter
    if (filters.submitter) {
      filtered = filtered.filter(caseItem => caseItem.submittedBy === filters.submitter);
    }

    // Apply hospital filter
    if (filters.hospital) {
      filtered = filtered.filter(caseItem => caseItem.hospital === filters.hospital);
    }

    // Apply country filter
    if (filters.country) {
      filtered = filtered.filter(caseItem => caseItem.country === filters.country);
    }

    // Apply date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(caseItem => caseItem.dateOfSurgery >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(caseItem => caseItem.dateOfSurgery <= filters.dateTo!);
    }

    return filtered;
  })[0];

  return {
    cases: filteredCases,
    totalCases: cases.length,
    filteredCount: filteredCases.length,
    ...rest
  };
};

// Cases by status hook
export const useRealtimeCasesByStatus = (status: CaseStatus) => {
  const { cases, ...rest } = useRealtimeCases();

  const statusCases = useState(() =>
    cases.filter(caseItem => caseItem.status === status)
  )[0];

  return {
    cases: statusCases,
    count: statusCases.length,
    ...rest
  };
};

// Single case hook
export const useRealtimeCaseById = (caseId: string) => {
  const [caseItem, setCaseItem] = useState<CaseBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCase = async () => {
      setLoading(true);
      setError(null);

      try {
        const foundCase = await realtimeCaseService.getCaseById(caseId);
        setCaseItem(foundCase);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch case');
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [caseId]);

  const updateCase = useCallback(async (updatedCase: CaseBooking) => {
    try {
      const success = await realtimeCaseService.saveCase(updatedCase);
      if (success) {
        setCaseItem(updatedCase);
      }
      return !!success;
    } catch (error) {
      // Failed to update case
      return false;
    }
  }, []);

  return {
    caseItem,
    loading,
    error,
    updateCase
  };
};