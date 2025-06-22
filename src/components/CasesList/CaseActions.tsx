import React from 'react';
import { CaseActionsProps } from './types';
import { getTooltipMessage, formatDateTime } from './utils';
import { getCurrentUser } from '../../utils/auth';
import Tooltip from '../Tooltip';

const CaseActions: React.FC<CaseActionsProps> = ({
  caseItem,
  currentUser,
  onStatusChange,
  onAmendCase,
  onDeleteCase,
  onOrderProcessed,
  onOrderDelivered,
  onOrderReceived,
  onCaseCompleted,
  onOrderDeliveredOffice,
  onToBeBilled,
  canAmendCase
}) => {
  return (
    <div className="case-actions">
      {/* Status transition buttons */}
      <div className="status-buttons">
        {caseItem.status === 'Case Booked' && (
          <Tooltip
            content={getTooltipMessage(['operations', 'operation-manager', 'admin'], 'Process Order')}
            disabled={!(currentUser?.role === 'operations' || currentUser?.role === 'operation-manager' || currentUser?.role === 'admin')}
          >
            <button
              onClick={() => onStatusChange(caseItem.id, 'Order Preparation')}
              className={`process-order-button ${
                !(currentUser?.role === 'operations' || currentUser?.role === 'operation-manager' || currentUser?.role === 'admin') 
                  ? 'disabled' : ''
              }`}
              disabled={!(currentUser?.role === 'operations' || currentUser?.role === 'operation-manager' || currentUser?.role === 'admin')}
            >
              Process Order
            </button>
          </Tooltip>
        )}
        
        {caseItem.status === 'Order Preparation' && (
          <button
            onClick={() => onOrderProcessed(caseItem.id)}
            className="process-button"
          >
            Order Processed
          </button>
        )}
        
        {caseItem.status === 'Pending Preparation' && (
          <button
            onClick={() => onOrderProcessed(caseItem.id)}
            className="process-button"
          >
            Order Processed
          </button>
        )}
        
        {caseItem.status === 'Order Prepared' && (
          <Tooltip
            content={getTooltipMessage(['driver', 'admin'], 'Pending Delivery (Hospital)')}
            disabled={!(currentUser?.role === 'driver' || currentUser?.role === 'admin')}
          >
            <button
              onClick={() => onOrderDelivered(caseItem.id)}
              className={`deliver-button ${
                !(currentUser?.role === 'driver' || currentUser?.role === 'admin') ? 'disabled' : ''
              }`}
              disabled={!(currentUser?.role === 'driver' || currentUser?.role === 'admin')}
            >
              Pending Delivery (Hospital)
            </button>
          </Tooltip>
        )}
        
        {caseItem.status === 'Pending Delivery (Hospital)' && (
          <Tooltip
            content={getTooltipMessage(['driver', 'admin'], 'Delivered (Hospital)')}
            disabled={!(currentUser?.role === 'driver' || currentUser?.role === 'admin')}
          >
            <button
              onClick={() => onOrderReceived(caseItem.id)}
              className={`received-button ${
                !(currentUser?.role === 'driver' || currentUser?.role === 'admin') ? 'disabled' : ''
              }`}
              disabled={!(currentUser?.role === 'driver' || currentUser?.role === 'admin')}
            >
              Delivered (Hospital)
            </button>
          </Tooltip>
        )}
        
        {caseItem.status === 'Delivered (Hospital)' && (
          <Tooltip
            content={getTooltipMessage(['sales', 'admin'], 'Mark as Case Completed')}
            disabled={!(currentUser?.role === 'sales' || currentUser?.role === 'admin')}
          >
            <button
              onClick={() => onCaseCompleted(caseItem.id)}
              className={`complete-button ${
                !(currentUser?.role === 'sales' || currentUser?.role === 'admin') ? 'disabled' : ''
              }`}
              disabled={!(currentUser?.role === 'sales' || currentUser?.role === 'admin')}
            >
              Mark as Case Completed
            </button>
          </Tooltip>
        )}
        
        {caseItem.status === 'Case Completed' && (
          <Tooltip
            content={getTooltipMessage(['driver', 'sales', 'admin'], 'Delivered (Office)')}
            disabled={!(currentUser?.role === 'driver' || currentUser?.role === 'sales' || currentUser?.role === 'admin')}
          >
            <button
              onClick={() => onOrderDeliveredOffice(caseItem.id)}
              className={`office-deliver-button ${
                !(currentUser?.role === 'driver' || currentUser?.role === 'sales' || currentUser?.role === 'admin') ? 'disabled' : ''
              }`}
              disabled={!(currentUser?.role === 'driver' || currentUser?.role === 'sales' || currentUser?.role === 'admin')}
            >
              Delivered (Office)
            </button>
          </Tooltip>
        )}
        
        {caseItem.status === 'Delivered (Office)' && (
          <button
            onClick={() => onToBeBilled(caseItem.id)}
            className="billing-button"
          >
            Mark as To be Billed
          </button>
        )}
      </div>
      
      {canAmendCase(caseItem) && (
        <button
          onClick={() => onAmendCase(caseItem)}
          className="amend-button"
        >
          Amend Case
        </button>
      )}
      
      {(currentUser?.role === 'admin' || currentUser?.role === 'operation-manager') && (
        <button
          onClick={() => onDeleteCase(caseItem.id, caseItem)}
          className="delete-button"
        >
          🗑️ Delete Case
        </button>
      )}
      
      {caseItem.isAmended && (
        <div className="amendment-info">
          <span className="amendment-badge">AMENDED</span>
          <small>
            Amended by: {caseItem.amendedBy}<br/>
            Amended at: {caseItem.amendedAt ? formatDateTime(caseItem.amendedAt) : 'N/A'}
          </small>
        </div>
      )}
    </div>
  );
};

export default CaseActions;