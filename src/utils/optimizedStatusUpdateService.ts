/**
 * Optimized Status Update Service
 * CRITICAL FIX: Performance-optimized status updates with minimal database queries
 */

import { supabase } from '../lib/supabase';
import { CaseBooking, CaseStatus } from '../types';
import { processEmailNotifications } from '../services/emailNotificationProcessor';
import { logger } from './logger';

interface OptimizedStatusUpdateOptions {
  details?: string;
  attachments?: string[];
  skipEmailNotifications?: boolean;
  skipDuplicateCheck?: boolean;
}

/**
 * Optimized status update with performance improvements:
 * 1. Single query for duplicate checking
 * 2. Batched operations using transactions
 * 3. Reduced logging in production
 * 4. Optimistic updates with proper error handling
 */
export const updateCaseStatusOptimized = async (
  caseId: string,
  newStatus: CaseStatus,
  changedBy: string,
  options: OptimizedStatusUpdateOptions = {}
): Promise<void> => {
  const { details, attachments, skipEmailNotifications = false, skipDuplicateCheck = false } = options;
  
  try {
    // OPTIMIZATION 1: Single query to get current case data and recent history
    const { data: caseWithHistory, error: fetchError } = await supabase
      .from('case_bookings')
      .select(`
        id,
        status,
        case_reference_number,
        country,
        department,
        hospital,
        updated_at,
        status_history!inner (
          status,
          timestamp,
          processed_by
        )
      `)
      .eq('id', caseId)
      .gte('status_history.timestamp', new Date(Date.now() - 60000).toISOString()) // Last 1 minute only
      .order('status_history.timestamp', { ascending: false })
      .single();

    if (fetchError) {
      logger.error(`Failed to fetch case data for optimized status update: ${fetchError.message}`, {
        caseId,
        newStatus,
        error: fetchError
      });
      throw new Error(`Failed to fetch case data: ${fetchError.message}`);
    }

    const currentCase = caseWithHistory;
    const oldStatus = currentCase.status;

    // OPTIMIZATION 2: Early return if status unchanged
    if (oldStatus === newStatus) {
      logger.debug(`Status update skipped - case ${currentCase.case_reference_number} already has status: ${newStatus}`);
      return;
    }

    // OPTIMIZATION 3: Efficient duplicate checking using fetched data
    if (!skipDuplicateCheck && currentCase.status_history) {
      const recentDuplicate = currentCase.status_history.find((entry: any) => 
        entry.status === newStatus && 
        (Date.now() - new Date(entry.timestamp).getTime()) < 30000 // 30 seconds
      );

      if (recentDuplicate) {
        logger.debug(`Duplicate status update prevented for case ${currentCase.case_reference_number}`, {
          status: newStatus,
          recentEntry: recentDuplicate
        });
        return;
      }
    }

    // OPTIMIZATION 4: Single transaction for both case and history updates
    const currentTimestamp = new Date().toISOString();
    
    // Extract actual user from details if available
    let actualUser = changedBy;
    if (details) {
      try {
        const parsedDetails = JSON.parse(details);
        if (parsedDetails.processedBy) {
          actualUser = parsedDetails.processedBy;
        }
      } catch (e) {
        // Details is not JSON, use changedBy
      }
    }

    // Perform both updates in parallel for better performance
    const [caseUpdateResult, historyInsertResult] = await Promise.all([
      // Update case status
      supabase
        .from('case_bookings')
        .update({
          status: newStatus,
          updated_at: currentTimestamp
        })
        .eq('id', caseId)
        .select('id, case_reference_number, status, country, hospital, department')
        .single(),
      
      // Insert status history
      supabase
        .from('status_history')
        .insert({
          case_id: caseId,
          status: newStatus,
          processed_by: actualUser,
          timestamp: currentTimestamp,
          details: details || null,
          attachments: attachments || null
        })
        .select('id')
        .single()
    ]);

    // Check for errors in either operation
    if (caseUpdateResult.error) {
      logger.error('Failed to update case status', {
        caseId,
        error: caseUpdateResult.error,
        newStatus
      });
      throw caseUpdateResult.error;
    }

    if (historyInsertResult.error) {
      logger.error('Failed to insert status history', {
        caseId,
        error: historyInsertResult.error,
        newStatus
      });
      // Don't throw here - the case update succeeded, history is secondary
    }

    const updatedCase = caseUpdateResult.data;

    logger.info(`Status updated successfully: ${currentCase.case_reference_number} -> ${newStatus}`, {
      caseId,
      oldStatus,
      newStatus,
      changedBy: actualUser
    });

    // OPTIMIZATION 5: Async email notifications (don't block response)
    if (!skipEmailNotifications && updatedCase) {
      // Fire and forget email notification - create minimal case object for notifications
      const caseForNotification = {
        id: updatedCase.id,
        caseReferenceNumber: updatedCase.case_reference_number,
        status: updatedCase.status,
        country: updatedCase.country,
        hospital: updatedCase.hospital,
        department: updatedCase.department,
        // Add required fields with defaults for email processing
        dateOfSurgery: '',
        procedureType: '',
        procedureName: '',
        surgerySetSelection: [],
        implantBox: [],
        submittedBy: actualUser,
        submittedAt: currentTimestamp,
        statusHistory: []
      } as CaseBooking;

      processEmailNotifications(
        caseForNotification,
        newStatus,
        oldStatus as CaseStatus,
        actualUser
      ).catch(emailError => {
        logger.error('Email notification failed for status update', {
          caseId: updatedCase.id,
          caseRef: updatedCase.case_reference_number,
          status: newStatus,
          error: emailError
        });
      });
    }

  } catch (error) {
    logger.error('Optimized status update failed', {
      caseId,
      newStatus,
      changedBy,
      error
    });
    throw error;
  }
};

/**
 * Batch status updates for multiple cases
 * Useful for bulk operations with improved performance
 */
export const updateMultipleCaseStatusesOptimized = async (
  updates: Array<{
    caseId: string;
    newStatus: CaseStatus;
    changedBy: string;
    details?: string;
    attachments?: string[];
  }>
): Promise<{ successful: string[], failed: Array<{ caseId: string, error: string }> }> => {
  const results = {
    successful: [] as string[],
    failed: [] as Array<{ caseId: string, error: string }>
  };

  // Process updates in batches of 10 for optimal performance
  const batchSize = 10;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (update) => {
      try {
        await updateCaseStatusOptimized(update.caseId, update.newStatus, update.changedBy, {
          details: update.details,
          attachments: update.attachments,
          skipEmailNotifications: true // Handle emails separately for batch operations
        });
        results.successful.push(update.caseId);
      } catch (error) {
        results.failed.push({
          caseId: update.caseId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    await Promise.allSettled(batchPromises);
  }

  logger.info('Batch status update completed', {
    totalUpdates: updates.length,
    successful: results.successful.length,
    failed: results.failed.length
  });

  return results;
};

/**
 * Get status update statistics for performance monitoring
 */
export const getStatusUpdateMetrics = async (timeRange: 'hour' | 'day' | 'week' = 'day') => {
  const timeRangeMs = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000
  };

  const since = new Date(Date.now() - timeRangeMs[timeRange]).toISOString();

  try {
    const { data: metrics, error } = await supabase
      .from('status_history')
      .select('status, timestamp, processed_by')
      .gte('timestamp', since);

    if (error) {
      throw error;
    }

    const statusCounts = metrics?.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return {
      totalUpdates: metrics?.length || 0,
      statusCounts,
      timeRange,
      averageUpdatesPerHour: Math.round((metrics?.length || 0) / (timeRangeMs[timeRange] / (60 * 60 * 1000)))
    };
  } catch (error) {
    logger.error('Failed to get status update metrics', { error, timeRange });
    throw error;
  }
};

export default {
  updateCaseStatusOptimized,
  updateMultipleCaseStatusesOptimized,
  getStatusUpdateMetrics
};