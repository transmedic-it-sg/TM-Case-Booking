/**
 * CaseCard Component Types
 * Centralized type definitions for the CaseCard component family
 */

import { CaseBooking, CaseStatus } from '../../types';

export interface CaseCardData {
  caseItem: CaseBooking;
  currentUser: any;
}

export interface CaseCardState {
  expandedCases: Set<string>;
  expandedStatusHistory: Set<string>;
  expandedAmendmentHistory: Set<string>;
}

export interface AmendmentState {
  amendingCase: string | null;
  amendmentData: any;
}

export interface ProcessState {
  processingCase: string | null;
  processDetails: string;
  processAttachments: File[];
  processComments: string;
}

export interface DeliveryState {
  hospitalDeliveryCase: string | null;
  hospitalDeliveryAttachments: File[];
  hospitalDeliveryComments: string;
}

export interface ReceivedState {
  receivedCase: string | null;
  receivedDetails: string;
  receivedImage: string | null;
}

export interface CompletedState {
  completedCase: string | null;
  attachments: File[];
  orderSummary: string;
  doNumber: string;
}

export interface OfficeDeliveryState {
  pendingOfficeCase: string | null;
  pendingOfficeAttachments: File[];
  pendingOfficeComments: string;
  officeDeliveryCase: string | null;
  officeDeliveryAttachments: File[];
  officeDeliveryComments: string;
}

export interface CaseCardActions {
  onToggleExpansion: (caseId: string) => void;
  onToggleStatusHistory: (caseId: string) => void;
  onToggleAmendmentHistory: (caseId: string) => void;
  onStatusChange: (caseId: string, newStatus: CaseStatus) => void;
  onAmendCase: (caseId: string) => void;
  onSaveAmendment: (caseId: string, amendmentData: any) => void;
  onCancelAmendment: () => void;
  onOrderProcessed: (caseId: string) => void;
  onSaveProcessDetails: (caseId: string) => void;
  onCancelProcessing: () => void;
  onOrderDelivered: (caseId: string) => void;
  onOrderReceived: (caseId: string) => void;
  onSaveOrderReceived: (caseId: string) => void;
  onCancelOrderReceived: () => void;
  onCaseCompleted: (caseId: string) => void;
  onSaveCaseCompleted: (caseId: string) => void;
  onCancelCaseCompleted: () => void;
  onOrderDeliveredOffice: (caseId: string) => void;
  onSaveOfficeDelivery: (caseId: string) => void;
  onCancelOfficeDelivery: () => void;
  onToBeBilled: (caseId: string) => void;
}

export interface CaseCardProps extends
  CaseCardData,
  CaseCardState,
  AmendmentState,
  ProcessState,
  DeliveryState,
  ReceivedState,
  CompletedState,
  OfficeDeliveryState,
  CaseCardActions {
  // Additional props if needed
}

export interface CaseDetailsProps {
  caseItem: CaseBooking;
  isExpanded: boolean;
  onToggleExpansion: () => void;
}

export interface CaseHeaderProps {
  caseItem: CaseBooking;
  currentUser: any;
  isExpanded: boolean;
  onToggleExpansion: () => void;
}

export interface StatusWorkflowProps {
  caseItem: CaseBooking;
  currentUser: any;
  onStatusChange: (newStatus: CaseStatus) => void;
  // Workflow states
  processingCase: string | null;
  receivedCase: string | null;
  completedCase: string | null;
  // Workflow actions
  onOrderProcessed: () => void;
  onOrderDelivered: () => void;
  onOrderReceived: () => void;
  onCaseCompleted: () => void;
  onOrderDeliveredOffice: () => void;
  onToBeBilled: () => void;
}

export interface AttachmentManagerProps {
  caseId: string;
  attachments: File[];
  onAttachmentsChange: (attachments: File[]) => void;
  maxFiles?: number;
  acceptedFileTypes?: string[];
}

export interface AmendmentFormProps {
  caseItem: CaseBooking;
  amendmentData: any;
  onSave: (amendmentData: any) => void;
  onCancel: () => void;
}