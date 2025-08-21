/**
 * Country Database Compatibility Layer
 * Handles the transition from country codes to full country names
 * This ensures the app works during the migration period
 */

import { normalizeCountry, getLegacyCountryCode } from './countryUtils';

/**
 * Convert a full country name to the format used in the database
 * Now standardized to use full country names only
 */
export const getCountryForDatabase = (country: string): string => {
  // Always normalize to full country name
  return normalizeCountry(country);
};

/**
 * Convert database country format back to full country name for the frontend
 * Handles both legacy codes and full names
 */
export const getCountryFromDatabase = (databaseCountry: string): string => {
  // If it's already a full country name, return as-is
  if (databaseCountry.length > 3) {
    return normalizeCountry(databaseCountry);
  }
  
  // If it's a 2-3 character code, convert to full name
  return normalizeCountry(databaseCountry);
};

/**
 * Get all possible country variations for database queries
 * Returns both the country code and full name for flexible querying
 */
export const getCountryVariations = (country: string): string[] => {
  const fullName = normalizeCountry(country);
  const code = getLegacyCountryCode(fullName);
  
  const variations = [fullName];
  if (code && code !== fullName) {
    variations.push(code);
  }
  
  return variations;
};