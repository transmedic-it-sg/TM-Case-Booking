// Supabase Storage Utilities for Case Booking - DISABLED FOR COMPATIBILITY
import { CaseBooking, FilterOptions } from '../types'

console.warn('supabaseStorage service is temporarily disabled. Using fallback from storage.ts instead.');

// Stub implementations to prevent import errors
export const getCases = async (filters?: FilterOptions): Promise<CaseBooking[]> => {
  console.warn('getCases called on disabled supabaseStorage. Use storage.ts instead.');
  return [];
}

export const getCaseById = async (caseId: string): Promise<CaseBooking | null> => {
  console.warn('getCaseById called on disabled supabaseStorage. Use storage.ts instead.');
  return null;
}

export const saveCase = async (caseData: Omit<CaseBooking, 'id' | 'caseReferenceNumber' | 'submittedAt'>): Promise<CaseBooking> => {
  console.warn('saveCase called on disabled supabaseStorage. Use storage.ts instead.');
  throw new Error('supabaseStorage is disabled');
}

export const updateCaseStatus = async (
  caseId: string, 
  status: CaseBooking['status'], 
  processedBy: string, 
  details?: string
): Promise<void> => {
  console.warn('updateCaseStatus called on disabled supabaseStorage. Use storage.ts instead.');
  throw new Error('supabaseStorage is disabled');
}

export const amendCase = async (
  caseId: string,
  amendments: Partial<CaseBooking>,
  amendedBy: string
): Promise<void> => {
  console.warn('amendCase called on disabled supabaseStorage. Use storage.ts instead.');
  throw new Error('supabaseStorage is disabled');
}

// Transform functions (stub versions)
export const transformCaseFromDB = (dbCase: any): CaseBooking => {
  console.warn('transformCaseFromDB called on disabled supabaseStorage.');
  return dbCase as CaseBooking;
}

export const transformCaseToDB = (frontendCase: CaseBooking): any => {
  console.warn('transformCaseToDB called on disabled supabaseStorage.');
  return frontendCase;
}