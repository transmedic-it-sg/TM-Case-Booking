import { SURGERY_SETS, IMPLANT_BOXES, PROCEDURE_TYPES } from '../../types';
import { CategorizedSets } from './types';

export const initializeCategorizedSets = (): CategorizedSets => {
  const initialCategorizedSets: CategorizedSets = {};
  
  // Initialize each procedure type with empty arrays
  PROCEDURE_TYPES.forEach(procedureType => {
    initialCategorizedSets[procedureType] = {
      surgerySets: [],
      implantBoxes: []
    };
  });
  
  // Distribute existing sets based on keywords (smart categorization)
  SURGERY_SETS.forEach(set => {
    const lowerSet = set.toLowerCase();
    let assigned = false;
    
    PROCEDURE_TYPES.forEach(procedureType => {
      const lowerProcedureType = procedureType.toLowerCase();
      if (lowerSet.includes(lowerProcedureType) && !assigned) {
        initialCategorizedSets[procedureType].surgerySets.push(set);
        assigned = true;
      }
    });
    
    // If not assigned to any specific category, add to first category
    if (!assigned) {
      initialCategorizedSets[PROCEDURE_TYPES[0]].surgerySets.push(set);
    }
  });
  
  // Distribute existing implant boxes based on keywords
  IMPLANT_BOXES.forEach(box => {
    const lowerBox = box.toLowerCase();
    let assigned = false;
    
    PROCEDURE_TYPES.forEach(procedureType => {
      const lowerProcedureType = procedureType.toLowerCase();
      if (lowerBox.includes(lowerProcedureType) && !assigned) {
        initialCategorizedSets[procedureType].implantBoxes.push(box);
        assigned = true;
      }
    });
    
    // If not assigned to any specific category, add to first category
    if (!assigned) {
      initialCategorizedSets[PROCEDURE_TYPES[0]].implantBoxes.push(box);
    }
  });
  
  return initialCategorizedSets;
};

export const reorderItems = <T>(items: T[], fromIndex: number, toIndex: number): T[] => {
  const result = [...items];
  const [removed] = result.splice(fromIndex, 1);
  
  // Calculate correct drop position
  const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  result.splice(adjustedToIndex, 0, removed);
  
  return result;
};

export const swapItems = <T>(items: T[], index1: number, index2: number): T[] => {
  const result = [...items];
  [result[index1], result[index2]] = [result[index2], result[index1]];
  return result;
};