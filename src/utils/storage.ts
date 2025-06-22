import { CaseBooking, FilterOptions, StatusHistory } from '../types';

const CASES_KEY = 'case-booking-cases';
const CASE_COUNTER_KEY = 'case-booking-counter';

export const generateCaseReferenceNumber = (): string => {
  const currentCounter = localStorage.getItem(CASE_COUNTER_KEY);
  const counter = currentCounter ? parseInt(currentCounter) + 1 : 1;
  const paddedCounter = counter.toString().padStart(6, '0');
  const referenceNumber = `TMC${paddedCounter}`;
  localStorage.setItem(CASE_COUNTER_KEY, counter.toString());
  return referenceNumber;
};

export const getCases = (): CaseBooking[] => {
  const stored = localStorage.getItem(CASES_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveCase = (caseData: CaseBooking): void => {
  const cases = getCases();
  const existingIndex = cases.findIndex(c => c.id === caseData.id);
  
  if (existingIndex >= 0) {
    cases[existingIndex] = caseData;
  } else {
    cases.push(caseData);
  }
  
  localStorage.setItem(CASES_KEY, JSON.stringify(cases));
};

export const updateCaseStatus = (caseId: string, status: CaseBooking['status'], processedBy?: string, details?: string): void => {
  const cases = getCases();
  const caseIndex = cases.findIndex(c => c.id === caseId);
  
  if (caseIndex >= 0) {
    const caseData = cases[caseIndex];
    const timestamp = new Date().toISOString();
    
    // Initialize status history if it doesn't exist
    if (!caseData.statusHistory) {
      caseData.statusHistory = [];
      // Add initial status
      caseData.statusHistory.push({
        status: 'Case Booked',
        timestamp: caseData.submittedAt,
        processedBy: caseData.submittedBy,
        details: 'Case initially submitted'
      });
    }
    
    // Add new status to history
    const statusEntry: StatusHistory = {
      status,
      timestamp,
      processedBy: processedBy || 'System',
      details: details
    };
    caseData.statusHistory.push(statusEntry);
    
    // Update current status
    caseData.status = status;
    if (processedBy) {
      caseData.processedBy = processedBy;
      caseData.processedAt = timestamp;
    }
    // Only update processOrderDetails for actual order processing statuses
    if (details && (status === 'Order Prepared' || status === 'Order Preparation')) {
      caseData.processOrderDetails = details;
    }
    localStorage.setItem(CASES_KEY, JSON.stringify(cases));
  }
};

// Utility function to clean up corrupted processOrderDetails
export const cleanupProcessOrderDetails = (): void => {
  const cases = getCases();
  let hasChanges = false;
  
  cases.forEach(caseData => {
    // Check if processOrderDetails contains JSON delivery data
    if (caseData.processOrderDetails && caseData.processOrderDetails.includes('deliveryDetails')) {
      try {
        const parsed = JSON.parse(caseData.processOrderDetails);
        if (parsed.deliveryDetails || parsed.deliveryImage || parsed.attachments) {
          // This is corrupted data, clear it
          delete caseData.processOrderDetails;
          hasChanges = true;
        }
      } catch (error) {
        // If it's not valid JSON, it might be legitimate process details
      }
    }
  });
  
  if (hasChanges) {
    localStorage.setItem(CASES_KEY, JSON.stringify(cases));
  }
};

export const amendCase = (caseId: string, amendments: Partial<CaseBooking>, amendedBy: string): void => {
  const cases = getCases();
  const caseIndex = cases.findIndex(c => c.id === caseId);
  
  if (caseIndex >= 0) {
    const caseToAmend = cases[caseIndex];
    
    // Check if case has already been amended
    if (caseToAmend.isAmended) {
      throw new Error('This case has already been amended and cannot be amended again.');
    }
    
    // Update the case with amendments
    cases[caseIndex] = {
      ...caseToAmend,
      ...amendments,
      amendedBy,
      amendedAt: new Date().toISOString(),
      isAmended: true
    };
    
    localStorage.setItem(CASES_KEY, JSON.stringify(cases));
  }
};

export const filterCases = (cases: CaseBooking[], filters: FilterOptions): CaseBooking[] => {
  return cases.filter(caseItem => {
    if (filters.submitter && !caseItem.submittedBy.toLowerCase().includes(filters.submitter.toLowerCase())) {
      return false;
    }
    
    if (filters.hospital && !caseItem.hospital.toLowerCase().includes(filters.hospital.toLowerCase())) {
      return false;
    }
    
    if (filters.status && caseItem.status !== filters.status) {
      return false;
    }
    
    if (filters.dateFrom && caseItem.dateOfSurgery < filters.dateFrom) {
      return false;
    }
    
    if (filters.dateTo && caseItem.dateOfSurgery > filters.dateTo) {
      return false;
    }
    
    return true;
  });
};

// Categorized Sets Storage
export interface CategorizedSets {
  [procedureType: string]: {
    surgerySets: string[];
    implantBoxes: string[];
  };
}

export const saveCategorizedSets = (categorizedSets: CategorizedSets): void => {
  localStorage.setItem('categorized-sets', JSON.stringify(categorizedSets));
};

export const getCategorizedSets = (): CategorizedSets => {
  const stored = localStorage.getItem('categorized-sets');
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Return empty object if no categorized sets found
  return {};
};