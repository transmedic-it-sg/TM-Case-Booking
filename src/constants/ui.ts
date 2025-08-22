/**
 * UI Constants - Centralized UI configuration
 * Prevents scattered UI strings and values throughout the app
 */

// Country and region data - now using centralized country utilities
import { SUPPORTED_COUNTRIES, getLegacyCountryCode } from '../utils/countryUtils';

// Application metadata
export const APP_INFO = {
  NAME: 'Case Booking System',
  SHORT_NAME: 'CBS',
  VERSION: '1.1.5',
  DESCRIPTION: 'Medical case booking and workflow management system',
  AUTHOR: 'TM Medical',
  SUPPORT_EMAIL: 'support@tmmedical.com'
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_VISIBLE_PAGES: 5
} as const;

// Animation durations (in milliseconds)
export const ANIMATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  EXTRA_SLOW: 1000
} as const;

// Breakpoints for responsive design
export const BREAKPOINTS = {
  XS: 480,
  SM: 576,
  MD: 768,
  LG: 992,
  XL: 1200,
  XXL: 1400
} as const;

// Z-index layers
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  TOAST: 1080
} as const;

// File upload constraints
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_UPLOAD: 5,
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ACCEPTED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
  PREVIEW_IMAGE_SIZE: 150
} as const;

// Form validation
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_TEXT_LENGTH: 1000,
  MAX_INSTRUCTION_LENGTH: 2000,
  PHONE_PATTERN: /^[+]?[1-9][\d]{0,15}$/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
} as const;

// Date and time formats
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm',
  INPUT: 'YYYY-MM-DD',
  ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  TIME_ONLY: 'HH:mm'
} as const;

// Notification types and durations
export const NOTIFICATIONS = {
  TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  },
  DURATIONS: {
    SHORT: 3000,
    MEDIUM: 5000,
    LONG: 8000,
    PERSISTENT: 0 // Don't auto-dismiss
  },
  MAX_VISIBLE: 5,
  POSITION: 'top-right'
} as const;

// Loading states
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
} as const;

// Modal sizes
export const MODAL_SIZES = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl',
  FULLSCREEN: 'fullscreen'
} as const;

// Table configuration
export const TABLE = {
  DEFAULT_SORT_DIRECTION: 'asc',
  SORTABLE_COLUMNS: ['dateOfSurgery', 'submittedAt', 'hospital', 'status'],
  STICKY_HEADER: true,
  ROW_HEIGHT: 60
} as const;

// Search configuration
export const SEARCH = {
  MIN_QUERY_LENGTH: 2,
  DEBOUNCE_DELAY: 300,
  MAX_RESULTS: 100,
  HIGHLIGHT_CLASS: 'search-highlight'
} as const;

export const COUNTRIES = {
  SINGAPORE: { code: getLegacyCountryCode('Singapore') || 'SG', name: 'Singapore', emoji: '🇸🇬', timezone: 'Asia/Singapore' },
  MALAYSIA: { code: getLegacyCountryCode('Malaysia') || 'MY', name: 'Malaysia', emoji: '🇲🇾', timezone: 'Asia/Kuala_Lumpur' },
  PHILIPPINES: { code: getLegacyCountryCode('Philippines') || 'PH', name: 'Philippines', emoji: '🇵🇭', timezone: 'Asia/Manila' },
  INDONESIA: { code: getLegacyCountryCode('Indonesia') || 'ID', name: 'Indonesia', emoji: '🇮🇩', timezone: 'Asia/Jakarta' },
  VIETNAM: { code: getLegacyCountryCode('Vietnam') || 'VN', name: 'Vietnam', emoji: '🇻🇳', timezone: 'Asia/Ho_Chi_Minh' },
  HONG_KONG: { code: getLegacyCountryCode('Hong Kong') || 'HK', name: 'Hong Kong', emoji: '🇭🇰', timezone: 'Asia/Hong_Kong' },
  THAILAND: { code: getLegacyCountryCode('Thailand') || 'TH', name: 'Thailand', emoji: '🇹🇭', timezone: 'Asia/Bangkok' }
} as const;

// List of supported countries for easier access
export const COUNTRY_LIST = SUPPORTED_COUNTRIES;

// Theme colors
export const THEME_COLORS = {
  PRIMARY: '#20b2aa',
  PRIMARY_DARK: '#008b8b',
  PRIMARY_LIGHT: '#e0f7f7',
  SECONDARY: '#ff5a5f',
  SUCCESS: '#27ae60',
  DANGER: '#e74c3c',
  WARNING: '#f39c12',
  INFO: '#3498db',
  LIGHT: '#f8f9fa',
  DARK: '#343a40'
} as const;

// Icon mappings
export const ICONS = {
  // Navigation
  HOME: '🏠',
  CASES: '📋',
  CALENDAR: '📅',
  SETTINGS: '⚙️',
  USERS: '👥',
  LOGOUT: '🚪',
  
  // Actions
  ADD: '➕',
  EDIT: '✏️',
  DELETE: '🗑️',
  SAVE: '💾',
  CANCEL: '❌',
  SEARCH: '🔍',
  FILTER: '🔽',
  SORT: '🔄',
  
  // Status
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOADING: '⏳',
  
  // File operations
  UPLOAD: '📤',
  DOWNLOAD: '📥',
  ATTACHMENT: '📎',
  IMAGE: '🖼️',
  DOCUMENT: '📄'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  VALIDATION: 'Please check your input and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit.',
  INVALID_FILE_TYPE: 'Invalid file type. Please select a supported file.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  PASSWORD_TOO_SHORT: `Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters long.`
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  CASE_CREATED: 'Case created successfully!',
  CASE_UPDATED: 'Case updated successfully!',
  CASE_DELETED: 'Case deleted successfully!',
  STATUS_UPDATED: 'Status updated successfully!',
  USER_CREATED: 'User created successfully!',
  USER_UPDATED: 'User updated successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
  FILE_UPLOADED: 'File uploaded successfully!',
  EMAIL_SENT: 'Email sent successfully!'
} as const;

// Helper functions
export const getCountryEmoji = (countryName: string): string => {
  const country = Object.values(COUNTRIES).find(c => c.name === countryName);
  return country?.emoji || '🌍';
};

export const getCountryCode = (countryName: string): string => {
  const country = Object.values(COUNTRIES).find(c => c.name === countryName);
  return country?.code || '';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const isMobile = (): boolean => {
  return window.innerWidth <= BREAKPOINTS.MD;
};

export const isTablet = (): boolean => {
  return window.innerWidth > BREAKPOINTS.MD && window.innerWidth <= BREAKPOINTS.LG;
};

export const isDesktop = (): boolean => {
  return window.innerWidth > BREAKPOINTS.LG;
};