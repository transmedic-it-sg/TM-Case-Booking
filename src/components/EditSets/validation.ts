import { CategorizedSets } from './types';

export interface ValidationResult {
  isValid: boolean;
  error: string;
}

export const validateItemName = (
  name: string,
  type: 'surgery' | 'implant',
  categorizedSets: CategorizedSets,
  selectedProcedureType: string,
  excludeName?: string
): ValidationResult => {
  const trimmedName = name.trim();
  const itemType = type === 'surgery' ? 'Surgery set' : 'Implant box';
  
  // Required field validation
  if (!trimmedName) {
    return {
      isValid: false,
      error: `${itemType} name is required`
    };
  }

  // Length validation
  if (trimmedName.length < 3) {
    return {
      isValid: false,
      error: 'Name must be at least 3 characters long'
    };
  }

  if (trimmedName.length > 50) {
    return {
      isValid: false,
      error: 'Name must be 50 characters or less'
    };
  }

  // Special characters validation
  const validNamePattern = /^[a-zA-Z0-9\s\-()]+$/;
  if (!validNamePattern.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Name can only contain letters, numbers, spaces, hyphens, and parentheses'
    };
  }

  // Duplicate validation in current procedure type
  const currentItems = type === 'surgery' 
    ? categorizedSets[selectedProcedureType]?.surgerySets || []
    : categorizedSets[selectedProcedureType]?.implantBoxes || [];
    
  const duplicateInCurrent = currentItems.some(item => 
    item !== excludeName && item === trimmedName
  );
  
  if (duplicateInCurrent) {
    return {
      isValid: false,
      error: `This ${type === 'surgery' ? 'surgery set' : 'implant box'} already exists in this procedure type`
    };
  }

  // Duplicate validation across all procedure types (only for add, not edit)
  if (!excludeName) {
    const allItems = Object.values(categorizedSets).flatMap(sets => 
      type === 'surgery' ? sets.surgerySets : sets.implantBoxes
    );
    
    if (allItems.includes(trimmedName)) {
      return {
        isValid: false,
        error: `This ${type === 'surgery' ? 'surgery set' : 'implant box'} already exists in another procedure type`
      };
    }
  }

  return {
    isValid: true,
    error: ''
  };
};