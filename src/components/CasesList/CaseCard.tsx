import React, { useEffect, useMemo } from 'react';
import { CaseCardProps } from './types';
import { getStatusColor, getNextResponsibleRole, formatDateTime } from './utils';
import CaseActions from './CaseActions';
import { getCurrentUser } from '../../utils/auth';
import { getAllProcedureTypes } from '../../utils/storage';
import { getDepartments, initializeCodeTables, getCodeTables, getDepartmentNamesForUser } from '../../utils/codeTable';
import { useUserNames } from '../../hooks/useUserNames';
import TimePicker from '../common/TimePicker';
import { formatDate, getTodayForInput } from '../../utils/dateFormat';

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
  onSaveProcessDetails,
  onCancelProcessing,
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

  // Memoize expensive operations to prevent excessive localStorage calls
  const availableProcedureTypes = useMemo(() => {
    try {
      const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
      return getAllProcedureTypes(userCountry);
    } catch (error) {
      console.error('Error loading procedure types:', error);
      return [];
    }
  }, [currentUser?.selectedCountry, currentUser?.countries]);

  const availableDepartments = useMemo(() => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return getDepartments();
      }
      
      // Get departments for user's current country
      const userCountry = currentUser.selectedCountry || currentUser.countries?.[0];
      if (userCountry) {
        // Load country-specific departments from Code Table Setup
        const countryTables = getCodeTables(userCountry);
        const departmentsTable = countryTables.find(table => table.id === 'departments');
        const countrySpecificDepts = departmentsTable?.items || [];
        
        // Admin and IT users can access all departments for their country
        if (currentUser.role === 'admin' || currentUser.role === 'it') {
          return countrySpecificDepts.sort();
        }
        
        // Other users are restricted to their assigned departments
        const userDepartments = currentUser.departments || [];
        
        // Handle both legacy and new country-specific department formats
        const userDepartmentNames = getDepartmentNamesForUser(userDepartments, [userCountry]);
        return countrySpecificDepts.filter(dept => userDepartmentNames.includes(dept)).sort();
      }
      
      // Fallback to global departments
      return getDepartments();
    } catch (error) {
      console.error('Error loading departments:', error);
      return [];
    }
  }, []);

  // Initialize code tables only once when component mounts
  useEffect(() => {
    try {
      initializeCodeTables();
    } catch (error) {
      console.error('Error initializing code tables:', error);
    }
  }, []);

  // Memoize status history parsing to prevent expensive JSON.parse operations during rendering
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parsedStatusHistory = useMemo(() => {
    return caseItem.statusHistory?.map(historyItem => {
      let parsedDetails = null;
      let parsedAttachments = [];
      
      if (historyItem.details) {
        try {
          parsedDetails = JSON.parse(historyItem.details);
          
          // Pre-parse attachments if they exist
          if (parsedDetails.attachments) {
            parsedAttachments = parsedDetails.attachments.map((attachment: string) => {
              try {
                return JSON.parse(attachment);
              } catch {
                return null;
              }
            }).filter(Boolean);
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

  // Memoize attachment parsing for forms to prevent repeated JSON.parse operations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parsedProcessAttachments = useMemo(() => {
    return processAttachments.map(attachment => {
      try {
        return JSON.parse(attachment);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }, [processAttachments]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parsedHospitalDeliveryAttachments = useMemo(() => {
    return hospitalDeliveryAttachments.map(attachment => {
      try {
        return JSON.parse(attachment);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }, [hospitalDeliveryAttachments]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parsedPendingOfficeAttachments = useMemo(() => {
    return pendingOfficeAttachments.map(attachment => {
      try {
        return JSON.parse(attachment);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }, [pendingOfficeAttachments]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parsedOfficeDeliveryAttachments = useMemo(() => {
    return officeDeliveryAttachments.map(attachment => {
      try {
        return JSON.parse(attachment);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }, [officeDeliveryAttachments]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parsedAttachments = useMemo(() => {
    return attachments.map(attachment => {
      try {
        return JSON.parse(attachment);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }, [attachments]);

  const canAmendCase = (caseItem: any): boolean => {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    // Admin can amend any case unlimited times
    if (currentUser.role === 'admin') return true;
    
    // Check if user has amend permission using permission system
    const { hasPermission, PERMISSION_ACTIONS } = require('../../utils/permissions');
    const canAmend = hasPermission(currentUser.role, PERMISSION_ACTIONS.AMEND_CASE);
    
    // Check if case hasn't been amended yet (for non-admin users)
    const notAmended = !caseItem.isAmended;
    
    return canAmend && notAmended;
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
      style={{ '--status-color': getStatusColor(caseItem.status) } as React.CSSProperties}
    >
      <div className="case-summary" onClick={() => onToggleExpansion(caseItem.id)}>
        <div className="case-main-info">
          <div className="case-title">
            <span className="case-title-label">Submitted by:</span>
            <strong>{getUserName(caseItem.submittedBy)}</strong>
            <span className="case-reference">#{caseItem.caseReferenceNumber}</span>
          </div>
          <div className="case-meta">
            <span>Case Title: {caseItem.procedureType}</span>
            <span>Surgery Date: {formatDate(caseItem.dateOfSurgery)}</span>
            <span>Hospital: {caseItem.hospital}</span>
            <span>Department: {caseItem.department}</span>
            {currentUser?.role === 'admin' && (
              <span>Country: {caseItem.country}</span>
            )}
          </div>
        </div>
        <div className="case-status">
          <div className="status-text">{caseItem.status}</div>
          {getNextResponsibleRole(caseItem.status) && (
            <div className="pending-indicator">
              <span className="pending-icon">⏳</span>
              <span 
                className="pending-text"
                title="Click to view Role-Based Permission Matrix"
              >
                Awaiting: {getNextResponsibleRole(caseItem.status)}
              </span>
            </div>
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
                <span className="detail-value">{caseItem.doctorName}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Surgery Set Selection: </span>
              <ul className="detail-value">
                {caseItem.surgerySetSelection.map(set => (
                  <li key={set}>{set}</li>
                ))}
              </ul>
            </div>
            <div className="detail-item">
              <span className="detail-label">Implant Box: </span>
              <ul className="detail-value">
                {caseItem.implantBox.map(box => (
                  <li key={box}>{box}</li>
                ))}
              </ul>
            </div>
            {caseItem.specialInstruction && (
              <div className="detail-item full-width">
                <span className="detail-label">Special Instructions: </span>
                <p className="detail-value">{caseItem.specialInstruction}</p>
              </div>
            )}
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
                    {caseItem.amendmentHistory.map((amendment, index) => (
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
                            {amendment.changes.map((change, changeIndex) => (
                              <div key={changeIndex} className="change-item">
                                <span className="change-field">{change.field}:</span>
                                <span className="change-from">{change.oldValue}</span>
                                <span className="change-arrow">→</span>
                                <span className="change-to">{change.newValue}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
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
            {caseItem.statusHistory && caseItem.statusHistory.length > 0 && caseItem.status !== 'Case Booked' && (
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
                                          {attachments && attachments.length > 0 && (
                                            <div>
                                              <strong>Attachments ({attachments.length}):</strong>
                                              <div className="attachment-preview-grid">
                                                {attachments.map((attachment: string, index: number) => {
                                                  try {
                                                    const fileData = JSON.parse(attachment);
                                                    const isImage = fileData.type.startsWith('image/');
                                                    
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        {isImage ? (
                                                          <div className="image-attachment">
                                                            <img 
                                                              src={fileData.data} 
                                                              alt={fileData.name}
                                                              className="attachment-thumbnail clickable-image"
                                                              style={{ maxWidth: '100px', maxHeight: '75px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                              onClick={() => {
                                                                const modal = document.createElement('div');
                                                                modal.className = 'image-modal';
                                                                modal.innerHTML = `
                                                                  <div class="image-modal-backdrop" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                                                    <div style="position: relative; max-width: 90%; max-height: 90%;">
                                                                      <img src="${fileData.data}" alt="${fileData.name}" style="max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
                                                                      <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 10px;">
                                                                        <button onclick="event.stopPropagation(); const link = document.createElement('a'); link.href = '${fileData.data}'; link.download = '${fileData.name}'; link.click();" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">📥 Download</button>
                                                                        <button onclick="document.body.removeChild(this.closest('.image-modal'));" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕ Close</button>
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                `;
                                                                document.body.appendChild(modal);
                                                                modal.addEventListener('click', (e) => {
                                                                  if (e.target === modal.querySelector('.image-modal-backdrop')) {
                                                                    document.body.removeChild(modal);
                                                                  }
                                                                });
                                                              }}
                                                            />
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <div className="file-attachment">
                                                            <div className="file-icon">📄</div>
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                            <button
                                                              onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = fileData.data;
                                                                link.download = fileData.name;
                                                                link.click();
                                                              }}
                                                              className="download-button"
                                                              title="Download file"
                                                            >
                                                              📥
                                                            </button>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  } catch {
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        <div className="file-attachment error">
                                                          <div className="file-icon">❌</div>
                                                          <div className="attachment-info">
                                                            <div className="file-name">Invalid file data</div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  }
                                                })}
                                              </div>
                                            </div>
                                          )}
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
                                            <div>
                                              <strong>Attachments ({parsedDetails.attachments.length}):</strong>
                                              <div className="attachment-preview-grid">
                                                {parsedDetails.attachments.map((attachment: string, index: number) => {
                                                  try {
                                                    const fileData = JSON.parse(attachment);
                                                    const isImage = fileData.type.startsWith('image/');
                                                    
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        {isImage ? (
                                                          <div className="image-attachment">
                                                            <img 
                                                              src={fileData.data} 
                                                              alt={fileData.name}
                                                              className="attachment-thumbnail clickable-image"
                                                              style={{ maxWidth: '100px', maxHeight: '75px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                              onClick={() => {
                                                                const modal = document.createElement('div');
                                                                modal.className = 'image-modal';
                                                                modal.innerHTML = `
                                                                  <div class="image-modal-backdrop" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                                                    <div style="position: relative; max-width: 90%; max-height: 90%;">
                                                                      <img src="${fileData.data}" alt="${fileData.name}" style="max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
                                                                      <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 10px;">
                                                                        <button onclick="event.stopPropagation(); const link = document.createElement('a'); link.href = '${fileData.data}'; link.download = '${fileData.name}'; link.click();" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">📥 Download</button>
                                                                        <button onclick="document.body.removeChild(this.closest('.image-modal'));" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕ Close</button>
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                `;
                                                                document.body.appendChild(modal);
                                                                modal.addEventListener('click', (e) => {
                                                                  if (e.target === modal.querySelector('.image-modal-backdrop')) {
                                                                    document.body.removeChild(modal);
                                                                  }
                                                                });
                                                              }}
                                                            />
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <div className="file-attachment">
                                                            <div className="file-icon">📄</div>
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                            <button
                                                              onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = fileData.data;
                                                                link.download = fileData.name;
                                                                link.click();
                                                              }}
                                                              className="download-button"
                                                              title="Download file"
                                                            >
                                                              📥
                                                            </button>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  } catch {
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        <div className="file-attachment error">
                                                          <div className="file-icon">❌</div>
                                                          <div className="attachment-info">
                                                            <div className="file-name">Invalid file data</div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  }
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    } else if (parsedDetails.processDetails) {
                                      return (
                                        <div>
                                          <strong>Process Details:</strong> {parsedDetails.processDetails}
                                          {parsedDetails.attachments && parsedDetails.attachments.length > 0 && (
                                            <div>
                                              <strong>Attachments ({parsedDetails.attachments.length}):</strong>
                                              <div className="attachment-preview-grid">
                                                {parsedDetails.attachments.map((attachment: string, index: number) => {
                                                  try {
                                                    const fileData = JSON.parse(attachment);
                                                    const isImage = fileData.type.startsWith('image/');
                                                    
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        {isImage ? (
                                                          <div className="image-attachment">
                                                            <img 
                                                              src={fileData.data} 
                                                              alt={fileData.name}
                                                              className="attachment-thumbnail clickable-image"
                                                              style={{ maxWidth: '100px', maxHeight: '75px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                              onClick={() => {
                                                                const modal = document.createElement('div');
                                                                modal.className = 'image-modal';
                                                                modal.innerHTML = `
                                                                  <div class="image-modal-backdrop" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                                                    <div style="position: relative; max-width: 90%; max-height: 90%;">
                                                                      <img src="${fileData.data}" alt="${fileData.name}" style="max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
                                                                      <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 10px;">
                                                                        <button onclick="event.stopPropagation(); const link = document.createElement('a'); link.href = '${fileData.data}'; link.download = '${fileData.name}'; link.click();" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">📥 Download</button>
                                                                        <button onclick="document.body.removeChild(this.closest('.image-modal'));" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕ Close</button>
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                `;
                                                                document.body.appendChild(modal);
                                                                modal.addEventListener('click', (e) => {
                                                                  if (e.target === modal.querySelector('.image-modal-backdrop')) {
                                                                    document.body.removeChild(modal);
                                                                  }
                                                                });
                                                              }}
                                                            />
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <div className="file-attachment">
                                                            <div className="file-icon">📄</div>
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                            <button
                                                              onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = fileData.data;
                                                                link.download = fileData.name;
                                                                link.click();
                                                              }}
                                                              className="download-button"
                                                              title="Download file"
                                                            >
                                                              📥
                                                            </button>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  } catch {
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        <div className="file-attachment error">
                                                          <div className="file-icon">❌</div>
                                                          <div className="attachment-info">
                                                            <div className="file-name">Invalid file data</div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  }
                                                })}
                                              </div>
                                            </div>
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
                                            <div>
                                              <strong>Attachments ({parsedDetails.attachments.length}):</strong>
                                              <div className="attachment-preview-grid">
                                                {parsedDetails.attachments.map((attachment: string, index: number) => {
                                                  try {
                                                    const fileData = JSON.parse(attachment);
                                                    const isImage = fileData.type.startsWith('image/');
                                                    
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        {isImage ? (
                                                          <div className="image-attachment">
                                                            <img 
                                                              src={fileData.data} 
                                                              alt={fileData.name}
                                                              className="attachment-thumbnail clickable-image"
                                                              style={{ maxWidth: '100px', maxHeight: '75px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                              onClick={() => {
                                                                const modal = document.createElement('div');
                                                                modal.className = 'image-modal';
                                                                modal.innerHTML = `
                                                                  <div class="image-modal-backdrop" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                                                    <div style="position: relative; max-width: 90%; max-height: 90%;">
                                                                      <img src="${fileData.data}" alt="${fileData.name}" style="max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
                                                                      <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 10px;">
                                                                        <button onclick="event.stopPropagation(); const link = document.createElement('a'); link.href = '${fileData.data}'; link.download = '${fileData.name}'; link.click();" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">📥 Download</button>
                                                                        <button onclick="document.body.removeChild(this.closest('.image-modal'));" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕ Close</button>
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                `;
                                                                document.body.appendChild(modal);
                                                                modal.addEventListener('click', (e) => {
                                                                  if (e.target === modal.querySelector('.image-modal-backdrop')) {
                                                                    document.body.removeChild(modal);
                                                                  }
                                                                });
                                                              }}
                                                            />
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <div className="file-attachment">
                                                            <div className="file-icon">📄</div>
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                            <button
                                                              onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = fileData.data;
                                                                link.download = fileData.name;
                                                                link.click();
                                                              }}
                                                              className="download-button"
                                                              title="Download file"
                                                            >
                                                              📥
                                                            </button>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  } catch {
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        <div className="file-attachment error">
                                                          <div className="file-icon">❌</div>
                                                          <div className="attachment-info">
                                                            <div className="file-name">Invalid file data</div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  }
                                                })}
                                              </div>
                                            </div>
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
                                                <div>
                                                  <strong> ({value.length}):</strong>
                                                  <div className="attachment-preview-grid">
                                                    {value.map((attachment: string, index: number) => {
                                                      try {
                                                        const fileData = JSON.parse(attachment);
                                                        const isImage = fileData.type.startsWith('image/');
                                                        
                                                        return (
                                                          <div key={index} className="attachment-preview-item">
                                                            {isImage ? (
                                                              <div className="image-attachment">
                                                                <img 
                                                                  src={fileData.data} 
                                                                  alt={fileData.name}
                                                                  className="attachment-thumbnail clickable-image"
                                                                  style={{ maxWidth: '100px', maxHeight: '75px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                                  onClick={() => {
                                                                    const modal = document.createElement('div');
                                                                    modal.className = 'image-modal';
                                                                    modal.innerHTML = `
                                                                      <div class="image-modal-backdrop" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                                                        <div style="position: relative; max-width: 90%; max-height: 90%;">
                                                                          <img src="${fileData.data}" alt="${fileData.name}" style="max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
                                                                          <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 10px;">
                                                                            <button onclick="event.stopPropagation(); const link = document.createElement('a'); link.href = '${fileData.data}'; link.download = '${fileData.name}'; link.click();" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">📥 Download</button>
                                                                            <button onclick="document.body.removeChild(this.closest('.image-modal'));" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕ Close</button>
                                                                          </div>
                                                                        </div>
                                                                      </div>
                                                                    `;
                                                                    document.body.appendChild(modal);
                                                                    modal.addEventListener('click', (e) => {
                                                                      if (e.target === modal.querySelector('.image-modal-backdrop')) {
                                                                        document.body.removeChild(modal);
                                                                      }
                                                                    });
                                                                  }}
                                                                />
                                                                <div className="attachment-info">
                                                                  <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                                  <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                                </div>
                                                              </div>
                                                            ) : (
                                                              <div className="file-attachment">
                                                                <div className="file-icon">📄</div>
                                                                <div className="attachment-info">
                                                                  <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                                  <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                                </div>
                                                                <button
                                                                  onClick={() => {
                                                                    const link = document.createElement('a');
                                                                    link.href = fileData.data;
                                                                    link.download = fileData.name;
                                                                    link.click();
                                                                  }}
                                                                  className="download-button"
                                                                  title="Download file"
                                                                >
                                                                  📥
                                                                </button>
                                                              </div>
                                                            )}
                                                          </div>
                                                        );
                                                      } catch {
                                                        return (
                                                          <div key={index} className="attachment-preview-item">
                                                            <div className="file-attachment error">
                                                              <div className="file-icon">❌</div>
                                                              <div className="attachment-info">
                                                                <div className="file-name">Invalid file data</div>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        );
                                                      }
                                                    })}
                                                  </div>
                                                </div>
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
                                  } catch {
                                    return <div>{historyItem.details}</div>;
                                  }
                                })()}
                              </div>
                            )}
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
                                          {attachments && attachments.length > 0 && (
                                            <div>
                                              <strong>Attachments ({attachments.length}):</strong>
                                              <div className="attachment-preview-grid">
                                                {attachments.map((attachment: string, index: number) => {
                                                  try {
                                                    const fileData = JSON.parse(attachment);
                                                    const isImage = fileData.type.startsWith('image/');
                                                    
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        {isImage ? (
                                                          <div className="image-attachment">
                                                            <img 
                                                              src={fileData.data} 
                                                              alt={fileData.name}
                                                              className="attachment-thumbnail clickable-image"
                                                              style={{ maxWidth: '100px', maxHeight: '75px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                              onClick={() => {
                                                                const modal = document.createElement('div');
                                                                modal.className = 'image-modal';
                                                                modal.innerHTML = `
                                                                  <div class="image-modal-backdrop" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                                                    <div style="position: relative; max-width: 90%; max-height: 90%;">
                                                                      <img src="${fileData.data}" alt="${fileData.name}" style="max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
                                                                      <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 10px;">
                                                                        <button onclick="event.stopPropagation(); const link = document.createElement('a'); link.href = '${fileData.data}'; link.download = '${fileData.name}'; link.click();" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">📥 Download</button>
                                                                        <button onclick="document.body.removeChild(this.closest('.image-modal'));" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕ Close</button>
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                `;
                                                                document.body.appendChild(modal);
                                                                modal.addEventListener('click', (e) => {
                                                                  if (e.target === modal.querySelector('.image-modal-backdrop')) {
                                                                    document.body.removeChild(modal);
                                                                  }
                                                                });
                                                              }}
                                                            />
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <div className="file-attachment">
                                                            <div className="file-icon">📄</div>
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                            <button
                                                              onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = fileData.data;
                                                                link.download = fileData.name;
                                                                link.click();
                                                              }}
                                                              className="download-button"
                                                              title="Download file"
                                                            >
                                                              📥
                                                            </button>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  } catch {
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        <div className="file-attachment error">
                                                          <div className="file-icon">❌</div>
                                                          <div className="attachment-info">
                                                            <div className="file-name">Invalid file data</div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  }
                                                })}
                                              </div>
                                            </div>
                                          )}
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
                                            <div>
                                              <strong>Attachments ({parsedDetails.attachments.length}):</strong>
                                              <div className="attachment-preview-grid">
                                                {parsedDetails.attachments.map((attachment: string, index: number) => {
                                                  try {
                                                    const fileData = JSON.parse(attachment);
                                                    const isImage = fileData.type.startsWith('image/');
                                                    
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        {isImage ? (
                                                          <div className="image-attachment">
                                                            <img 
                                                              src={fileData.data} 
                                                              alt={fileData.name}
                                                              className="attachment-thumbnail clickable-image"
                                                              style={{ maxWidth: '100px', maxHeight: '75px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                              onClick={() => {
                                                                const modal = document.createElement('div');
                                                                modal.className = 'image-modal';
                                                                modal.innerHTML = `
                                                                  <div class="image-modal-backdrop" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                                                    <div style="position: relative; max-width: 90%; max-height: 90%;">
                                                                      <img src="${fileData.data}" alt="${fileData.name}" style="max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
                                                                      <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 10px;">
                                                                        <button onclick="event.stopPropagation(); const link = document.createElement('a'); link.href = '${fileData.data}'; link.download = '${fileData.name}'; link.click();" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">📥 Download</button>
                                                                        <button onclick="document.body.removeChild(this.closest('.image-modal'));" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕ Close</button>
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                `;
                                                                document.body.appendChild(modal);
                                                                modal.addEventListener('click', (e) => {
                                                                  if (e.target === modal.querySelector('.image-modal-backdrop')) {
                                                                    document.body.removeChild(modal);
                                                                  }
                                                                });
                                                              }}
                                                            />
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <div className="file-attachment">
                                                            <div className="file-icon">📄</div>
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                            <button
                                                              onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = fileData.data;
                                                                link.download = fileData.name;
                                                                link.click();
                                                              }}
                                                              className="download-button"
                                                              title="Download file"
                                                            >
                                                              📥
                                                            </button>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  } catch {
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        <div className="file-attachment error">
                                                          <div className="file-icon">❌</div>
                                                          <div className="attachment-info">
                                                            <div className="file-name">Invalid file data</div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  }
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    } else if (parsedDetails.processDetails) {
                                      return (
                                        <div>
                                          <strong>Process Details:</strong> {parsedDetails.processDetails}
                                          {parsedDetails.attachments && parsedDetails.attachments.length > 0 && (
                                            <div>
                                              <strong>Attachments ({parsedDetails.attachments.length}):</strong>
                                              <div className="attachment-preview-grid">
                                                {parsedDetails.attachments.map((attachment: string, index: number) => {
                                                  try {
                                                    const fileData = JSON.parse(attachment);
                                                    const isImage = fileData.type.startsWith('image/');
                                                    
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        {isImage ? (
                                                          <div className="image-attachment">
                                                            <img 
                                                              src={fileData.data} 
                                                              alt={fileData.name}
                                                              className="attachment-thumbnail clickable-image"
                                                              style={{ maxWidth: '100px', maxHeight: '75px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                              onClick={() => {
                                                                const modal = document.createElement('div');
                                                                modal.className = 'image-modal';
                                                                modal.innerHTML = `
                                                                  <div class="image-modal-backdrop" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                                                    <div style="position: relative; max-width: 90%; max-height: 90%;">
                                                                      <img src="${fileData.data}" alt="${fileData.name}" style="max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
                                                                      <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 10px;">
                                                                        <button onclick="event.stopPropagation(); const link = document.createElement('a'); link.href = '${fileData.data}'; link.download = '${fileData.name}'; link.click();" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">📥 Download</button>
                                                                        <button onclick="document.body.removeChild(this.closest('.image-modal'));" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕ Close</button>
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                `;
                                                                document.body.appendChild(modal);
                                                                modal.addEventListener('click', (e) => {
                                                                  if (e.target === modal.querySelector('.image-modal-backdrop')) {
                                                                    document.body.removeChild(modal);
                                                                  }
                                                                });
                                                              }}
                                                            />
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <div className="file-attachment">
                                                            <div className="file-icon">📄</div>
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                            <button
                                                              onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = fileData.data;
                                                                link.download = fileData.name;
                                                                link.click();
                                                              }}
                                                              className="download-button"
                                                              title="Download file"
                                                            >
                                                              📥
                                                            </button>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  } catch {
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        <div className="file-attachment error">
                                                          <div className="file-icon">❌</div>
                                                          <div className="attachment-info">
                                                            <div className="file-name">Invalid file data</div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  }
                                                })}
                                              </div>
                                            </div>
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
                                            <div>
                                              <strong>Attachments ({parsedDetails.attachments.length}):</strong>
                                              <div className="attachment-preview-grid">
                                                {parsedDetails.attachments.map((attachment: string, index: number) => {
                                                  try {
                                                    const fileData = JSON.parse(attachment);
                                                    const isImage = fileData.type.startsWith('image/');
                                                    
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        {isImage ? (
                                                          <div className="image-attachment">
                                                            <img 
                                                              src={fileData.data} 
                                                              alt={fileData.name}
                                                              className="attachment-thumbnail clickable-image"
                                                              style={{ maxWidth: '100px', maxHeight: '75px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                              onClick={() => {
                                                                const modal = document.createElement('div');
                                                                modal.className = 'image-modal';
                                                                modal.innerHTML = `
                                                                  <div class="image-modal-backdrop" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                                                    <div style="position: relative; max-width: 90%; max-height: 90%;">
                                                                      <img src="${fileData.data}" alt="${fileData.name}" style="max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
                                                                      <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 10px;">
                                                                        <button onclick="event.stopPropagation(); const link = document.createElement('a'); link.href = '${fileData.data}'; link.download = '${fileData.name}'; link.click();" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">📥 Download</button>
                                                                        <button onclick="document.body.removeChild(this.closest('.image-modal'));" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕ Close</button>
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                `;
                                                                document.body.appendChild(modal);
                                                                modal.addEventListener('click', (e) => {
                                                                  if (e.target === modal.querySelector('.image-modal-backdrop')) {
                                                                    document.body.removeChild(modal);
                                                                  }
                                                                });
                                                              }}
                                                            />
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <div className="file-attachment">
                                                            <div className="file-icon">📄</div>
                                                            <div className="attachment-info">
                                                              <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                              <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                            </div>
                                                            <button
                                                              onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = fileData.data;
                                                                link.download = fileData.name;
                                                                link.click();
                                                              }}
                                                              className="download-button"
                                                              title="Download file"
                                                            >
                                                              📥
                                                            </button>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  } catch {
                                                    return (
                                                      <div key={index} className="attachment-preview-item">
                                                        <div className="file-attachment error">
                                                          <div className="file-icon">❌</div>
                                                          <div className="attachment-info">
                                                            <div className="file-name">Invalid file data</div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  }
                                                })}
                                              </div>
                                            </div>
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
                                                <div>
                                                  <strong> ({value.length}):</strong>
                                                  <div className="attachment-preview-grid">
                                                    {value.map((attachment: string, index: number) => {
                                                      try {
                                                        const fileData = JSON.parse(attachment);
                                                        const isImage = fileData.type.startsWith('image/');
                                                        
                                                        return (
                                                          <div key={index} className="attachment-preview-item">
                                                            {isImage ? (
                                                              <div className="image-attachment">
                                                                <img 
                                                                  src={fileData.data} 
                                                                  alt={fileData.name}
                                                                  className="attachment-thumbnail clickable-image"
                                                                  style={{ maxWidth: '100px', maxHeight: '75px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                                  onClick={() => {
                                                                    const modal = document.createElement('div');
                                                                    modal.className = 'image-modal';
                                                                    modal.innerHTML = `
                                                                      <div class="image-modal-backdrop" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                                                        <div style="position: relative; max-width: 90%; max-height: 90%;">
                                                                          <img src="${fileData.data}" alt="${fileData.name}" style="max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
                                                                          <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 10px;">
                                                                            <button onclick="event.stopPropagation(); const link = document.createElement('a'); link.href = '${fileData.data}'; link.download = '${fileData.name}'; link.click();" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">📥 Download</button>
                                                                            <button onclick="document.body.removeChild(this.closest('.image-modal'));" style="background: rgba(255,255,255,0.9); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕ Close</button>
                                                                          </div>
                                                                        </div>
                                                                      </div>
                                                                    `;
                                                                    document.body.appendChild(modal);
                                                                    modal.addEventListener('click', (e) => {
                                                                      if (e.target === modal.querySelector('.image-modal-backdrop')) {
                                                                        document.body.removeChild(modal);
                                                                      }
                                                                    });
                                                                  }}
                                                                />
                                                                <div className="attachment-info">
                                                                  <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                                  <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                                </div>
                                                              </div>
                                                            ) : (
                                                              <div className="file-attachment">
                                                                <div className="file-icon">📄</div>
                                                                <div className="attachment-info">
                                                                  <div className="file-name" title={fileData.name}>{fileData.name.length > 15 ? fileData.name.substring(0, 15) + '...' : fileData.name}</div>
                                                                  <div className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</div>
                                                                </div>
                                                                <button
                                                                  onClick={() => {
                                                                    const link = document.createElement('a');
                                                                    link.href = fileData.data;
                                                                    link.download = fileData.name;
                                                                    link.click();
                                                                  }}
                                                                  className="download-button"
                                                                  title="Download file"
                                                                >
                                                                  📥
                                                                </button>
                                                              </div>
                                                            )}
                                                          </div>
                                                        );
                                                      } catch {
                                                        return (
                                                          <div key={index} className="attachment-preview-item">
                                                            <div className="file-attachment error">
                                                              <div className="file-icon">❌</div>
                                                              <div className="attachment-info">
                                                                <div className="file-name">Invalid file data</div>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        );
                                                      }
                                                    })}
                                                  </div>
                                                </div>
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

          {/* Amendment Form */}
          {amendingCase === caseItem.id && (
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
            <div className="processing-form">
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
                            data: reader.result as string
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
                  <div className="attachment-list">
                    <p>Uploaded files ({processAttachments.length}):</p>
                    {processAttachments.map((attachment, index) => {
                      try {
                        const fileData = JSON.parse(attachment);
                        return (
                          <div key={index} className="attachment-item">
                            <span className="file-name">{fileData.name}</span>
                            <span className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</span>
                            <button
                              onClick={() => onProcessAttachmentsChange(processAttachments.filter((_, i) => i !== index))}
                              className="remove-attachment"
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      } catch {
                        return (
                          <div key={index} className="attachment-item">
                            <span className="file-name">Invalid file data</span>
                            <button
                              onClick={() => onProcessAttachmentsChange(processAttachments.filter((_, i) => i !== index))}
                              className="remove-attachment"
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
              <div className="processing-actions">
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

          {/* Hospital Delivery Form */}
          {hospitalDeliveryCase === caseItem.id && (
            <div className="hospital-delivery-form">
              <h4>Pending Delivery to Hospital</h4>
              <div className="form-group">
                <label>Attachments (Optional):</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      Array.from(files).forEach(file => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const fileData = {
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            data: reader.result as string
                          };
                          onHospitalDeliveryAttachmentsChange([...hospitalDeliveryAttachments, JSON.stringify(fileData)]);
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                  className="file-upload-input"
                />
                {hospitalDeliveryAttachments.length > 0 && (
                  <div className="attachment-list">
                    <p>Uploaded files ({hospitalDeliveryAttachments.length}):</p>
                    {hospitalDeliveryAttachments.map((attachment, index) => {
                      try {
                        const fileData = JSON.parse(attachment);
                        return (
                          <div key={index} className="attachment-item">
                            <span className="file-name">{fileData.name}</span>
                            <span className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</span>
                            <button
                              onClick={() => onHospitalDeliveryAttachmentsChange(hospitalDeliveryAttachments.filter((_, i) => i !== index))}
                              className="remove-attachment"
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      } catch {
                        return (
                          <div key={index} className="attachment-item">
                            <span className="file-name">Invalid file data</span>
                            <button
                              onClick={() => onHospitalDeliveryAttachmentsChange(hospitalDeliveryAttachments.filter((_, i) => i !== index))}
                              className="remove-attachment"
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Comments (Optional):</label>
                <textarea
                  value={hospitalDeliveryComments}
                  onChange={(e) => onHospitalDeliveryCommentsChange(e.target.value)}
                  placeholder="Add any delivery notes or special instructions..."
                  rows={3}
                  className="form-control"
                />
              </div>
              <div className="hospital-delivery-actions">
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
            <div className="received-form">
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
              <div className="received-actions">
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
            <div className="completed-form">
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
                  <div className="attachment-list">
                    <p>Uploaded files ({attachments.length}):</p>
                    {attachments.map((attachment, index) => {
                      try {
                        const fileData = JSON.parse(attachment);
                        return (
                          <div key={index} className="attachment-item">
                            <span className="file-name">{fileData.name}</span>
                            <span className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</span>
                            <button
                              onClick={() => onRemoveAttachment(index)}
                              className="remove-attachment"
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      } catch {
                        return (
                          <div key={index} className="attachment-item">
                            <span className="file-name">Invalid file data</span>
                            <button
                              onClick={() => onRemoveAttachment(index)}
                              className="remove-attachment"
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      }
                    })}
                  </div>
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
              <div className="completed-actions">
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
            <div className="pending-office-form">
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
                  <div className="attachment-list">
                    <p>Uploaded files ({pendingOfficeAttachments.length}):</p>
                    {pendingOfficeAttachments.map((attachment, index) => {
                      try {
                        const fileData = JSON.parse(attachment);
                        return (
                          <div key={index} className="attachment-item">
                            <span className="file-name">{fileData.name}</span>
                            <span className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</span>
                            <button
                              onClick={() => onPendingOfficeAttachmentsChange(pendingOfficeAttachments.filter((_, i) => i !== index))}
                              className="remove-attachment"
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      } catch {
                        return (
                          <div key={index} className="attachment-item">
                            <span className="file-name">Invalid file data</span>
                            <button
                              onClick={() => onPendingOfficeAttachmentsChange(pendingOfficeAttachments.filter((_, i) => i !== index))}
                              className="remove-attachment"
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      }
                    })}
                  </div>
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
              <div className="pending-office-actions">
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
            <div className="office-delivery-form">
              <h4>Delivery to Office</h4>
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
                  <div className="attachment-list">
                    <p>Uploaded files ({officeDeliveryAttachments.length}):</p>
                    {officeDeliveryAttachments.map((attachment, index) => {
                      try {
                        const fileData = JSON.parse(attachment);
                        return (
                          <div key={index} className="attachment-item">
                            <span className="file-name">{fileData.name}</span>
                            <span className="file-size">({(fileData.size / 1024).toFixed(1)} KB)</span>
                            <button
                              onClick={() => onOfficeDeliveryAttachmentsChange(officeDeliveryAttachments.filter((_, i) => i !== index))}
                              className="remove-attachment"
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      } catch {
                        return (
                          <div key={index} className="attachment-item">
                            <span className="file-name">Invalid file data</span>
                            <button
                              onClick={() => onOfficeDeliveryAttachmentsChange(officeDeliveryAttachments.filter((_, i) => i !== index))}
                              className="remove-attachment"
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Comments (Optional):</label>
                <textarea
                  value={officeDeliveryComments}
                  onChange={(e) => onOfficeDeliveryCommentsChange(e.target.value)}
                  placeholder="Add any delivery notes or special instructions..."
                  rows={3}
                  className="comments-input"
                />
              </div>
              <div className="office-delivery-actions">
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