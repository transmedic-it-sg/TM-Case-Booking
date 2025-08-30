/**
 * Fixed Supabase Service - Production Ready Implementation
 * Handles proper type conversion between database and application schemas
 * Includes comprehensive error handling and fallback mechanisms
 */

import { supabase } from '../lib/supabase';
import { User, CaseBooking, CaseStatus } from '../types';
import { ErrorHandler } from '../utils/errorHandler';
import { dbCaseToAppCase, appCaseToDbCase, DbCaseBooking } from '../utils/typeMapping';

// Enhanced interfaces for proper type safety
export interface CaseFilters {
  country?: string;
  status?: string;
  submitter?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CaseOperationsResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Production-ready Supabase service with proper error handling
 */
class SupabaseServiceFixed {
  private connectionAttempts = 0;
  private readonly maxRetries = 3;
  private isOfflineMode = false;

  // User management operations
  async createUser(userData: Omit<User, 'id'>): Promise<CaseOperationsResult<User>> {
    return await ErrorHandler.executeWithRetry(
      async () => {
        // Create auth user first
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
          password: '', // Never expose password
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
        maxRetries: this.maxRetries
      }
    );
  }

  // Case management operations with proper type conversion
  async getCases(filters?: CaseFilters): Promise<CaseOperationsResult<CaseBooking[]>> {
    return await ErrorHandler.executeWithRetry(
      async () => {
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

        // Convert database cases to application format
        const dbCases = data as DbCaseBooking[];
        const appCases = dbCases.map(dbCase => dbCaseToAppCase(dbCase));
        
        return appCases;
      },
      {
        operation: 'Get Cases',
        userMessage: 'Failed to fetch cases',
        showToast: false,
        showNotification: false,
        includeDetails: true,
        autoRetry: true,
        maxRetries: this.maxRetries
      }
    );
  }

  async getById(id: string): Promise<CaseOperationsResult<CaseBooking>> {
    return await ErrorHandler.executeWithRetry(
      async () => {
        const { data, error } = await supabase
          .from('case_bookings')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Case not found');

        // Convert database case to application format
        const appCase = dbCaseToAppCase(data as DbCaseBooking);
        return appCase;
      },
      {
        operation: 'Get Case By ID',
        userMessage: 'Failed to fetch case',
        showToast: false,
        showNotification: false,
        includeDetails: true,
        autoRetry: true,
        maxRetries: this.maxRetries
      }
    );
  }

  async createCase(caseData: Omit<CaseBooking, 'id' | 'submittedAt'>): Promise<CaseOperationsResult<CaseBooking>> {
    return await ErrorHandler.executeWithRetry(
      async () => {
        // Convert application case to database format
        const dbCaseData = appCaseToDbCase({
          ...caseData,
          id: '',
          submittedAt: new Date().toISOString()
        } as CaseBooking);

        const { data, error } = await supabase
          .from('case_bookings')
          .insert(dbCaseData)
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('No data returned from case creation');

        // Convert back to application format
        const appCase = dbCaseToAppCase(data as DbCaseBooking);
        return appCase;
      },
      {
        operation: 'Create Case',
        userMessage: 'Failed to create case',
        showToast: true,
        showNotification: true,
        includeDetails: true,
        autoRetry: true,
        maxRetries: this.maxRetries
      }
    );
  }

  async updateCase(id: string, updates: Partial<CaseBooking>): Promise<CaseOperationsResult<CaseBooking>> {
    return await ErrorHandler.executeWithRetry(
      async () => {
        // Convert partial application updates to database format
        const dbUpdates = appCaseToDbCase(updates as CaseBooking);
        
        // Remove undefined fields and add timestamp
        const cleanUpdates = Object.fromEntries(
          Object.entries(dbUpdates).filter(([_, value]) => value !== undefined)
        );
        cleanUpdates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
          .from('case_bookings')
          .update(cleanUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('No data returned from case update');

        // Convert back to application format
        const appCase = dbCaseToAppCase(data as DbCaseBooking);
        return appCase;
      },
      {
        operation: 'Update Case',
        userMessage: 'Failed to update case',
        showToast: true,
        showNotification: true,
        includeDetails: true,
        autoRetry: true,
        maxRetries: this.maxRetries
      }
    );
  }

  async updateStatus(id: string, status: CaseStatus, processedBy: string, details?: string): Promise<CaseOperationsResult<CaseBooking>> {
    return await this.updateCase(id, {
      status,
      processedBy,
      processedAt: new Date().toISOString(),
      processOrderDetails: details
    } as Partial<CaseBooking>);
  }

  async deleteCase(id: string): Promise<CaseOperationsResult<boolean>> {
    return await ErrorHandler.executeWithRetry(
      async () => {
        const { error } = await supabase
          .from('case_bookings')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return true;
      },
      {
        operation: 'Delete Case',
        userMessage: 'Failed to delete case',
        showToast: true,
        showNotification: true,
        includeDetails: true,
        autoRetry: true,
        maxRetries: this.maxRetries
      }
    );
  }

  // Connection health check
  async checkConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('code_tables')
        .select('count')
        .limit(1);
      
      if (error) {
        this.connectionAttempts++;
        if (this.connectionAttempts >= this.maxRetries) {
          this.isOfflineMode = true;
          console.warn('🔥 Supabase connection failed after 3 attempts, switching to offline mode');
        }
        return false;
      }
      
      // Reset connection attempts on success
      this.connectionAttempts = 0;
      this.isOfflineMode = false;
      return true;
    } catch (error) {
      this.connectionAttempts++;
      return false;
    }
  }

  // Get connection status
  isOnline(): boolean {
    return !this.isOfflineMode;
  }

  getConnectionAttempts(): number {
    return this.connectionAttempts;
  }
}

// Create singleton instance
const supabaseServiceFixed = new SupabaseServiceFixed();

// Export operations for backwards compatibility
export const caseOperations = {
  getAll: (filters?: CaseFilters) => supabaseServiceFixed.getCases(filters),
  getById: (id: string) => supabaseServiceFixed.getById(id),
  create: (caseData: Omit<CaseBooking, 'id' | 'submittedAt'>) => supabaseServiceFixed.createCase(caseData),
  update: (id: string, updates: Partial<CaseBooking>) => supabaseServiceFixed.updateCase(id, updates),
  updateStatus: (id: string, status: CaseStatus, processedBy: string, details?: string) => 
    supabaseServiceFixed.updateStatus(id, status, processedBy, details),
  delete: (id: string) => supabaseServiceFixed.deleteCase(id),
  addAmendment: async (caseId: string, amendedBy: string, changes: { field: string; oldValue: string; newValue: string }[]): Promise<CaseOperationsResult<boolean>> => {
    return await ErrorHandler.executeWithRetry(
      async () => {
        // Store amendment history in the database
        const amendmentRecord = {
          case_id: caseId,
          amended_by: amendedBy,
          amended_at: new Date().toISOString(),
          changes: JSON.stringify(changes),
          change_summary: changes.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join(', ')
        };

        const { error } = await supabase
          .from('amendment_history')
          .insert(amendmentRecord);

        if (error) throw error;
        return true;
      },
      {
        operation: 'Add Amendment',
        userMessage: 'Failed to record case amendment',
        showToast: true,
        showNotification: true,
        includeDetails: true,
        autoRetry: true,
        maxRetries: 3
      }
    );
  }
};

export const userOperations = {
  createUser: (userData: Omit<User, 'id'>) => supabaseServiceFixed.createUser(userData)
};

export const lookupOperations = {
  // Get countries - ALWAYS from Global only (consistent data model)
  getCountries: async (): Promise<CaseOperationsResult<any[]>> => {
    return await ErrorHandler.executeWithRetry(
      async () => {
        const { data, error } = await supabase
          .from('code_tables')
          .select('display_name, code')
          .eq('table_type', 'countries')
          .eq('country', 'Global') // Countries are ALWAYS Global
          .eq('is_active', true)
          .order('display_name');

        if (error) throw error;
        
        return data?.map(item => ({
          name: item.display_name,
          code: item.code || item.display_name.substring(0, 2).toUpperCase()
        })) || [];
      },
      {
        operation: 'Get Countries',
        userMessage: 'Failed to fetch countries',
        showToast: false,
        showNotification: false,
        includeDetails: true,
        autoRetry: true,
        maxRetries: 3
      }
    );
  },

  // Get case statuses - Global only (consistent data model)
  getCaseStatuses: async (): Promise<CaseOperationsResult<any[]>> => {
    return await ErrorHandler.executeWithRetry(
      async () => {
        const { data, error } = await supabase
          .from('code_tables')
          .select('*')
          .eq('table_type', 'case_statuses')
          .eq('country', 'Global') // Case statuses are ALWAYS Global
          .eq('is_active', true)
          .order('display_name');

        if (error) throw error;
        
        return data?.map(item => ({
          status_key: item.code,
          display_name: item.display_name,
          color: '#6c757d', // Default color - should be enhanced with metadata
          icon: 'circle',    // Default icon - should be enhanced with metadata  
          sort_order: 1      // Default order - should be enhanced with metadata
        })) || [];
      },
      {
        operation: 'Get Case Statuses',
        userMessage: 'Failed to fetch case statuses',
        showToast: false,
        showNotification: false,
        includeDetails: true,
        autoRetry: true,
        maxRetries: 3
      }
    );
  },

  // Get departments - ALWAYS country-specific, NEVER Global
  getDepartments: async (country?: string): Promise<CaseOperationsResult<any[]>> => {
    return await ErrorHandler.executeWithRetry(
      async () => {
        if (!country) {
          // If no country provided, return empty array (departments are country-specific)
          return [];
        }

        const { data, error } = await supabase
          .from('code_tables')
          .select('display_name')
          .eq('table_type', 'departments')
          .eq('country', country) // Departments are ONLY country-specific
          .eq('is_active', true)
          .order('display_name');

        if (error) throw error;
        
        return data?.map(item => ({
          name: item.display_name
        })) || [];
      },
      {
        operation: 'Get Departments',
        userMessage: 'Failed to fetch departments',
        showToast: false,
        showNotification: false,
        includeDetails: true,
        autoRetry: true,
        maxRetries: 3
      }
    );
  },

  // Get hospitals - ALWAYS country-specific, NEVER Global  
  getHospitals: async (country?: string): Promise<CaseOperationsResult<any[]>> => {
    return await ErrorHandler.executeWithRetry(
      async () => {
        if (!country) {
          // If no country provided, return empty array (hospitals are country-specific)
          return [];
        }

        const { data, error } = await supabase
          .from('code_tables')
          .select('display_name')
          .eq('table_type', 'hospitals')
          .eq('country', country) // Hospitals are ONLY country-specific
          .eq('is_active', true)
          .order('display_name');

        if (error) throw error;
        
        return data?.map(item => ({
          name: item.display_name
        })) || [];
      },
      {
        operation: 'Get Hospitals',
        userMessage: 'Failed to fetch hospitals',
        showToast: false,
        showNotification: false,
        includeDetails: true,
        autoRetry: true,
        maxRetries: 3
      }
    );
  },

  // Get procedure types - Country-specific with Global fallback (consistent data model)
  getProcedureTypes: async (country?: string, includeHidden = false): Promise<CaseOperationsResult<any[]>> => {
    return await ErrorHandler.executeWithRetry(
      async () => {
        let query = supabase
          .from('code_tables')
          .select('*')
          .eq('table_type', 'procedure_types')
          .order('display_name');

        // Apply consistent country filtering: country-specific first, then Global fallback
        if (country) {
          query = query.in('country', [country, 'Global']);
        } else {
          query = query.eq('country', 'Global');
        }

        if (!includeHidden) {
          query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        return data?.map(item => ({
          name: item.display_name,
          is_hidden: !item.is_active
        })) || [];
      },
      {
        operation: 'Get Procedure Types',
        userMessage: 'Failed to fetch procedure types',
        showToast: false,
        showNotification: false,
        includeDetails: true,
        autoRetry: true,
        maxRetries: 3
      }
    );
  },

  // Get surgery sets - Country-specific with Global fallback
  getSurgerySets: async (country?: string): Promise<CaseOperationsResult<any[]>> => {
    return await ErrorHandler.executeWithRetry(
      async () => {
        let query = supabase
          .from('code_tables')
          .select('display_name')
          .eq('table_type', 'surgery_sets')
          .eq('is_active', true)
          .order('display_name');

        // Apply consistent country filtering: country-specific first, then Global fallback
        if (country) {
          query = query.in('country', [country, 'Global']);
        } else {
          query = query.eq('country', 'Global');
        }

        const { data, error } = await query;
        if (error) throw error;
        
        return data?.map(item => ({
          name: item.display_name
        })) || [];
      },
      {
        operation: 'Get Surgery Sets',
        userMessage: 'Failed to fetch surgery sets',
        showToast: false,
        showNotification: false,
        includeDetails: true,
        autoRetry: true,
        maxRetries: 3
      }
    );
  },

  // Get implant boxes - Country-specific with Global fallback
  getImplantBoxes: async (country?: string): Promise<CaseOperationsResult<any[]>> => {
    return await ErrorHandler.executeWithRetry(
      async () => {
        let query = supabase
          .from('code_tables')
          .select('display_name')
          .eq('table_type', 'implant_boxes')
          .eq('is_active', true)
          .order('display_name');

        // Apply consistent country filtering: country-specific first, then Global fallback
        if (country) {
          query = query.in('country', [country, 'Global']);
        } else {
          query = query.eq('country', 'Global');
        }

        const { data, error } = await query;
        if (error) throw error;
        
        return data?.map(item => ({
          name: item.display_name
        })) || [];
      },
      {
        operation: 'Get Implant Boxes',
        userMessage: 'Failed to fetch implant boxes',
        showToast: false,
        showNotification: false,
        includeDetails: true,
        autoRetry: true,
        maxRetries: 3
      }
    );
  },

  // Get procedure mappings (surgery sets and implant boxes) - Fixed to use consistent parameters
  getProcedureMappings: async (procedureType?: string, country?: string): Promise<CaseOperationsResult<{surgerySets: string[], implantBoxes: string[]}>> => {
    return await ErrorHandler.executeWithRetry(
      async () => {
        // Get surgery sets with country-specific + Global fallback
        const surgerySetsResult = await lookupOperations.getSurgerySets(country);
        const implantBoxesResult = await lookupOperations.getImplantBoxes(country);
        
        return {
          surgerySets: surgerySetsResult.success ? surgerySetsResult.data?.map(item => item.name) || [] : [],
          implantBoxes: implantBoxesResult.success ? implantBoxesResult.data?.map(item => item.name) || [] : []
        };
      },
      {
        operation: 'Get Procedure Mappings',
        userMessage: 'Failed to fetch procedure mappings',
        showToast: false,
        showNotification: false,
        includeDetails: true,
        autoRetry: true,
        maxRetries: 3
      }
    );
  }
};

export const auditOperations = {
  // Production-ready audit logging with proper user traceability
  logAction: async (userId: string, action: string, category: string, entityId?: string, details?: string): Promise<void> => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      user_id: userId,
      action,
      category,
      entity_id: entityId,
      details,
      session_id: sessionStorage.getItem('session-token') || 'unknown',
      user_agent: navigator.userAgent,
      ip_address: 'client-side' // Would be populated server-side in production
    };
    
    try {
      // Store audit logs in Supabase audit table
      const { error } = await supabase
        .from('audit_logs')
        .insert(logEntry);
        
      if (error) {
        // Fallback to console logging if database insert fails
        console.warn('[AUDIT FALLBACK] Failed to store audit log:', error);
        console.log(`[AUDIT] ${action}:`, logEntry);
      } else {
        // Only log successful audit entries in production (reduce console noise)
        if (process.env.NODE_ENV === 'development') {
          console.log(`[AUDIT] ${action}:`, logEntry);
        }
      }
    } catch (error) {
      // Emergency fallback - always log to console if database is unreachable
      console.error('[AUDIT ERROR]', error);
      console.log(`[AUDIT FALLBACK] ${action}:`, logEntry);
    }
  }
};

export const subscriptions = {
  // Real-time subscriptions if needed for production
  subscribeToCaseUpdates: (callback: (payload: any) => void) => {
    return supabase
      .channel('case_bookings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_bookings'
        },
        callback
      )
      .subscribe();
  }
};

export default supabaseServiceFixed;