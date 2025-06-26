/**
 * useCaseActions Hook - Centralized case action logic
 * Extracts complex action handling from the main component
 */

import { useCallback } from 'react';
import { CaseBooking, CaseStatus } from '../../../types';
import { useCurrentUser, useNotifications } from '../../../hooks';
import { caseService } from '../../../services';
import { CASE_STATUSES } from '../../../constants';

export const useCaseActions = (caseItem: CaseBooking) => {
  const { user } = useCurrentUser();
  const { success, error } = useNotifications();

  const updateCaseStatus = useCallback(async (
    newStatus: CaseStatus,
    details?: string,
    attachments?: string[]
  ) => {
    if (!user) {
      error('Authentication Error', 'User not found');
      return false;
    }

    try {
      const updateResult = caseService.updateCaseStatus(
        caseItem.id,
        newStatus,
        details,
        attachments
      );

      if (updateResult) {
        success(
          'Status Updated',
          `Case ${caseItem.caseReferenceNumber} updated to ${newStatus}`
        );
        return true;
      } else {
        error('Update Failed', 'Failed to update case status');
        return false;
      }
    } catch (err) {
      error('Update Error', 'An error occurred while updating the case');
      return false;
    }
  }, [caseItem.id, caseItem.caseReferenceNumber, user, success, error]);

  const processOrder = useCallback(async (details: string, attachments: File[]) => {
    return updateCaseStatus(CASE_STATUSES.ORDER_PREPARATION, details);
  }, [updateCaseStatus]);

  const markAsDelivered = useCallback(async (details: string, attachments: File[]) => {
    return updateCaseStatus(CASE_STATUSES.DELIVERED_HOSPITAL, details);
  }, [updateCaseStatus]);

  const markAsReceived = useCallback(async (details: string, image?: string) => {
    const attachments = image ? [image] : undefined;
    return updateCaseStatus(CASE_STATUSES.DELIVERED_HOSPITAL, details, attachments);
  }, [updateCaseStatus]);

  const markAsCompleted = useCallback(async (
    summary: string,
    doNumber: string,
    attachments: File[]
  ) => {
    const details = `Summary: ${summary}\nDO Number: ${doNumber}`;
    return updateCaseStatus(CASE_STATUSES.CASE_COMPLETED, details);
  }, [updateCaseStatus]);

  const markAsDeliveredToOffice = useCallback(async (
    details: string,
    attachments: File[]
  ) => {
    return updateCaseStatus(CASE_STATUSES.DELIVERED_OFFICE, details);
  }, [updateCaseStatus]);

  const markAsToBeBilled = useCallback(async () => {
    return updateCaseStatus(CASE_STATUSES.TO_BE_BILLED);
  }, [updateCaseStatus]);

  const amendCase = useCallback(async (amendmentData: any) => {
    try {
      const updatedCase = {
        ...caseItem,
        ...amendmentData,
        isAmended: true,
        amendedBy: user?.name || 'Unknown',
        amendedAt: new Date().toISOString()
      };

      const saveResult = caseService.saveCase(updatedCase);
      if (saveResult) {
        success('Case Amended', `Case ${caseItem.caseReferenceNumber} has been amended`);
        return true;
      } else {
        error('Amendment Failed', 'Failed to amend case');
        return false;
      }
    } catch (err) {
      error('Amendment Error', 'An error occurred while amending the case');
      return false;
    }
  }, [caseItem, user, success, error]);

  return {
    processOrder,
    markAsDelivered,
    markAsReceived,
    markAsCompleted,
    markAsDeliveredToOffice,
    markAsToBeBilled,
    amendCase,
    updateCaseStatus
  };
};