export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      amendment_history: {
        Row: {
          amended_by: string
          case_id: string
          changes: Json
          created_at: string | null
          id: string
          reason: string | null
          timestamp: string | null
        }
        Insert: {
          amended_by: string
          case_id: string
          changes: Json
          created_at?: string | null
          id?: string
          reason?: string | null
          timestamp?: string | null
        }
        Update: {
          amended_by?: string
          case_id?: string
          changes?: Json
          created_at?: string | null
          id?: string
          reason?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "amendment_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          category: string
          country: string | null
          created_at: string | null
          department: string | null
          details: string
          id: string
          ip_address: string
          metadata: Json | null
          status: string
          target: string
          timestamp: string
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          action: string
          category: string
          country?: string | null
          created_at?: string | null
          department?: string | null
          details: string
          id: string
          ip_address: string
          metadata?: Json | null
          status: string
          target: string
          timestamp: string
          user_id: string
          user_name: string
          user_role: string
        }
        Update: {
          action?: string
          category?: string
          country?: string | null
          created_at?: string | null
          department?: string | null
          details?: string
          id?: string
          ip_address?: string
          metadata?: Json | null
          status?: string
          target?: string
          timestamp?: string
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: []
      }
      case_booking_quantities: {
        Row: {
          case_booking_id: string
          created_at: string | null
          id: string
          item_name: string
          item_type: string
          quantity: number | null
          updated_at: string | null
        }
        Insert: {
          case_booking_id: string
          created_at?: string | null
          id?: string
          item_name: string
          item_type: string
          quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          case_booking_id?: string
          created_at?: string | null
          id?: string
          item_name?: string
          item_type?: string
          quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_booking_quantities_case_booking_id_fkey"
            columns: ["case_booking_id"]
            isOneToOne: false
            referencedRelation: "case_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      case_bookings: {
        Row: {
          amended_at: string | null
          amended_by: string | null
          attachments: string[] | null
          case_reference_number: string
          country: string
          created_at: string | null
          date_of_surgery: string
          delivery_details: string | null
          delivery_image: string | null
          department: string
          do_number: string | null
          doctor_id: string | null
          doctor_name: string | null
          hospital: string
          id: string
          implant_box: string[] | null
          is_amended: boolean | null
          order_summary: string | null
          procedure_name: string
          procedure_type: string
          process_order_details: string | null
          processed_at: string | null
          processed_by: string | null
          quantities_migrated: boolean | null
          special_instruction: string | null
          status: string | null
          submitted_at: string | null
          submitted_by: string
          surgery_set_selection: string[] | null
          time_of_procedure: string | null
          updated_at: string | null
        }
        Insert: {
          amended_at?: string | null
          amended_by?: string | null
          attachments?: string[] | null
          case_reference_number: string
          country: string
          created_at?: string | null
          date_of_surgery: string
          delivery_details?: string | null
          delivery_image?: string | null
          department: string
          do_number?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          hospital: string
          id?: string
          implant_box?: string[] | null
          is_amended?: boolean | null
          order_summary?: string | null
          procedure_name: string
          procedure_type: string
          process_order_details?: string | null
          processed_at?: string | null
          processed_by?: string | null
          quantities_migrated?: boolean | null
          special_instruction?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_by: string
          surgery_set_selection?: string[] | null
          time_of_procedure?: string | null
          updated_at?: string | null
        }
        Update: {
          amended_at?: string | null
          amended_by?: string | null
          attachments?: string[] | null
          case_reference_number?: string
          country?: string
          created_at?: string | null
          date_of_surgery?: string
          delivery_details?: string | null
          delivery_image?: string | null
          department?: string
          do_number?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          hospital?: string
          id?: string
          implant_box?: string[] | null
          is_amended?: boolean | null
          order_summary?: string | null
          procedure_name?: string
          procedure_type?: string
          process_order_details?: string | null
          processed_at?: string | null
          processed_by?: string | null
          quantities_migrated?: boolean | null
          special_instruction?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string
          surgery_set_selection?: string[] | null
          time_of_procedure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_bookings_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      case_counters: {
        Row: {
          country: string
          created_at: string | null
          current_counter: number | null
          id: string
          updated_at: string | null
          year: number
        }
        Insert: {
          country: string
          created_at?: string | null
          current_counter?: number | null
          id?: string
          updated_at?: string | null
          year: number
        }
        Update: {
          country?: string
          created_at?: string | null
          current_counter?: number | null
          id?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      code_tables: {
        Row: {
          code: string
          country: string | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          table_type: string
          updated_at: string | null
        }
        Insert: {
          code: string
          country?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          table_type: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          country?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          table_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_usage_aggregation: {
        Row: {
          country: string
          created_at: string | null
          department: string
          id: string
          item_name: string
          item_type: string
          total_quantity: number | null
          updated_at: string | null
          usage_date: string
        }
        Insert: {
          country: string
          created_at?: string | null
          department: string
          id?: string
          item_name: string
          item_type: string
          total_quantity?: number | null
          updated_at?: string | null
          usage_date: string
        }
        Update: {
          country?: string
          created_at?: string | null
          department?: string
          id?: string
          item_name?: string
          item_type?: string
          total_quantity?: number | null
          updated_at?: string | null
          usage_date?: string
        }
        Relationships: []
      }
      department_categorized_sets: {
        Row: {
          country: string
          created_at: string | null
          department_id: string | null
          id: string
          implant_box_id: string | null
          procedure_type: string
          surgery_set_id: string | null
          updated_at: string | null
        }
        Insert: {
          country: string
          created_at?: string | null
          department_id?: string | null
          id?: string
          implant_box_id?: string | null
          procedure_type: string
          surgery_set_id?: string | null
          updated_at?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          department_id?: string | null
          id?: string
          implant_box_id?: string | null
          procedure_type?: string
          surgery_set_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_categorized_sets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_categorized_sets_implant_box_id_fkey"
            columns: ["implant_box_id"]
            isOneToOne: false
            referencedRelation: "implant_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_categorized_sets_surgery_set_id_fkey"
            columns: ["surgery_set_id"]
            isOneToOne: false
            referencedRelation: "surgery_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      department_procedure_types: {
        Row: {
          country: string
          created_at: string | null
          department_id: string | null
          id: string
          is_active: boolean | null
          is_hidden: boolean | null
          procedure_type: string
          updated_at: string | null
        }
        Insert: {
          country: string
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          is_hidden?: boolean | null
          procedure_type: string
          updated_at?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          is_hidden?: boolean | null
          procedure_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_procedure_types_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code_table_id: string | null
          country: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code_table_id?: string | null
          country: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code_table_id?: string | null
          country?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_code_table_id_fkey"
            columns: ["code_table_id"]
            isOneToOne: false
            referencedRelation: "code_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_procedure_sets: {
        Row: {
          country: string
          created_at: string | null
          doctor_id: string
          id: string
          implant_box_id: string | null
          procedure_type: string
          surgery_set_id: string | null
          updated_at: string | null
        }
        Insert: {
          country: string
          created_at?: string | null
          doctor_id: string
          id?: string
          implant_box_id?: string | null
          procedure_type: string
          surgery_set_id?: string | null
          updated_at?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          doctor_id?: string
          id?: string
          implant_box_id?: string | null
          procedure_type?: string
          surgery_set_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_procedure_sets_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_procedure_sets_implant_box_id_fkey"
            columns: ["implant_box_id"]
            isOneToOne: false
            referencedRelation: "implant_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_procedure_sets_surgery_set_id_fkey"
            columns: ["surgery_set_id"]
            isOneToOne: false
            referencedRelation: "surgery_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_procedures: {
        Row: {
          country: string
          created_at: string | null
          doctor_id: string
          id: string
          is_active: boolean | null
          procedure_type: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          country: string
          created_at?: string | null
          doctor_id: string
          id?: string
          is_active?: boolean | null
          procedure_type: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          doctor_id?: string
          id?: string
          is_active?: boolean | null
          procedure_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_procedures_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          country: string
          created_at: string | null
          department_id: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          specialties: string[] | null
          updated_at: string | null
        }
        Insert: {
          country: string
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notification_rules: {
        Row: {
          conditions: Json | null
          country: string
          created_at: string | null
          enabled: boolean | null
          id: string
          recipients: Json
          status: string
          template: Json
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          country: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          recipients: Json
          status: string
          template: Json
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          country?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          recipients?: Json
          status?: string
          template?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      implant_boxes: {
        Row: {
          country: string
          created_at: string | null
          description: string | null
          doctor_id: string | null
          id: string
          is_active: boolean | null
          name: string
          procedure_type: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          country: string
          created_at?: string | null
          description?: string | null
          doctor_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          procedure_type?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          description?: string | null
          doctor_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          procedure_type?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "implant_boxes_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          browser_notifications: boolean | null
          case_booked: boolean | null
          case_cancelled: boolean | null
          case_closed: boolean | null
          case_completed: boolean | null
          created_at: string | null
          delivered_hospital: boolean | null
          delivered_office: boolean | null
          id: string
          order_preparation: boolean | null
          order_prepared: boolean | null
          pending_delivery_hospital: boolean | null
          pending_delivery_office: boolean | null
          to_be_billed: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          browser_notifications?: boolean | null
          case_booked?: boolean | null
          case_cancelled?: boolean | null
          case_closed?: boolean | null
          case_completed?: boolean | null
          created_at?: string | null
          delivered_hospital?: boolean | null
          delivered_office?: boolean | null
          id?: string
          order_preparation?: boolean | null
          order_prepared?: boolean | null
          pending_delivery_hospital?: boolean | null
          pending_delivery_office?: boolean | null
          to_be_billed?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          browser_notifications?: boolean | null
          case_booked?: boolean | null
          case_cancelled?: boolean | null
          case_closed?: boolean | null
          case_completed?: boolean | null
          created_at?: string | null
          delivered_hospital?: boolean | null
          delivered_office?: boolean | null
          id?: string
          order_preparation?: boolean | null
          order_prepared?: boolean | null
          pending_delivery_hospital?: boolean | null
          pending_delivery_office?: boolean | null
          to_be_billed?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          duration: number | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          allowed: boolean | null
          created_at: string | null
          id: string
          resource: string
          role: string
        }
        Insert: {
          action: string
          allowed?: boolean | null
          created_at?: string | null
          id?: string
          resource: string
          role: string
        }
        Update: {
          action?: string
          allowed?: boolean | null
          created_at?: string | null
          id?: string
          resource?: string
          role?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          countries: string[] | null
          created_at: string | null
          departments: string[] | null
          email: string | null
          enabled: boolean | null
          id: string
          is_temporary_password: boolean | null
          name: string
          password_changed_at: string | null
          password_hash: string
          password_reset_at: string | null
          role: string
          selected_country: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          countries?: string[] | null
          created_at?: string | null
          departments?: string[] | null
          email?: string | null
          enabled?: boolean | null
          id?: string
          is_temporary_password?: boolean | null
          name: string
          password_changed_at?: string | null
          password_hash: string
          password_reset_at?: string | null
          role: string
          selected_country?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          countries?: string[] | null
          created_at?: string | null
          departments?: string[] | null
          email?: string | null
          enabled?: boolean | null
          id?: string
          is_temporary_password?: boolean | null
          name?: string
          password_changed_at?: string | null
          password_hash?: string
          password_reset_at?: string | null
          role?: string
          selected_country?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      status_history: {
        Row: {
          attachments: string[] | null
          case_id: string
          created_at: string | null
          details: string | null
          id: string
          processed_by: string
          status: string
          timestamp: string | null
        }
        Insert: {
          attachments?: string[] | null
          case_id: string
          created_at?: string | null
          details?: string | null
          id?: string
          processed_by: string
          status: string
          timestamp?: string | null
        }
        Update: {
          attachments?: string[] | null
          case_id?: string
          created_at?: string | null
          details?: string | null
          id?: string
          processed_by?: string
          status?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      surgery_sets: {
        Row: {
          country: string
          created_at: string | null
          description: string | null
          doctor_id: string | null
          id: string
          is_active: boolean | null
          name: string
          procedure_type: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          country: string
          created_at?: string | null
          description?: string | null
          doctor_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          procedure_type?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          description?: string | null
          doctor_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          procedure_type?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surgery_sets_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          session_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          session_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          session_token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      migrate_essential_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const