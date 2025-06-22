import React from 'react';
import { CaseCardProps } from './types';
import { getStatusColor, getNextResponsibleRole, formatDateTime } from './utils';
import CaseActions from './CaseActions';
import { getCurrentUser } from '../../utils/auth';

const CaseCard: React.FC<CaseCardProps> = ({
  caseItem,
  currentUser,
  expandedCases,
  expandedStatusHistory,
  amendingCase,
  amendmentData,
  processingCase,
  processDetails,
  receivedCase,
  receivedDetails,
  receivedImage,
  completedCase,
  attachments,
  orderSummary,
  doNumber,
  onToggleExpansion,
  onToggleStatusHistory,
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
  onOrderDeliveredOffice,
  onToBeBilled,
  onDeleteCase,
  onAttachmentUpload,
  onRemoveAttachment,
  onAmendmentDataChange,
  onProcessDetailsChange,
  onReceivedDetailsChange,
  onReceivedImageChange,
  onOrderSummaryChange,
  onDoNumberChange
}) => {
  const canAmendCase = (caseItem: any): boolean => {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    // Admin can amend any case unlimited times
    if (currentUser.role === 'admin') return true;
    
    // Check if user has amend permission
    const canAmend = ['sales', 'sales-manager', 'operations', 'operation-manager'].includes(currentUser.role);
    
    // Check if case hasn't been amended yet (for non-admin users)
    const notAmended = !caseItem.isAmended;
    
    return canAmend && notAmended;
  };

  return (
    <div 
      className="case-card"
      style={{ '--status-color': getStatusColor(caseItem.status) } as React.CSSProperties}
    >
      <div className="case-summary" onClick={() => onToggleExpansion(caseItem.id)}>
        <div className="case-main-info">
          <div className="case-title">
            <strong>{caseItem.procedureType}</strong>
            <span className="case-reference">#{caseItem.caseReferenceNumber}</span>
          </div>
          <div className="case-meta">
            <span>Submitted by: {caseItem.submittedBy}</span>
            <span>Date: {new Date(caseItem.submittedAt).toLocaleDateString()}</span>
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
              <span className="pending-text">Awaiting: {getNextResponsibleRole(caseItem.status)}</span>
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
              <strong>Surgery Date:</strong> {caseItem.dateOfSurgery}
            </div>
            <div className="detail-item">
              <strong>Time of Procedure:</strong> {caseItem.timeOfProcedure || 'Not specified'}
            </div>
            {caseItem.doctorName && (
              <div className="detail-item">
                <strong>Doctor Name:</strong> {caseItem.doctorName}
              </div>
            )}
            <div className="detail-item">
              <strong>Surgery Set Selection:</strong>
              <ul>
                {caseItem.surgerySetSelection.map(set => (
                  <li key={set}>{set}</li>
                ))}
              </ul>
            </div>
            <div className="detail-item">
              <strong>Implant Box:</strong>
              <ul>
                {caseItem.implantBox.map(box => (
                  <li key={box}>{box}</li>
                ))}
              </ul>
            </div>
            {caseItem.specialInstruction && (
              <div className="detail-item full-width">
                <strong>Special Instructions:</strong>
                <p>{caseItem.specialInstruction}</p>
              </div>
            )}
            {caseItem.processedBy && (
              <div className="detail-item">
                <strong>Prepared by:</strong> {caseItem.processedBy}
              </div>
            )}
            {caseItem.processedAt && (
              <div className="detail-item">
                <strong>Prepared at:</strong> {formatDateTime(caseItem.processedAt)}
              </div>
            )}
            {caseItem.processOrderDetails && (
              <div className="detail-item full-width">
                <strong>Prepared Order Details:</strong>
                <p>{caseItem.processOrderDetails}</p>
              </div>
            )}
            {caseItem.statusHistory && caseItem.statusHistory.length > 0 && (
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
                            <span className="history-processor">By: {historyItem.processedBy}</span>
                            {historyItem.details && (
                              <div className="history-notes">{historyItem.details}</div>
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
                            <span className="history-processor">By: {historyItem.processedBy}</span>
                            {historyItem.details && (
                              <div className="history-notes">{historyItem.details}</div>
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
                </div>
                <div className="form-group">
                  <label>Department:</label>
                  <input
                    type="text"
                    value={amendmentData.department || ''}
                    onChange={(e) => onAmendmentDataChange({ ...amendmentData, department: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Date of Surgery:</label>
                  <input
                    type="date"
                    value={amendmentData.dateOfSurgery || ''}
                    onChange={(e) => onAmendmentDataChange({ ...amendmentData, dateOfSurgery: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Procedure Type:</label>
                  <input
                    type="text"
                    value={amendmentData.procedureType || ''}
                    onChange={(e) => onAmendmentDataChange({ ...amendmentData, procedureType: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Doctor Name:</label>
                  <input
                    type="text"
                    value={amendmentData.doctorName || ''}
                    onChange={(e) => onAmendmentDataChange({ ...amendmentData, doctorName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Time of Procedure:</label>
                  <input
                    type="time"
                    value={amendmentData.timeOfProcedure || ''}
                    onChange={(e) => onAmendmentDataChange({ ...amendmentData, timeOfProcedure: e.target.value })}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Special Instructions:</label>
                  <textarea
                    value={amendmentData.specialInstruction || ''}
                    onChange={(e) => onAmendmentDataChange({ ...amendmentData, specialInstruction: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="amendment-actions">
                <button 
                  onClick={() => onSaveAmendment(caseItem.id)}
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
              <div className="processing-actions">
                <button 
                  onClick={() => onSaveProcessDetails(caseItem.id)}
                  className="btn btn-primary btn-md save-process-button"
                  disabled={!processDetails.trim()}
                >
                  Complete Processing
                </button>
                <button 
                  onClick={onCancelProcessing}
                  className="btn btn-outline-secondary btn-md cancel-process-button"
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
                  className="btn btn-primary btn-md save-received-button"
                  disabled={!receivedDetails.trim()}
                >
                  Confirm Received
                </button>
                <button 
                  onClick={onCancelReceived}
                  className="btn btn-outline-secondary btn-md cancel-received-button"
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
                  className="btn btn-primary btn-md save-completed-button"
                  disabled={!orderSummary.trim() || !doNumber.trim()}
                >
                  Complete Case
                </button>
                <button 
                  onClick={onCancelCompleted}
                  className="btn btn-outline-secondary btn-md cancel-completed-button"
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
            onOrderDeliveredOffice={onOrderDeliveredOffice}
            onToBeBilled={onToBeBilled}
            canAmendCase={canAmendCase}
          />
        </div>
      )}
    </div>
  );
};

export default CaseCard;