/**
 * Centralized date formatting utilities
 * All dates in the application should use Day, DD/MM/YYYY format
 */

/**
 * Format a date to DD/MM/YYYY format with day name
 * @param date - Date object, string, or timestamp
 * @returns Formatted date string in Day, DD/MM/YYYY format
 */
export const formatDate = (date: Date | string | number): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[d.getDay()];
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${dayName}, ${day}/${month}/${year}`;
};

/**
 * Format a date to DD/MM/YYYY HH:MM format with day name
 * @param date - Date object, string, or timestamp
 * @returns Formatted date and time string in Day, DD/MM/YYYY HH:MM format
 */
export const formatDateTime = (date: Date | string | number): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[d.getDay()];
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${dayName}, ${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Format a date for HTML date input (YYYY-MM-DD)
 * @param date - Date object, string, or timestamp
 * @returns Formatted date string in YYYY-MM-DD format for HTML inputs
 */
export const formatDateForInput = (date: Date | string | number): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }

  return d.toISOString().split('T')[0];
};

/**
 * Parse DD/MM/YYYY format to Date object
 * @param dateString - Date string in DD/MM/YYYY format
 * @returns Date object or null if invalid
 */
export const parseDateFromDDMMYYYY = (dateString: string): Date | null => {
  const parts = dateString.split('/');
  if (parts.length !== 3) {
    return null;
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }

  const date = new Date(year, month, day);

  // Validate that the date is correct (handles invalid dates like 31/02/2023)
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }

  return date;
};

/**
 * Get month name with year for calendar displays
 * @param date - Date object
 * @returns Month name and year (e.g., "January 2024")
 */
export const getMonthYearDisplay = (date: Date): string => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Get today's date in DD/MM/YYYY format
 * @returns Today's date formatted as DD/MM/YYYY
 */
export const getTodayFormatted = (): string => {
  return formatDate(new Date());
};

/**
 * Get today's date in YYYY-MM-DD format for HTML inputs
 * @returns Today's date formatted as YYYY-MM-DD
 */
export const getTodayForInput = (): string => {
  return formatDateForInput(new Date());
};

/**
 * Add days to a date and return formatted string
 * @param days - Number of days to add
 * @param fromDate - Base date (defaults to today)
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const addDaysFormatted = (days: number, fromDate?: Date): string => {
  const date = fromDate || new Date();
  const newDate = new Date(date);
  newDate.setDate(date.getDate() + days);
  return formatDate(newDate);
};

/**
 * Add days to a date and return in input format
 * @param days - Number of days to add
 * @param fromDate - Base date (defaults to today)
 * @returns Formatted date string in YYYY-MM-DD format
 */
export const addDaysForInput = (days: number, fromDate?: Date): string => {
  const date = fromDate || new Date();
  const newDate = new Date(date);
  newDate.setDate(date.getDate() + days);
  return formatDateForInput(newDate);
};