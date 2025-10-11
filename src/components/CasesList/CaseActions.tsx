import React from 'react';
import { CaseActionsProps } from './types';
import { hasPermission, PERMISSION_ACTIONS } from '../../utils/permissions';
import Tooltip from '../Tooltip';

const CaseActions: React.FC<CaseActionsProps> = ({
  caseItem,
  currentUser,
  onStatusChange,
  onAmendCase,
  onDeleteCase,
  onOrderProcessed,
  onMarkOrderProcessed,
  onSalesApproval,
  onOrderDelivered,
  onOrderReceived,
  onCaseCompleted,
  onPendingDeliveryOffice,
  onOfficeDelivery,
  onOrderDeliveredOffice,
  onToBeBilled,
  onCancelCase,
  canAmendCase
}) => {
  return (
    <div className="case-actions">
      {/* Status transition buttons - hide for cancelled cases */}
      {caseItem.status !== 'Case Cancelled' && (
      <div className="case-buttons">
        {caseItem.status === 'Case Booked' && (
          <Tooltip
            content={hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.PROCESS_ORDER) ? 'Process Order' : 'You do not have permission to process orders'}
            disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.PROCESS_ORDER)}
          >
            <button
              onClick={() => onOrderProcessed(caseItem.id)}
              className={`case-action-button process-order-button ${
                !hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.PROCESS_ORDER)
                  ? 'disabled' : ''
              }`}
              disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.PROCESS_ORDER)}
            >
              Process Order
            </button>
          </Tooltip>
        )}

        {caseItem.status === 'Order Preparation' && (
          <Tooltip
            content={hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.ORDER_PROCESSED) ? 'Mark as Order Processed' : 'You do not have permission to mark orders as processed'}
            disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.ORDER_PROCESSED)}
          >
            <button
              onClick={() => onMarkOrderProcessed(caseItem.id)}
              className={`case-action-button process-button ${
                !hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.ORDER_PROCESSED)
                  ? 'disabled' : ''
              }`}
              disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.ORDER_PROCESSED)}
            >
              Order Processed
            </button>
          </Tooltip>
        )}

        {caseItem.status === 'Order Prepared' && (
          <Tooltip
            content={hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.SALES_APPROVAL) ? 'Submit for Sales Approval' : 'You do not have permission to submit for sales approval'}
            disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.SALES_APPROVAL)}
          >
            <button
              onClick={() => onSalesApproval(caseItem.id)}
              className={`case-action-button sales-approval-button ${
                !hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.SALES_APPROVAL) ? 'disabled' : ''
              }`}
              disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.SALES_APPROVAL)}
            >
              Sales Approval
            </button>
          </Tooltip>
        )}

        {caseItem.status === 'Sales Approval' && (
          <Tooltip
            content={hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.PENDING_DELIVERY_HOSPITAL) ? 'Mark as Pending Delivery to Hospital' : 'You do not have permission to mark pending delivery to hospital'}
            disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.PENDING_DELIVERY_HOSPITAL)}
          >
            <button
              onClick={() => onOrderDelivered(caseItem.id)}
              className={`case-action-button deliver-button ${
                !hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.PENDING_DELIVERY_HOSPITAL) ? 'disabled' : ''
              }`}
              disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.PENDING_DELIVERY_HOSPITAL)}
            >
              Pending Delivery (Hospital)
            </button>
          </Tooltip>
        )}

        {caseItem.status === 'Pending Delivery (Hospital)' && (
          <Tooltip
            content={hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELIVERED_HOSPITAL) ? 'Mark as Delivered to Hospital' : 'You do not have permission to mark as delivered to hospital'}
            disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELIVERED_HOSPITAL)}
          >
            <button
              onClick={() => onOrderReceived(caseItem.id)}
              className={`case-action-button received-button ${
                !hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELIVERED_HOSPITAL) ? 'disabled' : ''
              }`}
              disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELIVERED_HOSPITAL)}
            >
              Delivered (Hospital)
            </button>
          </Tooltip>
        )}

        {caseItem.status === 'Delivered (Hospital)' && (
          <Tooltip
            content={hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.CASE_COMPLETED) ? 'Mark as Case Completed' : 'You do not have permission to mark cases as completed'}
            disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.CASE_COMPLETED)}
          >
            <button
              onClick={() => onCaseCompleted(caseItem.id)}
              className={`case-action-button complete-button ${
                !hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.CASE_COMPLETED) ? 'disabled' : ''
              }`}
              disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.CASE_COMPLETED)}
            >
              Mark as Case Completed
            </button>
          </Tooltip>
        )}

        {caseItem.status === 'Case Completed' && (
          <Tooltip
            content={hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.PENDING_DELIVERY_OFFICE) ? 'Mark as Pending Delivery to Office' : 'You do not have permission to mark as pending delivery to office'}
            disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.PENDING_DELIVERY_OFFICE)}
          >
            <button
              onClick={() => onPendingDeliveryOffice(caseItem.id)}
              className={`case-action-button pending-office-button ${
                !hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.PENDING_DELIVERY_OFFICE) ? 'disabled' : ''
              }`}
              disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.PENDING_DELIVERY_OFFICE)}
            >
              Pending Delivery (Office)
            </button>
          </Tooltip>
        )}

        {caseItem.status === 'Pending Delivery (Office)' && (
          <Tooltip
            content={hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELIVERED_OFFICE) ? 'Mark as Delivered to Office' : 'You do not have permission to mark as delivered to office'}
            disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELIVERED_OFFICE)}
          >
            <button
              onClick={() => onOfficeDelivery(caseItem.id)}
              className={`case-action-button office-deliver-button ${
                !hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELIVERED_OFFICE) ? 'disabled' : ''
              }`}
              disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELIVERED_OFFICE)}
            >
              Delivered (Office)
            </button>
          </Tooltip>
        )}

        {caseItem.status === 'Delivered (Office)' && (
          <Tooltip
            content={hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.TO_BE_BILLED) ? 'Mark as To be Billed' : 'You do not have permission to mark as to be billed'}
            disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.TO_BE_BILLED)}
          >
            <button
              onClick={() => onToBeBilled(caseItem.id)}
              className={`case-action-button billing-button ${
                !hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.TO_BE_BILLED) ? 'disabled' : ''
              }`}
              disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.TO_BE_BILLED)}
            >
              Mark as To be Billed
            </button>
          </Tooltip>
        )}

        {caseItem.status === 'To be billed' && (
          <Tooltip
            content={hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.CASE_CLOSED) ? 'Mark as Case Closed' : 'You do not have permission to mark as case closed'}
            disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.CASE_CLOSED)}
          >
            <button
              onClick={() => onStatusChange(caseItem.id, 'Case Closed')}
              className={`case-action-button case-closed-button ${
                !hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.CASE_CLOSED) ? 'disabled' : ''
              }`}
              disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.CASE_CLOSED)}
            >
              Mark as Case Closed
            </button>
          </Tooltip>
        )}
      </div>
      )}

      {canAmendCase(caseItem) && caseItem.status !== 'Case Cancelled' && (
        <Tooltip
          content={hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.AMEND_CASE) ? 'Amend Case' : 'You do not have permission to amend cases'}
          disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.AMEND_CASE)}
        >
          <button
            onClick={() => {onAmendCase(caseItem);
            }}
            className="case-action-button amend-button"
          >
            Amend Case
          </button>
        </Tooltip>
      )}

      {hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELETE_CASE) && caseItem.status !== 'Case Cancelled' && (
        <Tooltip
          content={hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELETE_CASE) ? 'Delete Case' : 'You do not have permission to delete cases'}
          disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELETE_CASE)}
        >
          <button
            onClick={() => onDeleteCase(caseItem.id, caseItem)}
            className={`case-action-button delete-button ${
              !hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELETE_CASE) ? 'disabled' : ''
            }`}
            disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELETE_CASE)}
          >
            🗑️ Delete Case
          </button>
        </Tooltip>
      )}

      {/* Cancel Case button - only show for specific statuses */}
      {(['Case Booked', 'Order Preparation', 'Order Prepared', 'Sales Approval', 'Pending Delivery (Hospital)', 'Delivered (Hospital)'].includes(caseItem.status)) && hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.CANCEL_CASE) && (
        <Tooltip
          content={hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.CANCEL_CASE) ? 'Cancel this case - will mark as cancelled (case data preserved)' : 'You do not have permission to cancel cases'}
          disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.CANCEL_CASE)}
        >
          <button
            onClick={() => onCancelCase(caseItem.id)}
            className={`case-action-button cancel-button warning-action ${
              !hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.CANCEL_CASE) ? 'disabled' : ''
            }`}
            disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.CANCEL_CASE)}
          >
            🚫 Cancel Case
          </button>
        </Tooltip>
      )}

      {/* Delete button for cancelled cases (Admin/IT only) */}
      {caseItem.status === 'Case Cancelled' && (
        <Tooltip
          content={hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELETE_CASE) ? 'Permanently delete this cancelled case - this action cannot be undone' : 'Only Admin and IT users can delete cancelled cases'}
          disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELETE_CASE)}
        >
          <button
            onClick={() => onDeleteCase(caseItem.id, caseItem)}
            className={`case-action-button delete-button ${
              !hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELETE_CASE) ? 'disabled' : ''
            }`}
            disabled={!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.DELETE_CASE)}
          >
            🗑️ Delete Case
          </button>
        </Tooltip>
      )}
    </div>
  );
};

export default CaseActions;