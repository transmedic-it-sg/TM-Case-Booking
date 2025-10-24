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

import React, { useEffect, useMemo, useState } from 'react';
import { CaseCardProps } from './types';
import { getStatusColor, getNextResponsibleRole, formatDateTime } from './utils';
import CaseActions from './CaseActions';
import { getCurrentUserSync } from '../../utils/auth';
import { useRealtimeMasterDataQuery } from '../../services/realtimeQueryService';
import { getDepartmentNamesForUser } from '../../utils/codeTable';
import { useUserNames } from '../../hooks/useUserNames';
import TimePicker from '../common/TimePicker';
import { formatDate, getTodayForInput } from '../../utils/dateFormat';
import { supabase } from '../../lib/supabase';
import { StatusAttachmentManager } from './StatusAttachmentManager';
import { AttachmentRenderer, parseAttachments, type ParsedAttachment } from './AttachmentRenderer';
import { EditableAttachmentRenderer } from './EditableAttachmentRenderer';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../../utils/fieldMappings';
import { getCaseQuantities } from '../../utils/unifiedDataService';

const CaseCard: React.FC<CaseCardProps> = ({
  caseItem,
  currentUser,
  expandedCases,
  expandedStatusHistory,
  expandedAmendmentHistory,
  amendingCase,
  amendmentData,
  processingCase,
  processDetails,
  processAttachments,
  processComments,
  salesApprovalCase,
  salesApprovalAttachments,
  salesApprovalComments,
  orderPreparedCase,
  orderPreparedAttachments,
  orderPreparedComments,
  hospitalDeliveryCase,
  hospitalDeliveryAttachments,
  hospitalDeliveryComments,
  receivedCase,
  receivedDetails,
  receivedImage,
  completedCase,
  attachments,
  orderSummary,
  doNumber,
  pendingOfficeCase,
  pendingOfficeAttachments,
  pendingOfficeComments,
  officeDeliveryCase,
  officeDeliveryAttachments,
  officeDeliveryComments,
  onToggleExpansion,
  onToggleStatusHistory,
  onToggleAmendmentHistory,
  onStatusChange,
  onAmendCase,
  onSaveAmendment,
  onCancelAmendment,
  onOrderProcessed,
  onMarkOrderProcessed,
  onSaveProcessDetails,
  onCancelProcessing,
  onSalesApproval,
  onSaveSalesApproval,
  onCancelSalesApproval,
  onSaveOrderPrepared,
  onCancelOrderPrepared,
  onOrderDelivered,
  onOrderReceived,
  onSaveOrderReceived,
  onCancelReceived,
  onCaseCompleted,
  onSaveCaseCompleted,
  onCancelCompleted,
  onPendingDeliveryOffice,
  onSavePendingOffice,
  onCancelPendingOffice,
  onOfficeDelivery,
  onSaveOfficeDelivery,
  onCancelOfficeDelivery,
  onOrderDeliveredOffice,
  onToBeBilled,
  onDeleteCase,
  onCancelCase,
  onAttachmentUpload,
  onRemoveAttachment,
  onAmendmentDataChange,
  onProcessDetailsChange,
  onProcessAttachmentsChange,
  onProcessCommentsChange,
  onSalesApprovalAttachmentsChange,
  onSalesApprovalCommentsChange,
  onOrderPreparedAttachmentsChange,
  onOrderPreparedCommentsChange,
  onSaveHospitalDelivery,
  onCancelHospitalDelivery,
  onHospitalDeliveryAttachmentsChange,
  onHospitalDeliveryCommentsChange,
  onReceivedDetailsChange,
  onReceivedImageChange,
  onOrderSummaryChange,
  onDoNumberChange,
  onPendingOfficeAttachmentsChange,
  onPendingOfficeCommentsChange,
  onOfficeDeliveryAttachmentsChange,
  onOfficeDeliveryCommentsChange,
  onCompletedAttachmentsChange,
  onCaseAttachmentsChange,
  onNavigateToPermissions
}) => {
  // Get user IDs from case data and status history - memoized to prevent infinite re-renders
  const userIds = useMemo(() => [
    caseItem.submittedBy,
    caseItem.processedBy,
    caseItem.amendedBy,
    ...(caseItem.statusHistory || []).map(h => h.processedBy)
  ].filter((id): id is string => Boolean(id)), [
    caseItem.submittedBy,
    caseItem.processedBy,
    caseItem.amendedBy,
    caseItem.statusHistory
  ]);

  const { getUserName } = useUserNames(userIds);
  
  // Debug logging for the problematic case
  React.useEffect(() => {
    if (caseItem.caseReferenceNumber === 'TMC-Singapore-2025-029') {
    }
  }, [caseItem, getUserName]);

  // Real-time procedure types query - always fresh data
  const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
  const { data: availableProcedureTypes = [] } = useRealtimeMasterDataQuery('procedures', userCountry);

  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

  // State for case quantities
  const [caseQuantities, setCaseQuantities] = useState<Record<string, number>>({});

  // Load case quantities when case changes
  useEffect(() => {
    const loadCaseQuantities = async () => {
      console.log('🔢 CASE CARD QUANTITIES DEBUG - Loading quantities for case:', {
        caseId: caseItem.id,
        caseRef: caseItem.caseReferenceNumber,
        hasCaseId: !!caseItem.id,
        timestamp: new Date().toISOString()
      });

      if (!caseItem.id) {
        console.log('🔢 CASE CARD QUANTITIES DEBUG - No case ID, clearing quantities');
        setCaseQuantities({});
        return;
      }

      try {
        const quantities = await getCaseQuantities(caseItem.id);
        console.log('🔢 CASE CARD QUANTITIES DEBUG - Quantities loaded:', {
          caseId: caseItem.id,
          quantitiesReceived: quantities,
          quantitiesCount: quantities?.length || 0,
          timestamp: new Date().toISOString()
        });

        // Convert array to object for easy lookup
        const quantitiesMap: Record<string, number> = {};
        quantities.forEach(q => {
          quantitiesMap[q.item_name] = q.quantity;
        });

        console.log('🔢 CASE CARD QUANTITIES DEBUG - Quantities mapped:', {
          caseId: caseItem.id,
          quantitiesMap,
          mapKeys: Object.keys(quantitiesMap),
          surgerySetSelection: caseItem.surgerySetSelection,
          implantBox: caseItem.implantBox,
          nameMatches: {
            surgerySetMatches: (caseItem.surgerySetSelection || []).map(set => ({
              name: set,
              hasQuantity: set in quantitiesMap,
              quantity: quantitiesMap[set]
            })),
            implantBoxMatches: (caseItem.implantBox || []).map(box => ({
              name: box,
              hasQuantity: box in quantitiesMap,
              quantity: quantitiesMap[box]
            }))
          },
          timestamp: new Date().toISOString()
        });

        setCaseQuantities(quantitiesMap);
      } catch (error) {
        console.error('❌ CASE CARD QUANTITIES DEBUG - Failed to load quantities:', {
          caseId: caseItem.id,
          error: error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
        setCaseQuantities({});
      }
    };

    loadCaseQuantities();
  }, [caseItem.id]);

  // Load departments using Supabase service
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const currentUser = getCurrentUserSync();
        if (!currentUser) {
          setAvailableDepartments([]);
          return;
        }

        // Get departments for user's current country
        const userCountry = currentUser.selectedCountry || currentUser.countries?.[0];
        if (userCountry) {
          // Use the CORRECT code table service instead of the wrong departments table
          const { getDepartmentsForCountry } = await import('../../utils/supabaseCodeTableService');
          const countrySpecificDepts = await getDepartmentsForCountry(userCountry);

          // Admin and IT users can access all departments for their country
          if (currentUser.role === 'admin' || currentUser.role === 'it') {
            setAvailableDepartments(countrySpecificDepts.sort());
            return;
          }

          // Other users are restricted to their assigned departments
          const userDepartments = currentUser.departments || [];

          // Handle both legacy and new country-specific department formats
          const userDepartmentNames = getDepartmentNamesForUser(userDepartments, [userCountry]);
          setAvailableDepartments(countrySpecificDepts.filter(dept => userDepartmentNames.includes(dept)).sort());
          return;
        }

        // No fallback - use empty array if no country
        setAvailableDepartments([]);
      } catch (error) {
        // No fallback on error - use empty array
        setAvailableDepartments([]);
      }
    };

    loadDepartments();
  }, []);

  // Load case quantities for display in both collapsed and expanded views
  useEffect(() => {
    const loadCaseQuantities = async () => {
      try {
        // Loading quantities for case

        const { data, error } = await supabase
          .from('case_booking_quantities')
          .select('item_name, quantity')
          .eq('case_booking_id', caseItem.id); // ⚠️ case_booking_id (caseBookingId) FK - NOT caseId

        // Quantities query completed

        if (error) {
          console.error('🔍 CaseCard Debug - Quantities query error:', error);
          setCaseQuantities({});
          return;
        }

        if (data && data.length > 0) {
          const quantities: Record<string, number> = {};
          data.forEach(item => {
            quantities[item.item_name] = item.quantity;
          });
          console.log('🔍 CaseCard Debug - Setting quantities:', {
            caseRef: caseItem.caseReferenceNumber,
            quantities
          });
          setCaseQuantities(quantities);
        } else {
          // No quantities found
          setCaseQuantities({});
        }
      } catch (error) {
        console.error('🔍 CaseCard Debug - Exception loading quantities:', error);
        setCaseQuantities({});
      }
    };

    loadCaseQuantities();
  }, [caseItem.id]);

  // Initialize code tables only once when component mounts
  // Code tables are now initialized at app level via Supabase service
  // No need for component-level initialization

  // Memoize status history parsing to prevent expensive JSON.parse operations during rendering
  const parsedStatusHistory = useMemo(() => {
    return caseItem.statusHistory?.map(historyItem => {
      let parsedDetails = null;
      let parsedAttachments: any[] = [];

      if (historyItem.details) {
        try {
          parsedDetails = JSON.parse(historyItem.details);

          // ⚠️ FIXED: Use centralized attachment parsing for status history attachments
          if (parsedDetails.attachments) {
            parsedAttachments = parseAttachments(parsedDetails.attachments); // ⚠️ Centralized parsing
          }
        } catch {
          parsedDetails = null;
        }
      }

      return {
        ...historyItem,
        parsedDetails,
        parsedAttachments
      };
    }) || [];
  }, [caseItem.statusHistory]);

  // Find the most recent attachments for statuses without active forms
  const currentAttachments = useMemo(() => {
    // Only show for specific statuses that don't have their own forms
    const statusesWithoutForms = ['Order Prepared', 'Sales Approved'];

    if (!statusesWithoutForms.includes(caseItem.status)) {
      return [];
    }

    // Find the most recent status history entry with attachments
    const historyWithAttachments = [...parsedStatusHistory].reverse().find(entry => {
      // Check both direct attachments field and parsed details attachments
      return (entry.attachments && entry.attachments.length > 0) || 
             (entry.parsedDetails?.attachments && entry.parsedDetails.attachments.length > 0);
    });

    if (historyWithAttachments) {
      // Prioritize direct attachments field over parsed details attachments
      const attachmentsToUse = historyWithAttachments.attachments && historyWithAttachments.attachments.length > 0
        ? historyWithAttachments.attachments
        : historyWithAttachments.parsedDetails?.attachments;
      
      if (attachmentsToUse && attachmentsToUse.length > 0) {
        // Return raw attachment strings for AttachmentRenderer
        return attachmentsToUse;
      }
    }

    return [];
  }, [caseItem.status, parsedStatusHistory]);

  // Find the most recent comments for statuses without active forms
  const currentComments = useMemo(() => {
    // Only show for specific statuses that don't have their own forms
    const statusesWithoutForms = ['Order Prepared', 'Sales Approved'];

    if (!statusesWithoutForms.includes(caseItem.status)) {
      return '';
    }

    // Find the most recent status history entry with comments
    const historyWithComments = [...parsedStatusHistory].reverse().find(entry => {
      // Check parsed details comments
      return entry.parsedDetails?.comments;
    });

    if (historyWithComments) {
      // Return parsed details comments
      return historyWithComments.parsedDetails?.comments || '';
    }

    return '';
  }, [caseItem.status, parsedStatusHistory]);

  // Memoize attachment parsing for forms to prevent repeated JSON.parse operations

  
  // ⚠️ FIXED: Use centralized attachment parsing to prevent repeated JSON.parse operations
  const parsedAttachments = useMemo(() => {
    return parseAttachments(attachments); // ⚠️ Uses centralized AttachmentRenderer parsing
  }, [attachments]);

  const canAmendCase = (caseItem: any): boolean => {
    const currentUser = getCurrentUserSync();
    if (!currentUser) return false;

    // Check if user has amend-case permission
    // Note: This is a simplified check, actual permission checking happens at component level
    const hasAmendPermission = currentUser.role === 'admin' || currentUser.role === 'it' || currentUser.role === 'sales';
    
    // Users with amend permission can amend cases, others need the case to not be amended yet
    if (hasAmendPermission) return true;
    
    // For non-privileged users, check if case hasn't been amended yet
    const notAmended = !caseItem.isAmended;
    return notAmended;
  };

  // Helper function to check if a field has been changed and show original value
  const getOriginalValueDisplay = (fieldName: string, currentValue: string | undefined, originalValue: string | undefined) => {
    // Check if case has original values and the specific field has an original value
    if (!caseItem.originalValues || !originalValue) return null;

    // Ensure current value exists and is different from original
    if (currentValue && currentValue.trim() !== originalValue.trim()) {
      return (
        <div className="detail-item">
          <span className="detail-label">Original Value: </span>
          <span className="detail-value">{originalValue}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id={`case-${caseItem.id}`}
      className="case-card"
      data-case-id={caseItem.id}
      data-testid={`case-card-${caseItem.caseReferenceNumber}`}
      style={{ '--status-color': getStatusColor(caseItem.status) } as React.CSSProperties}
    >
      <div className="case-summary" onClick={() => onToggleExpansion(caseItem.id)}>
        <div className="case-main-info">
          <div className="case-title">
            <span className="case-title-label">Submitted by:</span>
            <strong>{getUserName(caseItem.submittedBy)}</strong>
            <span className="case-reference" data-testid="case-reference">#{caseItem.caseReferenceNumber}</span>
            <div className="case-status">
              <div
                className="status-text"
                style={{ backgroundColor: getStatusColor(caseItem.status) }}
              >
                {caseItem.status}
              </div>
              {getNextResponsibleRole(caseItem.status) && (
                <div className="pending-indicator">
                  <span className="pending-icon">⏳</span>
                  <span
                  className="pending-text"
                  title="Click to view Role-Based Permission Matrix">
                    Awaiting: {getNextResponsibleRole(caseItem.status)}
                    </span>
                    </div>
                  )}
                  </div>
                  </div>
                  </div>
                  <div className="case-meta">
            <span data-testid="case-procedure">Procedure Type: {caseItem.procedureType}</span>
            <span>Procedure Name: {caseItem.procedureName || 'Not specified'}</span>
            <span data-testid="case-date">Surgery Date: {formatDate(caseItem.dateOfSurgery)}</span>
            <span data-testid="case-hospital">Hospital: {caseItem.hospital}</span>
            <span>Department: {caseItem.department}</span>
            {currentUser?.role === 'admin' && (
              <span data-testid="case-country">Country: {caseItem.country}</span>
            )}
          </div>
        <div className="expand-icon">
          {expandedCases.has(caseItem.id) ? '▼' : '▶'}
        </div>
      </div>

      {expandedCases.has(caseItem.id) && (
        <div className="case-details">
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Submission Date: </span>
              <span className="detail-value">{formatDate(caseItem.submittedAt)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Surgery Date: </span>
              <span className="detail-value">{formatDate(caseItem.dateOfSurgery)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Time of Procedure: </span>
              <span className="detail-value">{caseItem.timeOfProcedure || 'Not specified'}</span>
            </div>
            {caseItem.doctorName && (
              <div className="detail-item">
                <span className="detail-label">Doctor Name: </span>
                <span className="detail-value" data-testid="case-doctor">{caseItem.doctorName}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Surgery Set Selection: </span>
              <ul className="detail-value">
                {(caseItem.surgerySetSelection || []).map(set => {
                  const quantity = caseQuantities[set] || 1; // Default to 1 if not found
                  return (
                    <li key={set} className="set-item-with-quantity">
                      <span className="set-name">{set}</span>
                      <span className="quantity-badge" data-testid="surgery-set-quantity" title={`Quantity: ${quantity}`}>
                        ×{quantity}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="detail-item">
              <span className="detail-label">Implant Box: </span>
              <ul className="detail-value">
                {(caseItem.implantBox || []).map(box => {
                  const quantity = caseQuantities[box] || 1; // Default to 1 if not found
                  return (
                    <li key={box} className="set-item-with-quantity">
                      <span className="set-name">{box}</span>
                      <span className="quantity-badge" data-testid="implant-box-quantity" title={`Quantity: ${quantity}`}>
                        ×{quantity}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            {caseItem.specialInstruction && (
              <div className="detail-item full-width">
                <span className="detail-label">Special Instructions: </span>
                <p className="detail-value">{caseItem.specialInstruction}</p>
              </div>
            )}
            {caseItem.attachments && caseItem.attachments.length > 0 && (
              <div className="detail-item full-width">
                <span className="detail-label">Case Attachments: </span>
                <EditableAttachmentRenderer 
                  attachments={caseItem.attachments} 
                  title="Case Attachments"
                  showCount={true}
                  maxThumbnailSize={{ width: 100, height: 75 }}
                  onAttachmentsChange={(newAttachments) => onCaseAttachmentsChange(caseItem.id, newAttachments)}
                  canEdit={true}
                  currentUser={currentUser || undefined}
                />
              </div>
            )}
            
            {/* FIXED: Display current status comments for Sales Approved and Order Prepared */}
            {currentComments && (
              <div className="detail-item full-width">
                <span className="detail-label">
                  {caseItem.status === 'Sales Approved' ? 'Sales Approved Comments' : 
                   caseItem.status === 'Order Prepared' ? 'Order Prepared Comments' : 
                   'Status Comments'}: 
                </span>
                <div className="status-comments" style={{
                  background: '#f8f9fa',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #dee2e6',
                  marginTop: '8px',
                  fontStyle: 'italic',
                  color: '#495057'
                }}>
                  {currentComments}
                </div>
              </div>
            )}
            
            {/* Removed duplicate status attachments section as they're already included in case attachments */}
            
            {caseItem.amendmentHistory && caseItem.amendmentHistory.length > 0 && (
              <div className="detail-item full-width amendment-history">
                <div className="amendment-header-container">
                  <span className="amendment-badge">AMENDED</span>
                  <button
                    onClick={() => onToggleAmendmentHistory(caseItem.id)}
                    className="btn btn-outline-secondary btn-sm expand-amendment-button"
                  >
                    {expandedAmendmentHistory.has(caseItem.id)
                      ? 'Hide Amendment History'
                      : 'View Amendment History'
                    }
                  </button>
                </div>
                {expandedAmendmentHistory.has(caseItem.id) && (
                  <div className="amendment-content">
                    {caseItem.amendmentHistory && caseItem.amendmentHistory.length > 0 ? (
                      caseItem.amendmentHistory.map((amendment, index) => (
                      <div key={amendment.amendmentId} className="amendment-entry">
                        <div className="amendment-header">
                          <strong>Amendment #{index + 1}</strong>
                          <div className="amendment-meta">
                            <span>By: {getUserName(amendment.amendedBy)}</span>
                            <span>At: {formatDateTime(amendment.timestamp)}</span>
                          </div>
                        </div>

                        {amendment.reason && (
                          <div className="amendment-reason">
                            <strong>Reason:</strong> {amendment.reason}
                          </div>
                        )}

                        <div className="amendment-changes">
                          <strong>Changes:</strong>
                          <div className="changes-grid">
                            {(amendment.changes || []).map((change, changeIndex) => {
                              // Determine change type based on old and new values
                              const isAddition = !change.oldValue && change.newValue;
                              const isRemoval = change.oldValue && !change.newValue;
                              const isModification = change.oldValue && change.newValue;
                              
                              return (
                                <div key={changeIndex} className={`change-item ${isAddition ? 'change-addition' : isRemoval ? 'change-removal' : 'change-modification'}`}>
                                  <span className="change-field">{change.field}: </span>
                                  {isAddition && (
                                    <span className="change-to change-added">+ {change.newValue}</span>
                                  )}
                                  {isRemoval && (
                                    <span className="change-from change-removed">- {change.oldValue}</span>
                                  )}
                                  {isModification && (
                                    <>
                                      <span className="change-from">{change.oldValue} </span>
                                      <span className="change-arrow"> → </span>
                                      <span className="change-to">{change.newValue} </span>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      ))
                    ) : (
                      <div className="no-amendments">
                        <p>No amendment history available for this case.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {caseItem.processedBy && (
              <div className="detail-item prepared-by">
                <strong>Prepared by:</strong> {getUserName(caseItem.processedBy)}
              </div>
            )}
            {caseItem.processedAt && (
              <div className="detail-item prepared-at">
                <strong>Prepared at:</strong> {formatDateTime(caseItem.processedAt)}
              </div>
            )}
            {caseItem.statusHistory && caseItem.statusHistory.length > 1 && (
              <div className="detail-item full-width">
                <div className="status-history-header-container">
                  <strong>Status Updates:</strong>
                  {caseItem.statusHistory.length > 1 && (
                    <button
                      onClick={() => onToggleStatusHistory(caseItem.id)}
                      className="btn btn-outline-secondary btn-sm expand-history-button"
                    >
                      {expandedStatusHistory.has(caseItem.id)
                        ? `Hide History (${caseItem.statusHistory.length - 1} previous)`
                        : `View History (${caseItem.statusHistory.length - 1} previous)`
                      }
                    </button>
                  )}
                </div>
                <div className="status-history">
                  {expandedStatusHistory.has(caseItem.id)
                    ? caseItem.statusHistory.map((historyItem, index) => (
                        <div key={index} className="status-history-item" style={{ borderLeftColor: getStatusColor(historyItem.status) }}>
                          <div className="status-history-header">
                            <span
                              className="history-status"
                              style={{ backgroundColor: getStatusColor(historyItem.status) }}
                            >
                              {historyItem.status}
                            </span>
                            <span className="history-timestamp">{formatDateTime(historyItem.timestamp)}</span>
                          </div>
                          <div className="history-details">
                            <span className="history-processor">By: {getUserName(historyItem.processedBy)}</span>
                            {historyItem.details && (
                              <div className="history-notes">
                                {(() => {
                                  try {
                                    const parsedDetails = JSON.parse(historyItem.details);
                                    if (parsedDetails.deliveryDetails || (parsedDetails.comments && !parsedDetails.orderSummary && !parsedDetails.processDetails)) {
                                      // Handle both old format (deliveryDetails/deliveryImage) and new format (comments/attachments) for Delivered (Hospital)
                                      const isOldFormat = parsedDetails.deliveryDetails;
                                      const comments = isOldFormat ? parsedDetails.deliveryDetails : parsedDetails.comments;
                                      const attachments = isOldFormat ?
                                        (parsedDetails.deliveryImage ? [JSON.stringify({
                                          name: 'delivery-image.png',
                                          type: 'image/png',
                                          data: parsedDetails.deliveryImage
                                        })] : []) :
                                        (parsedDetails.attachments || []);

                                      return (
                                        <div>
                                          <strong>Delivery Details:</strong> {comments}
                                          {/* ⚠️ FIXED: Replaced duplicated attachment rendering with centralized AttachmentRenderer */}
                                          <AttachmentRenderer 
                                            attachments={attachments} 
                                            title="Attachments"
                                            showCount={true}
                                          />
                                        </div>
                                      );
                                    } else if (parsedDetails.orderSummary || parsedDetails.doNumber) {
                                      return (
                                        <div>
                                          {parsedDetails.orderSummary && (
                                            <div><strong>Order Summary:</strong> {parsedDetails.orderSummary}</div>
                                          )}
                                          {parsedDetails.doNumber && (
                                            <div><strong>DO Number:</strong> {parsedDetails.doNumber}</div>
                                          )}
                                          {parsedDetails.attachments && parsedDetails.attachments.length > 0 && (
                                            <AttachmentRenderer 
                                              attachments={parsedDetails.attachments} 
                                              title="Attachments"
                                              showCount={true}
                                            />
                                          )}
                                        </div>
                                      );
                                    } else if (parsedDetails.processDetails) {
                                      return (
                                        <div>
                                          <strong>Process Details:</strong> {parsedDetails.processDetails}
                                          {parsedDetails.attachments && parsedDetails.attachments.length > 0 && (
                                            <AttachmentRenderer 
                                              attachments={parsedDetails.attachments} 
                                              title="Attachments"
                                              showCount={true}
                                            />
                                          )}
                                          {parsedDetails.comments && (
                                            <div><strong>Comments:</strong> {parsedDetails.comments}</div>
                                          )}
                                        </div>
                                      );
                                    } else if (parsedDetails.attachments || parsedDetails.comments) {
                                      return (
                                        <div>
                                          {parsedDetails.comments && (
                                            <div><strong>Comments:</strong> {parsedDetails.comments}</div>
                                          )}
                                          {parsedDetails.attachments && parsedDetails.attachments.length > 0 && (
                                            <AttachmentRenderer 
                                              attachments={parsedDetails.attachments} 
                                              title="Attachments"
                                              showCount={true}
                                            />
                                          )}
                                        </div>
                                      );
                                    } else {
                                      // For any other structured data, show it in a readable format
                                      return (
                                        <div>
                                          {Object.entries(parsedDetails).map(([key, value]) => (
                                            <div key={key}>
                                              <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong>
                                              {key === 'attachments' && Array.isArray(value) && value.length > 0 ? (
                                                <AttachmentRenderer 
                                                  attachments={value} 
                                                  title=""
                                                  showCount={true}
                                                />
                                              ) : (
                                                <span> {
                                                  typeof value === 'object' ?
                                                    (Array.isArray(value) ? `${value.length} item(s)` : JSON.stringify(value)) :
                                                    String(value)
                                                }</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                    //   return <div><strong>Comments:</strong> {comments}</div>;
                                    // }
                                  } catch {
                                    return <div>{historyItem.details}</div>;
                                  }
                                })()}
                              </div>
                            )}
                            <StatusAttachmentManager
                              historyItem={{
                                id: historyItem.id, // Use real database ID, not fake composite ID
                                attachments: historyItem.attachments,
                                status: historyItem.status,
                                timestamp: historyItem.timestamp, // ⚠️ timestamp field
                                processed_by: historyItem.processedBy || 'System' // ⚠️ processed_by (processedBy)
                              }}
                              caseId={caseItem.id}
                              canEdit={currentUser?.role === 'admin' || currentUser?.role === 'operations-manager'}
                              onAttachmentsUpdated={() => {
                                // Refresh the case data
                                window.location.reload();
                              }}
                            />
                          </div>
                        </div>
                      ))
                    : caseItem.statusHistory.slice(-1).map((historyItem, index) => (
                        <div key={index} className="status-history-item current-status" style={{ borderLeftColor: getStatusColor(historyItem.status) }}>
                          <div className="status-history-header">
                            <span
                              className="history-status current"
                              style={{ backgroundColor: getStatusColor(historyItem.status) }}
                            >
                              {historyItem.status} (Current)
                            </span>
                            <span className="history-timestamp">{formatDateTime(historyItem.timestamp)}</span>
                          </div>
                          <div className="history-details">
                            <span className="history-processor">By: {getUserName(historyItem.processedBy)}</span>
                            {historyItem.details && (
                              <div className="history-notes">
                                {(() => {
                                  try {
                                    const parsedDetails = JSON.parse(historyItem.details);
                                    if (parsedDetails.deliveryDetails || (parsedDetails.comments && !parsedDetails.orderSummary && !parsedDetails.processDetails)) {
                                      // Handle both old format (deliveryDetails/deliveryImage) and new format (comments/attachments) for Delivered (Hospital)
                                      const isOldFormat = parsedDetails.deliveryDetails;
                                      const comments = isOldFormat ? parsedDetails.deliveryDetails : parsedDetails.comments;
                                      const attachments = isOldFormat ?
                                        (parsedDetails.deliveryImage ? [JSON.stringify({
                                          name: 'delivery-image.png',
                                          type: 'image/png',
                                          data: parsedDetails.deliveryImage
                                        })] : []) :
                                        (parsedDetails.attachments || []);

                                      return (
                                        <div>
                                          <strong>Delivery Details:</strong> {comments}
                                          {/* ⚠️ FIXED: Replaced duplicated attachment rendering with centralized AttachmentRenderer */}
                                          <AttachmentRenderer 
                                            attachments={attachments} 
                                            title="Attachments"
                                            showCount={true}
                                          />
                                        </div>
                                      );
                                    } else if (parsedDetails.orderSummary || parsedDetails.doNumber) {
                                      return (
                                        <div>
                                          {parsedDetails.orderSummary && (
                                            <div><strong>Order Summary:</strong> {parsedDetails.orderSummary}</div>
                                          )}
                                          {parsedDetails.doNumber && (
                                            <div><strong>DO Number:</strong> {parsedDetails.doNumber}</div>
                                          )}
                                          {parsedDetails.attachments && parsedDetails.attachments.length > 0 && (
                                            <AttachmentRenderer 
                                              attachments={parsedDetails.attachments} 
                                              title="Attachments"
                                              showCount={true}
                                            />
                                          )}
                                        </div>
                                      );
                                    } else if (parsedDetails.processDetails) {
                                      return (
                                        <div>
                                          <strong>Process Details:</strong> {parsedDetails.processDetails}
                                          {parsedDetails.attachments && parsedDetails.attachments.length > 0 && (
                                            <AttachmentRenderer 
                                              attachments={parsedDetails.attachments} 
                                              title="Attachments"
                                              showCount={true}
                                            />
                                          )}
                                          {parsedDetails.comments && (
                                            <div><strong>Comments:</strong> {parsedDetails.comments}</div>
                                          )}
                                        </div>
                                      );
                                    } else if (parsedDetails.attachments || parsedDetails.comments) {
                                      return (
                                        <div>
                                          {parsedDetails.comments && (
                                            <div><strong>Comments:</strong> {parsedDetails.comments}</div>
                                          )}
                                          {parsedDetails.attachments && parsedDetails.attachments.length > 0 && (
                                            <AttachmentRenderer 
                                              attachments={parsedDetails.attachments} 
                                              title="Attachments"
                                              showCount={true}
                                            />
                                          )}
                                        </div>
                                      );
                                    } else {
                                      // For any other structured data, show it in a readable format
                                      return (
                                        <div>
                                          {Object.entries(parsedDetails).map(([key, value]) => (
                                            <div key={key}>
                                              <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong>
                                              {key === 'attachments' && Array.isArray(value) && value.length > 0 ? (
                                                <AttachmentRenderer 
                                                  attachments={value} 
                                                  title=""
                                                  showCount={true}
                                                />
                                              ) : (
                                                <span> {
                                                  typeof value === 'object' ?
                                                    (Array.isArray(value) ? `${value.length} item(s)` : JSON.stringify(value)) :
                                                    String(value)
                                                }</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                    //   return <div><strong>Comments:</strong> {comments}</div>;
                                    // }
                                  } catch {
                                    return <div>{historyItem.details}</div>;
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                  }
                </div>
              </div>
            )}
          </div>

          {/* Amendment Form - DISABLED: Use modal AmendmentForm instead */}
          {false && amendingCase === caseItem.id && (
            <div className="amendment-form">
              <h4>Amend Case Details</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Hospital:</label>
                  <input
                    type="text"
                    value={amendmentData.hospital || ''}
                    onChange={(e) => onAmendmentDataChange({ ...amendmentData, hospital: e.target.value })}
                  />
                  {getOriginalValueDisplay('hospital', amendmentData.hospital, caseItem.originalValues?.hospital)}
                </div>
                <div className="form-group">
                  <label>Department:</label>
                  <select
                    value={amendmentData.department || ''}
                    onChange={(e) => onAmendmentDataChange({ ...amendmentData, department: e.target.value })}
                  >
                    <option value="">Select Department</option>
                    {availableDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {getOriginalValueDisplay('department', amendmentData.department, caseItem.originalValues?.department)}
                </div>
                <div className="form-group">
                  <label>Date of Surgery:</label>
                  <input
                    type="date"
                    value={amendmentData.dateOfSurgery || ''}
                    onChange={(e) => onAmendmentDataChange({ ...amendmentData, dateOfSurgery: e.target.value })}
                    min={getTodayForInput()}
                    required
                  />
                  {getOriginalValueDisplay('dateOfSurgery', amendmentData.dateOfSurgery, caseItem.originalValues?.dateOfSurgery)}
                </div>
                <div className="form-group">
                  <label>Procedure Type:</label>
                  <select
                    value={amendmentData.procedureType || ''}
                    onChange={(e) => onAmendmentDataChange({ ...amendmentData, procedureType: e.target.value })}
                  >
                    <option value="">Select Procedure Type</option>
                    {availableProcedureTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {getOriginalValueDisplay('procedureType', amendmentData.procedureType, caseItem.originalValues?.procedureType)}
                </div>
                <div className="form-group">
                  <label>Doctor Name:</label>
                  <input
                    type="text"
                    value={amendmentData.doctorName || ''}
                    onChange={(e) => onAmendmentDataChange({ ...amendmentData, doctorName: e.target.value })}
                  />
                  {getOriginalValueDisplay('doctorName', amendmentData.doctorName, caseItem.originalValues?.doctorName)}
                </div>
                <div className="form-group">
                  <label>Time of Procedure:</label>
                  <TimePicker
                    value={amendmentData.timeOfProcedure || ''}
                    onChange={(value) => onAmendmentDataChange({ ...amendmentData, timeOfProcedure: value })}
                    placeholder="Select procedure time"
                    step={15}
                  />
                  {getOriginalValueDisplay('timeOfProcedure', amendmentData.timeOfProcedure, caseItem.originalValues?.timeOfProcedure)}
                </div>
                <div className="form-group full-width">
                  <label>Special Instructions:</label>
                  <textarea
                    value={amendmentData.specialInstruction || ''}
                    onChange={(e) => onAmendmentDataChange({ ...amendmentData, specialInstruction: e.target.value })}
                    rows={3}
                  />
                  {getOriginalValueDisplay('specialInstruction', amendmentData.specialInstruction, caseItem.originalValues?.specialInstruction)}
                </div>
                <div className="form-group full-width">
                  <label>Amendment Reason: <span style={{color: 'red'}}>*</span></label>
                  <textarea
                    value={amendmentData.amendmentReason || ''}
                    onChange={(e) => onAmendmentDataChange({ ...amendmentData, amendmentReason: e.target.value })}
                    rows={2}
                    placeholder="Please explain why this case needs to be amended..."
                    required
                  />
                </div>
              </div>
              <div className="amendment-actions">
                <button
                  onClick={() => {
                    if (!amendmentData.amendmentReason || !amendmentData.amendmentReason.trim()) {
                      alert('Amendment reason is required. Please provide a reason for this amendment.');
                      return;
                    }
                    onSaveAmendment({ ...amendmentData, caseId: caseItem.id });
                  }}
                  className="btn btn-primary btn-md save-amendment-button"
                >
                  Save Amendment
                </button>
                <button
                  onClick={onCancelAmendment}
                  className="btn btn-outline-secondary btn-md cancel-amendment-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Processing Form */}
          {processingCase === caseItem.id && (
            <div className="sales-approval-form">
              <h4>Order Processing Details</h4>
              <div className="form-group">
                <label>Enter processing details:</label>
                <textarea
                  value={processDetails}
                  onChange={(e) => onProcessDetailsChange(e.target.value)}
                  placeholder="Enter order processing details, preparation notes, and any additional requirements..."
                  rows={4}
                  className="process-details-input"
                />
              </div>
              <div className="form-group">
                <label>Attachments (Optional):</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      const newAttachments: string[] = [];
                      Array.from(files).forEach(file => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const fileData = {
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            data: reader.result,
                            uploadedAt: new Date().toISOString(),
                            uploadedBy: currentUser?.name || 'Unknown'
                          };
                          newAttachments.push(JSON.stringify(fileData));
                          if (newAttachments.length === files.length) {
                            onProcessAttachmentsChange([...processAttachments, ...newAttachments]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                  className="file-upload-input"
                />
                {processAttachments.length > 0 && (
                  <EditableAttachmentRenderer 
                    attachments={processAttachments} 
                    title="Uploaded files"
                    showCount={true}
                    maxThumbnailSize={{ width: 50, height: 50 }}
                    onAttachmentsChange={(newAttachments) => onProcessAttachmentsChange(newAttachments)}
                    canEdit={true}
                    currentUser={currentUser || undefined}
                  />
                )}
              </div>
              <div className="sales-approval-actions">
                <button
                  onClick={() => onSaveProcessDetails(caseItem.id)}
                  className="btn btn-primary btn-md primary-button"
                  disabled={!processDetails.trim()}
                >
                  Complete Processing
                </button>
                <button
                  onClick={onCancelProcessing}
                  className="btn btn-outline-secondary btn-md cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Sales Approved Form */}
          {salesApprovalCase === caseItem.id && (
            <div className="sales-approval-form">
              <h4>Sales Approved</h4>
              <div className="form-group">
                <label>Comments (Optional):</label>
                <textarea
                  value={salesApprovalComments}
                  onChange={(e) => onSalesApprovalCommentsChange(e.target.value)}
                  placeholder="Enter sales approval comments, notes, or any additional information..."
                  rows={4}
                  className="process-details-input"
                />
              </div>
              <div className="form-group">
                <label>Attachments (Optional):</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      const newAttachments: string[] = [];
                      Array.from(files).forEach((file, index) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const fileData = {
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            data: reader.result,
                            uploadedAt: new Date().toISOString(),
                            uploadedBy: currentUser?.name || 'Unknown'
                          };
                          newAttachments.push(JSON.stringify(fileData));
                          if (newAttachments.length === files.length) {
                            onSalesApprovalAttachmentsChange([...salesApprovalAttachments, ...newAttachments]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                  className="file-upload-input"
                />
                {salesApprovalAttachments.length > 0 && (
                  <EditableAttachmentRenderer 
                    attachments={salesApprovalAttachments} 
                    title="Uploaded files"
                    showCount={true}
                    maxThumbnailSize={{ width: 100, height: 75 }}
                    onAttachmentsChange={(newAttachments) => onSalesApprovalAttachmentsChange(newAttachments)}
                    canEdit={true}
                    currentUser={currentUser || undefined}
                  />
                )}
              </div>
              <div className="sales-approval-actions">
                <button
                  onClick={() => onSaveSalesApproval(caseItem.id)}
                  className="btn btn-primary btn-md primary-button"
                >
                  Submit for Sales Approved
                </button>
                <button
                  onClick={onCancelSalesApproval}
                  className="btn btn-outline-secondary btn-md cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Order Prepared Form */}
          {orderPreparedCase === caseItem.id && (
            <div className="sales-approval-form">
              <h4>Order Prepared Details</h4>
              <div className="form-group">
                <label>Comments (Required):</label>
                <textarea
                  value={orderPreparedComments}
                  onChange={(e) => onOrderPreparedCommentsChange(e.target.value)}
                  placeholder="Enter order preparation details, completion notes, and any additional information..."
                  rows={4}
                  className="process-details-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>Attachments (Optional):</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      const newAttachments: string[] = [];
                      Array.from(files).forEach((file, index) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const fileData = {
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            data: reader.result,
                            uploadedAt: new Date().toISOString(),
                            uploadedBy: currentUser?.name || 'Unknown'
                          };
                          newAttachments.push(JSON.stringify(fileData));
                          if (newAttachments.length === files.length) {
                            onOrderPreparedAttachmentsChange([...orderPreparedAttachments, ...newAttachments]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                  className="file-upload-input"
                />
                {orderPreparedAttachments.length > 0 && (
                  <EditableAttachmentRenderer 
                    attachments={orderPreparedAttachments} 
                    title="Uploaded files"
                    showCount={true}
                    maxThumbnailSize={{ width: 50, height: 50 }}
                    onAttachmentsChange={(newAttachments) => onOrderPreparedAttachmentsChange(newAttachments)}
                    canEdit={true}
                    currentUser={currentUser || undefined}
                  />
                )}
              </div>
              <div className="sales-approval-actions">
                <button
                  onClick={() => onSaveOrderPrepared(caseItem.id)}
                  className="btn btn-primary btn-md primary-button"
                  disabled={!orderPreparedComments.trim()}
                >
                  Mark as Order Prepared
                </button>
                <button
                  onClick={onCancelOrderPrepared}
                  className="btn btn-outline-secondary btn-md cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Hospital Delivery Form */}
          {hospitalDeliveryCase === caseItem.id && (
            <div className="sales-approval-form">
              <h4>Pending Delivery to Hospital</h4>
              <div className="form-group">
                <label>Comments (Optional):</label>
                <textarea
                  value={hospitalDeliveryComments}
                  onChange={(e) => onHospitalDeliveryCommentsChange(e.target.value)}
                  placeholder="Add any delivery notes or special instructions..."
                  rows={4}
                  className="process-details-input"
                />
              </div>
              <div className="form-group">
                <label>Attachments (Optional):</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      const newAttachments: string[] = [];
                      Array.from(files).forEach((file, index) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const fileData = {
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            data: reader.result,
                            uploadedAt: new Date().toISOString(),
                            uploadedBy: currentUser?.name || 'Unknown'
                          };
                          newAttachments.push(JSON.stringify(fileData));
                          if (newAttachments.length === files.length) {
                            onHospitalDeliveryAttachmentsChange([...hospitalDeliveryAttachments, ...newAttachments]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                  className="file-upload-input"
                />
                {hospitalDeliveryAttachments.length > 0 && (
                  <EditableAttachmentRenderer 
                    attachments={hospitalDeliveryAttachments} 
                    title="Uploaded files"
                    showCount={true}
                    maxThumbnailSize={{ width: 50, height: 50 }}
                    onAttachmentsChange={(newAttachments) => onHospitalDeliveryAttachmentsChange(newAttachments)}
                    canEdit={true}
                    currentUser={currentUser || undefined}
                  />
                )}
              </div>
              <div className="sales-approval-actions">
                <button
                  onClick={() => onSaveHospitalDelivery(caseItem.id)}
                  className="btn btn-primary btn-md primary-button"
                >
                  Mark as Pending Delivery
                </button>
                <button
                  onClick={onCancelHospitalDelivery}
                  className="btn btn-outline-secondary btn-md cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Received Form */}
          {receivedCase === caseItem.id && (
            <div className="sales-approval-form">
              <h4>Order Received at Hospital</h4>
              <div className="form-group">
                <label>Delivery Details:</label>
                <textarea
                  value={receivedDetails}
                  onChange={(e) => onReceivedDetailsChange(e.target.value)}
                  placeholder="Enter delivery details, condition of items, any issues encountered..."
                  rows={4}
                  className="received-details-input"
                />
              </div>
              <div className="form-group">
                <label>Delivery Image (Optional):</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => onReceivedImageChange(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="image-upload"
                />
                {receivedImage && (
                  <div className="image-preview">
                    <img src={receivedImage} alt="Delivery" style={{maxWidth: '200px', maxHeight: '200px'}} />
                  </div>
                )}
              </div>
              <div className="sales-approval-actions">
                <button
                  onClick={() => onSaveOrderReceived(caseItem.id)}
                  className="btn btn-primary btn-md primary-button"
                  disabled={!receivedDetails.trim()}
                >
                  Confirm Received
                </button>
                <button
                  onClick={onCancelReceived}
                  className="btn btn-outline-secondary btn-md cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Completed Form */}
          {completedCase === caseItem.id && (
            <div className="sales-approval-form">
              <h4>Case Completion</h4>
              <div className="form-group">
                <label>Attachments (Optional):</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                  onChange={onAttachmentUpload}
                  className="file-upload-input"
                />
                {attachments.length > 0 && (
                  <EditableAttachmentRenderer 
                    attachments={attachments} 
                    title="Uploaded files"
                    showCount={true}
                    maxThumbnailSize={{ width: 50, height: 50 }}
                    onAttachmentsChange={(newAttachments) => onCompletedAttachmentsChange(newAttachments)}
                    canEdit={true}
                    currentUser={currentUser || undefined}
                  />
                )}
              </div>
              <div className="form-group">
                <label>Order Summary:</label>
                <textarea
                  value={orderSummary}
                  onChange={(e) => onOrderSummaryChange(e.target.value)}
                  placeholder="Provide a comprehensive summary of the completed order..."
                  rows={4}
                  className="summary-input"
                />
              </div>
              <div className="form-group">
                <label>DO Number:</label>
                <input
                  type="text"
                  value={doNumber}
                  onChange={(e) => onDoNumberChange(e.target.value)}
                  placeholder="Enter delivery order number"
                  className="do-number-input"
                />
              </div>
              <div className="sales-approval-actions">
                <button
                  onClick={() => onSaveCaseCompleted(caseItem.id)}
                  className="btn btn-primary btn-md primary-button"
                  disabled={!orderSummary.trim() || !doNumber.trim()}
                >
                  Complete Case
                </button>
                <button
                  onClick={onCancelCompleted}
                  className="btn btn-outline-secondary btn-md cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Pending Delivery (Office) Form */}
          {pendingOfficeCase === caseItem.id && (
            <div className="sales-approval-form">
              <h4>Pending Delivery to Office</h4>
              <div className="form-group">
                <label>Attachments (Optional):</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      const newAttachments: string[] = [];
                      Array.from(files).forEach(file => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const fileData = {
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            data: reader.result as string
                          };
                          newAttachments.push(JSON.stringify(fileData));
                          if (newAttachments.length === files.length) {
                            onPendingOfficeAttachmentsChange([...pendingOfficeAttachments, ...newAttachments]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                  className="file-upload-input"
                />
                {pendingOfficeAttachments.length > 0 && (
                  <EditableAttachmentRenderer 
                    attachments={pendingOfficeAttachments} 
                    title="Uploaded files"
                    showCount={true}
                    maxThumbnailSize={{ width: 50, height: 50 }}
                    onAttachmentsChange={(newAttachments) => onPendingOfficeAttachmentsChange(newAttachments)}
                    canEdit={true}
                    currentUser={currentUser || undefined}
                  />
                )}
              </div>
              <div className="form-group">
                <label>Comments (Optional):</label>
                <textarea
                  value={pendingOfficeComments}
                  onChange={(e) => onPendingOfficeCommentsChange(e.target.value)}
                  placeholder="Add any additional comments or notes..."
                  rows={3}
                  className="comments-input"
                />
              </div>
              <div className="sales-approval-actions">
                <button
                  onClick={() => onSavePendingOffice(caseItem.id)}
                  className="btn btn-primary btn-md primary-button"
                >
                  Mark as Pending Delivery (Office)
                </button>
                <button
                  onClick={onCancelPendingOffice}
                  className="btn btn-outline-secondary btn-md cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Office Delivery Form */}
          {officeDeliveryCase === caseItem.id && (
            <div className="sales-approval-form">
              <h4>Delivery to Office</h4>
              <div className="form-group">
                <label>Comments (Optional):</label>
                <textarea
                  value={officeDeliveryComments}
                  onChange={(e) => onOfficeDeliveryCommentsChange(e.target.value)}
                  placeholder="Add any delivery notes or special instructions..."
                  rows={4}
                  className="process-details-input"
                />
              </div>
              <div className="form-group">
                <label>Attachments (Optional):</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      const newAttachments: string[] = [];
                      Array.from(files).forEach((file, index) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const fileData = {
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            data: reader.result,
                            uploadedAt: new Date().toISOString(),
                            uploadedBy: currentUser?.name || 'Unknown'
                          };
                          newAttachments.push(JSON.stringify(fileData));
                          if (newAttachments.length === files.length) {
                            onOfficeDeliveryAttachmentsChange([...officeDeliveryAttachments, ...newAttachments]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                  className="file-upload-input"
                />
                {officeDeliveryAttachments.length > 0 && (
                  <EditableAttachmentRenderer 
                    attachments={officeDeliveryAttachments} 
                    title="Uploaded files"
                    showCount={true}
                    maxThumbnailSize={{ width: 50, height: 50 }}
                    onAttachmentsChange={(newAttachments) => onOfficeDeliveryAttachmentsChange(newAttachments)}
                    canEdit={true}
                    currentUser={currentUser || undefined}
                  />
                )}
              </div>
              <div className="sales-approval-actions">
                <button
                  onClick={() => onSaveOfficeDelivery(caseItem.id)}
                  className="btn btn-primary btn-md primary-button"
                >
                  Mark as Delivered (Office)
                </button>
                <button
                  onClick={onCancelOfficeDelivery}
                  className="btn btn-outline-secondary btn-md cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}


          <CaseActions
            caseItem={caseItem}
            currentUser={currentUser}
            onStatusChange={onStatusChange}
            onAmendCase={onAmendCase}
            onDeleteCase={onDeleteCase}
            onOrderProcessed={onOrderProcessed}
            onMarkOrderProcessed={onMarkOrderProcessed}
            onSalesApproval={onSalesApproval}
            onOrderDelivered={onOrderDelivered}
            onOrderReceived={onOrderReceived}
            onCaseCompleted={onCaseCompleted}
            onPendingDeliveryOffice={onPendingDeliveryOffice}
            onOfficeDelivery={onOfficeDelivery}
            onOrderDeliveredOffice={onOrderDeliveredOffice}
            onToBeBilled={onToBeBilled}
            onCancelCase={onCancelCase}
            canAmendCase={canAmendCase}
          />
        </div>
      )}
    </div>
  );
};

export default CaseCard;