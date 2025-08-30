/**
 * Type Mapping Utilities - Converts between Database and Application schemas
 * Resolves the mismatch between database column names and application interfaces
 */

import { CaseBooking, CaseStatus } from '../types';

// Database Case Interface (matches actual Supabase schema)
export interface DbCaseBooking {
  id: string;
  case_reference: string;
  hospital_name: string;
  patient_name: string;
  department: string;
  date_of_surgery: string;
  procedure_type: string;
  procedure_name?: string;
  surgeon_name?: string;
  time_of_procedure?: string;
  surgery_sets: string[];
  implant_boxes: string[];
  special_instruction?: string;
  status: CaseStatus;
  submitted_by: string;
  submitted_at?: string;
  processed_by?: string;
  processed_at?: string;
  process_order_details?: string;
  country: string;
  created_at?: string;
  updated_at?: string;
}

// Database User Interface (matches profiles table)
export interface DbUser {
  id: string;
  username: string;
  password_hash?: string;
  role: string;
  name: string;
  departments: string[];
  countries: string[];
  selected_country?: string;
  enabled: boolean;
  email?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Convert Database Case to Application Case
 */
export const dbCaseToAppCase = (dbCase: DbCaseBooking): CaseBooking => ({
  id: dbCase.id,
  caseReferenceNumber: dbCase.case_reference,
  hospital: dbCase.hospital_name,
  department: dbCase.department,
  dateOfSurgery: dbCase.date_of_surgery,
  procedureType: dbCase.procedure_type,
  procedureName: dbCase.procedure_name || '', // Don't use patient_name as fallback to prevent data mixing
  doctorName: dbCase.surgeon_name,
  timeOfProcedure: dbCase.time_of_procedure,
  surgerySetSelection: dbCase.surgery_sets || [],
  implantBox: dbCase.implant_boxes || [],
  specialInstruction: dbCase.special_instruction,
  status: dbCase.status,
  submittedBy: dbCase.submitted_by,
  submittedAt: dbCase.submitted_at || dbCase.created_at || new Date().toISOString(),
  processedBy: dbCase.processed_by,
  processedAt: dbCase.processed_at,
  processOrderDetails: dbCase.process_order_details,
  country: dbCase.country,
  // Add optional fields that may exist in extended types
  isAmended: false, // Default value
  statusHistory: [] // Default value
});

/**
 * Convert Application Case to Database Case
 */
export const appCaseToDbCase = (appCase: CaseBooking): Partial<DbCaseBooking> => ({
  id: appCase.id || undefined,
  case_reference: appCase.caseReferenceNumber,
  hospital_name: appCase.hospital,
  patient_name: appCase.procedureName || 'Patient Name', // Use procedureName as patient_name or default
  department: appCase.department,
  date_of_surgery: appCase.dateOfSurgery,
  procedure_type: appCase.procedureType,
  procedure_name: appCase.procedureName,
  surgeon_name: appCase.doctorName,
  time_of_procedure: appCase.timeOfProcedure,
  surgery_sets: appCase.surgerySetSelection || [],
  implant_boxes: appCase.implantBox || [],
  special_instruction: appCase.specialInstruction,
  status: appCase.status,
  submitted_by: appCase.submittedBy,
  submitted_at: appCase.submittedAt,
  processed_by: appCase.processedBy,
  processed_at: appCase.processedAt,
  process_order_details: appCase.processOrderDetails,
  country: appCase.country,
  updated_at: new Date().toISOString()
});

/**
 * Convert multiple database cases to application cases
 */
export const dbCasesToAppCases = (dbCases: DbCaseBooking[]): CaseBooking[] => {
  return dbCases.map(dbCaseToAppCase);
};

/**
 * Safe type conversion with error handling
 */
export const safeDbCaseToAppCase = (dbCase: any): CaseBooking | null => {
  try {
    if (!dbCase || typeof dbCase !== 'object') {
      return null;
    }

    return dbCaseToAppCase(dbCase as DbCaseBooking);
  } catch (error) {
    console.error('Failed to convert database case to application case:', error);
    return null;
  }
};

/**
 * Convert database user to application user  
 */
export const dbUserToAppUser = (dbUser: DbUser): any => ({
  id: dbUser.id,
  username: dbUser.username,
  password: '', // Never expose password
  role: dbUser.role,
  name: dbUser.name,
  departments: dbUser.departments || [],
  countries: dbUser.countries || [],
  selectedCountry: dbUser.selected_country,
  enabled: dbUser.enabled,
  email: dbUser.email || ''
});

/**
 * Type guards for runtime type checking
 */
export const isDbCaseBooking = (obj: any): obj is DbCaseBooking => {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.case_reference === 'string' &&
    typeof obj.hospital_name === 'string' &&
    typeof obj.department === 'string';
};

export const isAppCaseBooking = (obj: any): obj is CaseBooking => {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.caseReferenceNumber === 'string' &&
    typeof obj.hospital === 'string' &&
    typeof obj.department === 'string';
};