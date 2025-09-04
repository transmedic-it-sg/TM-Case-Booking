import { CaseBooking, FilterOptions } from '../types';
import { 
  getSupabaseCases, 
  saveSupabaseCase, 
  updateSupabaseCaseStatus, 
  updateSupabaseCaseProcessing,
  generateCaseReferenceNumber as generateSupabaseReferenceNumber, 
  getCategorizedSets as getSupabaseCategorizedSets, 
  saveCategorizedSets as saveSupabaseCategorizedSets, 
  migrateCasesFromLocalStorage 
} from './supabaseCaseService';
import offlineSyncService from '../services/offlineSyncService';
import { normalizeCountry } from './countryUtils';
import { withConnectionRetry } from './databaseConnectionMonitor';
import { ErrorHandler } from './errorHandler';

const CASES_KEY = 'case-booking-cases';
const CASE_COUNTER_KEY = 'case-booking-counter';

export const generateCaseReferenceNumber = async (country: string = 'Singapore'): Promise<string> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      return await generateSupabaseReferenceNumber(normalizeCountry(country));
    },
    {
      operation: 'Generate Reference Number',
      userMessage: 'Failed to generate case reference number from database. Using offline mode.',
      showToast: true,
      showNotification: false,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 3,
      fallbackToLocalStorage: true
    }
  );

  if (result.success && result.data) {
    return result.data;
  }

  // Fallback to localStorage with user notification
  ErrorHandler.executeWithRetry(
    async () => { throw new Error('Using offline reference number generation'); },
    {
      operation: 'Reference Number Fallback',
      userMessage: 'Database unavailable - generating reference number offline. This will sync when connection is restored.',
      showToast: true,
      showNotification: true,
      includeDetails: false,
      autoRetry: false,
      maxRetries: 0
    }
  );

  const currentCounter = localStorage.getItem(CASE_COUNTER_KEY);
  const counter = currentCounter ? parseInt(currentCounter) + 1 : 1;
  const paddedCounter = counter.toString().padStart(6, '0');
  const referenceNumber = `TMC${paddedCounter}`;
  localStorage.setItem(CASE_COUNTER_KEY, counter.toString());
  return referenceNumber;
};

export const getCases = async (country?: string): Promise<CaseBooking[]> => {
  try {
    console.log('Loading cases from Supabase...');
    const normalizedCountry = country ? normalizeCountry(country) : undefined;
    // Try to get cases directly from Supabase
    const supabaseCases = await getSupabaseCases(normalizedCountry);
    
    // If we got cases from Supabase, return them
    if (supabaseCases && supabaseCases.length > 0) {
      console.log(`Loaded ${supabaseCases.length} cases from Supabase`);
      
      // Clean up duplicate status entries in Supabase cases
      const cleanedCases = supabaseCases.map(caseData => {
        if (caseData.statusHistory && caseData.statusHistory.length > 1) {
          const uniqueEntries = new Map<string, any>();
          
          caseData.statusHistory.forEach(entry => {
            // For "Case Booked" entries, be more aggressive about deduplication
            if (entry.status === 'Case Booked') {
              const key = 'Case Booked';
              // Only keep the first "Case Booked" entry, or prefer the one with "Case created" details
              if (!uniqueEntries.has(key) || entry.details === 'Case created') {
                uniqueEntries.set(key, entry);
              }
            } else {
              // For other entries, create a unique key based on status, timestamp, and processedBy
              const key = `${entry.status}-${entry.timestamp}-${entry.processedBy}`;
              if (!uniqueEntries.has(key)) {
                uniqueEntries.set(key, entry);
              }
            }
          });
          
          const originalLength = caseData.statusHistory.length;
          const cleanedHistory = Array.from(uniqueEntries.values())
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
          if (originalLength > cleanedHistory.length) {
            console.log(`Cleaned ${originalLength - cleanedHistory.length} duplicate status entries for case ${caseData.caseReferenceNumber}`);
          }
          
          return { ...caseData, statusHistory: cleanedHistory };
        }
        return caseData;
      });
      
      return cleanedCases;
    }
    
    // If no cases in Supabase, check localStorage and migrate if needed (one time only)
    const stored = localStorage.getItem(CASES_KEY);
    if (stored) {
      console.log('No cases in Supabase, migrating from localStorage...');
      try {
        await migrateCasesFromLocalStorage();
        const migratedCases = await getSupabaseCases(country);
        console.log(`Migrated ${migratedCases.length} cases to Supabase`);
        
        // Clear localStorage after successful migration
        localStorage.removeItem(CASES_KEY);
        console.log('Cleared localStorage after successful migration');
        
        return migratedCases;
      } catch (migrationError) {
        console.error('Migration failed:', migrationError);
        throw migrationError; // Don't fall back to localStorage
      }
    }
    
    // No cases anywhere, return empty array
    console.log('No cases found in Supabase');
    return [];
  } catch (error) {
    console.error('Error getting cases from Supabase:', error);
    throw error; // Don't fall back to localStorage, throw error to inform user
  }
};

export const saveCase = async (caseData: CaseBooking): Promise<CaseBooking> => {
  try {
    // Try to save to Supabase first
    const result = await ErrorHandler.executeWithRetry(
      async () => {
        // If case has an ID, it's an update; otherwise it's a new case
        if (caseData.id && caseData.id !== '') {
          // This is an update - use Supabase update function
          const { updateSupabaseCase } = await import('./supabaseCaseService');
          return await updateSupabaseCase(caseData.id, caseData);
        } else {
          // New case - save to Supabase
          const { id, caseReferenceNumber, submittedAt, statusHistory, amendmentHistory, ...caseWithoutGeneratedFields } = caseData;
          return await saveSupabaseCase(caseWithoutGeneratedFields);
        }
      },
      {
        operation: caseData.id ? 'Update Case' : 'Save New Case',
        userMessage: `Failed to ${caseData.id ? 'update' : 'save'} case to database`,
        showToast: false, // Don't show toast here, we'll handle offline mode
        showNotification: false,
        includeDetails: true,
        autoRetry: true,
        maxRetries: 2
      }
    );

    if (result.success && result.data) {
      return result.data;
    } else {
      // Database failed, fall back to offline mode
      throw new Error('Database save failed, switching to offline mode');
    }
  } catch (error) {
    console.log('💾 Database unavailable, saving to localStorage and sync queue');
    
    // Generate offline data
    let caseReferenceNumber = caseData.caseReferenceNumber;
    if (!caseReferenceNumber) {
      try {
        caseReferenceNumber = await generateCaseReferenceNumber(caseData.country);
      } catch (refError) {
        console.warn('Failed to generate reference number, using fallback:', refError);
        // Fallback reference number generation
        const counter = Date.now();
        caseReferenceNumber = `TMC${counter.toString().slice(-6)}`;
      }
    }

    const offlineCaseData: CaseBooking = {
      ...caseData,
      id: caseData.id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      caseReferenceNumber,
      submittedAt: caseData.submittedAt || new Date().toISOString(),
      statusHistory: caseData.statusHistory || [{
        status: caseData.status,
        timestamp: new Date().toISOString(),
        processedBy: caseData.submittedBy,
        details: 'Case created offline'
      }]
    };

    // Save to localStorage
    const localCases = JSON.parse(localStorage.getItem('case-bookings') || '[]');
    const existingIndex = localCases.findIndex((c: CaseBooking) => c.id === offlineCaseData.id);
    
    if (existingIndex >= 0) {
      localCases[existingIndex] = offlineCaseData;
    } else {
      localCases.push(offlineCaseData);
    }
    
    localStorage.setItem('case-bookings', JSON.stringify(localCases));

    // Add to sync queue
    const syncType = caseData.id && caseData.id !== '' && !caseData.id.startsWith('offline_') ? 'case_update' : 'case_create';
    offlineSyncService.addToSyncQueue(syncType, offlineCaseData);

    // Notify user about offline mode
    window.dispatchEvent(new CustomEvent('showToast', {
      detail: {
        type: 'warning',
        message: `Case saved offline. Will sync to database when connection is restored.`
      }
    }));

    return offlineCaseData;
  }
};

// Helper function removed - using Supabase exclusively

// Function to clean up duplicate status history entries directly in Supabase
export const cleanupDuplicateStatusHistory = async (): Promise<void> => {
  try {
    const { supabase } = await import('../lib/supabase');
    
    // Get all cases with status history
    const { data: cases, error } = await supabase
      .from('case_bookings')
      .select(`
        id,
        case_reference_number,
        status_history (
          id,
          status,
          processed_by,
          timestamp,
          details,
          attachments
        )
      `);
    
    if (error) {
      console.error('Error fetching cases for cleanup:', error);
      return;
    }
    
    let totalCleaned = 0;
    
    for (const caseData of cases || []) {
      if (!caseData.status_history || caseData.status_history.length <= 1) continue;
      
      const statusHistoryMap = new Map<string, any>();
      const duplicatesToRemove: string[] = [];
      
      // Sort by timestamp to keep the earliest entry
      const sortedHistory = [...caseData.status_history].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      sortedHistory.forEach(entry => {
        if (entry.status === 'Case Booked') {
          // For "Case Booked", only keep the first one (earliest timestamp)
          if (!statusHistoryMap.has('Case Booked')) {
            statusHistoryMap.set('Case Booked', entry);
          } else {
            duplicatesToRemove.push(entry.id);
          }
        } else {
          // For other statuses, create unique key based on status + timestamp
          const key = `${entry.status}-${entry.timestamp}`;
          if (!statusHistoryMap.has(key)) {
            statusHistoryMap.set(key, entry);
          } else {
            duplicatesToRemove.push(entry.id);
          }
        }
      });
      
      // Remove duplicates from database
      if (duplicatesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('status_history')
          .delete()
          .in('id', duplicatesToRemove);
          
        if (deleteError) {
          console.error(`Error removing duplicates for case ${caseData.case_reference_number}:`, deleteError);
        } else {
          console.log(`Cleaned ${duplicatesToRemove.length} duplicate entries for case ${caseData.case_reference_number}`);
          totalCleaned += duplicatesToRemove.length;
        }
      }
    }
    
    console.log(`Cleanup completed. Total duplicate entries removed: ${totalCleaned}`);
  } catch (error) {
    console.error('Error in cleanupDuplicateStatusHistory:', error);
  }
};

export const updateCaseStatus = async (caseId: string, status: CaseBooking['status'], processedBy?: string, details?: string): Promise<void> => {
  // Extract attachments from details if present
  let attachments: string[] | undefined;
  if (details) {
    try {
      const parsedDetails = JSON.parse(details);
      attachments = parsedDetails.attachments;
    } catch {
      // If details are not JSON, no attachments
    }
  }

  try {
    // Try to update in Supabase first
    const result = await ErrorHandler.executeWithRetry(
      async () => {
        await updateSupabaseCaseStatus(caseId, status, processedBy || 'unknown', details, attachments);
        return true;
      },
      {
        operation: 'Update Case Status',
        userMessage: `Failed to update case status to "${status}"`,
        showToast: false, // Handle offline mode manually
        showNotification: false,
        includeDetails: true,
        autoRetry: true,
        maxRetries: 2
      }
    );

    if (!result.success) {
      throw new Error('Database update failed, switching to offline mode');
    }
  } catch (error) {
    console.log('💾 Database unavailable for status update, using offline mode');
    
    // Update case in localStorage
    const localCases = JSON.parse(localStorage.getItem('case-bookings') || '[]');
    const caseIndex = localCases.findIndex((c: CaseBooking) => c.id === caseId);
    
    if (caseIndex >= 0) {
      localCases[caseIndex].status = status;
      if (processedBy) {
        localCases[caseIndex].processedBy = processedBy;
        localCases[caseIndex].processedAt = new Date().toISOString();
      }
      
      // Add status history entry
      if (!localCases[caseIndex].statusHistory) {
        localCases[caseIndex].statusHistory = [];
      }
      
      localCases[caseIndex].statusHistory.push({
        status,
        timestamp: new Date().toISOString(),
        processedBy: processedBy || 'unknown',
        user: processedBy || 'unknown', // Add user field for compatibility
        details: details || 'Status updated offline',
        attachments: attachments || []
      });
      
      localStorage.setItem('case-bookings', JSON.stringify(localCases));
    }

    // Add to sync queue
    offlineSyncService.addToSyncQueue('case_status', {
      caseId,
      status,
      changedBy: processedBy || 'unknown',
      details,
      attachments: attachments
    });

    // Notify user about offline mode
    window.dispatchEvent(new CustomEvent('showToast', {
      detail: {
        type: 'warning',
        message: `Status updated offline. Will sync to database when connection is restored.`
      }
    }));
  }
};

// Process order with specific order details
export const processCaseOrder = async (
  caseId: string, 
  processedBy: string, 
  processOrderDetails: string,
  attachments?: string[],
  customDetails?: string
): Promise<void> => {
  const result = await ErrorHandler.executeWithRetry(
    async () => {
      // Always use Supabase for order processing
      await updateSupabaseCaseProcessing(
        caseId, 
        processedBy, 
        processOrderDetails, 
        'Order Prepared',
        attachments,
        customDetails
      );
      return true;
    },
    {
      operation: 'Process Case Order',
      userMessage: 'Failed to process case order',
      showToast: true,
      showNotification: true,
      includeDetails: true,
      autoRetry: true,
      maxRetries: 3
    }
  );

  if (!result.success) {
    throw new Error(result.error || 'Failed to process case order');
  }
};

// Note: Utility functions for localStorage cleanup have been removed since we now use Supabase exclusively
// Data cleanup is now handled at the Supabase level during data retrieval and saving

export const amendCase = async (caseId: string, amendments: Partial<CaseBooking>, amendedBy: string, isAdmin: boolean = false): Promise<void> => {
  try {
    // Always use Supabase for amendments
    const { amendSupabaseCase } = await import('./supabaseCaseService');
    await amendSupabaseCase(caseId, amendments, amendedBy);
    console.log('Case amended successfully in Supabase');
    return;
  } catch (error) {
    console.error('Error amending case in Supabase:', error);
    throw error; // Don't fall back to localStorage, throw error to inform user
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
    
    if (filters.country && normalizeCountry(caseItem.country) !== normalizeCountry(filters.country)) {
      return false;
    }
    
    if (filters.department && !caseItem.department.toLowerCase().includes(filters.department.toLowerCase())) {
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

// Department-specific categorized sets storage
export interface DepartmentCategorizedSets {
  [department: string]: {
    [procedureType: string]: {
      surgerySets: string[];
      implantBoxes: string[];
    };
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
      const normalizedCountry = normalizeCountry(country);
      // Try to get from Supabase first
      const supabaseSets = await getSupabaseCategorizedSets(normalizedCountry);
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
  
  // If no sets found anywhere, return empty object - don't create false data
  return {};
};

// Dynamic Procedure Types Management - Country-specific
const CUSTOM_PROCEDURE_TYPES_KEY = 'custom_procedure_types';
const HIDDEN_PROCEDURE_TYPES_KEY = 'hidden_procedure_types';
const DEPARTMENT_PROCEDURE_TYPES_KEY = 'department_procedure_types';

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

// Department-specific procedure types management
export interface DepartmentProcedureTypes {
  [department: string]: string[];
}

export const getDepartmentProcedureTypes = async (country?: string): Promise<DepartmentProcedureTypes> => {
  try {
    // Try Supabase first
    if (country) {
      // Note: departments are not needed here as procedure types are handled elsewhere
      const result: DepartmentProcedureTypes = {};
      
      // For each department, we would need to get its procedure types
      // This will be handled by the specific function getProcedureTypesForDepartment
      return result;
    }
    
    // Fallback to localStorage
    const key = country ? `${DEPARTMENT_PROCEDURE_TYPES_KEY}_${country}` : DEPARTMENT_PROCEDURE_TYPES_KEY;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
    return {};
  } catch (error) {
    console.error('Error loading department procedure types:', error);
    return {};
  }
};

export const saveDepartmentProcedureTypes = (departmentTypes: DepartmentProcedureTypes, country?: string): void => {
  try {
    const key = country ? `${DEPARTMENT_PROCEDURE_TYPES_KEY}_${country}` : DEPARTMENT_PROCEDURE_TYPES_KEY;
    localStorage.setItem(key, JSON.stringify(departmentTypes));
  } catch (error) {
    console.error('Error saving department procedure types:', error);
  }
};

export const addProcedureTypeToDepartment = async (department: string, procedureType: string, country?: string): Promise<boolean> => {
  const operation = async (): Promise<boolean> => {
    if (country) {
      const { addProcedureTypeToDepartment: addSupabaseProcedureType } = await import('./supabaseDepartmentService');
      return await addSupabaseProcedureType(department, procedureType, country);
    }
    return false;
  };

  const fallback = async (): Promise<boolean> => {
    console.log('Using localStorage fallback for adding procedure type');
    const departmentTypes = await getDepartmentProcedureTypes(country);
    
    if (!departmentTypes[department]) {
      departmentTypes[department] = [];
    }
    
    const trimmedType = procedureType.trim();
    if (!trimmedType || departmentTypes[department].includes(trimmedType)) {
      return false; // Invalid or duplicate
    }
    
    departmentTypes[department].push(trimmedType);
    saveDepartmentProcedureTypes(departmentTypes, country);
    return true;
  };

  try {
    return await withConnectionRetry(operation, fallback);
  } catch (error) {
    console.error('Error adding procedure type to department:', error);
    return await fallback();
  }
};

export const removeProcedureTypeFromDepartment = async (department: string, procedureType: string, country?: string): Promise<boolean> => {
  const operation = async (): Promise<boolean> => {
    if (country) {
      const { removeProcedureTypeFromDepartment: removeSupabaseProcedureType } = await import('./supabaseDepartmentService');
      return await removeSupabaseProcedureType(department, procedureType, country);
    }
    return false;
  };

  const fallback = async (): Promise<boolean> => {
    console.log('Using localStorage fallback for removing procedure type');
    const departmentTypes = await getDepartmentProcedureTypes(country);
    
    if (!departmentTypes[department]) {
      return false;
    }
    
    const originalLength = departmentTypes[department].length;
    departmentTypes[department] = departmentTypes[department].filter(type => type !== procedureType);
    
    if (departmentTypes[department].length === originalLength) {
      return false; // Type not found
    }
    
    saveDepartmentProcedureTypes(departmentTypes, country);
    return true;
  };

  try {
    return await withConnectionRetry(operation, fallback);
  } catch (error) {
    console.error('Error removing procedure type from department:', error);
    return await fallback();
  }
};

/**
 * Get procedure types for a specific department from the database
 * DATA SOURCE: department_procedure_types table (migrated from legacy categorized_sets)
 * ARCHITECTURE: Uses department_id foreign key to departments table, which links to code_tables
 */
export const getProcedureTypesForDepartment = async (department: string, country?: string): Promise<string[]> => {
  const operation = async (): Promise<string[]> => {
    if (country) {
      const { getProcedureTypesForDepartment: getSupabaseProcedureTypes } = await import('./supabaseDepartmentService');
      return await getSupabaseProcedureTypes(department, country);
    }
    return [];
  };

  const fallback = async (): Promise<string[]> => {
    console.warn('⚠️  Database connection failed after 3 attempts, using localStorage fallback for procedure types');
    const departmentTypes = await getDepartmentProcedureTypes(country);
    return departmentTypes[department] || [];
  };

  // Only use withConnectionRetry - it handles 3 attempts internally
  return await withConnectionRetry(operation, fallback);
};

export const getAllDepartmentProcedureTypes = async (country?: string): Promise<string[]> => {
  try {
    const departmentTypes = await getDepartmentProcedureTypes(country);
    const allTypes = new Set<string>();
    
    Object.values(departmentTypes).forEach(types => {
      types.forEach(type => allTypes.add(type));
    });
    
    return Array.from(allTypes);
  } catch (error) {
    console.error('Error getting all department procedure types:', error);
    return [];
  }
};

// Department-specific categorized sets management
const DEPARTMENT_CATEGORIZED_SETS_KEY = 'department_categorized_sets';

export const getDepartmentCategorizedSets = async (country?: string): Promise<DepartmentCategorizedSets> => {
  try {
    // Try Supabase first if country is provided
    if (country) {
      // Use the CORRECT code table service instead of the wrong departments table
      const { getDepartmentsForCountry } = await import('./supabaseCodeTableService');
      const departmentNames = await getDepartmentsForCountry(country);
      const result: DepartmentCategorizedSets = {};
      
      // Get categorized sets for each department
      for (const departmentName of departmentNames) {
        const { getCategorizedSetsForDepartment } = await import('./supabaseDepartmentService');
        const sets = await getCategorizedSetsForDepartment(departmentName, country);
        if (Object.keys(sets).length > 0) {
          result[departmentName] = sets;
        }
      }
      
      return result;
    }
    
    // Fallback to localStorage
    const key = country ? `${DEPARTMENT_CATEGORIZED_SETS_KEY}_${country}` : DEPARTMENT_CATEGORIZED_SETS_KEY;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
    return {};
  } catch (error) {
    console.error('Error loading department categorized sets:', error);
    return {};
  }
};

export const saveDepartmentCategorizedSets = async (departmentSets: DepartmentCategorizedSets, country?: string): Promise<void> => {
  try {
    // Try Supabase first if country is provided
    if (country) {
      // Save each department's categorized sets to Supabase
      for (const [departmentName, categorizedSets] of Object.entries(departmentSets)) {
        const { saveCategorizedSetsForDepartment } = await import('./supabaseDepartmentService');
        await saveCategorizedSetsForDepartment(departmentName, categorizedSets, country);
      }
      return;
    }
    
    // Fallback to localStorage
    const key = country ? `${DEPARTMENT_CATEGORIZED_SETS_KEY}_${country}` : DEPARTMENT_CATEGORIZED_SETS_KEY;
    localStorage.setItem(key, JSON.stringify(departmentSets));
  } catch (error) {
    console.error('Error saving department categorized sets:', error);
    throw error;
  }
};

/**
 * Get categorized sets (surgery sets & implant boxes) for a specific department and its procedure types
 * DATA SOURCE: department_categorized_sets bridge table (migrated from legacy categorized_sets)
 * ARCHITECTURE: Joins department_id -> surgery_sets & implant_boxes via foreign keys
 * RETURN FORMAT: { [procedureType]: { surgerySets: string[], implantBoxes: string[] } }
 */
export const getCategorizedSetsForDepartment = async (department: string, country?: string): Promise<CategorizedSets> => {
  const operation = async (): Promise<CategorizedSets> => {
    if (country) {
      const { getCategorizedSetsForDepartment: getSupabaseCategorizedSets } = await import('./supabaseDepartmentService');
      return await getSupabaseCategorizedSets(department, country);
    }
    return {};
  };

  const fallback = async (): Promise<CategorizedSets> => {
    console.warn('⚠️  Database connection failed after 3 attempts, using localStorage fallback for categorized sets');
    const departmentSets = await getDepartmentCategorizedSets(country);
    return departmentSets[department] || {};
  };

  // Only use withConnectionRetry - it handles 3 attempts internally
  return await withConnectionRetry(operation, fallback);
};

export const saveCategorizedSetsForDepartment = async (
  department: string, 
  categorizedSets: CategorizedSets, 
  country?: string
): Promise<void> => {
  const operation = async (): Promise<void> => {
    if (country) {
      const { saveCategorizedSetsForDepartment: saveSupabaseCategorizedSets } = await import('./supabaseDepartmentService');
      await saveSupabaseCategorizedSets(department, categorizedSets, country);
    }
  };

  const fallback = async (): Promise<void> => {
    console.log('Using localStorage fallback for saving categorized sets');
    const departmentSets = await getDepartmentCategorizedSets(country);
    departmentSets[department] = categorizedSets;
    await saveDepartmentCategorizedSets(departmentSets, country);
  };

  try {
    // Check if this is a data error that should not trigger connection retry
    await operation();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // If it's a department not found error, just use fallback without triggering connection monitoring
    if (errorMessage.includes('Department') && errorMessage.includes('not found')) {
      console.warn('Department not found, using localStorage fallback:', errorMessage);
      await fallback();
      return;
    }
    
    // For other errors, use the connection retry system
    try {
      await withConnectionRetry(operation, fallback);
    } catch (retryError) {
      console.error('Error saving categorized sets for department:', retryError);
      await fallback();
    }
  }
};