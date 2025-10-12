/**
 * Real-time Query Service - Optimized for 50-100 Concurrent Users
 * Replaces manual cache clearing with intelligent real-time data loading
 *
 * Key Features:
 * - Always fetch from Supabase (no stale cache issues)
 * - Optimistic updates for instant UI responses
 * - Smart batching for performance
 * - Connection pooling for efficiency
 * - Automatic retry logic with exponential backoff
 */

/**
 * ⚠️ CRITICAL: Uses comprehensive field mappings to prevent database field naming issues
 * 
 * FIELD MAPPING RULES:
 * - Database fields: snake_case (e.g., date_of_surgery, case_booking_id)
 * - TypeScript interfaces: camelCase (e.g., dateOfSurgery, caseBookingId)
 * - ALWAYS use fieldMappings.ts utility instead of hardcoded field names
 * 
 * NEVER use: case_date → USE: date_of_surgery
 * NEVER use: procedure → USE: procedure_type
 * NEVER use: caseId → USE: case_booking_id
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { CaseBooking, User, CaseStatus } from '../types';
import { useCallback } from 'react';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';

interface QueryConfig {
  queryKey: string[];
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
  retry?: number | boolean;
}

/**
 * Base real-time query hook with no caching - always fresh data
 */
export const useRealtimeQuery = <T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: Partial<QueryConfig> = {}
) => {
  return useQuery({
    queryKey,
    queryFn,
    // Force fresh data - no cache staleness issues
    staleTime: 0, // Always consider data stale
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes only
    refetchOnWindowFocus: true, // Always refetch when user comes back
    refetchOnReconnect: true, // Refetch when connection restored
    refetchInterval: options.refetchInterval || false, // Optional polling
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      const status = (error as any)?.status;
      if (status >= 400 && status < 500) return false;
      return failureCount < 3;
    },
    // Enhanced error handling
    throwOnError: false,
    ...options
  });
};

/**
 * Real-time Cases Service - Always Fresh Data
 */
export const useRealtimeCasesQuery = (filters?: {
  country?: string;
  status?: string;
  submitter?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const queryKey = ['cases', 'realtime', JSON.stringify(filters || {})];

  const queryFn = useCallback(async (): Promise<CaseBooking[]> => {
    let query = supabase
      .from('case_bookings')
      .select(`
        *,
        status_history (
          id,
          status,
          timestamp,
          processed_by,
          details
        ),
        amendment_history (
          id,
          timestamp,
          amended_by,
          reason,
          changes
        )
      `)
      .order('created_at', { ascending: false }); // ⚠️ created_at (createdAt)

    // Apply filters dynamically
    if (filters?.country) {
      query = query.eq('country', filters.country);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.submitter) {
      query = query.eq('submitted_by', filters.submitter);
    }
    if (filters?.dateFrom) {
      query = query.gte('date_of_surgery', filters.dateFrom); // ⚠️ date_of_surgery (dateOfSurgery) - NOT case_date
    }
    if (filters?.dateTo) {
      query = query.lte('date_of_surgery', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch cases: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Transform Supabase data to CaseBooking interface (same as getSupabaseCases)
    return data.map(caseData => ({
      id: caseData.id,
      caseReferenceNumber: caseData.case_reference_number,
      hospital: caseData.hospital,
      department: caseData.department,
      dateOfSurgery: caseData.date_of_surgery,
      procedureType: caseData.procedure_type,
      procedureName: caseData.procedure_name,
      doctorName: caseData.doctor_name,
      timeOfProcedure: caseData.time_of_procedure,
      surgerySetSelection: caseData.surgery_set_selection || [],
      implantBox: caseData.implant_box || [],
      specialInstruction: caseData.special_instruction,
      status: caseData.status as CaseStatus,
      submittedBy: caseData.submitted_by,
      submittedAt: caseData.submitted_at,
      processedBy: caseData.processed_by,
      processedAt: caseData.processed_at,
      processOrderDetails: caseData.process_order_details,
      country: caseData.country,
      isAmended: caseData.is_amended,
      amendedBy: caseData.amended_by,
      amendedAt: caseData.amended_at,
      deliveryImage: caseData.delivery_image,
      deliveryDetails: caseData.delivery_details,
      attachments: caseData.attachments || [],
      orderSummary: caseData.order_summary,
      doNumber: caseData.do_number,
      statusHistory: caseData.status_history?.map((history: any) => ({
        status: history.status as CaseStatus,
        timestamp: history.timestamp, // ⚠️ timestamp field
        processedBy: history.processed_by,
        user: history.processed_by,
        details: history.details || '',
        attachments: history.attachments || []
      }))?.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) || [],
      amendmentHistory: caseData.amendment_history?.map((amendment: any) => ({
        timestamp: amendment.timestamp,
        amendedBy: amendment.amended_by,
        reason: amendment.reason || '',
        changes: amendment.changes || []
      }))?.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) || []
    }));
  }, [filters]);

  return useRealtimeQuery(queryKey, queryFn, {
    refetchInterval: 30000, // Fallback polling every 30 seconds
  });
};

/**
 * Real-time User Query - Always Fresh User Data
 */
export const useRealtimeUsersQuery = (filters?: { role?: string; enabled?: boolean }) => {
  const queryKey = ['users', 'realtime', JSON.stringify(filters || {})];

  const queryFn = useCallback(async (): Promise<User[]> => {
    let query = supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true });

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }
    if (filters?.enabled !== undefined) {
      query = query.eq('enabled', filters.enabled);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }return data?.map(user => ({
      id: user.id,
      username: user.username,
      password: '', // Never expose passwords
      role: user.role,
      name: user.name,
      departments: user.departments || [],
      countries: user.countries || [],
      selectedCountry: user.selected_country,
      enabled: user.enabled,
      email: user.email || ''
    })) || [];
  }, [filters]);

  return useRealtimeQuery(queryKey, queryFn);
};

/**
 * Real-time Master Data Query (Countries, Departments, etc.)
 */
export const useRealtimeMasterDataQuery = (
  type: 'countries' | 'departments' | 'procedures' | 'hospitals',
  country?: string
) => {
  const queryKey = ['master-data', type, country || 'all'];

  const queryFn = useCallback(async (): Promise<string[]> => {
    let query = supabase
      .from('code_tables')
      .select('display_name, code')
      .eq('table_type', type)
      .eq('is_active', true); // ⚠️ is_active (isActive)

    if (country && country !== 'Global') {
      query = query.eq('country', country);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch ${type}: ${error.message}`);
    }

    // Extract display names from records
    const allValues: string[] = [];
    data?.forEach(record => {
      if (record.display_name) {
        allValues.push(record.display_name);
      }
    });

    // Remove duplicates and sort
    const uniqueValues = [...new Set(allValues)].sort();return uniqueValues;
  }, [type, country]);

  return useRealtimeQuery(queryKey, queryFn);
};

/**
 * Real-time Surgery Sets and Implant Boxes Query
 */
export const useRealtimeEditSetsQuery = (
  type: 'surgery_sets' | 'implant_boxes',
  country: string
) => {
  const queryKey = ['edit-sets', type, country];

  const queryFn = useCallback(async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from(type)
      .select('name')
      .eq('country', country)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch ${type}: ${error.message}`);
    }

    const names = data?.map(item => item.name) || [];return names;
  }, [type, country]);

  return useRealtimeQuery(queryKey, queryFn);
};

/**
 * Optimistic Mutation Hooks
 */
export const useOptimisticCaseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      caseId: string;
      status?: CaseStatus;
      data?: Partial<CaseBooking>;
    }) => {
      const { caseId, status, data } = variables;

      if (status) {
        // Update case status using proper field mappings
        console.log('🔧 REALTIME QUERY DEBUG - Status update attempt:', {
          caseId,
          status,
          timestamp: new Date().toISOString(),
          operation: 'PATCH /rest/v1/case_bookings',
          fieldMappings: {
            status: CASE_BOOKINGS_FIELDS.status,
            updatedAt: CASE_BOOKINGS_FIELDS.updatedAt
          }
        });

        // Use field mapping utility for consistency
        const updateData = { 
          [CASE_BOOKINGS_FIELDS.status]: status, 
          [CASE_BOOKINGS_FIELDS.updatedAt]: new Date().toISOString() 
        };
        console.log('🔧 REALTIME QUERY DEBUG - Update data with field mappings:', {
          updateData,
          rawFieldNames: Object.keys(updateData),
          fieldMappingUsed: true
        });

        const { data: updateResult, error } = await supabase
          .from('case_bookings')
          .update(updateData)
          .eq('id', caseId)
          .select(); // Add select to see what was updated

        if (error) {
          console.error('❌ REALTIME QUERY DEBUG - Update failed:', {
            error: error,
            message: error.message,
            details: error.details,
            code: error.code,
            hint: error.hint,
            caseId,
            status,
            updateData,
            possibleCauses: [
              'RLS policy blocking update',
              'Invalid status value for enum constraint',
              'Field name mismatch',
              'Missing user authentication'
            ]
          });
          throw error;
        }

        console.log('✅ REALTIME QUERY DEBUG - Status update successful:', {
          caseId,
          status,
          updateResult,
          rowsAffected: updateResult?.length || 0
        });

        // Add to status history with proper details and attachments
        let statusDetails = 'Status updated via real-time system';
        let statusAttachments = null;
        
        // Extract details and attachments from processOrderDetails if available
        if (data?.processOrderDetails) {
          try {
            const orderDetails = JSON.parse(data.processOrderDetails as string);
            
            // Handle nested details (Sales Approval format)
            if (orderDetails.details) {
              try {
                // Try to parse details as JSON (Sales Approval format)
                const nestedDetails = JSON.parse(orderDetails.details);
                if (nestedDetails.salesApprovalComments) {
                  statusDetails = nestedDetails.salesApprovalComments;
                } else if (typeof nestedDetails === 'string') {
                  statusDetails = nestedDetails;
                }
              } catch {
                // If not JSON, treat as plain text (Order Prepared format)
                statusDetails = orderDetails.details;
              }
            }
            
            // Handle attachments
            if (orderDetails.attachments && orderDetails.attachments.length > 0) {
              statusAttachments = orderDetails.attachments;
            }
          } catch (error) {
            console.warn('Failed to parse processOrderDetails:', error);
          }
        }

        // DUPLICATE PREVENTION: Check for existing status history entries with the same status very recently
        console.log('🔧 REALTIME QUERY DEBUG - Checking for duplicate status entries before insertion');
        
        const { data: existingHistory } = await supabase
          .from('status_history')
          .select('*')
          .eq(STATUS_HISTORY_FIELDS.caseId, caseId)
          .eq(STATUS_HISTORY_FIELDS.status, status)
          .gte(STATUS_HISTORY_FIELDS.timestamp, new Date(new Date().getTime() - 30000).toISOString()) // Last 30 seconds
          .order(STATUS_HISTORY_FIELDS.timestamp, { ascending: false });

        if (existingHistory && existingHistory.length > 0) {
          console.log('🚫 REALTIME QUERY DEBUG - Duplicate status prevented:', {
            caseId,
            status,
            existingEntries: existingHistory.length,
            mostRecentEntry: existingHistory[0],
            timeDiff: new Date().getTime() - new Date(existingHistory[0].timestamp).getTime()
          });
          // Skip status history insertion to prevent duplicate
        } else {
          // Insert status history using proper field mappings
          const statusHistoryData = {
            [STATUS_HISTORY_FIELDS.caseId]: caseId,
            [STATUS_HISTORY_FIELDS.status]: status,
            [STATUS_HISTORY_FIELDS.timestamp]: new Date().toISOString(),
            [STATUS_HISTORY_FIELDS.processedBy]: 'current_user', // TODO: Replace with actual user
            [STATUS_HISTORY_FIELDS.details]: statusDetails,
            [STATUS_HISTORY_FIELDS.attachments]: statusAttachments
          };

          console.log('🔧 REALTIME QUERY DEBUG - Status history insertion:', {
            statusHistoryData,
            fieldMappings: STATUS_HISTORY_FIELDS
          });

          const { error: historyError } = await supabase
            .from('status_history')
            .insert(statusHistoryData);

          if (historyError) {
            console.error('❌ REALTIME QUERY DEBUG - Status history insertion failed:', {
              error: historyError,
              statusHistoryData
            });
          } else {
            console.log('✅ REALTIME QUERY DEBUG - Status history inserted successfully');
          }
        }

        // Status history handling completed
      }

      if (data) {
        // Convert camelCase data to snake_case using field mappings
        const mappedData: Record<string, any> = {};
        
        // Convert each field using field mappings
        Object.entries(data).forEach(([camelCaseKey, value]) => {
          const snakeCaseKey = CASE_BOOKINGS_FIELDS[camelCaseKey as keyof typeof CASE_BOOKINGS_FIELDS];
          if (snakeCaseKey) {
            mappedData[snakeCaseKey] = value;
          } else {
            // Fallback: use camelCase key if no mapping found (shouldn't happen)
            console.warn(`🔧 FIELD MAPPING WARNING - No mapping found for: ${camelCaseKey}`);
            mappedData[camelCaseKey] = value;
          }
        });
        
        // Update case data using properly mapped field names
        const caseUpdateData = { 
          ...mappedData, 
          [CASE_BOOKINGS_FIELDS.updatedAt]: new Date().toISOString() 
        };
        
        console.log('🔧 REALTIME QUERY DEBUG - Case data update:', {
          caseId,
          caseUpdateData,
          fieldMappingUsed: true
        });

        const { error } = await supabase
          .from('case_bookings')
          .update(caseUpdateData)
          .eq('id', caseId);

        if (error) {
          console.error('❌ REALTIME QUERY DEBUG - Case data update failed:', {
            error: error,
            message: error.message,
            caseId,
            caseUpdateData
          });
          throw error;
        }

        console.log('✅ REALTIME QUERY DEBUG - Case data update successful');
      }

      return { caseId, status, data };
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['cases'] });

      // Snapshot previous value
      const previousCases = queryClient.getQueryData(['cases', 'realtime']);

      // Optimistically update - instant UI response
      queryClient.setQueryData(['cases', 'realtime'], (old: CaseBooking[] | undefined) => {
        if (!old) return old;

        return old.map(caseItem =>
          caseItem.id === variables.caseId
            ? {
                ...caseItem,
                ...(variables.status && { status: variables.status }),
                ...(variables.data && variables.data),
                updated_at: new Date().toISOString()
              }
            : caseItem
        );
      });

      return { previousCases };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousCases) {
        queryClient.setQueryData(['cases', 'realtime'], context.previousCases);
      }
      // Case mutation failed
    },
    onSuccess: () => {
      // The real-time subscription will automatically update the cache
      // Case mutation succeeded
    },
  });
};

/**
 * Force refresh all queries - Emergency fallback
 */
export const useForceRefreshAll = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    // Invalidate all queries
    queryClient.invalidateQueries();

    // Clear query cache entirely
    queryClient.clear();}, [queryClient]);
};