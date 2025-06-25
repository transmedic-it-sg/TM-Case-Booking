import React, { useState } from 'react';
import { CaseBooking } from '../types';
import { updateCaseStatus } from '../utils/storage';
import { getCurrentUser } from '../utils/auth';
import { formatDateTime } from '../utils/dateFormat';

interface ProcessOrderPageProps {
  caseData: CaseBooking;
  onProcessComplete: () => void;
  onBack: () => void;
}

const ProcessOrderPage: React.FC<ProcessOrderPageProps> = ({ 
  caseData, 
  onProcessComplete, 
  onBack 
}) => {
  const [processOrderDetails, setProcessOrderDetails] = useState(
    caseData.processOrderDetails || ''
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessOrder = async () => {
    if (!processOrderDetails.trim()) {
      alert('Please enter process order details before processing.');
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert('You must be logged in to process orders.');
      return;
    }

    setIsProcessing(true);

    try {
      updateCaseStatus(
        caseData.id,
        'Order Prepared',
        currentUser.name,
        processOrderDetails
      );

      setTimeout(() => {
        setIsProcessing(false);
        onProcessComplete();
      }, 1000);
    } catch (error) {
      setIsProcessing(false);
      alert('An error occurred while processing the order. Please try again.');
    }
  };


  return (
    <div className="process-order-page">
      <div className="page-header">
        <button onClick={onBack} className="btn btn-outline-secondary btn-md back-button">
          ← Back to Cases
        </button>
        <h2>Prepared Order Details</h2>
      </div>

      <div className="case-summary-card">
        <h3>Case Information</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <strong>Hospital:</strong> {caseData.hospital}
          </div>
          <div className="summary-item">
            <strong>Department:</strong> {caseData.department}
          </div>
          <div className="summary-item">
            <strong>Procedure:</strong> {caseData.procedureType}
          </div>
          <div className="summary-item">
            <strong>Surgery Date:</strong> {caseData.dateOfSurgery}
          </div>
          <div className="summary-item">
            <strong>Surgery Time:</strong> {caseData.timeOfProcedure || 'Not specified'}
          </div>
          <div className="summary-item">
            <strong>Submitted by:</strong> {caseData.submittedBy}
          </div>
          <div className="summary-item">
            <strong>Submitted at:</strong> {formatDateTime(caseData.submittedAt)}
          </div>
          <div className="summary-item">
            <strong>Current Status:</strong> 
            <span className="status-badge">{caseData.status}</span>
          </div>
        </div>

        <div className="equipment-section">
          <div className="equipment-item">
            <strong>Surgery Set Selection:</strong>
            <ul>
              {caseData.surgerySetSelection.map(set => (
                <li key={set}>{set}</li>
              ))}
            </ul>
          </div>
          
          <div className="equipment-item">
            <strong>Implant Box:</strong>
            <ul>
              {caseData.implantBox.map(box => (
                <li key={box}>{box}</li>
              ))}
            </ul>
          </div>
        </div>

        {caseData.specialInstruction && (
          <div className="special-instructions">
            <strong>Special Instructions:</strong>
            <p>{caseData.specialInstruction}</p>
          </div>
        )}
      </div>

      <div className="process-order-form">
        <h3>Prepared Order Details</h3>
        <div className="form-group">
          <label htmlFor="processOrderDetails">
            Enter detailed processing information, preparation notes, and any additional requirements:
          </label>
          <textarea
            id="processOrderDetails"
            value={processOrderDetails}
            onChange={(e) => setProcessOrderDetails(e.target.value)}
            rows={8}
            placeholder="Enter process order details here...

Examples:
- Equipment preparation status
- Special handling requirements
- Quality check notes
- Delivery instructions
- Any issues or concerns"
            className="process-details-textarea"
          />
        </div>

        <div className="process-actions">
          <button
            onClick={handleProcessOrder}
            disabled={isProcessing || !processOrderDetails.trim()}
            className="process-order-button"
          >
            {isProcessing ? 'Processing...' : 'Process Order'}
          </button>
        </div>

        {isProcessing && (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <p>Processing order and updating status...</p>
          </div>
        )}
      </div>

      <div className="process-info">
        <h4>What happens next?</h4>
        <ul>
          <li>Order status will change to "Order Prepared"</li>
          <li>Your name will be recorded as the processor</li>
          <li>Process timestamp will be logged</li>
          <li>Case will be ready for delivery to hospital</li>
        </ul>
      </div>
    </div>
  );
};

export default ProcessOrderPage;