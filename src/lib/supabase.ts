import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          name: string
          role: 'admin' | 'operations' | 'operations-manager' | 'sales' | 'sales-manager' | 'driver' | 'it'
          departments: string[]
          countries: string[]
          selected_country: string | null
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          name: string
          role?: 'admin' | 'operations' | 'operations-manager' | 'sales' | 'sales-manager' | 'driver' | 'it'
          departments?: string[]
          countries?: string[]
          selected_country?: string | null
          enabled?: boolean
        }
        Update: {
          username?: string
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
          case_reference_number: string
          hospital: string
          department: string
          date_of_surgery: string
          procedure_type: string
          procedure_name: string
          doctor_name: string | null
          time_of_procedure: string | null
          surgery_set_selection: string[]
          implant_box: string[]
          special_instruction: string | null
          status: 'Case Booked' | 'Order Preparation' | 'Order Prepared' | 'Pending Delivery (Hospital)' | 'Delivered (Hospital)' | 'Case Completed' | 'Pending Delivery (Office)' | 'Delivered (Office)' | 'To be billed' | 'Case Closed' | 'Case Cancelled'
          submitted_by: string
          submitted_at: string
          processed_by: string | null
          processed_at: string | null
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
          status?: 'Case Booked' | 'Order Preparation' | 'Order Prepared' | 'Pending Delivery (Hospital)' | 'Delivered (Hospital)' | 'Case Completed' | 'Pending Delivery (Office)' | 'Delivered (Office)' | 'To be billed' | 'Case Closed' | 'Case Cancelled'
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
          status?: 'Case Booked' | 'Order Preparation' | 'Order Prepared' | 'Pending Delivery (Hospital)' | 'Delivered (Hospital)' | 'Case Completed' | 'Pending Delivery (Office)' | 'Delivered (Office)' | 'To be billed' | 'Case Closed' | 'Case Cancelled'
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
          case_id: string
          status: string
          timestamp: string
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
          user_id: string
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
    console.error('Error fetching profile:', error)
    return null
  }
  
  return profile
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Error signing out:', error)
    throw error
  }
}