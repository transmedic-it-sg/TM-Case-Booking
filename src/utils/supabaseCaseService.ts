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
    
    // Create initial status history entry
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
      statusHistory: [{
        status: insertedCase.status as CaseStatus,
        timestamp: insertedCase.created_at,
        processedBy: insertedCase.submitted_by,
        details: 'Case created'
      }]
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
    
    // Add status history entry
    const { error: historyError } = await supabase
      .from('status_history')
      .insert([{
        case_id: caseId,
        status: newStatus,
        processed_by: changedBy,
        timestamp: new Date().toISOString(),
        details,
        attachments
      }]);
    
    if (historyError) {
      console.error('Error creating status history:', historyError);
      throw historyError;
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
    // Prepare update data
    const updateData: any = {
      is_amended: true,
      amended_by: amendedBy,
      amended_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Map amendments to database columns
    if (amendments.hospital) updateData.hospital = amendments.hospital;
    if (amendments.department) updateData.department = amendments.department;
    if (amendments.dateOfSurgery) updateData.date_of_surgery = amendments.dateOfSurgery;
    if (amendments.procedureType) updateData.procedure_type = amendments.procedureType;
    if (amendments.procedureName) updateData.procedure_name = amendments.procedureName;
    if (amendments.doctorName) updateData.doctor_name = amendments.doctorName;
    if (amendments.timeOfProcedure) updateData.time_of_procedure = amendments.timeOfProcedure;
    if (amendments.surgerySetSelection) updateData.surgery_set_selection = amendments.surgerySetSelection;
    if (amendments.implantBox) updateData.implant_box = amendments.implantBox;
    if (amendments.specialInstruction) updateData.special_instruction = amendments.specialInstruction;
    
    // Update case
    const { error: updateError } = await supabase
      .from('case_bookings')
      .update(updateData)
      .eq('id', caseId);
    
    if (updateError) {
      console.error('Error amending case:', updateError);
      throw updateError;
    }
    
    // Add status history entry
    const { error: historyError } = await supabase
      .from('status_history')
      .insert([{
        case_id: caseId,
        status: 'Case Booked', // Status typically remains the same when amended
        processed_by: amendedBy,
        timestamp: new Date().toISOString(),
        details: 'Case amended'
      }]);
    
    if (historyError) {
      console.error('Error creating amendment history:', historyError);
      throw historyError;
    }
  } catch (error) {
    console.error('Error in amendSupabaseCase:', error);
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