/**
 * ⚠️ CRITICAL: Uses comprehensive field mappings to prevent database field naming issues
 * 
 * FIELD MAPPING RULES:
 * - Database fields: snake_case (e.g., date_of_surgery, case_booking_id)
 * - TypeScript interfaces: camelCase (e.g., dateOfSurgery, caseBookingId)
 * - ALWAYS use fieldMappings.ts utility instead of hardcoded field names
 * 
 * NEVER use: case_date → USE: date_of_surgery
 * NEVER use: procedure → USE: procedure_type
 * NEVER use: caseId → USE: case_booking_id
 */

import { createClient } from '@supabase/supabase-js'

// Supabase configuration with fallback for localhost
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'http://localhost:54321' // Fallback URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'fake-key-for-localhost' // Fallback key

// Check if Supabase is properly configured
const isSupabaseConfigured =
  process.env.REACT_APP_SUPABASE_URL &&
  process.env.REACT_APP_SUPABASE_ANON_KEY &&
  !process.env.REACT_APP_SUPABASE_URL.includes('your-project-id')

// Create Supabase client with enhanced session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: {
      // Use localStorage for better persistence across refreshes
      getItem: (key) => {
        if (typeof window !== 'undefined') {
          return window.localStorage.getItem(key);
        }
        return null;
      },
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
      }
    },
    storageKey: 'tm-case-booking-auth',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  }
})

// Export configuration status
export { isSupabaseConfigured }

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          password_hash: string | null
          name: string
          role: 'admin' | 'operations' | 'operations-manager' | 'sales' | 'sales-manager' | 'driver' | 'it'
          departments: string[]
          countries: string[]
          selected_country: string | null // ⚠️ selected_country (selectedCountry)
          enabled: boolean
          created_at: string // ⚠️ created_at (createdAt)
          updated_at: string // ⚠️ updated_at (updatedAt)
        }
        Insert: {
          id: string
          username: string
          password_hash?: string
          name: string
          role?: 'admin' | 'operations' | 'operations-manager' | 'sales' | 'sales-manager' | 'driver' | 'it'
          departments?: string[]
          countries?: string[]
          selected_country?: string | null
          enabled?: boolean
        }
        Update: {
          username?: string
          password_hash?: string
          name?: string
          role?: 'admin' | 'operations' | 'operations-manager' | 'sales' | 'sales-manager' | 'driver' | 'it'
          departments?: string[]
          countries?: string[]
          selected_country?: string | null
          enabled?: boolean
        }
      }
      case_bookings: {
        Row: {
          id: string
          case_reference_number: string // ⚠️ case_reference_number (caseReferenceNumber)
          hospital: string
          department: string
          date_of_surgery: string // ⚠️ date_of_surgery (dateOfSurgery) - NOT case_date
          procedure_type: string // ⚠️ procedure_type (procedureType) - NOT procedure
          procedure_name: string // ⚠️ procedure_name (procedureName)
          doctor_name: string | null // ⚠️ doctor_name (doctorName)
          time_of_procedure: string | null
          surgery_set_selection: string[] // ⚠️ surgery_set_selection (surgerySetSelection)
          implant_box: string[] // ⚠️ implant_box (implantBox)
          special_instruction: string | null // ⚠️ special_instruction (specialInstruction)
          status: 'Case Booked' | 'Preparing Order' | 'Order Prepared' | 'Pending Delivery (Hospital)' | 'Delivered (Hospital)' | 'Case Completed' | 'Pending Delivery (Office)' | 'Delivered (Office)' | 'To be billed' | 'Case Closed' | 'Case Cancelled'
          submitted_by: string
          submitted_at: string
          processed_by: string | null // ⚠️ processed_by (processedBy)
          processed_at: string | null // ⚠️ processed_at (processedAt)
          process_order_details: string | null
          country: string
          amended_by: string | null
          amended_at: string | null
          is_amended: boolean
          delivery_image: string | null
          delivery_details: string | null
          attachments: string[] | null
          order_summary: string | null
          do_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          case_reference_number?: string
          hospital: string
          department: string
          date_of_surgery: string
          procedure_type: string
          procedure_name: string
          doctor_name?: string | null
          time_of_procedure?: string | null
          surgery_set_selection?: string[]
          implant_box?: string[]
          special_instruction?: string | null
          status?: 'Case Booked' | 'Preparing Order' | 'Order Prepared' | 'Pending Delivery (Hospital)' | 'Delivered (Hospital)' | 'Case Completed' | 'Pending Delivery (Office)' | 'Delivered (Office)' | 'To be billed' | 'Case Closed' | 'Case Cancelled'
          submitted_by: string
          country: string
        }
        Update: {
          hospital?: string
          department?: string
          date_of_surgery?: string
          procedure_type?: string
          procedure_name?: string
          doctor_name?: string | null
          time_of_procedure?: string | null
          surgery_set_selection?: string[]
          implant_box?: string[]
          special_instruction?: string | null
          status?: 'Case Booked' | 'Preparing Order' | 'Order Prepared' | 'Pending Delivery (Hospital)' | 'Delivered (Hospital)' | 'Case Completed' | 'Pending Delivery (Office)' | 'Delivered (Office)' | 'To be billed' | 'Case Closed' | 'Case Cancelled'
          processed_by?: string | null
          processed_at?: string | null
          process_order_details?: string | null
          amended_by?: string | null
          amended_at?: string | null
          is_amended?: boolean
          delivery_image?: string | null
          delivery_details?: string | null
          attachments?: string[] | null
          order_summary?: string | null
          do_number?: string | null
        }
      }
      status_history: {
        Row: {
          id: string
          case_id: string // ⚠️ case_id (caseId) FK to case_bookings
          status: string
          timestamp: string // ⚠️ timestamp field
          processed_by: string
          details: string | null
          attachments: string[] | null
          created_at: string
        }
        Insert: {
          case_id: string
          status: string
          processed_by: string
          details?: string | null
          attachments?: string[] | null
          timestamp?: string
        }
        Update: {
          details?: string | null
          attachments?: string[] | null
        }
      }
      amendment_history: {
        Row: {
          id: string
          case_id: string
          amended_by: string
          timestamp: string
          reason: string | null
          changes: any
          created_at: string
        }
        Insert: {
          case_id: string
          amended_by: string
          reason?: string | null
          changes: any
          timestamp?: string
        }
        Update: {
          reason?: string | null
          changes?: any
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string // ⚠️ user_id (userId) FK - NOT userid
          type: 'success' | 'error' | 'warning' | 'info'
          title: string
          message: string
          read: boolean
          duration: number
          created_at: string
        }
        Insert: {
          user_id: string
          type?: 'success' | 'error' | 'warning' | 'info'
          title: string
          message: string
          read?: boolean
          duration?: number
        }
        Update: {
          read?: boolean
        }
      }
      code_tables: {
        Row: {
          id: string
          country: string | null
          table_type: string
          code: string
          display_name: string
          is_active: boolean // ⚠️ is_active (isActive)
          created_at: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          table_type: string
          code: string
          display_name: string
          is_active?: boolean
        }
        Update: {
          country?: string | null
          table_type?: string
          code?: string
          display_name?: string
          is_active?: boolean
        }
      }
      departments: {
        Row: {
          id: string
          name: string
          country: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          country: string
          is_active?: boolean
        }
        Update: {
          name?: string
          country?: string
          is_active?: boolean
        }
      }
      surgery_sets: {
        Row: {
          id: string
          name: string
          country: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          country?: string | null
          is_active?: boolean
        }
        Update: {
          name?: string
          country?: string | null
          is_active?: boolean
        }
      }
      implant_boxes: {
        Row: {
          id: string
          name: string
          country: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          country?: string | null
          is_active?: boolean
        }
        Update: {
          name?: string
          country?: string | null
          is_active?: boolean
        }
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: any
          description: string | null
          updated_by: string
          updated_at: string
          created_at: string
        }
        Insert: {
          key: string
          value: any
          description?: string | null
          updated_by: string
        }
        Update: {
          key?: string
          value?: any
          description?: string | null
          updated_by?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          table_name: string | null
          record_id: string | null
          old_data: any | null
          new_data: any | null
          ip_address: string | null
          user_agent: string | null
          timestamp: string
          created_at: string
        }
        Insert: {
          user_id: string
          action: string
          table_name?: string | null
          record_id?: string | null
          old_data?: any | null
          new_data?: any | null
          ip_address?: string | null
          user_agent?: string | null
          timestamp?: string
        }
        Update: {
          user_id?: string
          action?: string
          table_name?: string | null
          record_id?: string | null
          old_data?: any | null
          new_data?: any | null
          ip_address?: string | null
          user_agent?: string | null
          timestamp?: string
        }
      }
      permissions: {
        Row: {
          id: string
          role: string
          action: string
          resource: string
          allowed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          role: string
          action: string
          resource: string
          allowed?: boolean
        }
        Update: {
          role?: string
          action?: string
          resource?: string
          allowed?: boolean
        }
      }
      department_procedure_types: {
        Row: {
          id: string
          department_id: string
          procedure_type: string
          country: string
          created_at: string
        }
        Insert: {
          department_id: string
          procedure_type: string
          country: string
        }
        Update: {
          department_id?: string
          procedure_type?: string
          country?: string
        }
      }
      department_categorized_sets: {
        Row: {
          id: string
          department_id: string
          procedure_type: string
          surgery_set_id: string | null
          implant_box_id: string | null
          country: string
          created_at: string
        }
        Insert: {
          department_id: string
          procedure_type: string
          surgery_set_id?: string | null
          implant_box_id?: string | null
          country: string
        }
        Update: {
          department_id?: string
          procedure_type?: string
          surgery_set_id?: string | null
          implant_box_id?: string | null
          country?: string
        }
      }
      cache_versions: {
        Row: {
          id: string
          cache_type: string
          version: string
          country: string | null
          updated_at: string
          created_at: string
        }
        Insert: {
          cache_type: string
          version: string
          country?: string | null
        }
        Update: {
          cache_type?: string
          version?: string
          country?: string | null
        }
      }
      app_settings: {
        Row: {
          id: string
          user_id: string | null
          setting_key: string // ⚠️ setting_key (settingKey) - NOT settingkey
          setting_value: any // ⚠️ setting_value (settingValue) - NOT settingvalue
          description?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          setting_key: string
          setting_value: any
          description?: string | null
        }
        Update: {
          setting_value?: any
          description?: string | null
          updated_at?: string
        }
      }
    }
  }
}

// Auth helper functions
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const getCurrentProfile = async () => {
  const user = await getCurrentUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    return null
  }

  return profile
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}