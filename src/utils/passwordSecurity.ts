import bcrypt from 'bcryptjs';

/**
 * Password hashing utility using bcrypt
 * CRITICAL: All passwords must be hashed before storing in database
 */

const SALT_ROUNDS = 12; // High security - will be slower but more secure

/**
 * Hash a plain text password using bcrypt
 * @param plainPassword - The plain text password to hash
 * @returns Promise<string> - The hashed password
 */
export const hashPassword = async (plainPassword: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Verify a plain text password against a hashed password
 * @param plainPassword - The plain text password to verify
 * @param hashedPassword - The hashed password to compare against
 * @returns Promise<boolean> - True if passwords match, false otherwise
 */
export const verifyPassword = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
  try {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

/**
 * Generate a secure random password for temporary use
 * @param length - The length of the password to generate (default: 12)
 * @returns string - A secure random password
 */
export const generateSecurePassword = (length: number = 12): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each category
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password to randomize character positions
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Validate password strength
 * @param password - The password to validate
 * @returns object - Validation result with strength score and requirements
 */
export const validatePasswordStrength = (password: string) => {
  const result = {
    isValid: false,
    score: 0,
    requirements: {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noCommonPatterns: !/^(password|123456|qwerty|admin|user)/i.test(password)
    },
    message: ''
  };
  
  // Calculate score
  Object.values(result.requirements).forEach(req => {
    if (req) result.score++;
  });
  
  // Determine if password is valid (all requirements met)
  result.isValid = Object.values(result.requirements).every(req => req);
  
  // Generate message
  if (result.score === 6) {
    result.message = 'Strong password';
  } else if (result.score >= 4) {
    result.message = 'Good password - consider adding more complexity';
  } else if (result.score >= 2) {
    result.message = 'Weak password - please improve';
  } else {
    result.message = 'Very weak password - must be strengthened';
  }
  
  return result;
};

/**
 * Check if a password is likely to be a temporary password
 * @param password - The password to check
 * @returns boolean - True if it appears to be temporary
 */
export const isTemporaryPasswordPattern = (password: string): boolean => {
  // Common temporary password patterns
  const tempPatterns = [
    /^temp/i,
    /^password/i,
    /^123456/,
    /^admin/i,
    /^user/i,
    /^change/i,
    /^reset/i
  ];
  
  return tempPatterns.some(pattern => pattern.test(password));
};