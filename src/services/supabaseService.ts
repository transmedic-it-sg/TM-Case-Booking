import { supabase } from './supabase'
import type { 
  CaseBooking, 
  User, 
  Notification
} from '../types'

// AuditLogEntry interface definition since it's not in types
export interface AuditLogEntry {
  id: string
  timestamp: string
  user: string
  action: string
  category: string
  target: string
  details: string
  ipAddress?: string
  status: 'success' | 'warning' | 'error'
}

// =============================================================================
// TYPE DEFINITIONS FOR SUPABASE TABLES
// =============================================================================

export interface Country {
  id: string
  code: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: string
  display_name: string
  description: string
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CaseStatus {
  id: string
  status_key: string
  display_name: string
  description: string
  color: string
  icon: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Hospital {
  id: string
  name: string
  country_id: string
  department_id: string
  is_active: boolean
  created_at: string
}

export interface Department {
  id: string
  name: string
  country_id: string
  is_active: boolean
  created_at: string
}

export interface ProcedureType {
  id: string
  name: string
  country_id: string
  is_active: boolean
  is_hidden: boolean
  created_at: string
}

export interface SurgerySet {
  id: string
  name: string
  country_id: string
  is_active: boolean
  created_at: string
}

export interface ImplantBox {
  id: string
  name: string
  country_id: string
  is_active: boolean
  created_at: string
}

// =============================================================================
// COUNTRY OPERATIONS
// =============================================================================

export const countryOperations = {
  async getAll(): Promise<Country[]> {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    return data || []
  },

  async getByCode(code: string): Promise<Country | null> {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  }
}


// =============================================================================
// USER OPERATIONS
// =============================================================================

export const userOperations = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        role:roles(name, display_name),
        selected_country:countries(code, name),
        user_departments(department_name),
        user_countries(country:countries(code, name))
      `)
      .eq('enabled', true)
      .order('name')
    
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        role:roles(name, display_name),
        selected_country:countries(code, name),
        user_departments(department_name),
        user_countries(country:countries(code, name))
      `)
      .eq('id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    // First create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email!,
      password: 'TempPassword123!', // Should be changed on first login
      options: {
        data: {
          name: userData.name,
          username: userData.username
        }
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create auth user')

    // Get role ID
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', userData.role)
      .single()

    if (roleError) throw roleError

    // Create user profile
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        username: userData.username,
        name: userData.name,
        email: userData.email!,
        role_id: roleData.id,
        enabled: userData.enabled ?? true
      })
      .select()
      .single()

    if (error) throw error

    // Add departments and countries
    if (userData.departments?.length) {
      const countryId = await this.getCountryIdByName(userData.countries?.[0] || 'Singapore')
      const deptInserts = userData.departments.map(dept => ({
        user_id: authData.user!.id,
        department_name: dept,
        country_id: countryId
      }))
      
      await supabase.from('user_departments').insert(deptInserts)
    }

    if (userData.countries?.length) {
      const countryInserts = await Promise.all(
        userData.countries.map(async (countryName) => {
          const countryId = await this.getCountryIdByName(countryName)
          return {
            user_id: authData.user!.id,
            country_id: countryId
          }
        })
      )
      
      await supabase.from('user_countries').insert(countryInserts)
    }

    return data
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getCountryIdByName(countryName: string): Promise<string> {
    const { data, error } = await supabase
      .from('countries')
      .select('id')
      .eq('name', countryName)
      .single()

    if (error) throw error
    return data.id
  }
}

// =============================================================================
// CASE OPERATIONS
// =============================================================================

export const caseOperations = {
  async getAll(filters?: {
    country?: string
    status?: string
    submitter?: string
    hospital?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<CaseBooking[]> {
    let query = supabase
      .from('case_bookings')
      .select(`
        *,
        hospital:hospitals(name),
        procedure_type:procedure_types(name),
        status:case_statuses(status_key, display_name, color, icon),
        submitted_by_user:users!cases_submitted_by_fkey(name),
        processed_by_user:users!cases_processed_by_fkey(name),
        country:countries(code, name),
        case_surgery_sets(surgery_set_name),
        case_implant_boxes(implant_box_name),
        case_status_history(
          status_key,
          timestamp,
          processed_by_user:users(name),
          details,
          attachments(file_name, file_path)
        ),
        amendment_history(
          amendment_id,
          timestamp,
          amended_by_user:users(name),
          changes,
          reason
        ),
        attachments(file_name, file_path, file_type, uploaded_at, is_delivery_image)
      `)
      .order('created_at', { ascending: false })

    if (filters?.country) {
      const { data: countryData } = await supabase
        .from('countries')
        .select('id')
        .eq('name', filters.country)
        .single()
      
      if (countryData) {
        query = query.eq('country_id', countryData.id)
      }
    }

    if (filters?.status) {
      const { data: statusData } = await supabase
        .from('case_statuses')
        .select('id')
        .eq('status_key', filters.status)
        .single()
      
      if (statusData) {
        query = query.eq('status_id', statusData.id)
      }
    }

    if (filters?.submitter) {
      query = query.eq('submitted_by', filters.submitter)
    }

    if (filters?.dateFrom) {
      query = query.gte('date_of_surgery', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('date_of_surgery', filters.dateTo)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<CaseBooking | null> {
    const { data, error } = await supabase
      .from('case_bookings')
      .select(`
        *,
        hospital:hospitals(name),
        procedure_type:procedure_types(name),
        status:case_statuses(status_key, display_name, color, icon),
        submitted_by_user:users!cases_submitted_by_fkey(name),
        processed_by_user:users!cases_processed_by_fkey(name),
        country:countries(code, name),
        case_surgery_sets(surgery_set_name),
        case_implant_boxes(implant_box_name),
        case_status_history(
          status_key,
          timestamp,
          processed_by_user:users(name),
          details,
          attachments(file_name, file_path)
        ),
        amendment_history(*),
        attachments(*)
      `)
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  async create(caseData: Omit<CaseBooking, 'id' | 'created_at' | 'updated_at'>): Promise<CaseBooking> {
    // Get country ID
    const countryId = await this.getCountryIdByName(caseData.country)
    
    // Get hospital ID
    const { data: hospitalData } = await supabase
      .from('hospitals')
      .select('id')
      .eq('name', caseData.hospital)
      .eq('country_id', countryId)
      .single()

    // Get procedure type ID  
    const { data: procedureData } = await supabase
      .from('procedure_types')
      .select('id')
      .eq('name', caseData.procedureType)
      .eq('country_id', countryId)
      .single()

    // Get status ID
    const { data: statusData } = await supabase
      .from('case_statuses')
      .select('id')
      .eq('status_key', caseData.status)
      .single()

    // Generate case reference number
    const { data: refNumber } = await supabase.rpc('generate_case_reference_number', {
      p_country_id: countryId
    })

    // Create case
    const { data, error } = await supabase
      .from('case_bookings')
      .insert({
        case_reference_number: refNumber,
        hospital_id: hospitalData?.id,
        department_name: caseData.department,
        date_of_surgery: caseData.dateOfSurgery,
        procedure_type_id: procedureData?.id,
        procedure_name: caseData.procedureName,
        doctor_name: caseData.doctorName,
        time_of_procedure: caseData.timeOfProcedure,
        special_instruction: caseData.specialInstruction,
        status_id: statusData?.id,
        submitted_by: caseData.submittedBy,
        country_id: countryId
      })
      .select()
      .single()

    if (error) throw error

    // Add surgery sets
    if (caseData.surgerySetSelection?.length) {
      const setsInserts = caseData.surgerySetSelection.map(setName => ({
        case_id: data.id,
        surgery_set_name: setName
      }))
      
      await supabase.from('case_surgery_sets').insert(setsInserts)
    }

    // Add implant boxes
    if (caseData.implantBox?.length) {
      const boxesInserts = caseData.implantBox.map(boxName => ({
        case_id: data.id,
        implant_box_name: boxName
      }))
      
      await supabase.from('case_implant_boxes').insert(boxesInserts)
    }

    // Add initial status history
    await this.addStatusHistory(data.id, caseData.status, caseData.submittedBy, 'Case created')

    return data
  },

  async update(id: string, updates: Partial<CaseBooking>): Promise<CaseBooking> {
    const { data, error } = await supabase
      .from('case_bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateStatus(
    caseId: string, 
    newStatus: string, 
    processedBy: string, 
    details?: string
  ): Promise<void> {
    const { data: statusData } = await supabase
      .from('case_statuses')
      .select('id')
      .eq('status_key', newStatus)
      .single()

    if (!statusData) throw new Error(`Status ${newStatus} not found`)

    // Update case status
    await supabase
      .from('case_bookings')
      .update({ 
        status_id: statusData.id,
        processed_by: processedBy,
        processed_at: new Date().toISOString()
      })
      .eq('id', caseId)

    // Add status history
    await this.addStatusHistory(caseId, newStatus, processedBy, details)
  },

  async addStatusHistory(
    caseId: string,
    status: string,
    processedBy: string,
    details?: string
  ): Promise<void> {
    const { data: statusData } = await supabase
      .from('case_statuses')
      .select('id')
      .eq('status_key', status)
      .single()

    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', processedBy)
      .single()

    await supabase
      .from('status_history')
      .insert({
        case_id: caseId,
        status_id: statusData?.id,
        status_key: status,
        processed_by: processedBy,
        user_name: userData?.name,
        details
      })
  },

  async addAmendment(
    caseId: string,
    amendedBy: string,
    changes: Array<{field: string, oldValue: string, newValue: string}>,
    reason?: string
  ): Promise<void> {
    const amendmentId = `AMD-${Date.now()}`
    
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', amendedBy)
      .single()

    await supabase
      .from('amendment_history')
      .insert({
        case_id: caseId,
        amendment_id: amendmentId,
        amended_by: amendedBy,
        amended_by_name: userData?.name,
        changes,
        reason
      })

    // Update case amended flags
    await supabase
      .from('case_bookings')
      .update({
        is_amended: true,
        amended_by: amendedBy,
        amended_at: new Date().toISOString()
      })
      .eq('id', caseId)
  },

  async getCountryIdByName(countryName: string): Promise<string> {
    const { data, error } = await supabase
      .from('countries')
      .select('id')
      .eq('name', countryName)
      .single()

    if (error) throw error
    return data.id
  }
}

// =============================================================================
// LOOKUP DATA OPERATIONS
// =============================================================================

export const lookupOperations = {
  async getCountries(): Promise<Country[]> {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    return data || []
  },

  async getHospitals(countryName?: string): Promise<Hospital[]> {
    let query = supabase
      .from('hospitals')
      .select(`
        *,
        country:countries(name),
        department:departments(name)
      `)
      .eq('is_active', true)
      .order('name')

    if (countryName) {
      const { data: countryData } = await supabase
        .from('countries')
        .select('id')
        .eq('name', countryName)
        .single()
      
      if (countryData) {
        query = query.eq('country_id', countryData.id)
      }
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getDepartments(countryName?: string): Promise<Department[]> {
    let query = supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (countryName) {
      const countryId = await userOperations.getCountryIdByName(countryName)
      query = query.eq('country_id', countryId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getProcedureTypes(countryName?: string, includeHidden = false): Promise<ProcedureType[]> {
    let query = supabase
      .from('procedure_types')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (!includeHidden) {
      query = query.eq('is_hidden', false)
    }

    if (countryName) {
      const countryId = await userOperations.getCountryIdByName(countryName)
      query = query.eq('country_id', countryId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getSurgerySets(countryName?: string): Promise<SurgerySet[]> {
    let query = supabase
      .from('surgery_sets')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (countryName) {
      const countryId = await userOperations.getCountryIdByName(countryName)
      query = query.eq('country_id', countryId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getImplantBoxes(countryName?: string): Promise<ImplantBox[]> {
    let query = supabase
      .from('implant_boxes')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (countryName) {
      const countryId = await userOperations.getCountryIdByName(countryName)
      query = query.eq('country_id', countryId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getCaseStatuses(): Promise<CaseStatus[]> {
    const { data, error } = await supabase
      .from('case_statuses')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw error
    return data || []
  },

  async getProcedureMappings(procedureTypeName: string, countryName: string) {
    const countryId = await userOperations.getCountryIdByName(countryName)
    
    const { data: procedureData } = await supabase
      .from('procedure_types')
      .select('id')
      .eq('name', procedureTypeName)
      .eq('country_id', countryId)
      .single()

    if (!procedureData) return { surgerySets: [], implantBoxes: [] }

    const { data, error } = await supabase
      .from('procedure_mappings')
      .select(`
        surgery_set:surgery_sets(name),
        implant_box:implant_boxes(name)
      `)
      .eq('procedure_type_id', procedureData.id)
      .eq('country_id', countryId)

    if (error) throw error

    const surgerySetNames = data?.map((item: any) => item.surgery_set?.name).filter(Boolean) || []
    const implantBoxNames = data?.map((item: any) => item.implant_box?.name).filter(Boolean) || []
    const surgerySets = Array.from(new Set(surgerySetNames))
    const implantBoxes = Array.from(new Set(implantBoxNames))

    return { surgerySets, implantBoxes }
  }
}

// =============================================================================
// NOTIFICATION OPERATIONS
// =============================================================================

export const notificationOperations = {
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async createNotification(
    userId: string,
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    duration?: number
  ): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        duration
      })

    if (error) throw error
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) throw error
  }
}

// =============================================================================
// AUDIT LOG OPERATIONS
// =============================================================================

export const auditOperations = {
  async logAction(
    userId: string,
    action: string,
    category: string,
    target?: string,
    details?: string,
    status: 'success' | 'warning' | 'error' = 'success'
  ): Promise<void> {
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single()

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        user_name: userData?.name,
        action,
        category,
        target,
        details,
        status
      })

    if (error) throw error
  },

  async getAuditLogs(filters?: {
    userId?: string
    category?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<AuditLogEntry[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }
}

// =============================================================================
// FILE OPERATIONS
// =============================================================================

export const fileOperations = {
  async uploadCaseAttachment(
    caseId: string,
    file: File,
    uploadedBy: string,
    isDeliveryImage = false
  ): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${caseId}/${Date.now()}.${fileExt}`
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('case-attachments')
      .upload(fileName, file)

    if (error) throw error

    // Save attachment metadata
    await supabase
      .from('attachments')
      .insert({
        case_id: caseId,
        file_name: file.name,
        file_path: data.path,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: uploadedBy,
        is_delivery_image: isDeliveryImage
      })

    return data.path
  },

  async getCaseAttachments(caseId: string) {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('case_id', caseId)
      .order('uploaded_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getFileUrl(filePath: string): Promise<string> {
    const { data } = supabase.storage
      .from('case-attachments')
      .getPublicUrl(filePath)

    return data.publicUrl
  }
}

// =============================================================================
// REAL-TIME SUBSCRIPTIONS
// =============================================================================

export const subscriptions = {
  subscribeToCases(callback: (payload: any) => void) {
    return supabase
      .channel('cases')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, callback)
      .subscribe()
  },

  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  }
}

const supabaseService = {
  countryOperations,
  userOperations,
  caseOperations,
  lookupOperations,
  notificationOperations,
  auditOperations,
  fileOperations,
  subscriptions
};

export default supabaseService;