/**
 * Supabase Security Service - DISABLED FOR COMPATIBILITY
 * This service is temporarily disabled to restore application functionality
 */

console.warn('supabaseSecurityService is temporarily disabled for compatibility.');

export interface SecurityContext {
  userId: string;
  role: string;
  countries: string[];
  departments: string[];
  enabled: boolean;
}

// Stub implementations
export const getCurrentSecurityContext = async (): Promise<SecurityContext | null> => {
  console.warn('getCurrentSecurityContext called on disabled security service');
  return null;
};

export const canAccessCase = async (caseCountry: string, caseDepartment?: string): Promise<boolean> => {
  console.warn('canAccessCase called on disabled security service');
  return true; // Allow all access for compatibility
};

export const validatePermission = (action: string): boolean => {
  console.warn('validatePermission called on disabled security service');
  return true; // Allow all permissions for compatibility
};

// Secure query stubs
export const secureQuery = {
  getCases: async (filters?: any) => {
    console.warn('secureQuery.getCases called on disabled security service');
    throw new Error('Security service is disabled. Use direct Supabase queries instead.');
  },
  createCase: async (caseData: any) => {
    console.warn('secureQuery.createCase called on disabled security service');
    throw new Error('Security service is disabled. Use direct Supabase queries instead.');
  },
  updateCase: async (caseId: string, updates: any) => {
    console.warn('secureQuery.updateCase called on disabled security service');
    throw new Error('Security service is disabled. Use direct Supabase queries instead.');
  }
};