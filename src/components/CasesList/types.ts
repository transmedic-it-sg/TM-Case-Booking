import { CaseBooking, CaseStatus, User } from '../../types';

export interface CasesListProps {
  onProcessCase: (caseData: CaseBooking) => void;
  currentUser: User | null;
  onNavigateToPermissions?: () => void;
}

export interface CaseCardProps {
  caseItem: CaseBooking;
  currentUser: User | null;
  expandedCases: Set<string>;
  expandedStatusHistory: Set<string>;
  amendingCase: string | null;
  amendmentData: Partial<CaseBooking>;
  processingCase: string | null;
  processDetails: string;
  deliveryCase: string | null;
  deliveryDetails: string;
  receivedCase: string | null;
  receivedDetails: string;
  receivedImage: string;
  completedCase: string | null;
  attachments: string[];
  orderSummary: string;
  doNumber: string;
  onToggleExpansion: (caseId: string) => void;
  onToggleStatusHistory: (caseId: string) => void;
  onStatusChange: (caseId: string, newStatus: CaseStatus) => void;
  onAmendCase: (caseItem: CaseBooking) => void;
  onSaveAmendment: (caseId: string) => void;
  onCancelAmendment: () => void;
  onOrderProcessed: (caseId: string) => void;
  onSaveProcessDetails: (caseId: string) => void;
  onCancelProcessing: () => void;
  onOrderDelivered: (caseId: string) => void;
  onOrderReceived: (caseId: string) => void;
  onSaveOrderReceived: (caseId: string) => void;
  onCancelReceived: () => void;
  onCaseCompleted: (caseId: string) => void;
  onSaveCaseCompleted: (caseId: string) => void;
  onCancelCompleted: () => void;
  onOrderDeliveredOffice: (caseId: string) => void;
  onToBeBilled: (caseId: string) => void;
  onDeleteCase: (caseId: string, caseItem: CaseBooking) => void;
  onCancelCase: (caseId: string) => void;
  onAttachmentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (index: number) => void;
  onAmendmentDataChange: (data: Partial<CaseBooking>) => void;
  onProcessDetailsChange: (details: string) => void;
  onReceivedDetailsChange: (details: string) => void;
  onReceivedImageChange: (image: string) => void;
  onOrderSummaryChange: (summary: string) => void;
  onDoNumberChange: (doNumber: string) => void;
  onNavigateToPermissions?: () => void;
}

export interface CaseActionsProps {
  caseItem: CaseBooking;
  currentUser: User | null;
  onStatusChange: (caseId: string, newStatus: CaseStatus) => void;
  onAmendCase: (caseItem: CaseBooking) => void;
  onDeleteCase: (caseId: string, caseItem: CaseBooking) => void;
  onOrderProcessed: (caseId: string) => void;
  onOrderDelivered: (caseId: string) => void;
  onOrderReceived: (caseId: string) => void;
  onCaseCompleted: (caseId: string) => void;
  onOrderDeliveredOffice: (caseId: string) => void;
  onToBeBilled: (caseId: string) => void;
  onCancelCase: (caseId: string) => void;
  canAmendCase: (caseItem: CaseBooking) => boolean;
}