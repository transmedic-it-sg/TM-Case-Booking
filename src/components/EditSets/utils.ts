import { CategorizedSets } from './types';

/**
 * Initialize empty categorized sets - no longer uses hardcoded data
 * Real data should be loaded from Supabase instead
 */
export const initializeCategorizedSets = (): CategorizedSets => {
  // Return empty sets - data will be loaded from Supabase
  return {};
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