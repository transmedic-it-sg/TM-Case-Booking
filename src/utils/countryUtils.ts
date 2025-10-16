/**
 * Country Utilities - Centralized country handling
 * Uses full country names throughout the system instead of country codes
 */

export const SUPPORTED_COUNTRIES = [
  'Singapore',
  'Malaysia',
  'Philippines',
  'Indonesia',
  'Vietnam',
  'Hong Kong',
  'Thailand'
] as const;

export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];

/**
 * Legacy country code mapping - used only for migration purposes
 * @deprecated - Use full country names instead
 */
const LEGACY_COUNTRY_CODE_MAP: { [key: string]: string } = {
  'SG': 'Singapore',
  'MY': 'Malaysia',
  'PH': 'Philippines',
  'ID': 'Indonesia',
  'VN': 'Vietnam',
  'HK': 'Hong Kong',
  'TH': 'Thailand'
};

/**
 * Convert legacy country code to full name
 * @param countryCode - Legacy 2-letter country code
 * @returns Full country name
 */
export const convertLegacyCountryCode = (countryCode: string): string => {
  return LEGACY_COUNTRY_CODE_MAP[countryCode] || countryCode;
};

/**
 * Normalize country input - converts codes to full names if needed
 * @param country - Country name or legacy code
 * @returns Full country name
 */
export const normalizeCountry = (country: string): string => {
  // If it's already a full name, return as is
  if (SUPPORTED_COUNTRIES.includes(country as SupportedCountry)) {
    return country;
  }

  // If it's a legacy code, convert it
  if (LEGACY_COUNTRY_CODE_MAP[country.toUpperCase()]) {
    return LEGACY_COUNTRY_CODE_MAP[country.toUpperCase()];
  }

  // Default fallback
  return country;
};

/**
 * Check if a country is supported
 * @param country - Country name to check
 * @returns true if supported
 */
export const isSupportedCountry = (country: string): country is SupportedCountry => {
  return SUPPORTED_COUNTRIES.includes(country as SupportedCountry);
};

/**
 * Get default country (first available country, no preference)
 * @returns Default country name
 */
export const getDefaultCountry = (): SupportedCountry => {
  // No country preference - use first from list or from user's available countries
  return SUPPORTED_COUNTRIES[0];
};

/**
 * Get legacy country code for a full country name (reverse lookup)
 * Used for database compatibility with existing cases
 * @param country - Full country name
 * @returns Legacy 2-letter country code or null if not found
 */
export const getLegacyCountryCode = (country: string): string | null => {
  const codeEntry = Object.entries(LEGACY_COUNTRY_CODE_MAP).find(([code, name]) => name === country);
  return codeEntry ? codeEntry[0] : null;
};