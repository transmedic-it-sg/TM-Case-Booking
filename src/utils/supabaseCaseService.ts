import { supabase } from '../lib/supabase';
import { CaseBooking, CaseStatus } from '../types';

// Interface for Supabase case data
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface SupabaseCase {
  id: string;
  case_reference_number: string;
  hospital: string;
  department: string;
  date_of_surgery: string;
  procedure_type: string;
  procedure_name: string;
  doctor_name?: string;
  time_of_procedure?: string;
  surgery_set_selection: string[];
  implant_box: string[];
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
  created_at: string;
  updated_at: string;
}

// Interface for case status history
interface SupabaseCaseStatusHistory {
  id: string;
  case_id: string;
  status: string;
  processed_by: string;
  timestamp: string;
  details?: string;
  attachments?: string[];
}

// Interface for amendment history
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
export const generateCaseReferenceNumber = async (country: string): Promise<string> => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Get or create counter for this country and year
    const { data: counterData, error: counterError } = await supabase
      .from('case_counters')
      .select('current_counter')
      .eq('country', country)
      .eq('year', currentYear)
      .single();
    
    if (counterError && counterError.code !== 'PGRST116') {
      console.error('Error getting counter:', counterError);
      throw counterError;
    }
    
    let newCounter = 1;
    
    if (counterData) {
      newCounter = counterData.current_counter + 1;
      
      // Update counter
      const { error: updateError } = await supabase
        .from('case_counters')
        .update({ current_counter: newCounter })
        .eq('country', country)
        .eq('year', currentYear);
      
      if (updateError) {
        console.error('Error updating counter:', updateError);
        throw updateError;
      }
    } else {
      // Create new counter
      const { error: insertError } = await supabase
        .from('case_counters')
        .insert([{
          country,
          current_counter: newCounter,
          year: currentYear
        }]);
      
      if (insertError) {
        console.error('Error creating counter:', insertError);
        throw insertError;
      }
    }
    
    // Format: TMC-SG-2024-001
    return `TMC-${country}-${currentYear}-${newCounter.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating case reference number:', error);
    throw error;
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
      query = query.eq('country', country);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching cases:', error);
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
      country: caseData.country,
      isAmended: caseData.is_amended,
      amendedBy: caseData.amended_by,
      amendedAt: caseData.amended_at,
      statusHistory: caseData.status_history?.map((history: SupabaseCaseStatusHistory) => ({
        status: history.status as CaseStatus,
        timestamp: history.timestamp,
        processedBy: history.processed_by,
        details: history.details,
        attachments: history.attachments
      })) || [],
      amendmentHistory: caseData.amendment_history?.map((history: SupabaseCaseAmendmentHistory) => ({
        amendmentId: history.id,
        timestamp: history.timestamp,
        amendedBy: history.amended_by,
        reason: history.reason || 'No reason provided',
        changes: history.changes || []
      })) || []
    }));
  } catch (error) {
    console.error('Error in getSupabaseCases:', error);
    throw error;
  }
};

/**
 * Save a new case to Supabase
 */
export const saveSupabaseCase = async (caseData: Omit<CaseBooking, 'id' | 'caseReferenceNumber' | 'submittedAt' | 'statusHistory'>): Promise<CaseBooking> => {
  try {
    // Generate case reference number
    const caseReferenceNumber = await generateCaseReferenceNumber(caseData.country);
    
    // Insert case
    const { data: insertedCase, error: insertError } = await supabase
      .from('case_bookings')
      .insert([{
        case_reference_number: caseReferenceNumber,
        hospital: caseData.hospital,
        department: caseData.department,
        date_of_surgery: caseData.dateOfSurgery,
        procedure_type: caseData.procedureType,
        procedure_name: caseData.procedureName,
        doctor_name: caseData.doctorName,
        time_of_procedure: caseData.timeOfProcedure,
        surgery_set_selection: caseData.surgerySetSelection || [],
        implant_box: caseData.implantBox || [],
        special_instruction: caseData.specialInstruction,
        status: caseData.status,
        submitted_by: caseData.submittedBy,
        country: caseData.country,
        processed_by: caseData.processedBy,
        processed_at: caseData.processedAt,
        process_order_details: caseData.processOrderDetails,
        is_amended: caseData.isAmended || false,
        amended_by: caseData.amendedBy,
        amended_at: caseData.amendedAt
      }])
      .select()
      .single();
    
    if (insertError) {
      console.error('Error inserting case:', insertError);
      throw insertError;
    }
    
    // Create initial status history entry - only if it's a new case with "Case Booked" status
    if (caseData.status === 'Case Booked') {
      const { error: historyError } = await supabase
        .from('status_history')
        .insert([{
          case_id: insertedCase.id,
          status: caseData.status,
          processed_by: caseData.submittedBy,
          timestamp: insertedCase.created_at,
          details: 'Case created'
        }]);
      
      if (historyError) {
        console.error('Error creating status history:', historyError);
        // Don't throw here, case was created successfully
      }
    }
    
    // Transform back to CaseBooking interface
    return {
      id: insertedCase.id,
      caseReferenceNumber: insertedCase.case_reference_number,
      hospital: insertedCase.hospital,
      department: insertedCase.department,
      dateOfSurgery: insertedCase.date_of_surgery,
      procedureType: insertedCase.procedure_type,
      procedureName: insertedCase.procedure_name,
      doctorName: insertedCase.doctor_name,
      timeOfProcedure: insertedCase.time_of_procedure,
      surgerySetSelection: insertedCase.surgery_set_selection || [],
      implantBox: insertedCase.implant_box || [],
      specialInstruction: insertedCase.special_instruction,
      status: insertedCase.status as CaseStatus,
      submittedBy: insertedCase.submitted_by,
      submittedAt: insertedCase.submitted_at,
      processedBy: insertedCase.processed_by,
      processedAt: insertedCase.processed_at,
      processOrderDetails: insertedCase.process_order_details,
      country: insertedCase.country,
      isAmended: insertedCase.is_amended,
      amendedBy: insertedCase.amended_by,
      amendedAt: insertedCase.amended_at,
      statusHistory: []
    };
  } catch (error) {
    console.error('Error in saveSupabaseCase:', error);
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
    // Get current case data for audit logging
    const { data: currentCase, error: fetchError } = await supabase
      .from('case_bookings')
      .select('status, case_reference_number, country, department')
      .eq('id', caseId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching case data:', fetchError);
      // Continue with status update even if we can't fetch current data
    }
    
    const oldStatus = currentCase?.status;
    const caseRef = currentCase?.case_reference_number;
    const country = currentCase?.country;
    const department = currentCase?.department;
    
    // Update case status
    const { error: updateError } = await supabase
      .from('case_bookings')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', caseId);
    
    if (updateError) {
      console.error('Error updating case status:', updateError);
      throw updateError;
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
        shouldAddHistoryEntry = false;
        console.log('Prevented duplicate "Case Booked" entry for case:', caseId);
      } else {
        // For other statuses, check if it's a recent duplicate (within 1 minute)
        const recentDuplicate = existingHistory.find(entry => {
          const entryTime = new Date(entry.timestamp).getTime();
          const now = new Date().getTime();
          return (now - entryTime) < 60000; // 1 minute
        });
        
        if (recentDuplicate) {
          shouldAddHistoryEntry = false;
          console.log(`Prevented duplicate "${newStatus}" entry for case:`, caseId);
        }
      }
    }
    
    // Add status history entry only if it's not a duplicate
    if (shouldAddHistoryEntry) {
      const { error: historyError } = await supabase
        .from('status_history')
        .insert([{
          case_id: caseId,
          status: newStatus,
          processed_by: changedBy,
          timestamp: new Date().toISOString(),
          details: details || null,
          attachments: attachments || null
        }]);
      
      if (historyError) {
        console.error('Error creating status history:', historyError);
        throw historyError;
      }
      
      // Add audit log for status change (only if history entry was added)
      if (caseRef && oldStatus !== newStatus) {
        try {
          const { auditCaseStatusChange } = await import('./auditService');
          
          // Get current user info for audit (simplified approach)
          const currentUserData = JSON.parse(localStorage.getItem('currentUser') || '{}');
          await auditCaseStatusChange(
            currentUserData.name || changedBy,
            currentUserData.id || 'unknown',
            currentUserData.role || 'unknown',
            caseRef,
            oldStatus || 'unknown',
            newStatus,
            country,
            department
          );
        } catch (auditError) {
          console.error('Failed to log status change audit:', auditError);
        }
      }
    }
  } catch (error) {
    console.error('Error in updateSupabaseCaseStatus:', error);
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
  newStatus: CaseStatus
): Promise<void> => {
  try {
    // Update case with processing details
    const { error: updateError } = await supabase
      .from('case_bookings')
      .update({
        processed_by: processedBy,
        processed_at: new Date().toISOString(),
        process_order_details: processOrderDetails,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', caseId);
    
    if (updateError) {
      console.error('Error updating case processing:', updateError);
      throw updateError;
    }
    
    // Add status history entry
    const { error: historyError } = await supabase
      .from('status_history')
      .insert([{
        case_id: caseId,
        status: newStatus,
        processed_by: processedBy,
        timestamp: new Date().toISOString(),
        details: 'Order processed and prepared'
      }]);
    
    if (historyError) {
      console.error('Error creating status history:', historyError);
      throw historyError;
    }
  } catch (error) {
    console.error('Error in updateSupabaseCaseProcessing:', error);
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
      console.error('Error fetching current case:', fetchError);
      throw fetchError;
    }
    
    // Track what's being changed
    const changes: { field: string; oldValue: string; newValue: string }[] = [];
    const updateData: any = {
      is_amended: true,
      amended_by: amendedBy,
      amended_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Map amendments to database columns and track changes
    if (amendments.hospital !== undefined && amendments.hospital !== currentCase.hospital) {
      updateData.hospital = amendments.hospital;
      changes.push({
        field: 'Hospital',
        oldValue: currentCase.hospital || '',
        newValue: amendments.hospital || ''
      });
    }
    if (amendments.department !== undefined && amendments.department !== currentCase.department) {
      updateData.department = amendments.department;
      changes.push({
        field: 'Department',
        oldValue: currentCase.department || '',
        newValue: amendments.department || ''
      });
    }
    if (amendments.dateOfSurgery !== undefined && amendments.dateOfSurgery !== currentCase.date_of_surgery) {
      updateData.date_of_surgery = amendments.dateOfSurgery;
      changes.push({
        field: 'Date of Surgery',
        oldValue: currentCase.date_of_surgery || '',
        newValue: amendments.dateOfSurgery || ''
      });
    }
    if (amendments.procedureType !== undefined && amendments.procedureType !== currentCase.procedure_type) {
      updateData.procedure_type = amendments.procedureType;
      changes.push({
        field: 'Procedure Type',
        oldValue: currentCase.procedure_type || '',
        newValue: amendments.procedureType || ''
      });
    }
    if (amendments.procedureName !== undefined && amendments.procedureName !== currentCase.procedure_name) {
      updateData.procedure_name = amendments.procedureName;
      changes.push({
        field: 'Procedure Name',
        oldValue: currentCase.procedure_name || '',
        newValue: amendments.procedureName || ''
      });
    }
    if (amendments.doctorName !== undefined && amendments.doctorName !== currentCase.doctor_name) {
      updateData.doctor_name = amendments.doctorName;
      changes.push({
        field: 'Doctor Name',
        oldValue: currentCase.doctor_name || '',
        newValue: amendments.doctorName || ''
      });
    }
    if (amendments.timeOfProcedure !== undefined && amendments.timeOfProcedure !== currentCase.time_of_procedure) {
      updateData.time_of_procedure = amendments.timeOfProcedure;
      changes.push({
        field: 'Time of Procedure',
        oldValue: currentCase.time_of_procedure || '',
        newValue: amendments.timeOfProcedure || ''
      });
    }
    if (amendments.surgerySetSelection !== undefined && JSON.stringify(amendments.surgerySetSelection) !== JSON.stringify(currentCase.surgery_set_selection)) {
      updateData.surgery_set_selection = amendments.surgerySetSelection;
      changes.push({
        field: 'Surgery Set Selection',
        oldValue: (currentCase.surgery_set_selection || []).join(', '),
        newValue: (amendments.surgerySetSelection || []).join(', ')
      });
    }
    if (amendments.implantBox !== undefined && JSON.stringify(amendments.implantBox) !== JSON.stringify(currentCase.implant_box)) {
      updateData.implant_box = amendments.implantBox;
      changes.push({
        field: 'Implant Box',
        oldValue: (currentCase.implant_box || []).join(', '),
        newValue: (amendments.implantBox || []).join(', ')
      });
    }
    if (amendments.specialInstruction !== undefined && amendments.specialInstruction !== currentCase.special_instruction) {
      updateData.special_instruction = amendments.specialInstruction;
      changes.push({
        field: 'Special Instruction',
        oldValue: currentCase.special_instruction || '',
        newValue: amendments.specialInstruction || ''
      });
    }
    
    // Only proceed if there are actual changes
    if (changes.length === 0) {
      console.log('No changes detected for case amendment');
      return;
    }
    
    // Update case
    const { error: updateError } = await supabase
      .from('case_bookings')
      .update(updateData)
      .eq('id', caseId);
    
    if (updateError) {
      console.error('Error amending case:', updateError);
      throw updateError;
    }
    
    // Get the current authenticated user (with fallback for session)
    const { data: { user } } = await supabase.auth.getUser();
    const session = await supabase.auth.getSession();
    
    console.log('Authentication check:', { user: !!user, session: !!session.data.session });
    
    // Skip authentication check if neither user nor session is available
    // The RLS policies will handle the actual authorization
    if (!user && !session.data.session) {
      console.warn('No authentication found, but proceeding with RLS policy enforcement');
    }
    
    // Create amendment history entry
    const historyEntry = {
      case_id: caseId,
      amended_by: amendedBy,
      timestamp: new Date().toISOString(),
      reason: (amendments as any).amendmentReason || 'No reason provided',
      changes: changes
    };
    
    console.log('Inserting amendment history entry:', historyEntry);
    console.log('Current user:', user);
    
    const { error: historyError } = await supabase
      .from('amendment_history')
      .insert([historyEntry]);
    
    if (historyError) {
      console.error('Error creating amendment history:', historyError);
      
      // Try alternative approach - use upsert instead of insert
      console.log('Attempting alternative approach with upsert...');
      const { error: upsertError } = await supabase
        .from('amendment_history')
        .upsert([{
          ...historyEntry,
          id: `${caseId}_${Date.now()}` // Generate unique ID
        }]);
        
      if (upsertError) {
        console.error('Upsert also failed:', upsertError);
        throw historyError; // Throw original error
      } else {
        console.log('Amendment history saved via upsert method');
      }
    }
    
    console.log('Case amended successfully with', changes.length, 'changes tracked.');
  } catch (error) {
    console.error('Error in amendSupabaseCase:', error);
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
      console.error('Error updating case:', updateError);
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
    console.error('Error in updateSupabaseCase:', error);
    throw error;
  }
};

/**
 * Delete a case from Supabase
 */
export const deleteSupabaseCase = async (caseId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('case_bookings')
      .delete()
      .eq('id', caseId);
    
    if (error) {
      console.error('Error deleting case:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteSupabaseCase:', error);
    throw error;
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
      .from('categorized_sets')
      .select('*')
      .eq('country', country);
    
    if (error) {
      console.error('Error fetching categorized sets:', error);
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
    console.error('Error in getCategorizedSets:', error);
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
      .from('categorized_sets')
      .upsert(setsArray, {
        onConflict: 'country,procedure_type'
      });
    
    if (upsertError) {
      console.error('Error upserting categorized sets:', upsertError);
      throw upsertError;
    }
  } catch (error) {
    console.error('Error in saveCategorizedSets:', error);
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
  try {
    const localCases = localStorage.getItem('case-booking-cases');
    if (!localCases) return;
    
    const cases = JSON.parse(localCases);
    
    for (const caseData of cases) {
      try {
        // Transform localStorage format to Supabase format
        const supabaseCase = {
          hospital: caseData.hospital,
          department: caseData.department,
          dateOfSurgery: caseData.dateOfSurgery,
          procedureType: caseData.procedureType,
          procedureName: caseData.procedureName,
          doctorName: caseData.doctorName,
          timeOfProcedure: caseData.timeOfProcedure,
          surgerySetSelection: caseData.surgerySetSelection || [],
          implantBox: caseData.implantBox || [],
          specialInstruction: caseData.specialInstruction,
          status: caseData.status,
          submittedBy: caseData.submittedBy,
          country: caseData.country,
          processedBy: caseData.processedBy,
          processedAt: caseData.processedAt,
          processOrderDetails: caseData.processOrderDetails,
          isAmended: caseData.isAmended,
          amendedBy: caseData.amendedBy,
          amendedAt: caseData.amendedAt
        };
        
        await saveSupabaseCase(supabaseCase);
        console.log(`Migrated case: ${caseData.caseReferenceNumber}`);
      } catch (error) {
        console.error(`Error migrating case ${caseData.caseReferenceNumber}:`, error);
      }
    }
    
    console.log('Case migration completed');
  } catch (error) {
    console.error('Error in case migration:', error);
  }
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
      console.error('Error checking cases exist:', error);
      return false;
    }
    
    return data.length > 0;
  } catch (error) {
    console.error('Error in checkCasesExist:', error);
    return false;
  }
};