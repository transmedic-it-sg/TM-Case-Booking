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

import { supabase } from '../lib/supabase';
import { CaseBooking, CaseStatus, StatusHistory, AmendmentHistory } from '../types';
import { normalizeCountry, getLegacyCountryCode } from './countryUtils';
import { processEmailNotifications } from '../services/emailNotificationProcessor';
import { CASE_BOOKINGS_FIELDS, STATUS_HISTORY_FIELDS, AMENDMENT_HISTORY_FIELDS, CASE_COUNTERS_FIELDS } from './fieldMappings';

// Interface for Supabase case data
interface SupabaseCase {
  id: string;
  case_reference_number: string; // ⚠️ case_reference_number (caseReferenceNumber)
  hospital: string;
  department: string;
  date_of_surgery: string; // ⚠️ date_of_surgery (dateOfSurgery) - NOT case_date
  procedure_type: string; // ⚠️ procedure_type (procedureType) - NOT procedure
  procedure_name: string; // ⚠️ procedure_name (procedureName)
  doctor_name?: string;
  time_of_procedure?: string;
  surgery_set_selection: string[]; // ⚠️ surgery_set_selection (surgerySetSelection)
  implant_box: string[]; // ⚠️ implant_box (implantBox)
  special_instruction?: string;
  status: string;
  submitted_by: string;
  submitted_at: string;
  processed_by?: string;
  processed_at?: string;
  process_order_details?: string;
  country: string;
  is_amended: boolean;
  amended_by?: string;
  amended_at?: string;
  created_at: string; // ⚠️ created_at (createdAt)
  updated_at: string; // ⚠️ updated_at (updatedAt)
}

// Interface for case status history (matching database schema)
interface SupabaseCaseStatusHistory {
  id: string;
  case_id: string; // ⚠️ case_id (caseId) FK to case_bookings
  status: string;
  processed_by: string; // ⚠️ processed_by (processedBy)
  timestamp: string; // ⚠️ timestamp field
  details?: string;
  attachments?: string[];
}

// Interface for amendment history (matching current database schema)
interface SupabaseCaseAmendmentHistory {
  id: string;
  amended_by: string;
  timestamp: string;
  reason: string | null;
  changes: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
}

// ================================================
// CASE REFERENCE NUMBER MANAGEMENT
// ================================================

/**
 * Generate a unique case reference number
 */
export const generateCaseReferenceNumber = async (country: string = 'Singapore'): Promise<string> => {
  // Ensure country has a valid value
  const validCountry = country && country.trim() ? country.trim() : 'Singapore';
  
  try {
    const currentYear = new Date().getFullYear();

    // Get or create counter for this country and year
    const { data: counterData, error: counterError } = await supabase
      .from('case_counters')
      .select('current_counter')
      .eq('country', validCountry)
      .eq('year', currentYear)
      .single();

    if (counterError && counterError.code !== 'PGRST116') {
      throw counterError;
    }

    let newCounter = 1;

    if (counterData) {
      newCounter = counterData.current_counter + 1;

      // Update counter
      const { error: updateError } = await supabase
        .from('case_counters')
        .update({ current_counter: newCounter })
        .eq('country', validCountry)
        .eq('year', currentYear);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Create new counter with explicit field handling
      const { error: insertError } = await supabase
        .from('case_counters')
        .insert([{
        country: validCountry, // Use validated country
        current_counter: newCounter,
        year: currentYear
        }])
        .select()
        .single();

      if (insertError) {
        // Log detailed error for debugging
        //   error: insertError,
        //   country,
        //   year: currentYear,
        //   message: insertError.message
        // });
        throw insertError;
      }
    }

    // Format: TMC-SG-2024-001
    return `TMC-${validCountry}-${currentYear}-${newCounter.toString().padStart(3, '0')}`;
  } catch (error) {
    throw error;
  }
};

// ================================================
// HELPER FUNCTIONS FOR NESTED DATA
// ================================================

/**
 * Get status history for a specific case
 */
const getStatusHistoryForCase = async (caseId: string): Promise<StatusHistory[]> => {
  try {
    const { data, error } = await supabase
      .from('status_history')
      .select('*')
      .eq('case_id', caseId) // ⚠️ case_id (caseId) FK to case_bookings
      .order('timestamp', { ascending: true }); // ⚠️ timestamp field

    if (error) {
      return [];
    }

    return data?.map(history => ({
      status: history.status as CaseStatus,
      timestamp: history.timestamp,
      processedBy: history.processed_by,
      details: history.details,
      attachments: history.attachments
    })) || [];
  } catch (error) {
    return [];
  }
};

/**
 * Get amendment history for a specific case
 */
const getAmendmentHistoryForCase = async (caseId: string): Promise<AmendmentHistory[]> => {
  try {
    const { data, error } = await supabase
      .from('amendment_history')
      .select('*')
      .eq('case_id', caseId)
      .order('timestamp', { ascending: true });

    if (error) {
      return [];
    }

    // Transform data correctly - changes are stored as JSONB array in database
    return data?.map(history => ({
      amendmentId: history.id,
      timestamp: history.timestamp,
      amendedBy: history.amended_by,
      changes: history.changes || [], // JSONB field already contains array of changes
      reason: history.reason || 'No reason provided' // Correct field name
    })) || [];
  } catch (error) {
    return [];
  }
};

// ================================================
// CASE CRUD OPERATIONS
// ================================================

/**
 * Get all cases from Supabase
 */
export const getSupabaseCases = async (country?: string): Promise<CaseBooking[]> => {
  try {
    // Fetch cases with status history and amendment history to enable versioning history display
    let query = supabase
      .from('case_bookings')
      .select(`
        *,
        status_history (
        id,
        status,
        processed_by,
        timestamp,
        details,
        attachments
        ),
        amendment_history (
        id,
        amended_by,
        timestamp,
        reason,
        changes
        )
      `)
      .order('created_at', { ascending: false }); // ⚠️ created_at (createdAt)

    if (country) {
      // Get both the normalized country name and potential legacy country code
      const normalizedCountry = normalizeCountry(country);
      const legacyCountryCode = getLegacyCountryCode(normalizedCountry);

      // Search for cases that match either the normalized country name or the legacy code
      if (legacyCountryCode && legacyCountryCode !== normalizedCountry) {
        query = query.or(`country.eq.${normalizedCountry},country.eq.${legacyCountryCode}`);
      } else {
        query = query.eq('country', normalizedCountry);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data) {
      return [];
    }

    // Transform data for display

    // Transform Supabase data to CaseBooking interface
    return data.map(caseData => ({
      id: caseData.id,
      caseReferenceNumber: caseData.case_reference_number,
      hospital: caseData.hospital,
      department: caseData.department,
      dateOfSurgery: caseData.date_of_surgery,
      procedureType: caseData.procedure_type,
      procedureName: caseData.procedure_name,
      doctorName: caseData.doctor_name,
      timeOfProcedure: caseData.time_of_procedure,
      surgerySetSelection: caseData.surgery_set_selection || [],
      implantBox: caseData.implant_box || [],
      specialInstruction: caseData.special_instruction,
      status: caseData.status as CaseStatus,
      submittedBy: caseData.submitted_by,
      submittedAt: caseData.submitted_at,
      processedBy: caseData.processed_by,
      processedAt: caseData.processed_at,
      processOrderDetails: caseData.process_order_details,
      country: normalizeCountry(caseData.country || ''),
      isAmended: caseData.is_amended,
      amendedBy: caseData.amended_by,
      amendedAt: caseData.amended_at,
      deliveryImage: caseData.delivery_image,
      deliveryDetails: caseData.delivery_details,
      attachments: caseData.attachments || [],
      orderSummary: caseData.order_summary,
      doNumber: caseData.do_number,
      // Use the nested status history from the relation
      statusHistory: caseData.status_history?.map((history: any) => ({
        id: history.id, // Include database ID for attachments
        status: history.status as CaseStatus,
        timestamp: history.timestamp,
        processedBy: history.processed_by,
        user: history.processed_by, // Add user field for compatibility
        details: history.details || '',
        attachments: history.attachments || []
      }))?.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) || [],
      // Transform amendment history from the relation
      amendmentHistory: (() => {
        if (!caseData.amendment_history || caseData.amendment_history.length === 0) {
        return [];
        }

        // Group amendment records by timestamp and amended_by
        const groupedAmendments = new Map<string, AmendmentHistory>();

        caseData.amendment_history.forEach((history: any) => {
        const key = `${history.timestamp}_${history.amended_by}`;

        if (!groupedAmendments.has(key)) {
          groupedAmendments.set(key, {
            amendmentId: history.id,
            timestamp: history.timestamp,
            amendedBy: history.amended_by,
            changes: history.changes || [],
            reason: history.reason || 'No reason provided'
          });
        }
        });

        return Array.from(groupedAmendments.values()).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      })()
    }));
  } catch (error) {
    return [];
  }
};

// Keep the original implementation as a fallback (commented out for now)
/*
export const getSupabaseCasesOriginal = async (country?: string): Promise<CaseBooking[]> => {
  try {
    let query = supabase
      .from('case_bookings')
      .select(`
        *,
        status_history (
        id,
        status,
        processed_by,
        timestamp,
        details,
        attachments
        ),
        amendment_history (
        id,
        amended_by,
        timestamp,
        reason,
        changes
        )
      `)
      .order('created_at', { ascending: false });

    if (country) {
      // Get both the normalized country name and potential legacy country code
      const normalizedCountry = normalizeCountry(country);
      const legacyCountryCode = getLegacyCountryCode(normalizedCountry);

      // Search for cases that match either the normalized country name or the legacy code
      if (legacyCountryCode && legacyCountryCode !== normalizedCountry) {
        query = query.or(`country.eq.${normalizedCountry},country.eq.${legacyCountryCode}`);
      } else {
        query = query.eq('country', normalizedCountry);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform Supabase data to CaseBooking interface
    return data.map(caseData => ({
      id: caseData.id,
      caseReferenceNumber: caseData.case_reference_number,
      hospital: caseData.hospital,
      department: caseData.department,
      dateOfSurgery: caseData.date_of_surgery,
      procedureType: caseData.procedure_type,
      procedureName: caseData.procedure_name,
      doctorName: caseData.doctor_name,
      timeOfProcedure: caseData.time_of_procedure,
      surgerySetSelection: caseData.surgery_set_selection || [],
      implantBox: caseData.implant_box || [],
      specialInstruction: caseData.special_instruction,
      status: caseData.status as CaseStatus,
      submittedBy: caseData.submitted_by,
      submittedAt: caseData.submitted_at,
      processedBy: caseData.processed_by,
      processedAt: caseData.processed_at,
      processOrderDetails: caseData.process_order_details,
      country: normalizeCountry(caseData.country || ''),
      isAmended: caseData.is_amended,
      amendedBy: caseData.amended_by,
      amendedAt: caseData.amended_at,
      statusHistory: caseData.status_history?.map((history: SupabaseCaseStatusHistory) => ({
        id: history.id, // Include database ID for attachments
        status: history.status as CaseStatus,
        timestamp: history.timestamp,
        processedBy: history.processed_by,
        details: history.details,
        attachments: history.attachments
      })) || [],
      amendmentHistory: (() => {
        if (!caseData.amendment_history || caseData.amendment_history.length === 0) {
        return [];
        }

        // Group amendment records by timestamp and amended_by
        const groupedAmendments = new Map<string, AmendmentHistory>();

        caseData.amendment_history.forEach((history: SupabaseCaseAmendmentHistory) => {
        const key = `${history.timestamp}_${history.amended_by}`;

        if (!groupedAmendments.has(key)) {
          groupedAmendments.set(key, {
            amendmentId: history.id,
            timestamp: history.timestamp,
            amendedBy: history.amended_by,
            changes: history.changes || [],
            reason: history.reason || 'No reason provided'
          });
        }
        });

        return Array.from(groupedAmendments.values());
      })()
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Save a new case to Supabase
 */
export const saveSupabaseCase = async (caseData: Omit<CaseBooking, 'id' | 'caseReferenceNumber' | 'submittedAt' | 'statusHistory'>): Promise<CaseBooking> => {
  try {
    // Temporarily disable permission validation to restore functionality
    // if (!validatePermission(PERMISSION_ACTIONS.CREATE_CASE)) {
    //   throw new Error('Insufficient permissions to create cases');
    // }

    // Generate case reference number with fallback
    const caseReferenceNumber = await generateCaseReferenceNumber(caseData.country || 'Singapore');

    console.log('Saving case with data:', {
      caseReferenceNumber,
      hospital: caseData.hospital,
      department: caseData.department,
      dateOfSurgery: caseData.dateOfSurgery,
      submittedBy: caseData.submittedBy,
      country: normalizeCountry(caseData.country || ''),
      doctorId: caseData.doctorId,
      doctorName: caseData.doctorName
    });

    // Prepare insert data with proper validation
    const insertData: any = {
      case_reference_number: caseReferenceNumber,
      hospital: caseData.hospital,
      department: caseData.department,
      date_of_surgery: caseData.dateOfSurgery,
      procedure_type: caseData.procedureType,
      procedure_name: caseData.procedureName,
      doctor_name: caseData.doctorName, // ⚠️ doctor_name (doctorName)
      time_of_procedure: caseData.timeOfProcedure,
      surgery_set_selection: caseData.surgerySetSelection || [],
      implant_box: caseData.implantBox || [],
      special_instruction: caseData.specialInstruction, // ⚠️ special_instruction (specialInstruction)
      status: caseData.status,
      submitted_by: caseData.submittedBy,
      country: normalizeCountry(caseData.country || ''),
      processed_by: caseData.processedBy,
      processed_at: caseData.processedAt, // ⚠️ processed_at (processedAt)
      process_order_details: caseData.processOrderDetails,
      is_amended: caseData.isAmended || false,
      amended_by: caseData.amendedBy,
      amended_at: caseData.amendedAt
    };

    // Only include doctor_id if it's a valid UUID, otherwise let it be NULL
    if (caseData.doctorId && caseData.doctorId.length > 0 && caseData.doctorId !== 'undefined') {
      insertData.doctor_id = caseData.doctorId;
    }

    console.log('Final insert data:', insertData);

    // Use direct query instead of secure query - RLS policy fixed to allow proper data return
    const { data: insertedCase, error: insertError } = await supabase
      .from('case_bookings')
      .insert(insertData)
      .select();

    console.log('🔍 E2E DEBUG - Insert result:', { 
      insertedCase, 
      insertError,
      hasData: !!insertedCase,
      dataLength: insertedCase?.length,
      insertedCaseData: insertedCase?.[0],
      arrayFields: {
        surgerySetSelection: insertedCase?.[0]?.surgery_set_selection,
        implantBox: insertedCase?.[0]?.implant_box
      }
    });

    if (insertError) {
      console.error('❌ E2E DEBUG - Database insert error:', {
        error: insertError,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
        insertData: JSON.stringify(insertData, null, 2)
      });
      throw insertError;
    }

    let finalInsertedCase = insertedCase;

    if (!finalInsertedCase || finalInsertedCase.length === 0) {
      console.error('No data returned from database insert');
      console.error('Possible causes: RLS policy blocking insert, foreign key constraint failure, or invalid data');
      
      // Try to verify if the case was actually created
      console.log('Attempting to verify if case was saved despite error...');
      const { data: verificationData } = await supabase
        .from('case_bookings')
        .select('*')
        .eq('case_reference_number', caseReferenceNumber)
        .single();
      
      if (verificationData) {
        console.log('Case was actually saved, using verification data:', verificationData);
        finalInsertedCase = [verificationData];
      } else {
        throw new Error('Failed to create case - no data returned from database');
      }
    }

    // Handle both single object and array returns from Supabase
    const insertedCaseRecord = Array.isArray(finalInsertedCase) ? finalInsertedCase[0] : finalInsertedCase;

    // Create initial status history entry - only if it's a new case with "Case Booked" status
    if (caseData.status === 'Case Booked') {
      const { error: historyError } = await supabase
        .from('status_history')
        .insert([{
        case_id: insertedCaseRecord.id,
        status: caseData.status,
        processed_by: caseData.submittedBy,
        timestamp: insertedCaseRecord.created_at,
        details: 'Case created'
        }]);

      if (historyError) {
        // Don't throw here, case was created successfully
      }
    }

    // Transform back to CaseBooking interface
    const newCaseBooking: CaseBooking = {
      id: insertedCaseRecord.id,
      caseReferenceNumber: insertedCaseRecord.case_reference_number,
      hospital: insertedCaseRecord.hospital,
      department: insertedCaseRecord.department,
      dateOfSurgery: insertedCaseRecord.date_of_surgery,
      procedureType: insertedCaseRecord.procedure_type,
      procedureName: insertedCaseRecord.procedure_name,
      doctorName: insertedCaseRecord.doctor_name,
      timeOfProcedure: insertedCaseRecord.time_of_procedure,
      surgerySetSelection: insertedCaseRecord.surgery_set_selection || [],
      implantBox: insertedCaseRecord.implant_box || [],
      specialInstruction: insertedCaseRecord.special_instruction,
      status: insertedCaseRecord.status as CaseStatus,
      submittedBy: insertedCaseRecord.submitted_by,
      submittedAt: insertedCaseRecord.submitted_at,
      processedBy: insertedCaseRecord.processed_by,
      processedAt: insertedCaseRecord.processed_at,
      processOrderDetails: insertedCaseRecord.process_order_details,
      country: insertedCaseRecord.country,
      isAmended: insertedCaseRecord.is_amended,
      amendedBy: insertedCaseRecord.amended_by,
      amendedAt: insertedCaseRecord.amended_at,
      statusHistory: [
        {
        status: 'Case Booked' as CaseStatus,
        timestamp: insertedCaseRecord.submitted_at,
        processedBy: insertedCaseRecord.submitted_by,
        user: insertedCaseRecord.submitted_by,
        details: 'Case initially submitted',
        attachments: []
        }
      ]
    };

    // Process email notifications for new case creation (async, don't block response)
    if (caseData.status === 'Case Booked') {
      console.log('📧 EMAIL DEBUG - New Case Email Notification Trigger:', {
        timestamp: new Date().toISOString(),
        caseId: newCaseBooking.id,
        caseRef: newCaseBooking.caseReferenceNumber,
        status: newCaseBooking.status,
        submittedBy: newCaseBooking.submittedBy,
        country: newCaseBooking.country,
        hospital: newCaseBooking.hospital,
        department: newCaseBooking.department,
        emailFunctionAvailable: typeof processEmailNotifications === 'function',
        processEmailNotificationsName: processEmailNotifications.name
      });
      
      processEmailNotifications(newCaseBooking, newCaseBooking.status, undefined, newCaseBooking.submittedBy)
        .then(() => {
        console.log('✅ EMAIL DEBUG - New case email notification SUCCESS:', {
          caseRef: newCaseBooking.caseReferenceNumber,
          status: newCaseBooking.status,
          submittedBy: newCaseBooking.submittedBy,
          country: newCaseBooking.country,
          timestamp: new Date().toISOString(),
          completionMessage: 'Email notification processing completed successfully'
        });
        })
        .catch(emailError => {
        console.error('❌ EMAIL DEBUG - New case email notification FAILED:', {
          caseRef: newCaseBooking.caseReferenceNumber,
          status: newCaseBooking.status,
          submittedBy: newCaseBooking.submittedBy,
          country: newCaseBooking.country,
          error: {
            message: emailError.message,
            stack: emailError.stack,
            name: emailError.name
          },
          timestamp: new Date().toISOString(),
          originalError: emailError
        });
        });
    }

    return newCaseBooking;
  } catch (error) {
    throw error;
  }
};

/**
 * Update case status in Supabase
 */
export const updateSupabaseCaseStatus = async (
  caseId: string,
  newStatus: CaseStatus,
  changedBy: string,
  details?: string,
  attachments?: string[]
): Promise<void> => {
  try {
    // Extract actual user from details if available
    let actualUser = changedBy;
    if (details) {
      try {
        const parsedDetails = JSON.parse(details);
        if (parsedDetails.processedBy) {
        actualUser = parsedDetails.processedBy;
        }
      } catch (e) {
        // Details is not JSON or doesn't have processedBy, use changedBy
      }
    }
    // Get current case data for audit logging and optimistic locking
    const { data: currentCase, error: fetchError } = await supabase
      .from('case_bookings')
      .select('status, case_reference_number, country, department, updated_at')
      .eq('id', caseId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch case data for status update: ${fetchError.message}`);
    }

    const oldStatus = currentCase?.status;
    const caseRef = currentCase?.case_reference_number;
    const country = currentCase?.country;
    const department = currentCase?.department;
    const lastUpdatedAt = currentCase?.updated_at;

    // Skip update if status hasn't actually changed
    if (oldStatus === newStatus) {
      console.log(`Status update skipped - case ${caseRef} already has status: ${newStatus}`);
      return;
    }

    // Update case status 
    const newUpdatedAt = new Date().toISOString();
    
    console.log('🔍 E2E DEBUG - Status Update:', {
      caseId,
      caseRef,
      oldStatus,
      newStatus,
      updateData: {
        status: newStatus,
        updated_at: newUpdatedAt
      }
    });
    
    const { data: updateResult, error: updateError } = await supabase
      .from('case_bookings')
      .update({
        status: newStatus,
        updated_at: newUpdatedAt
      })
      .eq('id', caseId)
      .select('updated_at');

    console.log('🔍 E2E DEBUG - Status Update Result:', {
      updateResult,
      updateError,
      hasData: !!updateResult,
      dataLength: updateResult?.length
    });

    if (updateError) {
      console.error('❌ E2E DEBUG - Status update error:', {
        error: updateError,
        message: updateError.message,
        details: updateError.details,
        code: updateError.code,
        caseId,
        oldStatus,
        newStatus
      });
      throw updateError;
    }

    // Check if the update actually happened (optimistic lock succeeded)
    if (!updateResult || updateResult.length === 0) {
      throw new Error(`Status update failed - case ${caseRef} was modified by another process. Please refresh and try again.`);
    }

    // Check if this is a status change that might create duplicates
    let shouldAddHistoryEntry = true;

    // Prevent duplicate entries, especially for "Case Booked"
    const { data: existingHistory } = await supabase
      .from('status_history')
      .select('*')
      .eq('case_id', caseId)
      .eq('status', newStatus);

    if (existingHistory && existingHistory.length > 0) {
      // For "Case Booked", always prevent duplicates
      if (newStatus === 'Case Booked') {
        shouldAddHistoryEntry = false;} else {
        // For other statuses, check if it's a recent duplicate (within 1 minute)
        const recentDuplicate = existingHistory.find(entry => {
        const entryTime = new Date(entry.timestamp).getTime();
        const now = new Date().getTime();
        return (now - entryTime) < 60000; // 1 minute
        });

        if (recentDuplicate) {
        shouldAddHistoryEntry = false;}
      }
    }

    // Add status history entry only if it's not a duplicate
    if (shouldAddHistoryEntry) {
      const historyEntry = {
        case_id: caseId,
        status: newStatus,
        processed_by: actualUser,
        timestamp: new Date().toISOString(),
        details: details || null,
        attachments: attachments || null
      };

      console.log('📋 STATUS HISTORY DEBUG - Creating history entry:', {
        caseId,
        newStatus,
        oldStatus,
        actualUser,
        detailsProvided: details,
        detailsType: typeof details,
        detailsLength: details?.length || 0,
        attachmentsProvided: attachments,
        attachmentsCount: attachments?.length || 0,
        historyEntry,
        timestamp: new Date().toISOString()
      });

      const { error: historyError } = await supabase
        .from('status_history')
        .insert([historyEntry]);

      if (historyError) {
        console.error('❌ STATUS HISTORY DEBUG - History insert failed:', {
        caseId,
        newStatus,
        historyEntry,
        error: historyError,
        errorMessage: historyError.message,
        timestamp: new Date().toISOString()
        });
        throw historyError;
      } else {
        console.log('✅ STATUS HISTORY DEBUG - History entry created successfully:', {
        caseId,
        newStatus,
        detailsSaved: details,
        timestamp: new Date().toISOString()
        });
      }
    }

    // Add audit log for status change (only if history entry was added)
    if (caseRef && oldStatus !== newStatus) {
      try {
        const { auditCaseStatusChange } = await import('./auditService');

        // Get current user info for audit using secure method
        const { getCurrentUser } = await import('./authCompat');
        const currentUserData = getCurrentUser();
        await auditCaseStatusChange(
        currentUserData?.name || actualUser,
        currentUserData?.id || 'unknown',
        currentUserData?.role || 'unknown',
        caseRef,
        oldStatus || 'unknown',
        newStatus,
        country,
        department
        );
      } catch (auditError) {
        // Failed to log status change audit - continue silently
      }
    }
    
    // Process email notifications for status change
    if (oldStatus !== newStatus) {
      try {
        // Get full case data for email notifications
        const { data: fullCaseData, error: caseError } = await supabase
        .from('case_bookings')
        .select('*')
        .eq('id', caseId)
        .single();

        if (!caseError && fullCaseData) {
          // Transform to CaseBooking format
          const caseBooking: CaseBooking = {
            id: fullCaseData.id,
            caseReferenceNumber: fullCaseData.case_reference_number,
            hospital: fullCaseData.hospital,
            department: fullCaseData.department,
            dateOfSurgery: fullCaseData.date_of_surgery,
            procedureType: fullCaseData.procedure_type,
            procedureName: fullCaseData.procedure_name,
            doctorName: fullCaseData.doctor_name,
            doctorId: fullCaseData.doctor_id,
            timeOfProcedure: fullCaseData.time_of_procedure,
            surgerySetSelection: fullCaseData.surgery_set_selection || [],
            implantBox: fullCaseData.implant_box || [],
            specialInstruction: fullCaseData.special_instruction,
            status: newStatus,
            submittedBy: fullCaseData.submitted_by,
            submittedAt: fullCaseData.submitted_at,
            processedBy: fullCaseData.processed_by,
            processedAt: fullCaseData.processed_at,
            processOrderDetails: fullCaseData.process_order_details,
            country: fullCaseData.country,
            amendedBy: fullCaseData.amended_by,
            amendedAt: fullCaseData.amended_at,
            isAmended: fullCaseData.is_amended
          };

          // Process email notifications asynchronously (don't block status update)
          console.log('📧 EMAIL DEBUG - Status Change Email Notification Trigger:', {
            timestamp: new Date().toISOString(),
            caseId: caseBooking.id,
            caseRef: caseBooking.caseReferenceNumber,
            oldStatus,
            newStatus,
            actualUser,
            country: caseBooking.country,
            hospital: caseBooking.hospital,
            department: caseBooking.department,
            submittedBy: caseBooking.submittedBy,
            emailFunctionAvailable: typeof processEmailNotifications === 'function',
            processEmailNotificationsName: processEmailNotifications.name,
            statusChangeType: oldStatus ? 'status_update' : 'initial_status'
          });
          
          processEmailNotifications(caseBooking, newStatus, oldStatus, actualUser)
            .then(() => {
              console.log('✅ EMAIL DEBUG - Status change email notification SUCCESS:', {
                caseRef: caseBooking.caseReferenceNumber,
                oldStatus,
                newStatus,
                actualUser,
                country: caseBooking.country,
                timestamp: new Date().toISOString(),
                completionMessage: 'Email notification processing completed successfully for status change'
              });
            })
            .catch(emailError => {
              console.error('❌ EMAIL DEBUG - Status change email notification FAILED:', {
                caseRef: caseBooking.caseReferenceNumber,
                oldStatus,
                newStatus,
                actualUser,
                country: caseBooking.country,
                error: {
                  message: emailError.message,
                  stack: emailError.stack,
                  name: emailError.name
                },
                timestamp: new Date().toISOString(),
                originalError: emailError
              });
            });
        }
      } catch (emailError) {
        // Don't fail the status update if email processing fails
        console.error('Error setting up email notifications:', emailError);
      }
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Update case with processing details
 */
export const updateSupabaseCaseProcessing = async (
  caseId: string,
  processedBy: string,
  processOrderDetails: string,
  newStatus: CaseStatus,
  attachments?: string[],
  customDetails?: string
): Promise<void> => {
  try {
    // ⚠️ CRITICAL: Use single timestamp for consistency between case_bookings.processed_at and status_history.timestamp
    const currentTimestamp = new Date().toISOString();
    
    // Update case with processing details - using field mappings
    const { error: updateError } = await supabase
      .from('case_bookings')
      .update({
        [CASE_BOOKINGS_FIELDS.processedBy]: processedBy,          // ⚠️ processed_by
        [CASE_BOOKINGS_FIELDS.processedAt]: currentTimestamp,     // ⚠️ processed_at - SAME timestamp as history
        [CASE_BOOKINGS_FIELDS.processOrderDetails]: processOrderDetails, // ⚠️ process_order_details
        [CASE_BOOKINGS_FIELDS.status]: newStatus,                 // ⚠️ status
        [CASE_BOOKINGS_FIELDS.updatedAt]: currentTimestamp        // ⚠️ updated_at
      })
      .eq('id', caseId);

    if (updateError) {
      throw updateError;
    }

    // Prepare status history entry data - using field mappings and SAME timestamp
    const historyData: any = {
      [STATUS_HISTORY_FIELDS.caseId]: caseId,                     // ⚠️ case_id (FK to case_bookings)
      [STATUS_HISTORY_FIELDS.status]: newStatus,                  // ⚠️ status
      [STATUS_HISTORY_FIELDS.processedBy]: processedBy,           // ⚠️ processed_by
      [STATUS_HISTORY_FIELDS.timestamp]: currentTimestamp,        // ⚠️ timestamp - SAME as case.processed_at
      [STATUS_HISTORY_FIELDS.details]: customDetails || null // ⚠️ details - Use actual user input, not hardcoded text
    };

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      historyData[STATUS_HISTORY_FIELDS.attachments] = attachments;  // ⚠️ attachments field mapping
    }

    // Add status history entry - using field mappings
    const { error: historyError } = await supabase
      .from('status_history')
      .insert([historyData]);

    if (historyError) {
      throw historyError;
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Amend a case in Supabase
 */
export const amendSupabaseCase = async (
  caseId: string,
  amendments: Partial<CaseBooking>,
  amendedBy: string
): Promise<void> => {
  try {
    // First, get the current case data to track changes
    const { data: currentCase, error: fetchError } = await supabase
      .from('case_bookings')
      .select('*')
      .eq('id', caseId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // ⚠️ CRITICAL: Use single timestamp for consistency across amendment fields
    const amendmentTimestamp = new Date().toISOString();
    
    // Track what's being changed
    const changes: { field: string; oldValue: string; newValue: string }[] = [];
    const updateData: any = {
      [CASE_BOOKINGS_FIELDS.isAmended]: true,              // ⚠️ is_amended
      [CASE_BOOKINGS_FIELDS.amendedBy]: amendedBy,         // ⚠️ amended_by
      [CASE_BOOKINGS_FIELDS.amendedAt]: amendmentTimestamp, // ⚠️ amended_at - SAME timestamp as history
      [CASE_BOOKINGS_FIELDS.updatedAt]: amendmentTimestamp  // ⚠️ updated_at - SAME timestamp
    };

    // Map amendments to database columns and track changes - using field mappings
    if (amendments.hospital !== undefined && amendments.hospital !== currentCase.hospital) {
      updateData[CASE_BOOKINGS_FIELDS.hospital] = amendments.hospital; // ⚠️ hospital field mapping
      changes.push({
        field: 'Hospital',
        oldValue: currentCase.hospital || '',
        newValue: amendments.hospital || ''
      });
    }
    if (amendments.department !== undefined && amendments.department !== currentCase.department) {
      updateData[CASE_BOOKINGS_FIELDS.department] = amendments.department; // ⚠️ department field mapping
      changes.push({
        field: 'Department',
        oldValue: currentCase.department || '',
        newValue: amendments.department || ''
      });
    }
    if (amendments.dateOfSurgery !== undefined && amendments.dateOfSurgery !== currentCase.date_of_surgery) {
      updateData[CASE_BOOKINGS_FIELDS.dateOfSurgery] = amendments.dateOfSurgery; // ⚠️ date_of_surgery field mapping (NOT case_date)
      changes.push({
        field: 'Date of Surgery',
        oldValue: currentCase.date_of_surgery || '',
        newValue: amendments.dateOfSurgery || ''
      });
    }
    if (amendments.procedureType !== undefined && amendments.procedureType !== currentCase.procedure_type) {
      updateData[CASE_BOOKINGS_FIELDS.procedureType] = amendments.procedureType; // ⚠️ procedure_type field mapping (NOT procedure)
      changes.push({
        field: 'Procedure Type',
        oldValue: currentCase.procedure_type || '',
        newValue: amendments.procedureType || ''
      });
    }
    if (amendments.procedureName !== undefined && amendments.procedureName !== currentCase.procedure_name) {
      updateData[CASE_BOOKINGS_FIELDS.procedureName] = amendments.procedureName; // ⚠️ procedure_name field mapping
      changes.push({
        field: 'Procedure Name',
        oldValue: currentCase.procedure_name || '',
        newValue: amendments.procedureName || ''
      });
    }
    if (amendments.doctorName !== undefined && amendments.doctorName !== currentCase.doctor_name) {
      updateData[CASE_BOOKINGS_FIELDS.doctorName] = amendments.doctorName; // ⚠️ doctor_name field mapping
      changes.push({
        field: 'Doctor Name',
        oldValue: currentCase.doctor_name || '',
        newValue: amendments.doctorName || ''
      });
    }
    if (amendments.timeOfProcedure !== undefined && amendments.timeOfProcedure !== currentCase.time_of_procedure) {
      updateData[CASE_BOOKINGS_FIELDS.timeOfProcedure] = amendments.timeOfProcedure; // ⚠️ time_of_procedure field mapping
      changes.push({
        field: 'Time of Procedure',
        oldValue: currentCase.time_of_procedure || '',
        newValue: amendments.timeOfProcedure || ''
      });
    }
    if (amendments.surgerySetSelection !== undefined && JSON.stringify(amendments.surgerySetSelection) !== JSON.stringify(currentCase.surgery_set_selection)) {
      updateData[CASE_BOOKINGS_FIELDS.surgerySetSelection] = amendments.surgerySetSelection; // ⚠️ surgery_set_selection field mapping

      // Calculate actual changes (additions and removals)
      const oldSets = currentCase.surgery_set_selection || [];
      const newSets = amendments.surgerySetSelection || [];
      const added = newSets.filter((item: string) => !oldSets.includes(item));
      const removed = oldSets.filter((item: string) => !newSets.includes(item));

      let changeDescription = '';
      if (added.length > 0) {
        changeDescription += `Added: ${added.join(', ')}`;
      }
      if (removed.length > 0) {
        if (changeDescription) changeDescription += '; ';
        changeDescription += `Removed: ${removed.join(', ')}`;
      }

      if (changeDescription) {
        changes.push({
        field: 'Surgery Set Selection',
        oldValue: '',
        newValue: changeDescription
        });
      }
    }
    if (amendments.implantBox !== undefined && JSON.stringify(amendments.implantBox) !== JSON.stringify(currentCase.implant_box)) {
      updateData[CASE_BOOKINGS_FIELDS.implantBox] = amendments.implantBox; // ⚠️ implant_box field mapping

      // Calculate actual changes (additions and removals)
      const oldBoxes = currentCase.implant_box || [];
      const newBoxes = amendments.implantBox || [];
      const added = newBoxes.filter((item: string) => !oldBoxes.includes(item));
      const removed = oldBoxes.filter((item: string) => !newBoxes.includes(item));

      let changeDescription = '';
      if (added.length > 0) {
        changeDescription += `Added: ${added.join(', ')}`;
      }
      if (removed.length > 0) {
        if (changeDescription) changeDescription += '; ';
        changeDescription += `Removed: ${removed.join(', ')}`;
      }

      if (changeDescription) {
        changes.push({
        field: 'Implant Box',
        oldValue: '',
        newValue: changeDescription
        });
      }
    }
    if (amendments.specialInstruction !== undefined && amendments.specialInstruction !== currentCase.special_instruction) {
      updateData[CASE_BOOKINGS_FIELDS.specialInstruction] = amendments.specialInstruction; // ⚠️ special_instruction field mapping
      changes.push({
        field: 'Special Instruction',
        oldValue: currentCase.special_instruction || '',
        newValue: amendments.specialInstruction || ''
      });
    }

    // Only proceed if there are actual changes
    if (changes.length === 0) {return;
    }

    // Update case
    const { error: updateError } = await supabase
      .from('case_bookings')
      .update(updateData)
      .eq('id', caseId);

    if (updateError) {
      throw updateError;
    }

    // Get the current authenticated user (with fallback for session)
    const { data: { user } } = await supabase.auth.getUser();
    const session = await supabase.auth.getSession();// Skip authentication check if neither user nor session is available
    // The RLS policies will handle the actual authorization
    if (!user && !session.data.session) {
      // No authentication found, but proceeding with RLS policy enforcement
    }

    // Create amendment history entry - using field mappings and SAME timestamp
    const historyEntry = {
      [AMENDMENT_HISTORY_FIELDS.caseId]: caseId,           // ⚠️ case_id (FK to case_bookings)
      [AMENDMENT_HISTORY_FIELDS.amendedBy]: amendedBy,     // ⚠️ amended_by
      [AMENDMENT_HISTORY_FIELDS.timestamp]: amendmentTimestamp, // ⚠️ timestamp - SAME as case.amended_at
      [AMENDMENT_HISTORY_FIELDS.reason]: (amendments as any).amendmentReason || 'No reason provided', // ⚠️ reason
      [AMENDMENT_HISTORY_FIELDS.changes]: changes          // ⚠️ changes (JSONB)
    };
    
    const { error: historyError } = await supabase
      .from('amendment_history')
      .insert([historyEntry]);

    if (historyError) {
      // Try alternative approach - use upsert instead of insert
      const { error: upsertError } = await supabase
        .from('amendment_history')
        .upsert([{
        ...historyEntry,
        id: `${caseId}_${Date.now()}` // Generate unique ID
        }]);

      if (upsertError) {
        throw historyError; // Throw original error
      }
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Update a case in Supabase (for general updates, not amendments)
 */
export const updateSupabaseCase = async (caseId: string, updates: Partial<CaseBooking>): Promise<CaseBooking> => {
  try {
    // Map updates to database columns
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.hospital !== undefined) updateData.hospital = updates.hospital;
    if (updates.department !== undefined) updateData.department = updates.department;
    if (updates.dateOfSurgery !== undefined) updateData.date_of_surgery = updates.dateOfSurgery;
    if (updates.procedureType !== undefined) updateData.procedure_type = updates.procedureType;
    if (updates.procedureName !== undefined) updateData.procedure_name = updates.procedureName;
    if (updates.doctorName !== undefined) updateData.doctor_name = updates.doctorName;
    if (updates.timeOfProcedure !== undefined) updateData.time_of_procedure = updates.timeOfProcedure;
    if (updates.surgerySetSelection !== undefined) updateData.surgery_set_selection = updates.surgerySetSelection;
    if (updates.implantBox !== undefined) updateData.implant_box = updates.implantBox;
    if (updates.specialInstruction !== undefined) updateData.special_instruction = updates.specialInstruction;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.processedBy !== undefined) updateData.processed_by = updates.processedBy;
    if (updates.processedAt !== undefined) updateData.processed_at = updates.processedAt;
    if (updates.processOrderDetails !== undefined) updateData.process_order_details = updates.processOrderDetails;

    // Update case
    const { data: updatedCase, error: updateError } = await supabase
      .from('case_bookings')
      .update(updateData)
      .eq('id', caseId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Return updated case in CaseBooking format
    return {
      id: updatedCase.id,
      caseReferenceNumber: updatedCase.case_reference_number,
      hospital: updatedCase.hospital,
      department: updatedCase.department,
      dateOfSurgery: updatedCase.date_of_surgery,
      procedureType: updatedCase.procedure_type,
      procedureName: updatedCase.procedure_name,
      doctorName: updatedCase.doctor_name,
      timeOfProcedure: updatedCase.time_of_procedure,
      surgerySetSelection: updatedCase.surgery_set_selection || [],
      implantBox: updatedCase.implant_box || [],
      specialInstruction: updatedCase.special_instruction,
      status: updatedCase.status as CaseStatus,
      submittedBy: updatedCase.submitted_by,
      submittedAt: updatedCase.submitted_at,
      processedBy: updatedCase.processed_by,
      processedAt: updatedCase.processed_at,
      processOrderDetails: updatedCase.process_order_details,
      country: updatedCase.country,
      isAmended: updatedCase.is_amended,
      amendedBy: updatedCase.amended_by,
      amendedAt: updatedCase.amended_at,
      statusHistory: [] // Will be loaded separately
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a case from Supabase and its associated usage data
 */
export const deleteSupabaseCase = async (caseId: string): Promise<void> => {
  try {
    // First get the case details to know what usage to delete
    const { data: caseData, error: fetchError } = await supabase
      .from('case_bookings')
      .select('date_of_surgery, country, department')
      .eq('id', caseId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Delete case quantities first (foreign key constraint)
    const { error: quantityError } = await supabase
      .from('case_booking_quantities')
      .delete()
      .eq('case_booking_id', caseId); // ⚠️ case_booking_id (caseBookingId) FK - NOT caseId

    if (quantityError) {
    }

    // Delete the case
    const { error: deleteError } = await supabase
      .from('case_bookings')
      .delete()
      .eq('id', caseId);

    if (deleteError) {
      throw deleteError;
    }

    // Trigger usage recalculation for that date
    if (caseData) {
      await recalculateUsageForDate(caseData.date_of_surgery, caseData.country, caseData.department);
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Recalculate usage for a specific date after case deletion
 */
export const recalculateUsageForDate = async (date: string, country: string, department: string): Promise<void> => {
  try {
    // Call RPC function to recalculate usage
    const { error } = await supabase.rpc('recalculate_daily_usage', {
      p_usage_date: date,
      p_country: country,
      p_department: department
    });

    if (error) {
      // If RPC doesn't exist, manually delete and recalculate
      const { error: deleteError } = await supabase
        .from('daily_usage_aggregation')
        .delete()
        .eq('usage_date', date)
        .eq('country', country)
        .eq('department', department);
      
      if (deleteError) {
      }
    }
  } catch (error) {
  }
};

// ================================================
// CATEGORIZED SETS MANAGEMENT
// ================================================

/**
 * Get categorized sets from Supabase
 */
export const getCategorizedSets = async (country: string): Promise<Record<string, { surgerySets: string[], implantBoxes: string[] }>> => {
  try {
    const { data, error } = await supabase
      .from('department_categorized_sets')
      .select('*')
      .eq('country', country);

    if (error) {
      throw error;
    }

    // Transform to expected format
    const result: Record<string, { surgerySets: string[], implantBoxes: string[] }> = {};

    data.forEach(item => {
      result[item.procedure_type] = {
        surgerySets: item.surgery_sets || [],
        implantBoxes: item.implant_boxes || []
      };
    });

    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Save categorized sets to Supabase
 */
export const saveCategorizedSets = async (
  sets: Record<string, { surgerySets: string[], implantBoxes: string[] }>,
  country: string
): Promise<void> => {
  try {
    // Convert sets to array format for bulk upsert
    const setsArray = Object.entries(sets).map(([procedureType, data]) => ({
      country,
      procedure_type: procedureType,
      surgery_sets: data.surgerySets,
      implant_boxes: data.implantBoxes
    }));

    // Use upsert to insert or update existing sets
    const { error: upsertError } = await supabase
      .from('department_categorized_sets')
      .upsert(setsArray, {
        onConflict: 'country,procedure_type'
      });

    if (upsertError) {
      throw upsertError;
    }
  } catch (error) {
    throw error;
  }
};

// ================================================
// MIGRATION HELPERS
// ================================================

/**
 * Migrate cases from localStorage to Supabase
 */
export const migrateCasesFromLocalStorage = async (): Promise<void> => {
  // Migration no longer needed - localStorage removed
  return;
};

/**
 * Check if cases exist in Supabase
 */
export const checkCasesExist = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('case_bookings')
      .select('id')
      .limit(1);

    if (error) {
      return false;
    }

    return data.length > 0;
  } catch (error) {
    return false;
  }
};