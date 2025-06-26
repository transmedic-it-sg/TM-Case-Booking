/**
 * Status Constants - Centralized status definitions
 * Replaces scattered status strings throughout the app
 */

import { CaseStatus } from '../types';

// Case Status Constants
export const CASE_STATUSES = {
  CASE_BOOKED: 'Case Booked',
  ORDER_PREPARATION: 'Order Preparation', 
  ORDER_DELIVERED: 'Order Delivered',
  ORDER_RECEIVED: 'Order Received',
  CASE_COMPLETED: 'Case Completed',
  ORDER_DELIVERED_OFFICE: 'Order Delivered (Office)',
  TO_BE_BILLED: 'To be billed'
} as const;

// Status workflow order
export const STATUS_WORKFLOW: readonly CaseStatus[] = [
  CASE_STATUSES.CASE_BOOKED,
  CASE_STATUSES.ORDER_PREPARATION,
  CASE_STATUSES.ORDER_DELIVERED,
  CASE_STATUSES.ORDER_RECEIVED,
  CASE_STATUSES.CASE_COMPLETED,
  CASE_STATUSES.ORDER_DELIVERED_OFFICE,
  CASE_STATUSES.TO_BE_BILLED
];

// Status colors mapping
export const STATUS_COLORS = {
  [CASE_STATUSES.CASE_BOOKED]: '#1976d2',
  [CASE_STATUSES.ORDER_PREPARATION]: '#f57c00',
  [CASE_STATUSES.ORDER_DELIVERED]: '#7b1fa2',
  [CASE_STATUSES.ORDER_RECEIVED]: '#388e3c',
  [CASE_STATUSES.CASE_COMPLETED]: '#2e7d32',
  [CASE_STATUSES.ORDER_DELIVERED_OFFICE]: '#0277bd',
  [CASE_STATUSES.TO_BE_BILLED]: '#c2185b'
} as const;

// Status icons mapping
export const STATUS_ICONS = {
  [CASE_STATUSES.CASE_BOOKED]: '📝',
  [CASE_STATUSES.ORDER_PREPARATION]: '📋',
  [CASE_STATUSES.ORDER_DELIVERED]: '🚚',
  [CASE_STATUSES.ORDER_RECEIVED]: '📦',
  [CASE_STATUSES.CASE_COMPLETED]: '✅',
  [CASE_STATUSES.ORDER_DELIVERED_OFFICE]: '🏢',
  [CASE_STATUSES.TO_BE_BILLED]: '💰'
} as const;

// Status labels for display
export const STATUS_LABELS = {
  [CASE_STATUSES.CASE_BOOKED]: 'Booked',
  [CASE_STATUSES.ORDER_PREPARATION]: 'Preparing',
  [CASE_STATUSES.ORDER_DELIVERED]: 'Delivered to Hospital',
  [CASE_STATUSES.ORDER_RECEIVED]: 'Received at Hospital',
  [CASE_STATUSES.CASE_COMPLETED]: 'Completed',
  [CASE_STATUSES.ORDER_DELIVERED_OFFICE]: 'Delivered to Office',
  [CASE_STATUSES.TO_BE_BILLED]: 'Ready for Billing'
} as const;

// Status descriptions
export const STATUS_DESCRIPTIONS = {
  [CASE_STATUSES.CASE_BOOKED]: 'Case has been submitted and is awaiting order preparation',
  [CASE_STATUSES.ORDER_PREPARATION]: 'Order is being prepared by operations team',
  [CASE_STATUSES.ORDER_DELIVERED]: 'Order has been delivered to the hospital',
  [CASE_STATUSES.ORDER_RECEIVED]: 'Order has been received and confirmed at the hospital',
  [CASE_STATUSES.CASE_COMPLETED]: 'Surgical case has been completed successfully',
  [CASE_STATUSES.ORDER_DELIVERED_OFFICE]: 'Equipment has been returned to office',
  [CASE_STATUSES.TO_BE_BILLED]: 'Case is ready for billing and invoicing'
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
    CASE_STATUSES.ORDER_DELIVERED,
    CASE_STATUSES.ORDER_RECEIVED
  ],
  COMPLETED: [
    CASE_STATUSES.CASE_COMPLETED,
    CASE_STATUSES.ORDER_DELIVERED_OFFICE,
    CASE_STATUSES.TO_BE_BILLED
  ],
  PENDING_ACTION: [
    CASE_STATUSES.CASE_BOOKED,
    CASE_STATUSES.ORDER_DELIVERED,
    CASE_STATUSES.ORDER_RECEIVED
  ]
} as const;