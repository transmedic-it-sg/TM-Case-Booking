/**
 * Supabase Service - Updated for correct database architecture
 * Uses centralized code_tables and proper authentication
 */

import { supabase } from '../lib/supabase';
import { User } from '../types';
import { ErrorHandler } from '../utils/errorHandler';

// Import the corrected database service
import correctDatabaseService from './correctDatabaseService';

export interface CaseBooking {
  id: string;
  case_reference: string;
  hospital_name: string;
  surgeon_name: string;
  patient_name: string;
  department: string;
  procedure_type: string;
  date_of_surgery: string;
  surgery_sets: string[];
  implant_boxes: string[];
  status: string;
  country: string;
  submitted_by: string;
  created_at: string;
  updated_at: string;
}

export interface CaseFilters {
  country?: string;
  status?: string;
  submitter?: string;
  dateFrom?: string;
  dateTo?: string;
}

const supabaseService = {
  // User management
  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    const result = await ErrorHandler.executeWithRetry(
      async () => {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userData.email || `${userData.username}@example.com`,
          password: userData.password || 'TempPassword123!'
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create auth user');

        // Create user profile
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            username: userData.username,
            name: userData.name,
            email: userData.email!,
            role: userData.role,
            departments: userData.departments,
            countries: userData.countries,
            enabled: userData.enabled ?? true
          })
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('No data returned from user creation');

        return {
          id: data.id,
          username: data.username,
          password: '',
          role: data.role,
          name: data.name,
          departments: data.departments || [],
          countries: data.countries || [],
          selectedCountry: data.selected_country,
          enabled: data.enabled,
          email: data.email || ''
        };
      },
      {
        operation: 'Create User',
        userMessage: 'Failed to create user',
        showToast: true,
        showNotification: true,
        includeDetails: true,
        autoRetry: true,
        maxRetries: 2
      }
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to create user');
    }

    return result.data!;
  },

  // Case management
  async getCases(filters?: CaseFilters): Promise<CaseBooking[]> {
    let query = supabase
      .from('case_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.country) {
      query = query.eq('country', filters.country);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.submitter) {
      query = query.eq('submitted_by', filters.submitter);
    }

    if (filters?.dateFrom) {
      query = query.gte('date_of_surgery', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('date_of_surgery', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<CaseBooking | null> {
    const { data, error } = await supabase
      .from('case_bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createCase(caseData: Omit<CaseBooking, 'id' | 'created_at' | 'updated_at'>): Promise<CaseBooking> {
    const { data, error } = await supabase
      .from('case_bookings')
      .insert(caseData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCase(id: string, updates: Partial<CaseBooking>): Promise<CaseBooking> {
    const { data, error } = await supabase
      .from('case_bookings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCase(id: string): Promise<void> {
    const { error } = await supabase
      .from('case_bookings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Constants - delegate to correct service
  getCountries: correctDatabaseService.getCountries,
  getHospitals: correctDatabaseService.getHospitals,
  getCaseStatuses: correctDatabaseService.getCaseStatuses,
  getDepartments: correctDatabaseService.getDepartments,
  getProcedureTypes: correctDatabaseService.getProcedureTypes,
  getSurgerySets: correctDatabaseService.getSurgerySets,
  getImplantBoxes: correctDatabaseService.getImplantBoxes,

  // User roles
  async getUserRoles(): Promise<any[]> {
    return correctDatabaseService.getUserRoles();
  },

  // Utility functions
  async getCountryIdByName(countryName: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('code_tables')
      .select('id')
      .eq('table_type', 'countries')
      .eq('display_name', countryName)
      .single();

    if (error) return null;
    return data?.id || null;
  },

  async getStatusIdByKey(statusKey: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('code_tables')
      .select('id')
      .eq('table_type', 'case_statuses')
      .eq('code', statusKey)
      .single();

    if (error) return null;
    return data?.id || null;
  }
};

// Legacy operation objects for backwards compatibility
export const caseOperations = {
  getCases: supabaseService.getCases,
  getById: supabaseService.getById,
  getAll: supabaseService.getCases, // Alias for getCases
  createCase: supabaseService.createCase,
  create: supabaseService.createCase, // Alias for createCase
  updateCase: supabaseService.updateCase,
  update: supabaseService.updateCase, // Alias for updateCase
  updateStatus: async (id: string, status: string, processedBy: string, details?: string) => {
    return supabaseService.updateCase(id, { status, processOrderDetails: details } as any);
  },
  deleteCase: supabaseService.deleteCase,
  addAmendment: async (caseId: string, amendments: any) => {
    // Legacy amendment support - update with amendments
    return supabaseService.updateCase(caseId, amendments);
  }
};

export const userOperations = {
  createUser: supabaseService.createUser
};

export const lookupOperations = {
  getCountries: supabaseService.getCountries,
  getHospitals: supabaseService.getHospitals,
  getCaseStatuses: supabaseService.getCaseStatuses,
  getDepartments: supabaseService.getDepartments,
  getProcedureTypes: supabaseService.getProcedureTypes,
  getSurgerySets: supabaseService.getSurgerySets,
  getImplantBoxes: supabaseService.getImplantBoxes,
  getUserRoles: supabaseService.getUserRoles,
  getProcedureMappings: async () => {
    // Legacy function - return empty array
    return [];
  }
};

export const auditOperations = {
  logAction: async (action: string, details: any) => {
    // Legacy audit logging - could implement actual logging here
    console.log(`[AUDIT] ${action}:`, details);
  }
};

export const subscriptions = {
  // Add subscription functions if needed
};

export default supabaseService;