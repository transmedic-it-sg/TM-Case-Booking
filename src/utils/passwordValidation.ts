/**
 * Password Validation Utility
 * Handles password complexity requirements and validation
 */

import { getSystemConfig } from './systemSettingsService';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // 0-100
  strengthText: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minSpecialChars: number;
}

const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minSpecialChars: 1
};

const SIMPLE_REQUIREMENTS: PasswordRequirements = {
  minLength: 6,
  requireUppercase: false,
  requireLowercase: false,
  requireNumbers: false,
  requireSpecialChars: false,
  minSpecialChars: 0
};

/**
 * Get password requirements based on system configuration
 */
export const getPasswordRequirements = async (): Promise<PasswordRequirements> => {
  try {
    const config = await getSystemConfig();
    return config.passwordComplexity ? DEFAULT_REQUIREMENTS : SIMPLE_REQUIREMENTS;
  } catch (error) {
    // // // console.error('Failed to get system config, using default requirements:', error);
    return DEFAULT_REQUIREMENTS;
  }
};

/**
 * Get password requirements synchronously (for immediate validation)
 */
export const getPasswordRequirementsSync = (enforceComplexity: boolean = true): PasswordRequirements => {
  return enforceComplexity ? DEFAULT_REQUIREMENTS : SIMPLE_REQUIREMENTS;
};

/**
 * Validate password against requirements
 */
export const validatePassword = (
  password: string,
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS
): PasswordValidationResult => {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`);
  } else {
    score += 20;
    // Bonus points for longer passwords
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
  }

  // Check uppercase requirement
  const hasUppercase = /[A-Z]/.test(password);
  if (requirements.requireUppercase && !hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (hasUppercase) {
    score += 15;
  }

  // Check lowercase requirement
  const hasLowercase = /[a-z]/.test(password);
  if (requirements.requireLowercase && !hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (hasLowercase) {
    score += 15;
  }

  // Check numbers requirement
  const hasNumbers = /\d/.test(password);
  if (requirements.requireNumbers && !hasNumbers) {
    errors.push('Password must contain at least one number');
  } else if (hasNumbers) {
    score += 15;
  }

  // Check special characters requirement
  const specialChars = password.match(/[^a-zA-Z0-9]/g) || [];
  if (requirements.requireSpecialChars && specialChars.length < requirements.minSpecialChars) {
    errors.push(`Password must contain at least ${requirements.minSpecialChars} special character(s)`);
  } else if (specialChars.length > 0) {
    score += 15;
    // Bonus for multiple special characters
    if (specialChars.length >= 2) score += 5;
  }

  // Additional security checks
  if (password.length > 0) {
    // Check for common patterns
    const commonPatterns = [
      /(.)\1{2,}/, // Repeated characters (aaa, 111, etc.)
      /123|234|345|456|567|678|789|890/, // Sequential numbers
      /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i, // Sequential letters
    ];

    commonPatterns.forEach(pattern => {
      if (pattern.test(password)) {
        score -= 10;
      }
    });

    // Check for dictionary words (basic check)
    const commonWords = [
      'password', 'admin', 'user', 'login', 'welcome', 'test', 'temp', 'temporary',
      'transmedic', 'medical', 'hospital', 'doctor', 'nurse', 'patient'
    ];

    const lowerPassword = password.toLowerCase();
    commonWords.forEach(word => {
      if (lowerPassword.includes(word)) {
        score -= 15;
        if (errors.length === 0) { // Only add this as a warning if no other errors
          errors.push('Password should not contain common words');
        }
      }
    });
  }

  // Ensure score stays within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine strength text
  let strengthText: PasswordValidationResult['strengthText'];
  if (score < 20) strengthText = 'Very Weak';
  else if (score < 40) strengthText = 'Weak';
  else if (score < 60) strengthText = 'Fair';
  else if (score < 80) strengthText = 'Good';
  else strengthText = 'Strong';

  return {
    isValid: errors.length === 0,
    errors,
    score,
    strengthText
  };
};

/**
 * Generate a random password that meets the requirements
 */
export const generateSecurePassword = (requirements: PasswordRequirements = DEFAULT_REQUIREMENTS): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let chars = '';
  let password = '';

  // Add required character types
  if (requirements.requireUppercase) {
    chars += uppercase;
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
  }

  if (requirements.requireLowercase) {
    chars += lowercase;
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
  }

  if (requirements.requireNumbers) {
    chars += numbers;
    password += numbers[Math.floor(Math.random() * numbers.length)];
  }

  if (requirements.requireSpecialChars) {
    chars += specialChars;
    for (let i = 0; i < requirements.minSpecialChars; i++) {
      password += specialChars[Math.floor(Math.random() * specialChars.length)];
    }
  }

  // If no specific requirements, use all characters
  if (!chars) {
    chars = uppercase + lowercase + numbers + specialChars;
  }

  // Fill the remaining length
  while (password.length < requirements.minLength) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  // Shuffle the password to randomize character positions
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

/**
 * Get password requirements as a human-readable string
 */
export const getPasswordRequirementsText = (requirements: PasswordRequirements): string[] => {
  const texts: string[] = [];

  texts.push(`At least ${requirements.minLength} characters long`);

  if (requirements.requireUppercase) {
    texts.push('At least one uppercase letter (A-Z)');
  }

  if (requirements.requireLowercase) {
    texts.push('At least one lowercase letter (a-z)');
  }

  if (requirements.requireNumbers) {
    texts.push('At least one number (0-9)');
  }

  if (requirements.requireSpecialChars) {
    texts.push(`At least ${requirements.minSpecialChars} special character(s) (!@#$%^&*)`);
  }

  return texts;
};