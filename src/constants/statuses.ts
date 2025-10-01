/**
 * Status Constants - Centralized status definitions
 * Replaces scattered status strings throughout the app
 */

import { CaseStatus } from '../types';

// Case Status Constants (matching the actual CaseStatus type)
export const CASE_STATUSES = {
  CASE_BOOKED: 'Case Booked' as CaseStatus,
  ORDER_PREPARATION: 'Order Preparation' as CaseStatus,
  ORDER_PREPARED: 'Order Prepared' as CaseStatus,
  PENDING_DELIVERY_HOSPITAL: 'Pending Delivery (Hospital)' as CaseStatus,
  DELIVERED_HOSPITAL: 'Delivered (Hospital)' as CaseStatus,
  CASE_COMPLETED: 'Case Completed' as CaseStatus,
  SALES_APPROVAL: 'Sales Approval' as CaseStatus,
  PENDING_DELIVERY_OFFICE: 'Pending Delivery (Office)' as CaseStatus,
  DELIVERED_OFFICE: 'Delivered (Office)' as CaseStatus,
  TO_BE_BILLED: 'To be billed' as CaseStatus,
  CASE_CLOSED: 'Case Closed' as CaseStatus,
  CASE_CANCELLED: 'Case Cancelled' as CaseStatus
} as const;

// Status workflow order
export const STATUS_WORKFLOW: readonly CaseStatus[] = [
  CASE_STATUSES.CASE_BOOKED,
  CASE_STATUSES.ORDER_PREPARATION,
  CASE_STATUSES.ORDER_PREPARED,
  CASE_STATUSES.SALES_APPROVAL,
  CASE_STATUSES.PENDING_DELIVERY_HOSPITAL,
  CASE_STATUSES.DELIVERED_HOSPITAL,
  CASE_STATUSES.CASE_COMPLETED,
  CASE_STATUSES.PENDING_DELIVERY_OFFICE,
  CASE_STATUSES.DELIVERED_OFFICE,
  CASE_STATUSES.TO_BE_BILLED
];

// Status colors mapping
export const STATUS_COLORS = {
  [CASE_STATUSES.CASE_BOOKED]: '#1976d2',
  [CASE_STATUSES.ORDER_PREPARATION]: '#f57c00',
  [CASE_STATUSES.ORDER_PREPARED]: '#ff9800',
  [CASE_STATUSES.PENDING_DELIVERY_HOSPITAL]: '#7b1fa2',
  [CASE_STATUSES.DELIVERED_HOSPITAL]: '#9c27b0',
  [CASE_STATUSES.CASE_COMPLETED]: '#4caf50',
  [CASE_STATUSES.SALES_APPROVAL]: '#ff5722',
  [CASE_STATUSES.PENDING_DELIVERY_OFFICE]: '#0277bd',
  [CASE_STATUSES.DELIVERED_OFFICE]: '#00bcd4',
  [CASE_STATUSES.TO_BE_BILLED]: '#c2185b',
  [CASE_STATUSES.CASE_CLOSED]: '#607d8b',
  [CASE_STATUSES.CASE_CANCELLED]: '#f44336'
} as const;

// Status icons mapping
export const STATUS_ICONS = {
  [CASE_STATUSES.CASE_BOOKED]: '📝',
  [CASE_STATUSES.ORDER_PREPARATION]: '📋',
  [CASE_STATUSES.ORDER_PREPARED]: '✅',
  [CASE_STATUSES.SALES_APPROVAL]: '👨‍💼',
  [CASE_STATUSES.PENDING_DELIVERY_HOSPITAL]: '🚚',
  [CASE_STATUSES.DELIVERED_HOSPITAL]: '📦',
  [CASE_STATUSES.CASE_COMPLETED]: '✅',
  [CASE_STATUSES.PENDING_DELIVERY_OFFICE]: '🚚',
  [CASE_STATUSES.DELIVERED_OFFICE]: '🏢',
  [CASE_STATUSES.TO_BE_BILLED]: '💰',
  [CASE_STATUSES.CASE_CLOSED]: '📁',
  [CASE_STATUSES.CASE_CANCELLED]: '❌'
} as const;

// Status labels for display
export const STATUS_LABELS = {
  [CASE_STATUSES.CASE_BOOKED]: 'Booked',
  [CASE_STATUSES.ORDER_PREPARATION]: 'Preparing',
  [CASE_STATUSES.ORDER_PREPARED]: 'Prepared',
  [CASE_STATUSES.SALES_APPROVAL]: 'Sales Approval',
  [CASE_STATUSES.PENDING_DELIVERY_HOSPITAL]: 'Pending Delivery',
  [CASE_STATUSES.DELIVERED_HOSPITAL]: 'Delivered to Hospital',
  [CASE_STATUSES.CASE_COMPLETED]: 'Completed',
  [CASE_STATUSES.PENDING_DELIVERY_OFFICE]: 'Pending Office Delivery',
  [CASE_STATUSES.DELIVERED_OFFICE]: 'Delivered to Office',
  [CASE_STATUSES.TO_BE_BILLED]: 'Ready for Billing',
  [CASE_STATUSES.CASE_CLOSED]: 'Closed',
  [CASE_STATUSES.CASE_CANCELLED]: 'Cancelled'
} as const;

// Status descriptions
export const STATUS_DESCRIPTIONS = {
  [CASE_STATUSES.CASE_BOOKED]: 'Case has been submitted and is awaiting order preparation',
  [CASE_STATUSES.ORDER_PREPARATION]: 'Order is being prepared by operations team',
  [CASE_STATUSES.ORDER_PREPARED]: 'Order has been prepared and is ready for sales approval',
  [CASE_STATUSES.SALES_APPROVAL]: 'Order requires sales team approval before delivery',
  [CASE_STATUSES.PENDING_DELIVERY_HOSPITAL]: 'Order is pending delivery to hospital',
  [CASE_STATUSES.DELIVERED_HOSPITAL]: 'Order has been delivered to the hospital',
  [CASE_STATUSES.CASE_COMPLETED]: 'Surgical case has been completed successfully',
  [CASE_STATUSES.PENDING_DELIVERY_OFFICE]: 'Equipment is pending delivery to office',
  [CASE_STATUSES.DELIVERED_OFFICE]: 'Equipment has been returned to office',
  [CASE_STATUSES.TO_BE_BILLED]: 'Case is ready for billing and invoicing',
  [CASE_STATUSES.CASE_CLOSED]: 'Case has been closed and archived',
  [CASE_STATUSES.CASE_CANCELLED]: 'Case has been cancelled'
} as const;

// Helper functions
export const getStatusColor = (status: CaseStatus): string => {
  return STATUS_COLORS[status] || '#6c757d';
};

export const getStatusIcon = (status: CaseStatus): string => {
  return STATUS_ICONS[status] || '📄';
};

export const getStatusLabel = (status: CaseStatus): string => {
  return STATUS_LABELS[status] || status;
};

export const getStatusDescription = (status: CaseStatus): string => {
  return STATUS_DESCRIPTIONS[status] || '';
};

export const getNextStatus = (currentStatus: CaseStatus): CaseStatus | null => {
  const currentIndex = STATUS_WORKFLOW.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === STATUS_WORKFLOW.length - 1) {
    return null;
  }
  return STATUS_WORKFLOW[currentIndex + 1];
};

export const getPreviousStatus = (currentStatus: CaseStatus): CaseStatus | null => {
  const currentIndex = STATUS_WORKFLOW.indexOf(currentStatus);
  if (currentIndex <= 0) {
    return null;
  }
  return STATUS_WORKFLOW[currentIndex - 1];
};

export const isValidStatusTransition = (from: CaseStatus, to: CaseStatus): boolean => {
  // Allow jumping to "To be billed" from any status
  if (to === CASE_STATUSES.TO_BE_BILLED) {
    return true;
  }

  // Otherwise, must follow workflow order
  const fromIndex = STATUS_WORKFLOW.indexOf(from);
  const toIndex = STATUS_WORKFLOW.indexOf(to);

  return toIndex === fromIndex + 1;
};

// Status groups for filtering
export const STATUS_GROUPS = {
  ACTIVE: [
    CASE_STATUSES.CASE_BOOKED,
    CASE_STATUSES.ORDER_PREPARATION,
    CASE_STATUSES.ORDER_PREPARED,
    CASE_STATUSES.PENDING_DELIVERY_HOSPITAL,
    CASE_STATUSES.DELIVERED_HOSPITAL
  ],
  COMPLETED: [
    CASE_STATUSES.CASE_COMPLETED,
    CASE_STATUSES.PENDING_DELIVERY_OFFICE,
    CASE_STATUSES.DELIVERED_OFFICE,
    CASE_STATUSES.TO_BE_BILLED
  ],
  PENDING_ACTION: [
    CASE_STATUSES.CASE_BOOKED,
    CASE_STATUSES.PENDING_DELIVERY_HOSPITAL,
    CASE_STATUSES.DELIVERED_HOSPITAL
  ],
  FINAL: [
    CASE_STATUSES.CASE_CLOSED,
    CASE_STATUSES.CASE_CANCELLED
  ]
} as const;