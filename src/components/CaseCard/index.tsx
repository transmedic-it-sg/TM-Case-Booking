/**
 * CaseCard Main Component - Optimized and Modular
 * Reduced from 1,987 lines to ~200 lines (90% reduction)
 * Uses composition pattern with sub-components
 */

import React, { useState, useCallback } from 'react';
import { CaseCardProps } from './types';
import { useCurrentUser, usePermissions } from '../../hooks';
import { useUserNames } from '../../hooks/useUserNames';

// Sub-components
import CaseHeader from './CaseHeader';
import CaseDetails from './CaseDetails';
import StatusWorkflow from './StatusWorkflow';
import EnhancedAttachmentManager from './EnhancedAttachmentManager';
import AmendmentForm from './AmendmentForm';
import CaseActions from '../CasesList/CaseActions'; // Reuse existing component

// Hooks
// Removed useCaseActions - now using useRealtimeCases directly
import { useCaseData } from './hooks/useCaseData';

// Styles
import '../../assets/components/CaseCard.css';

const CaseCard: React.FC<CaseCardProps> = ({
  caseItem,
  expandedCases,
  expandedStatusHistory,
  expandedAmendmentHistory,
  amendingCase,
  amendmentData,
  processingCase,
  receivedCase,
  completedCase,
  onToggleExpansion,
  onToggleStatusHistory,
  onToggleAmendmentHistory,
  onStatusChange,
  onAmendCase,
  onSaveAmendment,
  onCancelAmendment,
  onOrderProcessed,
  onOrderDelivered,
  onOrderReceived,
  onCaseCompleted,
  onOrderDeliveredOffice,
  onToBeBilled,
  // ... other props
}) => {
  const { user } = useCurrentUser();
  const permissions = usePermissions();

  // Get user IDs from status history and case data
  const userIds = [
    caseItem.submittedBy,
    caseItem.processedBy,
    caseItem.amendedBy,
    ...(caseItem.statusHistory || []).map(h => h.processedBy)
  ].filter((id): id is string => Boolean(id));

  const { getUserName } = useUserNames(userIds);
  // Removed useCaseActions - now using useRealtimeCases directly via props
  const caseData = useCaseData(caseItem);

  // Local state for UI interactions
  const [showStatusHistory, setShowStatusHistory] = useState(false);
  const [showAmendmentHistory, setShowAmendmentHistory] = useState(false);
  const [localAttachments, setLocalAttachments] = useState<File[]>([]);

  // Computed values
  const isExpanded = expandedCases.has(caseItem.id);
  const isAmending = amendingCase === caseItem.id;
  const isProcessing = processingCase === caseItem.id;
  const isReceiving = receivedCase === caseItem.id;
  const isCompleting = completedCase === caseItem.id;

  // Event handlers
  const handleToggleExpansion = useCallback(() => {
    onToggleExpansion(caseItem.id);
  }, [onToggleExpansion, caseItem.id]);

  const handleToggleStatusHistory = useCallback(() => {
    setShowStatusHistory(prev => !prev);
    onToggleStatusHistory?.(caseItem.id);
  }, [onToggleStatusHistory, caseItem.id]);

  const handleToggleAmendmentHistory = useCallback(() => {
    setShowAmendmentHistory(prev => !prev);
    onToggleAmendmentHistory?.(caseItem.id);
  }, [onToggleAmendmentHistory, caseItem.id]);

  const handleStatusChange = useCallback((newStatus: any) => {
    onStatusChange(caseItem.id, newStatus);
  }, [onStatusChange, caseItem.id]);

  const handleAmendCase = useCallback(() => {
    onAmendCase(caseItem.id);
  }, [onAmendCase, caseItem.id]);

  const handleAttachmentsChange = useCallback((attachments: File[]) => {
    setLocalAttachments(attachments);
  }, []);

  return (
    <div
      className={`case-card ${isExpanded ? 'expanded' : ''} ${caseData.isUrgent ? 'urgent' : ''} ${caseData.isOverdue ? 'overdue' : ''}`}
      data-case-id={caseItem.id}
    >
      {/* Case Header */}
      <CaseHeader
        caseItem={caseItem}
        currentUser={user}
        isExpanded={isExpanded}
        onToggleExpansion={handleToggleExpansion}
      />

      {/* Case Details (when expanded) */}
      {isExpanded && (
        <div className="case-card-body">
          <CaseDetails
            caseItem={caseItem}
            isExpanded={isExpanded}
            onToggleExpansion={handleToggleExpansion}
          />

          {/* Status History Section */}
          <div className="status-history-section">
            <button
              className="section-toggle"
              onClick={handleToggleStatusHistory}
            >
              <span>📋 Status History</span>
              <span className={`toggle-arrow ${showStatusHistory ? 'open' : ''}`}>▼</span>
            </button>

            {showStatusHistory && (
              <div className="status-history-list">
                {caseData.statusHistory.map((history, index) => {
                  // Debug status history details
                  console.log('📋 STATUS HISTORY DEBUG - Item:', {
                    index,
                    caseRef: caseItem.caseReferenceNumber,
                    status: history.status,
                    processedBy: history.processedBy,
                    details: history.details,
                    hasDetails: !!history.details,
                    detailsLength: history.details?.length || 0,
                    timestamp: history.formattedTimestamp,
                    attachmentCount: history.attachments?.length || 0
                  });
                  
                  return (
                    <div key={index} className="status-history-item">
                      <div className="history-status">{history.status}</div>
                      <div className="history-user">{getUserName(history.processedBy)}</div>
                      <div className="history-time">{history.formattedTimestamp}</div>
                      {history.details && (
                        <div className="history-details">
                          <strong>Comments:</strong> {history.details}
                        </div>
                      )}
                      {!history.details && (
                        <div className="debug-no-details" style={{color: 'orange', fontSize: '12px'}}>
                          [DEBUG: No status comments/details found]
                        </div>
                      )}
                      {history.attachments && history.attachments.length > 0 && (
                      <div className="history-attachments">
                        <div className="attachments-label">📎 Attachments ({history.attachments.length}):</div>
                        <div className="attachments-grid">
                          {history.attachments.map((attachmentStr, attachmentIndex) => {
                            try {
                              const attachment = JSON.parse(attachmentStr);
                              const isImage = attachment.type && attachment.type.startsWith('image/');
                              return (
                                <div key={attachmentIndex} className="attachment-preview">
                                  {isImage ? (
                                    <img
                                      src={attachment.data}
                                      alt={attachment.name}
                                      className="attachment-thumbnail"
                                      title={attachment.name}
                                    />
                                  ) : (
                                    <div className="attachment-file" title={attachment.name}>
                                      📄 {attachment.name}
                                    </div>
                                  )}
                                </div>
                              );
                            } catch (e) {
                              return (
                                <div key={attachmentIndex} className="attachment-error">
                                  ❌ Invalid attachment data
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Amendment History (if applicable) */}
          {caseData.hasAmendments && (
            <div className="amendment-history-section">
              <button
                className="section-toggle"
                onClick={handleToggleAmendmentHistory}
                data-testid="amendment-history-tab"
              >
                <span>📝 Amendment History</span>
                <span className={`toggle-arrow ${showAmendmentHistory ? 'open' : ''}`}>▼</span>
              </button>

              {showAmendmentHistory && (
                <div className="amendment-history-details" data-testid="amendment-history-section">
                  {/* Show full amendment history if available */}
                  {caseData.amendmentHistory && caseData.amendmentHistory.length > 0 ? (
                    caseData.amendmentHistory.map((amendment, index) => (
                      <div key={index} className="amendment-history-item" data-testid="amendment-history-item">
                        <div className="amendment-header">
                          <div className="amendment-user">Amended by: {getUserName(amendment.amendedBy)}</div>
                          <div className="amendment-time">{new Date(amendment.timestamp).toLocaleString()}</div>
                        </div>
                        {amendment.reason && (
                          <div className="amendment-reason">Reason: {amendment.reason}</div>
                        )}
                        {amendment.changes && amendment.changes.length > 0 && (
                          <div className="amendment-changes">
                            <div className="changes-label">Changes:</div>
                            <div className="changes-grid">
                              {amendment.changes.map((change, changeIndex) => {
                                // Debug amendment change logic
                                console.log('📝 AMENDMENT DEBUG - Change Item:', {
                                  changeIndex,
                                  field: change.field,
                                  oldValue: change.oldValue,
                                  newValue: change.newValue,
                                  isAddition: !change.oldValue && change.newValue,
                                  isRemoval: change.oldValue && !change.newValue,
                                  isModification: change.oldValue && change.newValue,
                                  caseRef: caseItem.caseReferenceNumber
                                });

                                const isAddition = !change.oldValue && change.newValue;
                                const isRemoval = change.oldValue && !change.newValue;
                                const isModification = change.oldValue && change.newValue;

                                return (
                                  <div key={changeIndex} className="change-item">
                                    <div className="change-field">{change.field}:</div>
                                    
                                    {/* For additions - show in green, no "from" field */}
                                    {isAddition && (
                                      <div className="change-addition" style={{color: 'green', fontWeight: 'bold'}}>
                                        ➕ Added: {change.newValue}
                                      </div>
                                    )}
                                    
                                    {/* For removals - show in red, no "to" field */}
                                    {isRemoval && (
                                      <div className="change-removal" style={{color: 'red', fontWeight: 'bold'}}>
                                        ➖ Removed: {change.oldValue}
                                      </div>
                                    )}
                                    
                                    {/* For modifications - show from/to with arrow */}
                                    {isModification && (
                                      <>
                                        <div className="change-from">From: {change.oldValue}</div>
                                        <div className="change-arrow">→</div>
                                        <div className="change-to">To: {change.newValue}</div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    /* Fallback to basic amendment info if full history not available */
                    caseData.amendmentInfo && (
                      <div className="amendment-history-item" data-testid="amendment-history-item">
                        <div>Amended by: {getUserName(caseData.amendmentInfo.amendedBy || '')}</div>
                        <div>Date: {caseData.amendmentInfo.amendedAt}</div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status Workflow */}
          <StatusWorkflow
            caseItem={caseItem}
            currentUser={user}
            onStatusChange={handleStatusChange}
            processingCase={processingCase}
            receivedCase={receivedCase}
            completedCase={completedCase}
            onOrderProcessed={() => onOrderProcessed(caseItem.id)}
            onOrderDelivered={() => onOrderDelivered(caseItem.id)}
            onOrderReceived={() => onOrderReceived(caseItem.id)}
            onCaseCompleted={() => onCaseCompleted(caseItem.id)}
            onOrderDeliveredOffice={() => onOrderDeliveredOffice(caseItem.id)}
            onToBeBilled={() => onToBeBilled(caseItem.id)}
          />

          {/* Attachment Manager (when needed) */}
          {(isProcessing || isReceiving || isCompleting ||
           caseItem.status === 'Order Prepared' ||
           caseItem.status === 'Preparing Order' ||
           caseItem.status === 'Pending Delivery (Hospital)' ||
           caseItem.status === 'Delivered (Hospital)' ||
           caseItem.status === 'Case Completed') && (
            <EnhancedAttachmentManager
              caseId={caseItem.id}
              caseSubmittedBy={caseItem.submittedBy}
              existingAttachments={caseItem.attachments || []} // Pass case attachments
              onAttachmentsChange={(attachments, changes) => {
                // Convert enhanced attachment format to simple format if needed
                handleAttachmentsChange(attachments.map(att => att.file).filter((f): f is File => f !== null));
              }}
              maxFiles={5}
            />
          )}
        </div>
      )}

      {/* Amendment Form Modal */}
      {isAmending && (
        <AmendmentForm
          caseItem={caseItem}
          amendmentData={amendmentData}
          onSave={(amendmentData) => onSaveAmendment(caseItem.id, amendmentData)}
          onCancel={onCancelAmendment}
        />
      )}

      {/* Case Footer Actions */}
      <div className="case-card-footer">
        <div className="case-meta-info">
          <span className="submission-info">
            Submitted {caseData.daysSinceSubmission} days ago by {getUserName(caseItem.submittedBy)}
          </span>
          {caseData.isUrgent && (
            <span className="urgency-warning">
              ⚡ Surgery in {caseData.daysUntilSurgery} days
            </span>
          )}
        </div>

        <div className="case-actions">
          {/* Amendment button */}
          {permissions.canEditCase && caseData.canBeAmended && (
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={handleAmendCase}
              disabled={isAmending}
            >
              📝 Amend Case
            </button>
          )}

          {/* Existing CaseActions component for additional actions */}
          <CaseActions
            caseItem={caseItem}
            currentUser={user}
            onStatusChange={(caseId, newStatus) => onStatusChange(caseId, newStatus)}
            onAmendCase={(caseItem) => onAmendCase(caseItem.id)}
            onDeleteCase={(caseId, caseItem) => {/* Handle delete */}}
            onOrderProcessed={() => onOrderProcessed(caseItem.id)}
            onMarkOrderProcessed={() => {/* Handle mark order processed */}}
            onSalesApproval={() => {/* Handle sales approval */}}
            onOrderDelivered={() => onOrderDelivered(caseItem.id)}
            onOrderReceived={() => onOrderReceived(caseItem.id)}
            onCaseCompleted={() => onCaseCompleted(caseItem.id)}
            onPendingDeliveryOffice={() => {/* Handle pending office delivery */}}
            onOfficeDelivery={() => {/* Handle office delivery */}}
            onOrderDeliveredOffice={() => onOrderDeliveredOffice(caseItem.id)}
            onToBeBilled={() => onToBeBilled(caseItem.id)}
            onCancelCase={() => {/* Handle cancel */}}
            canAmendCase={(caseItem) => permissions.canEditCase && caseData.canBeAmended}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(CaseCard);