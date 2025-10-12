/**
 * Doctor Service - Handle doctor-procedure-sets hierarchy with comprehensive error handling
 * Ensures robust operation with empty data states and graceful error recovery
 * 
 * ⚠️ CRITICAL: Uses comprehensive field mappings to prevent database field naming issues
 */

import { supabase } from '../lib/supabase';
import { logger } from './logger';
import { 
  DOCTORS_FIELDS, 
  DOCTOR_PROCEDURES_FIELDS, 
  SURGERY_SETS_FIELDS, 
  IMPLANT_BOXES_FIELDS,
  CASE_QUANTITIES_FIELDS,
  DAILY_USAGE_AGGREGATION_FIELDS
} from './fieldMappings';

// ⚠️ CRITICAL: Interfaces use database field names - mapped via DOCTORS_FIELDS utility
export interface Doctor {
  id: string;                    // → doctors.id
  name: string;                  // → doctors.name
  country: string;               // → doctors.country
  specialties: string[];         // → doctors.specialties
  is_active: boolean;            // → doctors.is_active ⚠️ CRITICAL: NOT isActive
}

// ⚠️ CRITICAL: Doctor procedures interface - mapped via DOCTOR_PROCEDURES_FIELDS
export interface DoctorProcedure {
  procedure_type: string;        // → doctor_procedures.procedure_type ⚠️ CRITICAL: NOT procedureType
}

// ⚠️ CRITICAL: Surgery sets and implant boxes interface
export interface ProcedureSet {
  item_type: 'surgery_set' | 'implant_box';  // → item_type ⚠️ CRITICAL: NOT itemType
  item_id: string;               // → item ID reference
  item_name: string;             // → item_name ⚠️ CRITICAL: NOT itemName
}

// ⚠️ CRITICAL: Case quantities interface - mapped via CASE_BOOKING_QUANTITIES_FIELDS
export interface CaseQuantity {
  item_type: 'surgery_set' | 'implant_box';  // → case_booking_quantities.item_type ⚠️ CRITICAL
  item_name: string;             // → case_booking_quantities.item_name ⚠️ CRITICAL
  quantity: number;              // → case_booking_quantities.quantity
}

// ⚠️ CRITICAL: Daily usage interface - mapped via DAILY_USAGE_AGGREGATION_FIELDS
export interface DailyUsage {
  usage_date: string;            // → daily_usage_aggregation.usage_date ⚠️ CRITICAL
  department: string;            // → daily_usage_aggregation.department
  surgery_sets_total: number;    // → calculated total
  implant_boxes_total: number;   // → calculated total
  top_items: Array<{
    item_type: string;           // → daily_usage_aggregation.item_type ⚠️ CRITICAL
    item_name: string;           // → daily_usage_aggregation.item_name ⚠️ CRITICAL
    quantity: number;            // → daily_usage_aggregation.total_quantity
  }>;
}

/**
 * Get doctors for a specific country with error handling
 * ⚠️ CRITICAL: Maps RPC results to Doctor interface using correct field names
 */
export const getDoctorsForCountry = async (country: string): Promise<Doctor[]> => {
  try {
    if (!country || country.trim() === '') {
      logger.warn('getDoctorsForCountry: Invalid country parameter', { country });
      return [];
    }

    // ⚠️ Using RPC function - returns doctor data with database field names
    const { data, error } = await supabase.rpc('get_doctors_for_country', {
      p_country: country.trim()
    });

    if (error) {
      logger.error('Error fetching doctors for country', { country, error: error.message });
      return [];
    }

    if (!data || data.length === 0) {
      logger.info('No doctors found for country', { country });
      return [];
    }

    // ⚠️ CRITICAL: Map RPC results to interface using database field names
    return data.map((doctor: any) => ({
      id: doctor.id,                               // → doctors.id
      name: doctor.name,                           // → doctors.name
      country: country,                            // → doctors.country
      specialties: doctor.specialties || [],       // → doctors.specialties
      is_active: doctor.is_active ?? true          // → doctors.is_active ⚠️ CRITICAL: NOT isActive
    }));

  } catch (error) {
    logger.error('Exception in getDoctorsForCountry', {
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
};

/**
 * Get procedures for a specific doctor with error handling
 * ⚠️ CRITICAL: Maps RPC results to DoctorProcedure interface using correct field names
 */
export const getProceduresForDoctor = async (doctorId: string, country: string): Promise<DoctorProcedure[]> => {
  try {
    if (!doctorId || !country || country.trim() === '') {
      logger.warn('getProceduresForDoctor: Invalid parameters', { doctorId, country });
      return [];
    }

    // ⚠️ Using RPC function - returns doctor_procedures data with database field names
    const { data, error } = await supabase.rpc('get_procedures_for_doctor', {
      p_doctor_id: doctorId,    // → doctor_procedures.doctor_id ⚠️ CRITICAL FK
      p_country: country.trim() // → doctor_procedures.country
    });

    if (error) {
      logger.error('Error fetching procedures for doctor', { doctorId, country, error: error.message });
      return [];
    }

    if (!data || data.length === 0) {
      logger.info('No procedures found for doctor', { doctorId, country });
      return [];
    }

    // ⚠️ CRITICAL: Map RPC results to interface using database field names
    return data.map((proc: any) => ({
      procedure_type: proc.procedure_type           // → doctor_procedures.procedure_type ⚠️ CRITICAL: NOT procedureType
    }));

  } catch (error) {
    logger.error('Exception in getProceduresForDoctor', {
      doctorId,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
};

/**
 * Get surgery sets and implant boxes for doctor-procedure combination
 */
export const getSetsForDoctorProcedure = async (
  doctorId: string,
  procedureType: string,
  country: string
): Promise<ProcedureSet[]> => {
  try {
    if (!doctorId || !procedureType || !country || country.trim() === '' || procedureType.trim() === '') {
      logger.warn('getSetsForDoctorProcedure: Invalid parameters', { doctorId, procedureType, country });
      return [];
    }

    const { data, error } = await supabase.rpc('get_sets_for_doctor_procedure', {
      p_doctor_id: doctorId,
      p_procedure_type: procedureType.trim(),
      p_country: country.trim()
    });

    if (error) {
      logger.error('Error fetching sets for doctor procedure', {
        doctorId,
        procedureType,
        country,
        error: error.message
      });
      return [];
    }

    if (!data || data.length === 0) {
      logger.info('No sets found for doctor procedure', { doctorId, procedureType, country });
      return [];
    }

    // Process the data from the database function
    const procedureSets: ProcedureSet[] = [];

    data.forEach((set: any) => {
      // Add surgery set if present
      if (set.surgery_set_id && set.surgery_set_name) {
        procedureSets.push({
          item_type: 'surgery_set',
          item_id: set.surgery_set_id,
          item_name: set.surgery_set_name
        });
      }

      // Add implant box if present
      if (set.implant_box_id && set.implant_box_name) {
        procedureSets.push({
          item_type: 'implant_box',
          item_id: set.implant_box_id,
          item_name: set.implant_box_name
        });
      }
    });

    // Remove duplicates
    const uniqueSets = procedureSets.filter((set, index, self) =>
      index === self.findIndex(s => s.item_id === set.item_id && s.item_type === set.item_type)
    );

    return uniqueSets;

  } catch (error) {
    logger.error('Exception in getSetsForDoctorProcedure', {
      doctorId,
      procedureType,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
};

/**
 * Get daily usage data for calendar view with error handling
 */
export const getDailyUsageForDate = async (
  usageDate: string,
  country: string
): Promise<DailyUsage[]> => {
  try {
    if (!usageDate || !country || country.trim() === '') {
      logger.warn('getDailyUsageForDate: Invalid parameters', { usageDate, country });
      return [];
    }

    const { data, error } = await supabase.rpc('get_daily_usage', {
      p_usage_date: usageDate,
      p_country: country.trim()
    });

    if (error) {
      logger.error('Error fetching daily usage', {
        usageDate,
        country,
        error: error.message
      });
      return [];
    }

    if (!data || data.length === 0) {
      logger.info('No usage data found for date', { usageDate, country });
      return [];
    }

    // Group data by department and aggregate
    const departmentMap = new Map<string, { surgery_sets: number; implant_boxes: number; items: any[] }>();

    data.forEach((usage: any) => {
      const dept = usage.department || 'Unknown';
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, { surgery_sets: 0, implant_boxes: 0, items: [] });
      }

      const deptData = departmentMap.get(dept)!;
      if (usage.item_type === 'surgery_set') {
        deptData.surgery_sets += usage.total_quantity;
      } else if (usage.item_type === 'implant_box') {
        deptData.implant_boxes += usage.total_quantity;
      }

      deptData.items.push({
        item_type: usage.item_type,
        item_name: usage.item_name,
        quantity: usage.total_quantity
      });
    });

    // Convert to array format
    const result: DailyUsage[] = [];
    departmentMap.forEach((deptData, department) => {
      result.push({
        usage_date: usageDate,
        department,
        surgery_sets_total: deptData.surgery_sets,
        implant_boxes_total: deptData.implant_boxes,
        top_items: deptData.items.sort((a, b) => b.quantity - a.quantity).slice(0, 5)
      });
    });

    return result;

  } catch (error) {
    logger.error('Exception in getDailyUsageForDate', {
      usageDate,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
};

/**
 * Get case quantities from the database
 */
export const getCaseQuantities = async (caseBookingId: string): Promise<CaseQuantity[]> => {
  console.log('🔢 GET CASE QUANTITIES DEBUG - Function called:', {
    caseBookingId,
    hasCaseBookingId: !!caseBookingId,
    caseBookingIdType: typeof caseBookingId,
    timestamp: new Date().toISOString()
  });

  try {
    if (!caseBookingId) {
      console.log('❌ GET CASE QUANTITIES DEBUG - Invalid case booking ID:', {
        caseBookingId,
        reason: 'No caseBookingId provided'
      });
      logger.warn('getCaseQuantities: Invalid case booking ID', { caseBookingId });
      return [];
    }

    console.log('🔍 GET CASE QUANTITIES DEBUG - Querying database:', {
      table: 'case_booking_quantities',
      select: 'item_type, item_name, quantity',
      filter: { case_booking_id: caseBookingId },
      timestamp: new Date().toISOString()
    });

    const { data, error } = await supabase
      .from('case_booking_quantities')
      .select('item_type, item_name, quantity')
      .eq('case_booking_id', caseBookingId); // ⚠️ case_booking_id (caseBookingId) FK - NOT caseId

    console.log('🔍 GET CASE QUANTITIES DEBUG - Database response:', {
      caseBookingId,
      hasData: !!data,
      dataLength: data?.length || 0,
      error: error,
      errorMessage: error?.message,
      rawData: data,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('❌ GET CASE QUANTITIES DEBUG - Database error:', {
        caseBookingId,
        error: error,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        timestamp: new Date().toISOString()
      });
      logger.error('Error fetching case quantities', {
        caseBookingId,
        error: error.message
      });
      return [];
    }

    if (!data || data.length === 0) {
      console.log('📭 GET CASE QUANTITIES DEBUG - No quantities found:', {
        caseBookingId,
        hasData: !!data,
        dataLength: data?.length || 0,
        isEmptyArray: Array.isArray(data) && data.length === 0,
        timestamp: new Date().toISOString()
      });
      return [];
    }

    // Convert to CaseQuantity array
    const convertedData = data.map(row => ({
      item_type: row.item_type as 'surgery_set' | 'implant_box',
      item_name: row.item_name,
      quantity: row.quantity
    }));

    console.log('✅ GET CASE QUANTITIES DEBUG - Conversion successful:', {
      caseBookingId,
      originalDataLength: data.length,
      convertedDataLength: convertedData.length,
      sampleConvertedData: convertedData.slice(0, 3),
      allItemTypes: convertedData.map(d => d.item_type),
      allItemNames: convertedData.map(d => d.item_name),
      allQuantities: convertedData.map(d => d.quantity),
      timestamp: new Date().toISOString()
    });

    return convertedData;

  } catch (error) {
    console.error('❌ GET CASE QUANTITIES DEBUG - Exception occurred:', {
      caseBookingId,
      error: error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    logger.error('Exception in getCaseQuantities', {
      caseBookingId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
};

/**
 * Save case quantities with comprehensive error handling
 */
export const saveCaseQuantities = async (
  caseBookingId: string,
  quantities: CaseQuantity[]
): Promise<boolean> => {
  try {
    console.log('DoctorService Debug - saveCaseQuantities called with:', { caseBookingId, quantities });
    
    if (!caseBookingId || !quantities || quantities.length === 0) {
      console.log('DoctorService Debug - Invalid parameters, returning false');
      logger.warn('saveCaseQuantities: Invalid parameters', { caseBookingId, quantitiesCount: quantities?.length });
      return false;
    }

    // Validate quantity data
    const validQuantities = quantities.filter(q =>
      q.item_type &&
      q.item_name &&
      q.quantity > 0 &&
      ['surgery_set', 'implant_box'].includes(q.item_type)
    );

    if (validQuantities.length === 0) {
      console.log('DoctorService Debug - No valid quantities after filtering');
      logger.warn('saveCaseQuantities: No valid quantities provided', { caseBookingId, quantities });
      return false;
    }

    // Clear existing quantities for this case
    await supabase
      .from('case_booking_quantities')
      .delete()
      .eq('case_booking_id', caseBookingId);

    // Insert new quantities using direct table insert
    const quantityRecords = validQuantities.map(q => ({
      case_booking_id: caseBookingId, // ⚠️ case_booking_id (caseBookingId) FK - NOT caseId
      item_type: q.item_type,
      item_name: q.item_name,
      quantity: q.quantity
    }));

    console.log('DoctorService Debug - Inserting quantity records:', quantityRecords);

    const { data, error } = await supabase
      .from('case_booking_quantities')
      .insert(quantityRecords);

    console.log('DoctorService Debug - Insert result:', { data, error });

    if (error) {
      console.error('DoctorService Debug - Insert error:', error);
      logger.error('Error saving case quantities', {
        caseBookingId,
        quantitiesCount: validQuantities.length,
        error: error.message
      });
      return false;
    }

    logger.info('Successfully saved case quantities', {
      caseBookingId,
      quantitiesCount: validQuantities.length
    });

    return true;

  } catch (error) {
    logger.error('Exception in saveCaseQuantities', {
      caseBookingId,
      quantitiesCount: quantities?.length,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};

/**
 * Create a new doctor with error handling
 */
export const createDoctor = async (
  name: string,
  country: string,
  specialties: string[] = []
): Promise<Doctor | null> => {
  try {
    if (!name || !country || name.trim() === '' || country.trim() === '') {
      logger.warn('createDoctor: Invalid parameters', { name, country });
      return null;
    }

    const { data, error } = await supabase
      .from('doctors')
      .insert([{
        name: name.trim(),
        country: country.trim(),
        specialties: specialties.filter(s => s && s.trim() !== ''),
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation (doctor already exists)
      if (error.code === '23505') {
        logger.info('Doctor already exists', { name, country });
        throw new Error(`Doctor "${name}" already exists in ${country}. Please use a different name.`);
      }

      logger.error('Error creating doctor', { name, country, error: error.message });
      throw new Error(`Failed to create doctor: ${error.message}`);
    }

    if (!data) {
      logger.warn('No data returned when creating doctor', { name, country });
      return null;
    }

    logger.info('Successfully created doctor', { doctorId: data.id, name, country });
    return {
      id: data.id,
      name: data.name,
      country: data.country,
      specialties: data.specialties || [],
      is_active: data.is_active
    };

  } catch (error) {
    logger.error('Exception in createDoctor', {
      name,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
};

/**
 * Add procedure to a doctor with error handling
 */
export const addProcedureToDoctor = async (
  doctorId: string,
  procedureType: string,
  country: string
): Promise<boolean> => {
  try {
    if (!doctorId || !procedureType || !country || procedureType.trim() === '' || country.trim() === '') {
      logger.warn('addProcedureToDoctor: Invalid parameters', { doctorId, procedureType, country });
      return false;
    }

    const { error } = await supabase
      .from('doctor_procedures')
      .insert([{
        doctor_id: doctorId,
        procedure_type: procedureType.trim(),
        country: country.trim(),
        is_active: true
      }]);

    if (error) {
      // Check for unique constraint violation (procedure already exists)
      if (error.code === '23505') {
        logger.info('Procedure already exists for doctor', { doctorId, procedureType, country });
        return true; // Consider it successful if it already exists
      }

      logger.error('Error adding procedure to doctor', { doctorId, procedureType, country, error: error.message });
      return false;
    }

    logger.info('Successfully added procedure to doctor', { doctorId, procedureType, country });
    return true;

  } catch (error) {
    logger.error('Exception in addProcedureToDoctor', {
      doctorId,
      procedureType,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};

/**
 * Update procedure for a doctor with error handling
 */
export const updateDoctorProcedure = async (
  doctorId: string,
  oldProcedureType: string,
  newProcedureType: string,
  country: string
): Promise<boolean> => {
  try {
    if (!doctorId || !oldProcedureType || !newProcedureType || !country) {
      logger.warn('updateDoctorProcedure: Invalid parameters', { doctorId, oldProcedureType, newProcedureType, country });
      return false;
    }

    const { error } = await supabase
      .from('doctor_procedures')
      .update({
        procedure_type: newProcedureType.trim()
      })
      .eq('doctor_id', doctorId) // ⚠️ doctor_id (doctorId) FK
      .eq('procedure_type', oldProcedureType.trim()) // ⚠️ procedure_type (procedureType) - NOT procedure
      .eq('country', country.trim());

    if (error) {
      logger.error('Error updating doctor procedure', { doctorId, oldProcedureType, newProcedureType, country, error: error.message });
      return false;
    }

    logger.info('Successfully updated doctor procedure', { doctorId, oldProcedureType, newProcedureType, country });
    return true;

  } catch (error) {
    logger.error('Exception in updateDoctorProcedure', {
      doctorId,
      oldProcedureType,
      newProcedureType,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};

/**
 * Delete procedure from a doctor with error handling
 */
export const deleteDoctorProcedure = async (
  doctorId: string,
  procedureType: string,
  country: string
): Promise<boolean> => {
  try {
    if (!doctorId || !procedureType || !country) {
      logger.warn('deleteDoctorProcedure: Invalid parameters', { doctorId, procedureType, country });
      return false;
    }

    const { error } = await supabase
      .from('doctor_procedures')
      .delete()
      .eq('doctor_id', doctorId)
      .eq('procedure_type', procedureType.trim())
      .eq('country', country.trim());

    if (error) {
      logger.error('Error deleting doctor procedure', { doctorId, procedureType, country, error: error.message });
      return false;
    }

    logger.info('Successfully deleted doctor procedure', { doctorId, procedureType, country });
    return true;

  } catch (error) {
    logger.error('Exception in deleteDoctorProcedure', {
      doctorId,
      procedureType,
      country,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};

const doctorService = {
  getDoctorsForCountry,
  getProceduresForDoctor,
  getSetsForDoctorProcedure,
  getDailyUsageForDate,
  getCaseQuantities,
  saveCaseQuantities,
  createDoctor,
  addProcedureToDoctor,
  updateDoctorProcedure,
  deleteDoctorProcedure
};

export default doctorService;