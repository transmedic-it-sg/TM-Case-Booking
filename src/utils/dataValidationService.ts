/**
 * Data Validation Service - Comprehensive data validation utilities
 * Provides validation functions for various data types and business rules
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CaseBookingValidation extends ValidationResult {
  field?: string;
}

class DataValidationService {
  validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Invalid email format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateCaseReferenceNumber(refNumber: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!refNumber || refNumber.trim().length === 0) {
      errors.push('Case reference number is required');
    } else if (refNumber.length < 3) {
      errors.push('Case reference number must be at least 3 characters');
    } else if (refNumber.length > 50) {
      errors.push('Case reference number must be less than 50 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateDate(date: string | Date, fieldName: string = 'Date'): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!date) {
      errors.push(`${fieldName} is required`);
    } else {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        errors.push(`Invalid ${fieldName.toLowerCase()} format`);
      } else {
        // Check if date is too far in the past or future
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

        if (parsedDate < oneYearAgo) {
          warnings.push(`${fieldName} is more than one year in the past`);
        } else if (parsedDate > oneYearFromNow) {
          warnings.push(`${fieldName} is more than one year in the future`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateRequiredField(value: any, fieldName: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (value === null || value === undefined || value === '') {
      errors.push(`${fieldName} is required`);
    } else if (typeof value === 'string' && value.trim().length === 0) {
      errors.push(`${fieldName} cannot be empty`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateCaseBooking(caseData: any): CaseBookingValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    const requiredFields = [
      'hospital',
      'department',
      'date_of_surgery',
      'procedure_type',
      'procedure_name',
      'submitted_by',
      'country'
    ];

    for (const field of requiredFields) {
      const result = this.validateRequiredField(caseData[field], field);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    // Validate date
    if (caseData.date_of_surgery) {
      const dateResult = this.validateDate(caseData.date_of_surgery, 'Surgery date');
      errors.push(...dateResult.errors);
      warnings.push(...dateResult.warnings);
    }

    // Validate arrays
    if (caseData.surgery_set_selection && !Array.isArray(caseData.surgery_set_selection)) {
      errors.push('Surgery set selection must be an array');
    }

    if (caseData.implant_box && !Array.isArray(caseData.implant_box)) {
      errors.push('Implant box selection must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateCountryCode(country: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Import from countryUtils to avoid hardcoding
    const { SUPPORTED_COUNTRIES } = require('./countryUtils');
    const validCountries = [...SUPPORTED_COUNTRIES, 'Global'];

    if (!country || country.trim().length === 0) {
      errors.push('Country is required');
    } else if (!validCountries.includes(country)) {
      warnings.push('Country not in standard list');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateUserRole(role: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validRoles = ['admin', 'operations', 'operations-manager', 'sales', 'sales-manager', 'driver', 'it'];

    if (!role || role.trim().length === 0) {
      errors.push('Role is required');
    } else if (!validRoles.includes(role)) {
      errors.push('Invalid user role');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .substring(0, 1000); // Limit length
  }

  // Additional methods for compatibility
  async checkCrossCountryContamination(): Promise<ValidationResult> {
    // Mock implementation - would check for cross-country data contamination
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  async checkDatabaseHealth(): Promise<ValidationResult> {
    // Mock implementation - would check database health
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  async validateUserAssignments(): Promise<ValidationResult> {
    // Mock implementation - would validate user country/department assignments
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  async autoFixEmptyDatabase(): Promise<ValidationResult> {
    // Mock implementation - would auto-fix empty database issues
    return {
      isValid: true,
      errors: [],
      warnings: ['Auto-fix would be implemented here']
    };
  }
}

// Export class for backward compatibility
export { DataValidationService };

export default new DataValidationService();