/**
 * StatusWorkflow Component - Case status workflow management
 * Handles all status transitions and workflow logic
 */

import React from 'react';
import { StatusWorkflowProps } from './types';
import { usePermissions } from '../../hooks';
// Removed useCaseActions - now using useRealtimeCases directly
import { CASE_STATUSES } from '../../constants';

const StatusWorkflow: React.FC<StatusWorkflowProps> = ({
  caseItem,
  currentUser,
  onStatusChange,
  processingCase,
  receivedCase,
  completedCase,
  onOrderProcessed,
  onOrderDelivered,
  onOrderReceived,
  onCaseCompleted,
  onOrderDeliveredOffice,
  onToBeBilled
}) => {
  const permissions = usePermissions();
  // Removed useCaseActions - now using functions passed via props

  const getStatusActions = () => {
    const actions = [];

    // 🔍 DEBUG: Status Workflow Action Generation
    console.log('🔄 STATUS WORKFLOW DEBUG - Action Generation Start:', {
      timestamp: new Date().toISOString(),
      caseId: caseItem.id,
      caseRef: caseItem.caseReferenceNumber,
      currentStatus: caseItem.status,
      permissionsSnapshot: {
        canProcessOrder: permissions.canProcessOrder,
        canMarkDelivered: permissions.canMarkDelivered,
        canSalesApproval: permissions.canSalesApproval,
        canReceiveOrder: permissions.canReceiveOrder,
        canDeliverToOffice: permissions.canDeliverToOffice,
        canMarkToBilled: permissions.canMarkToBilled
      },
      userInfo: currentUser?.email || 'Unknown'
    });

    switch (caseItem.status) {
      case CASE_STATUSES.CASE_BOOKED:
        console.log('🔍 STATUS WORKFLOW DEBUG - Case Booked Handler:', {
          status: caseItem.status,
          canProcessOrder: permissions.canProcessOrder,
          hasOnOrderProcessed: typeof onOrderProcessed === 'function',
          onOrderProcessedFunction: onOrderProcessed?.toString().substring(0, 100) + '...'
        });
        
        if (permissions.canProcessOrder) {
          actions.push({
            key: 'process',
            label: 'Process Order',
            action: onOrderProcessed,
            className: 'btn btn-primary btn-sm',
            icon: '📋'
          });
          
          console.log('✅ STATUS WORKFLOW DEBUG - Added Process Order action:', {
            actionKey: 'process',
            actionLabel: 'Process Order',
            hasActionFunction: typeof onOrderProcessed === 'function'
          });
        } else {
          console.log('❌ STATUS WORKFLOW DEBUG - Process Order NOT ADDED:', {
            reason: 'Missing canProcessOrder permission',
            canProcessOrder: permissions.canProcessOrder
          });
        }
        break;

      case CASE_STATUSES.ORDER_PREPARATION:
        if (permissions.canMarkDelivered) {
          actions.push({
            key: 'deliver',
            label: 'Mark as Delivered to Hospital',
            action: onOrderDelivered,
            className: 'btn btn-warning btn-sm',
            icon: '🚚'
          });
        }
        break;

      case CASE_STATUSES.ORDER_PREPARED:
        console.log('🔍 STATUS WORKFLOW DEBUG - Order Prepared Handler:', {
          status: caseItem.status,
          canSalesApproval: permissions.canSalesApproval,
          hasOnStatusChange: typeof onStatusChange === 'function',
          onStatusChangeFunction: onStatusChange?.toString().substring(0, 100) + '...',
          targetStatus: CASE_STATUSES.SALES_APPROVAL
        });
        
        if (permissions.canSalesApproval) {
          actions.push({
            key: 'sales-approval',
            label: 'Sales Approved',
            action: () => onStatusChange?.(CASE_STATUSES.SALES_APPROVAL),
            className: 'btn btn-success btn-sm',
            icon: '👨‍💼'
          });
          
          console.log('✅ STATUS WORKFLOW DEBUG - Added Sales Approved action:', {
            actionKey: 'sales-approval',
            actionLabel: 'Sales Approved',
            targetStatus: CASE_STATUSES.SALES_APPROVAL,
            hasStatusChangeFunction: typeof onStatusChange === 'function'
          });
        } else {
          console.log('❌ STATUS WORKFLOW DEBUG - Sales Approved NOT ADDED:', {
            reason: 'Missing canSalesApproval permission',
            canSalesApproval: permissions.canSalesApproval
          });
        }
        break;

      case CASE_STATUSES.SALES_APPROVAL:
        console.log('🔍 STATUS WORKFLOW DEBUG - Sales Approved Handler:', {
          status: caseItem.status,
          canMarkDelivered: permissions.canMarkDelivered,
          hasOnOrderDelivered: typeof onOrderDelivered === 'function',
          onOrderDeliveredFunction: onOrderDelivered?.toString().substring(0, 100) + '...'
        });
        
        if (permissions.canMarkDelivered) {
          actions.push({
            key: 'deliver',
            label: 'Mark as Delivered to Hospital',
            action: onOrderDelivered,
            className: 'btn btn-warning btn-sm',
            icon: '🚚'
          });
          
          console.log('✅ STATUS WORKFLOW DEBUG - Added Delivered Hospital action:', {
            actionKey: 'deliver',
            actionLabel: 'Mark as Delivered to Hospital',
            hasActionFunction: typeof onOrderDelivered === 'function'
          });
        } else {
          console.log('❌ STATUS WORKFLOW DEBUG - Delivered Hospital NOT ADDED:', {
            reason: 'Missing canMarkDelivered permission',
            canMarkDelivered: permissions.canMarkDelivered
          });
        }
        break;

      case CASE_STATUSES.DELIVERED_HOSPITAL:
        if (permissions.canReceiveOrder) {
          actions.push({
            key: 'receive',
            label: 'Mark as Received at Hospital',
            action: onOrderReceived,
            className: 'btn btn-info btn-sm',
            icon: '📦'
          });
        }
        break;

      case CASE_STATUSES.CASE_COMPLETED:
        if (permissions.canDeliverToOffice) {
          actions.push({
            key: 'office-delivery',
            label: 'Mark as Delivered to Office',
            action: onOrderDeliveredOffice,
            className: 'btn btn-primary btn-sm',
            icon: '🏢'
          });
        }
        break;

      case CASE_STATUSES.DELIVERED_OFFICE:
        if (permissions.canMarkToBilled) {
          actions.push({
            key: 'billing',
            label: 'Mark as To be Billed',
            action: onToBeBilled,
            className: 'btn btn-secondary btn-sm',
            icon: '💰'
          });
        }
        break;
    }

    // All users can mark as "To be billed" from certain statuses
    console.log('🔍 STATUS WORKFLOW DEBUG - Global Billing Check:', {
      canMarkToBilled: permissions.canMarkToBilled,
      currentStatus: caseItem.status,
      isNotToBeBilled: caseItem.status !== CASE_STATUSES.TO_BE_BILLED,
      hasBillingAction: actions.some(a => a.key === 'billing'),
      existingActions: actions.map(a => a.key),
      willAddGlobalBilling: permissions.canMarkToBilled && 
        caseItem.status !== CASE_STATUSES.TO_BE_BILLED && 
        !actions.some(a => a.key === 'billing')
    });
    
    if (
      permissions.canMarkToBilled &&
      caseItem.status !== CASE_STATUSES.TO_BE_BILLED &&
      !actions.some(a => a.key === 'billing')
    ) {
      actions.push({
        key: 'billing',
        label: 'Mark as To be Billed',
        action: onToBeBilled,
        className: 'btn btn-outline-secondary btn-sm',
        icon: '💰'
      });
      
      console.log('✅ STATUS WORKFLOW DEBUG - Added Global Billing action:', {
        actionKey: 'billing',
        actionLabel: 'Mark as To be Billed',
        className: 'btn btn-outline-secondary btn-sm',
        hasActionFunction: typeof onToBeBilled === 'function'
      });
    }

    console.log('🔄 STATUS WORKFLOW DEBUG - Final Actions Generated:', {
      caseId: caseItem.id,
      caseRef: caseItem.caseReferenceNumber,
      currentStatus: caseItem.status,
      totalActions: actions.length,
      actionKeys: actions.map(a => a.key),
      actionLabels: actions.map(a => a.label),
      hasOrderProcessed: actions.some(a => a.key === 'process'),
      hasSalesApproval: actions.some(a => a.key === 'sales-approval'),
      salesApprovalCount: actions.filter(a => a.key === 'sales-approval').length,
      allActions: actions.map(a => ({
        key: a.key,
        label: a.label,
        className: a.className,
        hasFunction: typeof a.action === 'function'
      }))
    });

    return actions;
  };

  const statusActions = getStatusActions();

  if (statusActions.length === 0) {
    return (
      <div className="workflow-status">
        <span className="no-actions-message">
          No actions available for current status
        </span>
      </div>
    );
  }

  return (
    <div className="status-workflow">
      <div className="workflow-header">
        <h4 className="workflow-title">Available Actions</h4>
        <span className="current-status">
          Current: <strong>{caseItem.status}</strong>
        </span>
      </div>

      <div className="workflow-actions">
        {statusActions.map(action => {
          const isDisabled = (action.key === 'process' && processingCase === caseItem.id) ||
            (action.key === 'receive' && receivedCase === caseItem.id) ||
            (action.key === 'complete' && completedCase === caseItem.id);

          // 🔍 DEBUG: Action Button Debug
          console.log('🔘 STATUS WORKFLOW DEBUG - Rendering Action Button:', {
            caseId: caseItem.id,
            caseRef: caseItem.caseReferenceNumber,
            actionKey: action.key,
            actionLabel: action.label,
            isDisabled,
            processingCase,
            receivedCase,
            completedCase,
            hasActionFunction: typeof action.action === 'function',
            buttonIndex: statusActions.indexOf(action)
          });

          return (
            <button
              key={action.key}
              className={action.className}
              onClick={(e) => {
                console.log('🖱️ STATUS WORKFLOW DEBUG - Button Clicked:', {
                  timestamp: new Date().toISOString(),
                  caseId: caseItem.id,
                  caseRef: caseItem.caseReferenceNumber,
                  actionKey: action.key,
                  actionLabel: action.label,
                  currentStatus: caseItem.status,
                  isDisabled,
                  hasActionFunction: typeof action.action === 'function',
                  actionFunctionName: action.action?.name || 'anonymous',
                  event: {
                    type: e.type,
                    target: (e.target as HTMLElement)?.tagName || 'unknown',
                    bubbles: e.bubbles
                  }
                });

                // Execute the actual action
                if (typeof action.action === 'function') {
                  console.log('▶️ STATUS WORKFLOW DEBUG - Executing Action:', {
                    actionKey: action.key,
                    actionLabel: action.label,
                    aboutToCall: action.action.toString().substring(0, 150) + '...'
                  });
                  
                  try {
                    const result = action.action();
                    console.log('✅ STATUS WORKFLOW DEBUG - Action Executed:', {
                      actionKey: action.key,
                      result: result,
                      resultType: typeof result
                    });
                  } catch (error) {
                    console.error('❌ STATUS WORKFLOW DEBUG - Action Failed:', {
                      actionKey: action.key,
                      error: error instanceof Error ? error.message : String(error),
                      stack: error instanceof Error ? error.stack : undefined
                    });
                  }
                } else {
                  console.error('❌ STATUS WORKFLOW DEBUG - No Action Function:', {
                    actionKey: action.key,
                    actionValue: action.action,
                    actionType: typeof action.action
                  });
                }
              }}
              disabled={isDisabled}
            >
              <span className="action-icon">{action.icon}</span>
              <span className="action-label">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Workflow Progress Indicator */}
      <div className="workflow-progress">
        <div className="progress-track">
          {getWorkflowSteps().map((step, index) => (
            <div
              key={step.status}
              className={`progress-step ${getStepClassName(step.status, caseItem.status)}`}
            >
              <div className="step-indicator">
                <span className="step-icon">{step.icon}</span>
              </div>
              <span className="step-label">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to get workflow steps
const getWorkflowSteps = () => [
  { status: CASE_STATUSES.CASE_BOOKED, icon: '📝', label: 'Booked' },
  { status: CASE_STATUSES.ORDER_PREPARATION, icon: '📋', label: 'Preparing' },
  { status: CASE_STATUSES.ORDER_PREPARED, icon: '✅', label: 'Prepared' },
  { status: CASE_STATUSES.PENDING_DELIVERY_HOSPITAL, icon: '🚚', label: 'Pending' },
  { status: CASE_STATUSES.DELIVERED_HOSPITAL, icon: '📦', label: 'Delivered' },
  { status: CASE_STATUSES.CASE_COMPLETED, icon: '✅', label: 'Completed' },
  { status: CASE_STATUSES.PENDING_DELIVERY_OFFICE, icon: '🚚', label: 'Office Pending' },
  { status: CASE_STATUSES.DELIVERED_OFFICE, icon: '🏢', label: 'Office' },
  { status: CASE_STATUSES.TO_BE_BILLED, icon: '💰', label: 'Billing' }
];

// Helper function to get step className
const getStepClassName = (stepStatus: string, currentStatus: string) => {
  const steps = getWorkflowSteps();
  const stepIndex = steps.findIndex(s => s.status === stepStatus);
  const currentIndex = steps.findIndex(s => s.status === currentStatus);

  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'active';
  return 'pending';
};

export default React.memo(StatusWorkflow);