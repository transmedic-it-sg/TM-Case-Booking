/**
 * useCaseData Hook - Case data management and formatting
 * Handles case information formatting and computed properties
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

import { useMemo } from 'react';
import { CaseBooking } from '../../../types';
import { getStatusColor, getNextResponsibleRole, formatDateTime } from '../../CasesList/utils';
import { formatDate } from '../../../utils/dateFormat';

export const useCaseData = (caseItem: CaseBooking) => {
  const formattedData = useMemo(() => {
    return {
      // Status information
      statusColor: getStatusColor(caseItem.status),
      nextResponsibleRole: getNextResponsibleRole(caseItem.status),

      // Date formatting
      formattedSubmissionDate: formatDateTime(caseItem.submittedAt),
      formattedSurgeryDate: formatDate(new Date(caseItem.dateOfSurgery)),
      formattedProcessedDate: caseItem.processedAt ? formatDateTime(caseItem.processedAt) : null,

      // Time calculations
      daysSinceSubmission: Math.floor(
        (new Date().getTime() - new Date(caseItem.submittedAt).getTime()) / (1000 * 60 * 60 * 24)
      ),
      daysUntilSurgery: Math.floor(
        (new Date(caseItem.dateOfSurgery).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ),

      // Status history
      latestStatusUpdate: caseItem.statusHistory?.length
        ? caseItem.statusHistory[caseItem.statusHistory.length - 1]
        : null,

      // Amendment information
      hasAmendments: caseItem.isAmended || false,
      amendmentInfo: caseItem.isAmended ? {
        amendedBy: caseItem.amendedBy,
        amendedAt: caseItem.amendedAt ? formatDateTime(caseItem.amendedAt) : null
      } : null,
      amendmentHistory: caseItem.amendmentHistory || [],

      // Urgency indicators
      isUrgent: Math.floor(
        (new Date(caseItem.dateOfSurgery).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ) <= 2,
      isOverdue: new Date(caseItem.dateOfSurgery) < new Date() && caseItem.status !== 'Case Completed',

      // Display helpers
      displayHospital: caseItem.hospital || 'Not specified',
      displayDoctor: caseItem.doctorName || 'Not specified',
      displayTime: caseItem.timeOfProcedure || 'Not specified',
      displaySets: caseItem.surgerySetSelection?.join(', ') || 'None selected',
      displayImplants: caseItem.implantBox?.join(', ') || 'None selected'
    };
  }, [caseItem]);

  const statusHistory = useMemo(() => {
    return caseItem.statusHistory?.map(history => ({
      ...history,
      formattedTimestamp: formatDateTime(history.timestamp),
      timeAgo: getTimeAgo(history.timestamp)
    })) || [];
  }, [caseItem.statusHistory]);

  const canBeAmended = useMemo(() => {
    const nonAmendableStatuses = ['Case Completed', 'To be billed'];
    return !nonAmendableStatuses.includes(caseItem.status);
  }, [caseItem.status]);

  return {
    ...formattedData,
    statusHistory,
    canBeAmended,
    rawCase: caseItem
  };
};

// Helper function to calculate time ago
const getTimeAgo = (timestamp: string): string => { // ⚠️ timestamp field
  const now = new Date();
  const past = new Date(timestamp);
  const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }
};