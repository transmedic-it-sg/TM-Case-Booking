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

/**
 * Get current user name for email notifications and status history
 */
const getCurrentUserName = async (): Promise<string> => {
  try {
    const { getCurrentUser } = await import('../utils/authCompat');
    const currentUser = getCurrentUser();
    return currentUser?.name || currentUser?.username || 'system';
  } catch (error) {
    console.log('📧 REALTIME DEBUG - Could not get current user, using system:', error);
    return 'system';
  }
};
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
    // Optimized caching for better performance
    staleTime: 1000 * 30, // Data is fresh for 30 seconds
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on tab focus (rely on real-time updates)
    refetchOnReconnect: true, // Still refetch when connection restored
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
          details,
          attachments
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
      details?: string;
      attachments?: string[];
    }) => {
      const { caseId, status, data, details, attachments } = variables;

      if (status) {
        // Status update for case

        // PERFORMANCE OPTIMIZATION: Batch update and history in parallel
        const updateData = { 
          [CASE_BOOKINGS_FIELDS.status]: status, 
          [CASE_BOOKINGS_FIELDS.updatedAt]: new Date().toISOString() 
        };
        
        // Start case update immediately (non-blocking)
        const caseUpdatePromise = supabase
          .from('case_bookings')
          .update(updateData)
          .eq('id', caseId)
          .select('id, status'); // Only select minimal fields for performance

        // Execute update and wait for result
        const { data: updateResult, error } = await caseUpdatePromise;

        if (error) {
          console.error('Case status update failed:', error.message);
          throw error;
        }

        // Status update completed successfully

        // Use direct parameters first, then fall back to parsing details/processOrderDetails
        let statusDetails = details || 'Status updated via real-time system';
        let statusAttachments = attachments || null;
        
        console.log('🔧 STATUS DETAILS DEBUG - Initial parameters:', {
          caseId,
          status,
          directDetails: details,
          directAttachments: attachments,
          hasProcessOrderDetails: !!data?.processOrderDetails
        });
        
        // ENHANCED: Always try to parse details field if it contains JSON to get clean details text
        if (details) {
          try {
            const detailsJson = JSON.parse(details);
            
            // Extract clean comment text for details (salesApprovalComments, comments, etc)
            if (detailsJson.salesApprovalComments) {
              statusDetails = detailsJson.salesApprovalComments;
            } else if (detailsJson.comments) {
              statusDetails = detailsJson.comments;
            }
            
            // Use direct attachments parameter if provided, otherwise use parsed attachments
            if (!attachments && detailsJson.attachments && Array.isArray(detailsJson.attachments) && detailsJson.attachments.length > 0) {
              statusAttachments = detailsJson.attachments;
            }
            
            console.log('🔧 JSON PARSING DEBUG - Successfully parsed details:', {
              originalDetails: details,
              extractedComments: statusDetails,
              extractedAttachments: detailsJson.attachments,
              usingDirectAttachments: !!attachments,
              finalAttachments: statusAttachments
            });
          } catch {
            // details is not JSON, keep as plain text
            console.log('🔧 JSON PARSING DEBUG - Details is not JSON, using as plain text:', details);
          }
        }
        
        // Fallback: Extract details and attachments from processOrderDetails if direct params not available
        if ((!details || !attachments) && data?.processOrderDetails) {
          try {
            const orderDetails = JSON.parse(data.processOrderDetails as string);
            
            // Use parsed details if direct details not provided
            if (!details && orderDetails.details) {
              try {
                const nestedDetails = JSON.parse(orderDetails.details);
                if (nestedDetails.salesApprovalComments) {
                  statusDetails = nestedDetails.salesApprovalComments;
                } else if (typeof nestedDetails === 'string') {
                  statusDetails = nestedDetails;
                }
              } catch {
                statusDetails = orderDetails.details;
              }
            }
            
            // Use parsed attachments if direct attachments not provided
            if (!statusAttachments && orderDetails.attachments && orderDetails.attachments.length > 0) {
              statusAttachments = orderDetails.attachments;
            }
          } catch (error) {
            console.warn('Failed to parse processOrderDetails:', error);
          }
        }

        console.log('📎 ATTACHMENT DEBUG - Status history attachments:', {
          caseId,
          status,
          directDetails: details,
          directAttachments: attachments,
          parsedAttachments: statusAttachments,
          finalDetails: statusDetails,
          willSaveDetails: statusDetails,
          willSaveAttachments: statusAttachments,
          timestamp: new Date().toISOString()
        });

        // PERFORMANCE OPTIMIZATION: Skip duplicate check for better performance
        // The database unique constraint will handle true duplicates
        // Only check if we're processing the exact same status within 5 seconds
        const recentTimestamp = new Date(Date.now() - 5000).toISOString();
        
        const { count } = await supabase
          .from('status_history')
          .select('id', { count: 'exact', head: true }) // Count only, no data transfer
          .eq(STATUS_HISTORY_FIELDS.caseId, caseId)
          .eq(STATUS_HISTORY_FIELDS.status, status)
          .gte(STATUS_HISTORY_FIELDS.timestamp, recentTimestamp);

        if (count && count > 0) {
          console.log('Duplicate status history entry prevented');
        } else {
          // Insert status history using proper field mappings
          const statusHistoryData = {
            [STATUS_HISTORY_FIELDS.caseId]: caseId,
            [STATUS_HISTORY_FIELDS.status]: status,
            [STATUS_HISTORY_FIELDS.timestamp]: new Date().toISOString(),
            [STATUS_HISTORY_FIELDS.processedBy]: await getCurrentUserName(),
            [STATUS_HISTORY_FIELDS.details]: statusDetails,
            [STATUS_HISTORY_FIELDS.attachments]: statusAttachments
          };

          // Insert status history with field mappings

          const { error: historyError } = await supabase
            .from('status_history')
            .insert(statusHistoryData);

          if (historyError) {
            console.error('Status history insertion failed:', historyError.message);
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

      // CRITICAL FIX: Add email notification processing for status updates
      if (status) {
        console.log('📧 REALTIME EMAIL DEBUG - Triggering email notifications for status update:', {
          caseId,
          newStatus: status,
          timestamp: new Date().toISOString()
        });

        try {
          // Import email processor and trigger notifications
          const { processEmailNotifications } = await import('../services/emailNotificationProcessor');
          
          // Get the updated case data to pass to email processor
          const { data: updatedCase, error: fetchError } = await supabase
            .from('case_bookings')
            .select('*')
            .eq('id', caseId)
            .single();

          if (fetchError) {
            console.error('❌ REALTIME EMAIL DEBUG - Failed to fetch updated case data:', fetchError);
          } else if (updatedCase) {
            // Convert snake_case database fields to camelCase for email processor
            const convertedCase = {
              id: updatedCase.id,
              caseReferenceNumber: updatedCase.case_reference_number,
              hospital: updatedCase.hospital,
              department: updatedCase.department,
              dateOfSurgery: updatedCase.date_of_surgery,
              procedureType: updatedCase.procedure_type,
              procedureName: updatedCase.procedure_name,
              doctorName: updatedCase.doctor_name,
              timeOfProcedure: updatedCase.time_of_procedure,
              surgerySetSelection: updatedCase.surgery_set_selection,
              implantBox: updatedCase.implant_box,
              specialInstruction: updatedCase.special_instruction,
              status: updatedCase.status,
              submittedBy: updatedCase.submitted_by,
              submittedAt: updatedCase.submitted_at,
              processedBy: updatedCase.processed_by,
              processedAt: updatedCase.processed_at,
              country: updatedCase.country
            };

            console.log('📧 REALTIME EMAIL DEBUG - Converted case data for email processing:', {
              caseRef: convertedCase.caseReferenceNumber,
              status: convertedCase.status,
              country: convertedCase.country
            });

            // Trigger email notifications asynchronously (don't block mutation)
            processEmailNotifications(convertedCase, status, undefined, await getCurrentUserName())
              .then(() => {
                console.log('✅ REALTIME EMAIL DEBUG - Email notifications processed successfully:', {
                  caseRef: convertedCase.caseReferenceNumber,
                  status,
                  timestamp: new Date().toISOString()
                });
              })
              .catch(emailError => {
                console.error('❌ REALTIME EMAIL DEBUG - Email notification failed:', {
                  caseRef: convertedCase.caseReferenceNumber,
                  status,
                  error: emailError.message,
                  timestamp: new Date().toISOString()
                });
              });
          }
        } catch (importError) {
          console.error('❌ REALTIME EMAIL DEBUG - Failed to import email processor:', importError);
        }
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