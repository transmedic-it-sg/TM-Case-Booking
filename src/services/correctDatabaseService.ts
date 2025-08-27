/**
 * Correct Database Service
 * Replaces all incorrect database table references with the correct ones
 */

import { supabase } from '../lib/supabase';

// ===================================================================
// LOOKUP DATA FROM CODE_TABLES (replaces separate tables)
// ===================================================================

/**
 * Get countries from code_tables (NOT from non-existent 'countries' table)
 */
export const getCountries = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('code_tables')
    .select('*')
    .eq('table_type', 'countries')
    .eq('is_active', true)
    .order('display_name');

  if (error) throw error;
  return data || [];
};

/**
 * Get hospitals from code_tables (NOT from non-existent 'hospitals' table)
 */
export const getHospitals = async (country?: string): Promise<any[]> => {
  let query = supabase
    .from('code_tables')
    .select('*')
    .eq('table_type', 'hospitals')
    .eq('is_active', true)
    .order('display_name');

  if (country) {
    query = query.eq('country', country);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Get departments from actual departments table (correct)
 */
export const getDepartments = async (country?: string): Promise<any[]> => {
  let query = supabase
    .from('departments')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (country) {
    query = query.eq('country', country);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Get case statuses from code_tables (NOT from non-existent 'case_statuses' table)
 */
export const getCaseStatuses = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('code_tables')
    .select('*')
    .eq('table_type', 'case_statuses')
    .eq('is_active', true)
    .order('display_name');

  if (error) throw error;
  return data || [];
};

/**
 * Get procedure types from code_tables (NOT from non-existent 'procedure_types' table)
 */
export const getProcedureTypes = async (country?: string): Promise<any[]> => {
  let query = supabase
    .from('code_tables')
    .select('*')
    .eq('table_type', 'procedure_types')
    .eq('is_active', true)
    .order('display_name');

  if (country) {
    query = query.eq('country', country);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Get surgery sets from actual surgery_sets table (correct)
 */
export const getSurgerySets = async (country?: string): Promise<any[]> => {
  let query = supabase
    .from('surgery_sets')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (country) {
    query = query.eq('country', country);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Get implant boxes from actual implant_boxes table (correct)
 */
export const getImplantBoxes = async (country?: string): Promise<any[]> => {
  let query = supabase
    .from('implant_boxes')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (country) {
    query = query.eq('country', country);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// ===================================================================
// USER MANAGEMENT (correct tables)
// ===================================================================

/**
 * Get all users from profiles table (correct)
 */
export const getUsers = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('username');

  if (error) throw error;
  return data || [];
};

/**
 * Get user roles from code_tables (NOT from non-existent 'roles' table)
 */
export const getUserRoles = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('code_tables')
    .select('*')
    .eq('table_type', 'user_roles')
    .eq('is_active', true)
    .order('display_name');

  if (error) throw error;
  return data || [];
};

// ===================================================================
// ATTACHMENTS HANDLING (using correct table or storage)
// ===================================================================

/**
 * Handle attachments - files should be stored in Supabase Storage, 
 * with metadata in a proper attachments table or case_bookings directly
 */
export const saveAttachment = async (caseId: string, fileName: string, fileData: File): Promise<string> => {
  // Upload to Supabase Storage
  const filePath = `case-attachments/${caseId}/${fileName}`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(filePath, fileData);

  if (uploadError) throw uploadError;

  // Return the file path
  return uploadData.path;
};

/**
 * Get attachment URLs for a case
 */
export const getCaseAttachments = async (caseId: string): Promise<string[]> => {
  const { data: files, error } = await supabase.storage
    .from('attachments')
    .list(`case-attachments/${caseId}`, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' }
    });

  if (error) throw error;

  if (!files || files.length === 0) {
    return [];
  }

  // Generate public URLs
  const urls = files.map(file => {
    const { data } = supabase.storage
      .from('attachments')
      .getPublicUrl(`case-attachments/${caseId}/${file.name}`);
    return data.publicUrl;
  });

  return urls;
};

const correctDatabaseService = {
  getCountries,
  getHospitals,
  getDepartments,
  getCaseStatuses,
  getProcedureTypes,
  getSurgerySets,
  getImplantBoxes,
  getUsers,
  getUserRoles,
  saveAttachment,
  getCaseAttachments
};

export default correctDatabaseService;