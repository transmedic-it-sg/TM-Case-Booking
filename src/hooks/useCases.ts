/**
 * useCases Hook - Centralized case data management
 * Replaces repetitive case fetching and caching logic
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CaseBooking, CaseStatus, FilterOptions } from '../types';
import { caseService } from '../services';

interface UseCasesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useCases = (options: UseCasesOptions = {}) => {
  const { autoRefresh = false, refreshInterval = 30000 } = options;
  
  const [cases, setCases] = useState<CaseBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCases = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const casesData = await caseService.getAllCases(forceRefresh);
      setCases(casesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cases');
      console.error('Error loading cases:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshCases = useCallback(() => {
    loadCases(true);
  }, [loadCases]);

  const updateCaseStatus = useCallback(async (
    caseId: string,
    newStatus: CaseStatus,
    details?: string,
    attachments?: string[]
  ) => {
    const success = await caseService.updateCaseStatus(caseId, newStatus, details, attachments);
    if (success) {
      refreshCases();
    }
    return success;
  }, [refreshCases]);

  const saveCase = useCallback(async (caseData: CaseBooking) => {
    const success = await caseService.saveCase(caseData);
    if (success) {
      refreshCases();
    }
    return success;
  }, [refreshCases]);

  const deleteCase = useCallback(async (caseId: string) => {
    const success = await caseService.deleteCase(caseId);
    if (success) {
      refreshCases();
    }
    return success;
  }, [refreshCases]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(refreshCases, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshCases]);

  // Initial load
  useEffect(() => {
    loadCases();
  }, [loadCases]);

  return {
    cases,
    loading,
    error,
    refreshCases,
    updateCaseStatus,
    saveCase,
    deleteCase,
    generateCaseReferenceNumber: () => caseService.generateCaseReferenceNumber()
  };
};

export const useFilteredCases = (filters: FilterOptions) => {
  const { cases, ...rest } = useCases();

  const filteredCases = useMemo(() => {
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
  }, [cases, filters]);

  return {
    cases: filteredCases,
    totalCases: cases.length,
    filteredCount: filteredCases.length,
    ...rest
  };
};

export const useCasesByStatus = (status: CaseStatus) => {
  const { cases, ...rest } = useCases();

  const statusCases = useMemo(() => 
    cases.filter(caseItem => caseItem.status === status),
    [cases, status]
  );

  return {
    cases: statusCases,
    count: statusCases.length,
    ...rest
  };
};

export const useCaseById = (caseId: string) => {
  const [caseItem, setCaseItem] = useState<CaseBooking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCase = async () => {
      setLoading(true);
      const foundCase = await caseService.getCaseById(caseId);
      setCaseItem(foundCase);
      setLoading(false);
    };

    fetchCase();
  }, [caseId]);

  const updateCase = useCallback(async (updatedCase: CaseBooking) => {
    const success = await caseService.saveCase(updatedCase);
    if (success) {
      setCaseItem(updatedCase);
    }
    return success;
  }, []);

  return {
    caseItem,
    loading,
    updateCase
  };
};