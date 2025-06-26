/**
 * StatusWorkflow Component - Case status workflow management
 * Handles all status transitions and workflow logic
 */

import React from 'react';
import { StatusWorkflowProps } from './types';
import { usePermissions } from '../../hooks';
import { useCaseActions } from './hooks/useCaseActions';

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
  const caseActions = useCaseActions(caseItem);

  const getStatusActions = () => {
    const actions = [];

    switch (caseItem.status) {
      case 'Case Booked':
        if (permissions.canProcessOrder) {
          actions.push({
            key: 'process',
            label: 'Process Order',
            action: onOrderProcessed,
            className: 'btn btn-primary btn-sm',
            icon: '📋'
          });
        }
        break;

      case 'Order Preparation':
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

      case 'Order Delivered':
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

      case 'Order Received':
        if (permissions.canCompleteCase) {
          actions.push({
            key: 'complete',
            label: 'Mark Case as Completed',
            action: onCaseCompleted,
            className: 'btn btn-success btn-sm',
            icon: '✅'
          });
        }
        break;

      case 'Case Completed':
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

      case 'Order Delivered (Office)':
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
    if (
      permissions.canMarkToBilled &&
      caseItem.status !== 'To be billed' &&
      !actions.some(a => a.key === 'billing')
    ) {
      actions.push({
        key: 'billing',
        label: 'Mark as To be Billed',
        action: onToBeBilled,
        className: 'btn btn-outline-secondary btn-sm',
        icon: '💰'
      });
    }

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
        {statusActions.map(action => (
          <button
            key={action.key}
            className={action.className}
            onClick={action.action}
            disabled={
              (action.key === 'process' && processingCase === caseItem.id) ||
              (action.key === 'receive' && receivedCase === caseItem.id) ||
              (action.key === 'complete' && completedCase === caseItem.id)
            }
          >
            <span className="action-icon">{action.icon}</span>
            <span className="action-label">{action.label}</span>
          </button>
        ))}
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
  { status: 'Case Booked', icon: '📝', label: 'Booked' },
  { status: 'Order Preparation', icon: '📋', label: 'Preparing' },
  { status: 'Order Delivered', icon: '🚚', label: 'Delivered' },
  { status: 'Order Received', icon: '📦', label: 'Received' },
  { status: 'Case Completed', icon: '✅', label: 'Completed' },
  { status: 'Order Delivered (Office)', icon: '🏢', label: 'Office' },
  { status: 'To be billed', icon: '💰', label: 'Billing' }
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