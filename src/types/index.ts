// Import countries from centralized utility
import { SUPPORTED_COUNTRIES } from '../utils/countryUtils';

export type CaseStatus = 
  | 'Case Booked'
  | 'Order Preparation'
  | 'Order Prepared'
  | 'Pending Delivery (Hospital)'
  | 'Delivered (Hospital)'
  | 'Case Completed'
  | 'Sales Approval'
  | 'Pending Delivery (Office)'
  | 'Delivered (Office)'
  | 'To be billed'
  | 'Case Closed'
  | 'Case Cancelled';

export const COUNTRIES = SUPPORTED_COUNTRIES;

export const DEPARTMENTS = [
  'Cardiology',
  'Orthopedics', 
  'Neurosurgery',
  'Oncology',
  'Emergency',
  'Radiology',
  'Anesthesiology',
  'Gastroenterology'
] as const;

export const PROCEDURE_TYPES = [
  'Knee',
  'Head',
  'Hip', 
  'Hands',
  'Neck',
  'Spine'
] as const;

export const SURGERY_SETS = [
  'Spine Surgery Set A',
  'Spine Surgery Set B', 
  'Joint Replacement Set',
  'Sports Medicine Set',
  'Orthobiologics Set',
  'Neuromonitoring Set',
  'General Orthopedic Set'
] as const;

export const IMPLANT_BOXES = [
  'Spine Implant Box 1',
  'Spine Implant Box 2',
  'Hip Implant Box',
  'Knee Implant Box', 
  'Shoulder Implant Box',
  'Sports Med Implant Box',
  'Biologics Box'
] as const;

export const PROCEDURE_TYPE_MAPPINGS = {
  'Spine': {
    surgerySets: ['Spine Surgery Set A', 'Spine Surgery Set B', 'Neuromonitoring Set', 'General Orthopedic Set'],
    implantBoxes: ['Spine Implant Box 1', 'Spine Implant Box 2', 'Biologics Box']
  },
  'Knee': {
    surgerySets: ['Joint Replacement Set', 'Sports Medicine Set', 'General Orthopedic Set'],
    implantBoxes: ['Knee Implant Box', 'Sports Med Implant Box', 'Biologics Box']
  },
  'Hip': {
    surgerySets: ['Joint Replacement Set', 'Orthobiologics Set', 'General Orthopedic Set'],
    implantBoxes: ['Hip Implant Box', 'Biologics Box']
  },
  'Head': {
    surgerySets: ['Neuromonitoring Set', 'General Orthopedic Set'],
    implantBoxes: ['Biologics Box']
  },
  'Hands': {
    surgerySets: ['Sports Medicine Set', 'General Orthopedic Set'],
    implantBoxes: ['Sports Med Implant Box']
  },
  'Neck': {
    surgerySets: ['Spine Surgery Set A', 'Neuromonitoring Set', 'General Orthopedic Set'],
    implantBoxes: ['Spine Implant Box 1', 'Biologics Box']
  }
} as const;

export interface StatusHistory {
  status: CaseStatus;
  timestamp: string;
  processedBy: string;
  user?: string;
  details?: string;
  attachments?: string[];
}

export interface AmendmentHistory {
  amendmentId: string;
  timestamp: string;
  amendedBy: string;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  reason?: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: string; // Support for dynamic roles including custom ones
  name: string;
  departments: string[];
  countries: string[];
  email?: string;
  selectedCountry?: string;
  enabled?: boolean;
  passwordResetRequired?: boolean;
  isTemporaryPassword?: boolean;
}

export interface CaseBooking {
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
  amendedBy?: string;
  amendedAt?: string;
  isAmended?: boolean;
  statusHistory?: StatusHistory[];
  deliveryImage?: string;
  deliveryDetails?: string;
  attachments?: string[];
  orderSummary?: string;
  doNumber?: string;
  originalValues?: {
    hospital?: string;
    department?: string;
    dateOfSurgery?: string;
    procedureType?: string;
    doctorName?: string;
    timeOfProcedure?: string;
    specialInstruction?: string;
  };
  amendmentHistory?: AmendmentHistory[];
  amendmentReason?: string;
}

export interface FilterOptions {
  submitter?: string;
  hospital?: string;
  status?: CaseStatus;
  country?: string;
  department?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  duration?: number;
  caseId?: string;
  caseReferenceNumber?: string;
}