// Supabase Storage Utilities for Case Booking
import { supabase } from '../lib/supabase'
import { CaseBooking, FilterOptions, StatusHistory, AmendmentHistory } from '../types'

// Case Management Functions

// Get all cases with filters
export const getCases = async (filters?: FilterOptions): Promise<CaseBooking[]> => {
  try {
    let query = supabase
      .from('case_bookings')
      .select(`
        *,
        submitted_by_profile:profiles!case_bookings_submitted_by_fkey(name, username),
        processed_by_profile:profiles!case_bookings_processed_by_fkey(name, username)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.country) {
      query = query.eq('country', filters.country)
    }
    if (filters?.hospital) {
      query = query.ilike('hospital', `%${filters.hospital}%`)
    }
    if (filters?.submitter) {
      query = query.ilike('submitted_by_profile.name', `%${filters.submitter}%`)
    }
    if (filters?.dateFrom) {
      query = query.gte('date_of_surgery', filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte('date_of_surgery', filters.dateTo)
    }
    if (filters?.search) {
      query = query.or(`
        case_reference_number.ilike.%${filters.search}%,
        hospital.ilike.%${filters.search}%,
        doctor_name.ilike.%${filters.search}%,
        procedure_name.ilike.%${filters.search}%
      `)
    }

    const { data, error } = await query

    if (error) throw error

    // Transform to match frontend interface
    return data.map(transformCaseFromDB)
  } catch (error) {
    console.error('Get cases error:', error)
    throw error
  }
}

// Get single case by ID
export const getCaseById = async (caseId: string): Promise<CaseBooking | null> => {
  try {
    const { data, error } = await supabase
      .from('case_bookings')
      .select(`
        *,
        submitted_by_profile:profiles!case_bookings_submitted_by_fkey(name, username),
        processed_by_profile:profiles!case_bookings_processed_by_fkey(name, username)
      `)
      .eq('id', caseId)
      .single()

    if (error) throw error
    if (!data) return null

    return transformCaseFromDB(data)
  } catch (error) {
    console.error('Get case by ID error:', error)
    return null
  }
}

// Create new case
export const saveCase = async (caseData: Omit<CaseBooking, 'id' | 'caseReferenceNumber' | 'submittedAt'>): Promise<CaseBooking> => {
  try {
    const { data, error } = await supabase
      .from('case_bookings')
      .insert({
        hospital: caseData.hospital,
        department: caseData.department,
        date_of_surgery: caseData.dateOfSurgery,
        procedure_type: caseData.procedureType,
        procedure_name: caseData.procedureName,
        doctor_name: caseData.doctorName,
        time_of_procedure: caseData.timeOfProcedure,
        surgery_set_selection: caseData.surgerySetSelection,
        implant_box: caseData.implantBox,
        special_instruction: caseData.specialInstruction,
        country: caseData.country,
        submitted_by: caseData.submittedBy
      })
      .select()
      .single()

    if (error) throw error

    return transformCaseFromDB(data)
  } catch (error) {
    console.error('Save case error:', error)
    throw error
  }
}

// Update case status
export const updateCaseStatus = async (
  caseId: string, 
  status: CaseBooking['status'], 
  processedBy: string, 
  details?: string
): Promise<void> => {
  try {
    // Update case
    const { error: caseError } = await supabase
      .from('case_bookings')
      .update({
        status,
        processed_by: processedBy,
        processed_at: new Date().toISOString(),
        ...(details && parseStatusDetails(status, details))
      })
      .eq('id', caseId)

    if (caseError) throw caseError

    // Add status history
    const { error: historyError } = await supabase
      .from('status_history')
      .insert({
        case_id: caseId,
        status,
        processed_by: processedBy,
        details
      })

    if (historyError) throw historyError
  } catch (error) {
    console.error('Update case status error:', error)
    throw error
  }
}

// Amend case
export const amendCase = async (
  caseId: string,
  amendments: Partial<CaseBooking>,
  amendedBy: string,
  reason?: string
): Promise<void> => {
  try {
    // Get current case for comparison
    const currentCase = await getCaseById(caseId)
    if (!currentCase) throw new Error('Case not found')

    // Build changes array
    const changes: { field: string; oldValue: string; newValue: string }[] = []
    
    Object.keys(amendments).forEach(key => {
      const field = key as keyof CaseBooking
      const oldValue = String(currentCase[field] || '')
      const newValue = String(amendments[field] || '')
      
      if (oldValue !== newValue) {
        changes.push({ field, oldValue, newValue })
      }
    })

    // Update case
    const { error: caseError } = await supabase
      .from('case_bookings')
      .update({
        ...transformCaseToDB(amendments),
        amended_by: amendedBy,
        amended_at: new Date().toISOString(),
        is_amended: true
      })
      .eq('id', caseId)

    if (caseError) throw caseError

    // Add amendment history
    const { error: historyError } = await supabase
      .from('amendment_history')
      .insert({
        case_id: caseId,
        amended_by: amendedBy,
        reason,
        changes
      })

    if (historyError) throw historyError
  } catch (error) {
    console.error('Amend case error:', error)
    throw error
  }
}

// Get status history for a case
export const getStatusHistory = async (caseId: string): Promise<StatusHistory[]> => {
  try {
    const { data, error } = await supabase
      .from('status_history')
      .select(`
        *,
        processed_by_profile:profiles!status_history_processed_by_fkey(name, username)
      `)
      .eq('case_id', caseId)
      .order('timestamp', { ascending: false })

    if (error) throw error

    return data.map(item => ({
      status: item.status as CaseBooking['status'],
      timestamp: item.timestamp,
      processedBy: item.processed_by_profile?.name || 'Unknown',
      details: item.details || undefined,
      attachments: item.attachments || undefined
    }))
  } catch (error) {
    console.error('Get status history error:', error)
    return []
  }
}

// Get amendment history for a case
export const getAmendmentHistory = async (caseId: string): Promise<AmendmentHistory[]> => {
  try {
    const { data, error } = await supabase
      .from('amendment_history')
      .select(`
        *,
        amended_by_profile:profiles!amendment_history_amended_by_fkey(name, username)
      `)
      .eq('case_id', caseId)
      .order('timestamp', { ascending: false })

    if (error) throw error

    return data.map(item => ({
      amendmentId: item.id,
      timestamp: item.timestamp,
      amendedBy: item.amended_by_profile?.name || 'Unknown',
      changes: item.changes,
      reason: item.reason || undefined
    }))
  } catch (error) {
    console.error('Get amendment history error:', error)
    return []
  }
}

// Generate case reference number
export const generateCaseReferenceNumber = async (): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('generate_case_reference')
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Generate case reference error:', error)
    // Fallback to timestamp-based reference
    const timestamp = Date.now()
    return `TMC${timestamp.toString().slice(-6).padStart(6, '0')}`
  }
}

// Helper functions

// Transform case from database format to frontend format
const transformCaseFromDB = (dbCase: any): CaseBooking => {
  return {
    id: dbCase.id,
    caseReferenceNumber: dbCase.case_reference_number,
    hospital: dbCase.hospital,
    department: dbCase.department,
    dateOfSurgery: dbCase.date_of_surgery,
    procedureType: dbCase.procedure_type,
    procedureName: dbCase.procedure_name,
    doctorName: dbCase.doctor_name,
    timeOfProcedure: dbCase.time_of_procedure,
    surgerySetSelection: dbCase.surgery_set_selection || [],
    implantBox: dbCase.implant_box || [],
    specialInstruction: dbCase.special_instruction,
    status: dbCase.status,
    submittedBy: dbCase.submitted_by_profile?.name || 'Unknown',
    submittedAt: dbCase.submitted_at,
    processedBy: dbCase.processed_by_profile?.name,
    processedAt: dbCase.processed_at,
    processOrderDetails: dbCase.process_order_details,
    country: dbCase.country,
    amendedBy: dbCase.amended_by,
    amendedAt: dbCase.amended_at,
    isAmended: dbCase.is_amended,
    deliveryImage: dbCase.delivery_image,
    deliveryDetails: dbCase.delivery_details,
    attachments: dbCase.attachments,
    orderSummary: dbCase.order_summary,
    doNumber: dbCase.do_number
  }
}

// Transform case from frontend format to database format
const transformCaseToDB = (frontendCase: Partial<CaseBooking>): any => {
  const dbCase: any = {}
  
  if (frontendCase.hospital !== undefined) dbCase.hospital = frontendCase.hospital
  if (frontendCase.department !== undefined) dbCase.department = frontendCase.department
  if (frontendCase.dateOfSurgery !== undefined) dbCase.date_of_surgery = frontendCase.dateOfSurgery
  if (frontendCase.procedureType !== undefined) dbCase.procedure_type = frontendCase.procedureType
  if (frontendCase.procedureName !== undefined) dbCase.procedure_name = frontendCase.procedureName
  if (frontendCase.doctorName !== undefined) dbCase.doctor_name = frontendCase.doctorName
  if (frontendCase.timeOfProcedure !== undefined) dbCase.time_of_procedure = frontendCase.timeOfProcedure
  if (frontendCase.surgerySetSelection !== undefined) dbCase.surgery_set_selection = frontendCase.surgerySetSelection
  if (frontendCase.implantBox !== undefined) dbCase.implant_box = frontendCase.implantBox
  if (frontendCase.specialInstruction !== undefined) dbCase.special_instruction = frontendCase.specialInstruction
  if (frontendCase.deliveryImage !== undefined) dbCase.delivery_image = frontendCase.deliveryImage
  if (frontendCase.deliveryDetails !== undefined) dbCase.delivery_details = frontendCase.deliveryDetails
  if (frontendCase.attachments !== undefined) dbCase.attachments = frontendCase.attachments
  if (frontendCase.orderSummary !== undefined) dbCase.order_summary = frontendCase.orderSummary
  if (frontendCase.doNumber !== undefined) dbCase.do_number = frontendCase.doNumber
  
  return dbCase
}

// Parse status-specific details
const parseStatusDetails = (status: CaseBooking['status'], details: string): any => {
  const updates: any = {}
  
  try {
    const parsedDetails = JSON.parse(details)
    
    if (status === 'Delivered (Hospital)' && parsedDetails.deliveryDetails !== undefined) {
      updates.delivery_details = parsedDetails.deliveryDetails
      updates.delivery_image = parsedDetails.deliveryImage
    } else if (status === 'Case Completed' && parsedDetails.attachments !== undefined) {
      updates.attachments = parsedDetails.attachments
      updates.order_summary = parsedDetails.orderSummary
      updates.do_number = parsedDetails.doNumber
    } else if (status === 'Order Prepared' || status === 'Order Preparation') {
      updates.process_order_details = details
    }
  } catch (error) {
    // If it's not JSON, treat as regular process details
    if (status === 'Order Prepared' || status === 'Order Preparation') {
      updates.process_order_details = details
    }
  }
  
  return updates
}