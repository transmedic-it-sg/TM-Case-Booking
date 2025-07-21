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
    console.log('Loading cases from Supabase...');
    // Try to get cases directly from Supabase
    const supabaseCases = await getSupabaseCases(country);
    
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
  } catch (error) {
    console.error('Error saving case to Supabase:', error);
    throw error; // Don't fall back to localStorage, throw error to inform user
  }
};

// Helper function removed - using Supabase exclusively

export const updateCaseStatus = async (caseId: string, status: CaseBooking['status'], processedBy?: string, details?: string): Promise<void> => {
  try {
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
    
    // Always use Supabase for status updates
    await updateSupabaseCaseStatus(caseId, status, processedBy || 'unknown', details, attachments);
    console.log('Case status updated successfully in Supabase');
    return;
  } catch (error) {
    console.error('Error updating case status in Supabase:', error);
    throw error; // Don't fall back to localStorage, throw error to inform user
  }
};

// Process order with specific order details
export const processCaseOrder = async (caseId: string, processedBy: string, processOrderDetails: string): Promise<void> => {
  try {
    // Always use Supabase for order processing
    await updateSupabaseCaseProcessing(caseId, processedBy, processOrderDetails, 'Order Prepared');
    console.log('Case order processed successfully in Supabase');
    return;
  } catch (error) {
    console.error('Error processing case order in Supabase:', error);
    throw error; // Don't fall back to localStorage, throw error to inform user
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