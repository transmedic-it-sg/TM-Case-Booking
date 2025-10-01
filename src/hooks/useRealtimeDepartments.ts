/**
 * Real-time Departments Hook - Always Fresh Department/Doctor Data
 * Replaces EditSets' direct departmentDoctorService calls with real-time queries
 * Designed for live doctor/department management across multiple users
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import {
  getDepartmentsForCountry,
  getDoctorsForDepartment,
  addDoctorToDepartment,
  removeDoctorFromSystem,
  type Department
} from '../utils/departmentDoctorService';
import { useNotifications } from '../contexts/NotificationContext';
import { useTestingValidation } from './useTestingValidation';

interface UseRealtimeDepartmentsOptions {
  country?: string;
  enableRealTime?: boolean;
  enableTesting?: boolean;
}

// Real-time departments query - Stable key with smart caching
const useRealtimeDepartmentsQuery = (country?: string) => {
  return useQuery({
    queryKey: ['realtime-departments', country], // FIXED: Stable key without Date.now()
    queryFn: async () => {const departments = await getDepartmentsForCountry(country || '');

      // Validate that departments have country field
      departments.forEach(dept => {
        if (!dept.country) {
          console.error(`❌ Department ${dept.name} missing country field!`, dept);
        }
      });return departments;
    },
    enabled: !!country, // Only run if country is provided
    staleTime: 1000 * 60, // Consider data fresh for 1 minute to reduce loops
    gcTime: 1000 * 60 * 10, // Cache for 10 minutes
    refetchOnMount: false, // FIXED: Don't refetch on every mount
    refetchOnWindowFocus: false, // FIXED: Don't refetch on focus to prevent loops
    refetchOnReconnect: true, // Keep this for network recovery
    refetchInterval: false, // DISABLED: No automatic polling to prevent loops
    retry: 1 // Minimal retries to prevent endless loops
  });
};

// Real-time doctors query for specific department - Stable key with better caching
const useRealtimeDoctorsQuery = (department?: Department) => {
  return useQuery({
    queryKey: ['realtime-doctors', department?.id], // FIXED: Simplified stable key
    queryFn: async () => {
      if (!department) return [];

      // Validate department has country before proceeding
      if (!department.country) {
        console.error(`❌ Cannot fetch doctors: Department ${department.name} missing country field`);
        throw new Error(`Department ${department.name} is missing country information`);
      }const doctors = await getDoctorsForDepartment(department.name, department.country);return doctors;
    },
    enabled: !!department && !!department.country, // Only run if department has country
    staleTime: 1000 * 30, // Consider data fresh for 30 seconds to reduce loops
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnMount: false, // FIXED: Don't refetch on every mount
    refetchOnWindowFocus: false, // FIXED: Don't refetch on focus to prevent loops
    refetchOnReconnect: true, // Keep this for network recovery
    refetchInterval: false, // DISABLED: No automatic polling to prevent loops
    retry: 1 // Minimal retries to prevent endless loops
  });
};

// Optimistic department/doctor mutations
const useOptimisticDepartmentMutation = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();

  return useMutation({
    mutationFn: async (action: {
      type: 'addDoctor' | 'removeDoctor';
      departmentId?: string;
      doctorName?: string;
      doctorId?: string;
      country?: string;
    }) => {
      switch (action.type) {
        case 'addDoctor':
          return await addDoctorToDepartment(
            action.departmentId!,
            action.doctorName!,
            action.country!
          );
        case 'removeDoctor':
          return await removeDoctorFromSystem(action.doctorId!, action.country!);
        default:
          throw new Error('Invalid department action');
      }
    },
    onSuccess: (result, action) => {
      // Invalidate and refetch department/doctor data
      queryClient.invalidateQueries({ queryKey: ['realtime-departments'] });
      queryClient.invalidateQueries({ queryKey: ['realtime-doctors'] });

      // Show success notification
      const actionText = {
        addDoctor: 'Doctor added successfully',
        removeDoctor: 'Doctor removed successfully'
      }[action.type];

      addNotification({
        title: 'Department Management',
        message: actionText,
        type: 'success'
      });
    },
    onError: (error, action) => {
      console.error(`❌ Failed to ${action.type}:`, error);

      addNotification({
        title: 'Department Management Error',
        message: `Failed to ${action.type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  });
};

export const useRealtimeDepartments = (options: UseRealtimeDepartmentsOptions = {}) => {
  const {
    country,
    enableTesting = false
  } = options;

  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // Real-time departments query
  const {
    data: departments = [],
    isLoading: departmentsLoading,
    error: departmentsError,
    refetch: refetchDepartments
  } = useRealtimeDepartmentsQuery(country);

  // Real-time doctors query for selected department
  const {
    data: doctors = [],
    isLoading: doctorsLoading,
    error: doctorsError,
    refetch: refetchDoctors
  } = useRealtimeDoctorsQuery(selectedDepartment || undefined);

  // Department/doctor mutations
  const departmentMutation = useOptimisticDepartmentMutation();

  // Testing validation
  const testing = useTestingValidation({
    componentName: 'useRealtimeDepartments',
    enableTesting
  });

  // Combined loading state
  const isLoading = departmentsLoading || doctorsLoading;
  const error = departmentsError || doctorsError || localError;

  // Refresh departments - forces fresh data fetch
  const refreshDepartments = useCallback(async () => {setLocalError(null);

    if (enableTesting) {
      testing.recordUpdate();
    }

    await refetchDepartments();
    if (selectedDepartment) {
      await refetchDoctors();
    }
  }, [refetchDepartments, refetchDoctors, selectedDepartment, enableTesting, testing]);

  // Query client for cache operations
  const queryClient = useQueryClient();

  // Force clear all department/doctor caches
  const clearCache = useCallback(() => {queryClient.removeQueries({ queryKey: ['realtime-departments'] });
    queryClient.removeQueries({ queryKey: ['realtime-doctors'] });
    setSelectedDepartment(null);
    setLocalError(null);
  }, [queryClient]);

  // Select department and load its doctors
  const selectDepartment = useCallback(async (department: Department | null) => {// Critical validation: Ensure department has country field
    if (department && !department.country) {
      console.error(`❌ CRITICAL: Department ${department.name} missing country field!`, department);
      setLocalError(`Department ${department.name} is missing country information. Please refresh the page.`);
      return;
    }

    setSelectedDepartment(department);
    setLocalError(null);

    if (enableTesting && department) {
      testing.recordUpdate();
    }
  }, [enableTesting, testing]);

  // Add doctor to department
  const addDoctor = useCallback(async (departmentId: string, doctorName: string, country: string) => {setLocalError(null);

    try {
      const result = await departmentMutation.mutateAsync({
        type: 'addDoctor',
        departmentId,
        doctorName,
        country
      });

      if (enableTesting) {
        testing.recordUpdate();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add doctor';
      setLocalError(errorMessage);
      console.error(`❌ Failed to add doctor ${doctorName}:`, error);
      throw error;
    }
  }, [departmentMutation, enableTesting, testing]);

  // Remove doctor from system
  const removeDoctor = useCallback(async (doctorId: string) => {setLocalError(null);

    try {
      const result = await departmentMutation.mutateAsync({
        type: 'removeDoctor',
        doctorId
      });

      if (enableTesting) {
        testing.recordUpdate();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove doctor';
      setLocalError(errorMessage);
      console.error(`❌ Failed to remove doctor ${doctorId}:`, error);
      throw error;
    }
  }, [departmentMutation, enableTesting, testing]);

  // Component validation for testing
  const validateComponent = useCallback(async (): Promise<boolean> => {
    if (!enableTesting) return true;try {
      // Test departments fetching
      const testDepartments = await refetchDepartments();
      if (!Array.isArray(testDepartments.data)) {
        throw new Error('Departments data is not an array');
      }

      // Test functionality
      testing.recordValidation(true);return true;
    } catch (error) {
      testing.recordValidation(false, error instanceof Error ? error.message : 'Validation failed');
      console.error('❌ useRealtimeDepartments validation failed:', error);
      return false;
    }
  }, [refetchDepartments, enableTesting, testing]);

  // Get testing report
  const getTestingReport = useCallback(() => {
    if (!enableTesting) return 'Testing disabled';

    if (testing) {
      return testing.generateReport();
    }
    return 'Testing not available';
  }, [enableTesting, testing]);

  // Return hook interface
  return {
    // Data
    departments,
    selectedDepartment,
    doctors,
    isLoading,
    error,

    // Actions
    refreshDepartments,
    selectDepartment,
    addDoctor,
    removeDoctor,
    clearCache,

    // Testing
    validateComponent,
    getTestingReport,

    // Status
    isMutating: departmentMutation.isPending,
    lastUpdated: new Date()
  };
};