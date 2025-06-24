// Component Interface Reference for Claude
// Quick access to all component interfaces without reading full files

// ===== CORE COMPONENTS =====

interface SearchableDropdownProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[] | { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'alert' | 'confirm' | 'success' | 'error' | 'warning' | 'info';
  actions?: ModalAction[];
  autoClose?: boolean;
  autoCloseDelay?: number;
}

interface ModalAction {
  label: string;
  onClick: () => void;
  style?: 'primary' | 'secondary' | 'danger' | 'success';
}

// ===== CASE MANAGEMENT =====

interface CaseBooking {
  id: string;
  caseReferenceNumber: string;
  hospital: string;
  department: string;
  dateOfSurgery: string;
  procedureType: string;
  procedureName: string;
  doctorName?: string;
  timeOfProcedure?: string;
  surgerySetSelection: string[];
  implantBox: string[];
  specialInstruction?: string;
  status: CaseStatus;
  submittedBy: string;
  submittedAt: string;
  processedBy?: string;
  processedAt?: string;
  processOrderDetails?: string;
  country: string;
  statusHistory: StatusHistory[];
  isAmended?: boolean;
  amendedBy?: string;
  amendedAt?: string;
}

type CaseStatus = 
  | 'Case Booked'
  | 'Order Preparation'
  | 'Order Prepared'
  | 'Pending Delivery (Hospital)'
  | 'Delivered (Hospital)'
  | 'Case Completed'
  | 'Delivered (Office)'
  | 'To be billed'
  | 'Case Cancelled';

interface CaseActionsProps {
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

// ===== USER MANAGEMENT =====

interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'operations' | 'operation-manager' | 'sales' | 'sales-manager' | 'driver' | 'it';
  name: string;
  departments: string[];
  countries: string[];
  selectedCountry?: string;
}

// ===== PERMISSION SYSTEM =====

interface Permission {
  actionId: string;
  roleId: string;
  allowed: boolean;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  color: string;
}

interface PermissionAction {
  id: string;
  name: string;
  description: string;
  category: string;
}

// ===== HOOKS =====

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm' | 'success' | 'error' | 'warning' | 'info';
  onConfirm?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

interface UseModalReturn {
  modal: ModalState;
  closeModal: () => void;
  showAlert: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  alert: (message: string) => void;
  confirm: (message: string) => Promise<boolean>;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

// ===== CALENDAR =====

interface BookingCalendarProps {
  onCaseClick?: (caseId: string) => void;
}

// ===== FILTERS =====

interface FilterOptions {
  submitter?: string;
  hospital?: string;
  country?: string;
  status?: string;
  department?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ===== EDIT SETS =====

interface CategorizedSets {
  [procedureType: string]: {
    surgerySets: string[];
    implantBoxes: string[];
  };
}

// ===== NOTIFICATION SYSTEM =====

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
  isRead: boolean;
}

// ===== CONSTANTS =====

const PERMISSION_ACTIONS = {
  // Case Management
  CREATE_CASE: 'create-case',
  VIEW_CASES: 'view-cases',
  AMEND_CASE: 'amend-case',
  DELETE_CASE: 'delete-case',
  CANCEL_CASE: 'cancel-case',
  EDIT_SETS: 'edit-sets',
  BOOKING_CALENDAR: 'booking-calendar',
  
  // Status Transitions
  PROCESS_ORDER: 'process-order',
  ORDER_PROCESSED: 'order-processed',
  PENDING_DELIVERY_HOSPITAL: 'pending-delivery-hospital',
  DELIVERED_HOSPITAL: 'delivered-hospital',
  CASE_COMPLETED: 'case-completed',
  DELIVERED_OFFICE: 'delivered-office',
  TO_BE_BILLED: 'to-be-billed',
  
  // User Management
  CREATE_USER: 'create-user',
  EDIT_USER: 'edit-user',
  DELETE_USER: 'delete-user',
  VIEW_USERS: 'view-users',
  ENABLE_DISABLE_USER: 'enable-disable-user',
  
  // System Settings
  SYSTEM_SETTINGS: 'system-settings',
  CODE_TABLE_SETUP: 'code-table-setup',
  BACKUP_RESTORE: 'backup-restore',
  AUDIT_LOGS: 'audit-logs',
  
  // Data Operations
  EXPORT_DATA: 'export-data',
  IMPORT_DATA: 'import-data',
  VIEW_REPORTS: 'view-reports',
  
  // File Operations
  UPLOAD_FILES: 'upload-files',
  DOWNLOAD_FILES: 'download-files',
  DELETE_FILES: 'delete-files'
} as const;

// Export for reference (won't actually compile in this reference file)
export type {
  SearchableDropdownProps,
  CustomModalProps,
  ModalAction,
  CaseBooking,
  CaseStatus,
  CaseActionsProps,
  User,
  Permission,
  Role,
  PermissionAction,
  ModalState,
  UseModalReturn,
  BookingCalendarProps,
  FilterOptions,
  CategorizedSets,
  Notification
};