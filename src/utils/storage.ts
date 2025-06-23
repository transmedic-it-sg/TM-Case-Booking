import { CaseBooking, FilterOptions, StatusHistory, AmendmentHistory } from '../types';

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
    // Handle different types of details based on status
    if (details) {
      try {
        const parsedDetails = JSON.parse(details);
        
        if (status === 'Delivered (Hospital)' && parsedDetails.deliveryDetails !== undefined) {
          // Handle delivery details
          caseData.deliveryDetails = parsedDetails.deliveryDetails;
          caseData.deliveryImage = parsedDetails.deliveryImage;
        } else if (status === 'Case Completed' && parsedDetails.attachments !== undefined) {
          // Handle case completion details
          caseData.attachments = parsedDetails.attachments;
          caseData.orderSummary = parsedDetails.orderSummary;
          caseData.doNumber = parsedDetails.doNumber;
        } else if (status === 'Order Prepared' || status === 'Order Preparation') {
          // Handle process order details
          caseData.processOrderDetails = details;
        }
      } catch (error) {
        // If it's not JSON, treat as regular process details
        if (status === 'Order Prepared' || status === 'Order Preparation') {
          caseData.processOrderDetails = details;
        }
      }
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

export const amendCase = (caseId: string, amendments: Partial<CaseBooking>, amendedBy: string, isAdmin: boolean = false): void => {
  const cases = getCases();
  const caseIndex = cases.findIndex(c => c.id === caseId);
  
  if (caseIndex >= 0) {
    const caseToAmend = cases[caseIndex];
    
    // Check if case has already been amended (Admin can bypass this restriction)
    if (caseToAmend.isAmended && !isAdmin) {
      throw new Error('This case has already been amended and cannot be amended again.');
    }
    
    // Store original values before first amendment
    let originalValues = caseToAmend.originalValues;
    if (!originalValues) {
      originalValues = {
        hospital: caseToAmend.hospital,
        department: caseToAmend.department,
        dateOfSurgery: caseToAmend.dateOfSurgery,
        procedureType: caseToAmend.procedureType,
        doctorName: caseToAmend.doctorName,
        timeOfProcedure: caseToAmend.timeOfProcedure,
        specialInstruction: caseToAmend.specialInstruction
      };
    }
    
    // Track what's being changed
    const changes: { field: string; oldValue: string; newValue: string }[] = [];
    const amendableFields = ['hospital', 'department', 'dateOfSurgery', 'procedureType', 'doctorName', 'timeOfProcedure', 'specialInstruction'];
    
    amendableFields.forEach(field => {
      if (amendments[field as keyof CaseBooking] !== undefined) {
        const oldValue = caseToAmend[field as keyof CaseBooking] as string || '';
        const newValue = amendments[field as keyof CaseBooking] as string || '';
        if (oldValue !== newValue) {
          changes.push({
            field: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
            oldValue,
            newValue
          });
        }
      }
    });
    
    // Create amendment history entry
    const amendmentEntry: AmendmentHistory = {
      amendmentId: Date.now().toString(),
      timestamp: new Date().toISOString(),
      amendedBy,
      changes
    };
    
    // Initialize amendment history if it doesn't exist
    const amendmentHistory = caseToAmend.amendmentHistory || [];
    amendmentHistory.push(amendmentEntry);
    
    // Update the case with amendments
    cases[caseIndex] = {
      ...caseToAmend,
      ...amendments,
      amendedBy,
      amendedAt: new Date().toISOString(),
      isAmended: true,
      originalValues,
      amendmentHistory
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
    
    if (filters.country && caseItem.country !== filters.country) {
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

// Dynamic Procedure Types Management
const CUSTOM_PROCEDURE_TYPES_KEY = 'custom_procedure_types';

export const getCustomProcedureTypes = (): string[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_PROCEDURE_TYPES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading custom procedure types:', error);
    return [];
  }
};

export const saveCustomProcedureTypes = (types: string[]): void => {
  try {
    localStorage.setItem(CUSTOM_PROCEDURE_TYPES_KEY, JSON.stringify(types));
  } catch (error) {
    console.error('Error saving custom procedure types:', error);
  }
};

export const addCustomProcedureType = (typeName: string): boolean => {
  const customTypes = getCustomProcedureTypes();
  const trimmedName = typeName.trim();
  
  if (!trimmedName || customTypes.includes(trimmedName)) {
    return false; // Invalid or duplicate name
  }
  
  const updatedTypes = [...customTypes, trimmedName];
  saveCustomProcedureTypes(updatedTypes);
  return true;
};

export const removeCustomProcedureType = (typeName: string): boolean => {
  const customTypes = getCustomProcedureTypes();
  const updatedTypes = customTypes.filter(type => type !== typeName);
  
  if (updatedTypes.length === customTypes.length) {
    return false; // Type not found
  }
  
  saveCustomProcedureTypes(updatedTypes);
  return true;
};

export const getAllProcedureTypes = (): string[] => {
  // Import the base types from types file
  const baseProcedureTypes = ['Knee', 'Head', 'Hip', 'Hands', 'Neck', 'Spine'];
  const customTypes = getCustomProcedureTypes();
  return [...baseProcedureTypes, ...customTypes];
};