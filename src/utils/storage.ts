import { CaseBooking, FilterOptions, StatusHistory, AmendmentHistory } from '../types';
import { sendStatusChangeNotification } from './emailNotificationService';
import { 
  getSupabaseCases, 
  saveSupabaseCase, 
  updateSupabaseCaseStatus, 
  updateSupabaseCaseProcessing,
  generateCaseReferenceNumber as generateSupabaseReferenceNumber, 
  getCategorizedSets as getSupabaseCategorizedSets, 
  saveCategorizedSets as saveSupabaseCategorizedSets, 
  checkCasesExist, 
  migrateCasesFromLocalStorage 
} from './supabaseCaseService';

const CASES_KEY = 'case-booking-cases';
const CASE_COUNTER_KEY = 'case-booking-counter';

export const generateCaseReferenceNumber = async (country: string = 'SG'): Promise<string> => {
  try {
    return await generateSupabaseReferenceNumber(country);
  } catch (error) {
    console.error('Error generating Supabase reference number, falling back to localStorage:', error);
    // Fallback to localStorage
    const currentCounter = localStorage.getItem(CASE_COUNTER_KEY);
    const counter = currentCounter ? parseInt(currentCounter) + 1 : 1;
    const paddedCounter = counter.toString().padStart(6, '0');
    const referenceNumber = `TMC${paddedCounter}`;
    localStorage.setItem(CASE_COUNTER_KEY, counter.toString());
    return referenceNumber;
  }
};

export const getCases = async (country?: string): Promise<CaseBooking[]> => {
  try {
    // Check if cases exist in Supabase
    const casesExist = await checkCasesExist();
    
    if (casesExist) {
      return await getSupabaseCases(country);
    } else {
      // If no cases in Supabase, check localStorage and migrate
      const stored = localStorage.getItem(CASES_KEY);
      if (stored) {
        console.log('Migrating cases from localStorage to Supabase...');
        await migrateCasesFromLocalStorage();
        return await getSupabaseCases(country);
      }
      return [];
    }
  } catch (error) {
    console.error('Error getting cases from Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const stored = localStorage.getItem(CASES_KEY);
    return stored ? JSON.parse(stored) : [];
  }
};

export const saveCase = async (caseData: CaseBooking): Promise<CaseBooking> => {
  try {
    // If case has an ID, it's an update; otherwise it's a new case
    if (caseData.id && caseData.id !== '') {
      // This is an update - not implemented in current Supabase service
      // For now, fall back to localStorage
      const cases = await getCasesFromLocalStorage();
      const existingIndex = cases.findIndex(c => c.id === caseData.id);
      
      if (existingIndex >= 0) {
        cases.splice(existingIndex, 1);
        cases.unshift(caseData);
      } else {
        cases.unshift(caseData);
      }
      
      localStorage.setItem(CASES_KEY, JSON.stringify(cases));
      return caseData;
    } else {
      // New case - save to Supabase
      const { id, caseReferenceNumber, submittedAt, statusHistory, ...caseWithoutGeneratedFields } = caseData;
      return await saveSupabaseCase(caseWithoutGeneratedFields);
    }
  } catch (error) {
    console.error('Error saving case to Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const cases = await getCasesFromLocalStorage();
    const existingIndex = cases.findIndex(c => c.id === caseData.id);
    
    if (existingIndex >= 0) {
      cases.splice(existingIndex, 1);
      cases.unshift(caseData);
    } else {
      cases.unshift(caseData);
    }
    
    localStorage.setItem(CASES_KEY, JSON.stringify(cases));
    return caseData;
  }
};

// Helper function to get cases from localStorage
const getCasesFromLocalStorage = async (): Promise<CaseBooking[]> => {
  const stored = localStorage.getItem(CASES_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const updateCaseStatus = async (caseId: string, status: CaseBooking['status'], processedBy?: string, details?: string): Promise<void> => {
  try {
    // Try to update in Supabase first
    await updateSupabaseCaseStatus(caseId, status, processedBy || 'unknown', details);
    return;
  } catch (error) {
    console.error('Error updating case status in Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const cases = await getCasesFromLocalStorage();
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
    
    // Move updated case to front for better visibility
    cases.splice(caseIndex, 1);
    cases.unshift(caseData);
    
    localStorage.setItem(CASES_KEY, JSON.stringify(cases));
    
    // Send email notification for status change (async, don't block the UI)
    const previousStatus = caseData.statusHistory[caseData.statusHistory.length - 2]?.status || 'Unknown';
    sendStatusChangeNotification(caseData, status, previousStatus, processedBy || 'System').then(emailSent => {
      if (emailSent) {
        console.log('✅ Email notification sent for status change:', {
          caseRef: caseData.caseReferenceNumber,
          status: status,
          previousStatus: previousStatus
        });
      } else {
        console.warn('⚠️ Failed to send email notification for status change:', caseData.caseReferenceNumber);
      }
    }).catch(error => {
      console.error('💥 Error sending status change email notification:', error);
    });
    }
  }
};

// Process order with specific order details
export const processCaseOrder = async (caseId: string, processedBy: string, processOrderDetails: string): Promise<void> => {
  try {
    // Try to update in Supabase first using the specific processing function
    await updateSupabaseCaseProcessing(caseId, processedBy, processOrderDetails, 'Order Prepared');
    return;
  } catch (error) {
    console.error('Error processing case order in Supabase, falling back to localStorage:', error);
    
    // Fallback to localStorage using regular updateCaseStatus
    const additionalData = {
      processDetails: processOrderDetails,
      attachments: []
    };
    await updateCaseStatus(caseId, 'Order Prepared', processedBy, JSON.stringify(additionalData));
  }
};

// Utility function to clean up corrupted processOrderDetails
export const cleanupProcessOrderDetails = async (): Promise<void> => {
  const cases = await getCasesFromLocalStorage();
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

export const amendCase = async (caseId: string, amendments: Partial<CaseBooking>, amendedBy: string, isAdmin: boolean = false): Promise<void> => {
  const cases = await getCases();
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

// Country-specific categorized sets storage
export const saveCategorizedSets = async (categorizedSets: CategorizedSets, country?: string): Promise<void> => {
  if (country) {
    try {
      // Transform from CategorizedSets format to Supabase format
      const transformedSets: Record<string, { surgerySets: string[], implantBoxes: string[] }> = {};
      Object.entries(categorizedSets).forEach(([procedureType, data]) => {
        transformedSets[procedureType] = {
          surgerySets: data.surgerySets || [],
          implantBoxes: data.implantBoxes || []
        };
      });
      
      // Try to save to Supabase first
      await saveSupabaseCategorizedSets(transformedSets, country);
      return;
    } catch (error) {
      console.error('Error saving categorized sets to Supabase:', error);
      // Fallback to localStorage
      saveCategorizedSetsToLocalStorage(categorizedSets, country);
    }
  } else {
    // Legacy support - save global sets
    localStorage.setItem('categorized-sets', JSON.stringify(categorizedSets));
  }
};

// Helper function for localStorage fallback
const saveCategorizedSetsToLocalStorage = (categorizedSets: CategorizedSets, country?: string): void => {
  if (country) {
    localStorage.setItem(`categorized-sets-${country}`, JSON.stringify(categorizedSets));
  } else {
    localStorage.setItem('categorized-sets', JSON.stringify(categorizedSets));
  }
};

export const getCategorizedSets = async (country?: string): Promise<CategorizedSets> => {
  if (country) {
    try {
      // Try to get from Supabase first
      const supabaseSets = await getSupabaseCategorizedSets(country);
      if (Object.keys(supabaseSets).length > 0) {
        // Transform from Supabase format to CategorizedSets format
        const transformedSets: CategorizedSets = {};
        Object.entries(supabaseSets).forEach(([procedureType, data]) => {
          transformedSets[procedureType] = {
            surgerySets: data.surgerySets || [],
            implantBoxes: data.implantBoxes || []
          };
        });
        return transformedSets;
      }
    } catch (error) {
      console.error('Error getting categorized sets from Supabase:', error);
    }
    
    // Fallback to localStorage
    const countryStored = localStorage.getItem(`categorized-sets-${country}`);
    if (countryStored) {
      return JSON.parse(countryStored);
    }
  }
  
  // Fallback to legacy global sets for migration
  const globalStored = localStorage.getItem('categorized-sets');
  if (globalStored) {
    const globalSets = JSON.parse(globalStored);
    
    // If we have a country and global sets exist, migrate them to country-specific
    if (country && Object.keys(globalSets).length > 0) {
      try {
        // Transform from CategorizedSets format to Supabase format
        const transformedSets: Record<string, { surgerySets: string[], implantBoxes: string[] }> = {};
        Object.entries(globalSets as CategorizedSets).forEach(([procedureType, data]) => {
          transformedSets[procedureType] = {
            surgerySets: data.surgerySets || [],
            implantBoxes: data.implantBoxes || []
          };
        });
        
        await saveSupabaseCategorizedSets(transformedSets, country);
      } catch (error) {
        console.error('Error saving categorized sets to Supabase:', error);
        // Fallback to localStorage
        saveCategorizedSetsToLocalStorage(globalSets, country);
      }
      return globalSets;
    }
    
    return globalSets;
  }
  
  // If no sets found anywhere, initialize with defaults
  const { initializeCategorizedSets } = await import('../components/EditSets/utils');
  const defaultSets = initializeCategorizedSets();
  
  // Save the default sets to Supabase for future use
  if (country) {
    try {
      await saveCategorizedSets(defaultSets, country);
    } catch (error) {
      console.error('Error saving default categorized sets:', error);
    }
  }
  
  return defaultSets;
};

// Dynamic Procedure Types Management - Country-specific
const CUSTOM_PROCEDURE_TYPES_KEY = 'custom_procedure_types';
const HIDDEN_PROCEDURE_TYPES_KEY = 'hidden_procedure_types';

export const getCustomProcedureTypes = (country?: string): string[] => {
  try {
    const key = country ? `${CUSTOM_PROCEDURE_TYPES_KEY}_${country}` : CUSTOM_PROCEDURE_TYPES_KEY;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Fallback to global custom types for migration
    if (country) {
      const globalStored = localStorage.getItem(CUSTOM_PROCEDURE_TYPES_KEY);
      if (globalStored) {
        const globalTypes = JSON.parse(globalStored);
        // Migrate to country-specific
        saveCustomProcedureTypes(globalTypes, country);
        return globalTypes;
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error loading custom procedure types:', error);
    return [];
  }
};

export const saveCustomProcedureTypes = (types: string[], country?: string): void => {
  try {
    const key = country ? `${CUSTOM_PROCEDURE_TYPES_KEY}_${country}` : CUSTOM_PROCEDURE_TYPES_KEY;
    localStorage.setItem(key, JSON.stringify(types));
  } catch (error) {
    console.error('Error saving custom procedure types:', error);
  }
};

export const getHiddenProcedureTypes = (country?: string): string[] => {
  try {
    const key = country ? `${HIDDEN_PROCEDURE_TYPES_KEY}_${country}` : HIDDEN_PROCEDURE_TYPES_KEY;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Fallback to global hidden types for migration
    if (country) {
      const globalStored = localStorage.getItem(HIDDEN_PROCEDURE_TYPES_KEY);
      if (globalStored) {
        const globalTypes = JSON.parse(globalStored);
        // Migrate to country-specific
        saveHiddenProcedureTypes(globalTypes, country);
        return globalTypes;
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error loading hidden procedure types:', error);
    return [];
  }
};

export const saveHiddenProcedureTypes = (types: string[], country?: string): void => {
  try {
    const key = country ? `${HIDDEN_PROCEDURE_TYPES_KEY}_${country}` : HIDDEN_PROCEDURE_TYPES_KEY;
    localStorage.setItem(key, JSON.stringify(types));
  } catch (error) {
    console.error('Error saving hidden procedure types:', error);
  }
};

export const addCustomProcedureType = (typeName: string, country?: string): boolean => {
  const customTypes = getCustomProcedureTypes(country);
  const trimmedName = typeName.trim();
  
  if (!trimmedName || customTypes.includes(trimmedName)) {
    return false; // Invalid or duplicate name
  }
  
  const updatedTypes = [...customTypes, trimmedName];
  saveCustomProcedureTypes(updatedTypes, country);
  return true;
};

export const removeCustomProcedureType = (typeName: string, country?: string): boolean => {
  const customTypes = getCustomProcedureTypes(country);
  
  // Check if it's a custom type first
  const isCustom = customTypes.includes(typeName);
  if (isCustom) {
    const updatedTypes = customTypes.filter(type => type !== typeName);
    saveCustomProcedureTypes(updatedTypes, country);
    return true;
  }
  
  // If it's a base type, add it to the hidden/removed types list
  const baseProcedureTypes = ['Knee', 'Head', 'Hip', 'Hands', 'Neck', 'Spine'];
  if (baseProcedureTypes.includes(typeName)) {
    const hiddenTypes = getHiddenProcedureTypes(country);
    if (!hiddenTypes.includes(typeName)) {
      saveHiddenProcedureTypes([...hiddenTypes, typeName], country);
      return true;
    }
  }
  
  return false; // Type not found
};

export const restoreProcedureType = (typeName: string, country?: string): boolean => {
  const hiddenTypes = getHiddenProcedureTypes(country);
  const updatedHiddenTypes = hiddenTypes.filter(type => type !== typeName);
  
  if (updatedHiddenTypes.length === hiddenTypes.length) {
    return false; // Type not found in hidden list
  }
  
  saveHiddenProcedureTypes(updatedHiddenTypes, country);
  return true;
};

export const getAllProcedureTypes = (country?: string): string[] => {
  // Import the base types from types file
  const baseProcedureTypes = ['Knee', 'Head', 'Hip', 'Hands', 'Neck', 'Spine'];
  const customTypes = getCustomProcedureTypes(country);
  const hiddenTypes = getHiddenProcedureTypes(country);
  
  // Filter out hidden base types and combine with custom types
  const visibleBaseTypes = baseProcedureTypes.filter(type => !hiddenTypes.includes(type));
  return [...visibleBaseTypes, ...customTypes];
};

export const getHiddenProcedureTypesList = (country?: string): string[] => {
  const baseProcedureTypes = ['Knee', 'Head', 'Hip', 'Hands', 'Neck', 'Spine'];
  const hiddenTypes = getHiddenProcedureTypes(country);
  
  // Only return hidden types that are actually base types
  return hiddenTypes.filter(type => baseProcedureTypes.includes(type));
};