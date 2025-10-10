/**
 * Supabase Department Service - Department management with Supabase
 * Provides CRUD operations for departments and related data
 */

import { supabase } from '../lib/supabase';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';

export interface Department {
  id: string;
  name: string;
  country: string;
  description?: string;
  is_active: boolean; // ⚠️ is_active (isActive)
  created_at: string; // ⚠️ created_at (createdAt)
  updated_at: string; // ⚠️ updated_at (updatedAt)
}

export interface ProcedureType {
  id: string;
  department_id: string;
  procedure_type: string; // ⚠️ procedure_type (procedureType) - NOT procedure
  country: string;
  is_active: boolean;
  is_hidden: boolean;
}

class SupabaseDepartmentService {
  async getDepartments(country: string): Promise<Department[]> {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('country', country)
        .eq('is_active', true) // ⚠️ is_active (isActive)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async getProcedureTypesForDepartment(departmentId: string, country: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('department_procedure_types')
        .select('procedure_type') // ⚠️ procedure_type (procedureType) - NOT procedure
        .eq('department_id', departmentId)
        .eq('country', country)
        .eq('is_active', true)
        .eq('is_hidden', false)
        .order('procedure_type');

      if (error) throw error;
      return data?.map(item => item.procedure_type) || [];
    } catch (error) {
      return [];
    }
  }

  async addProcedureTypeToDepartment(
    departmentId: string,
    procedureType: string,
    country: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('department_procedure_types')
        .insert({
          department_id: departmentId,
          procedure_type: procedureType,
          country: country,
          is_active: true,
          is_hidden: false
        });

      if (error) throw error;
      return true;
    } catch (error) {
      return false;
    }
  }

  async removeProcedureTypeFromDepartment(
    departmentId: string,
    procedureType: string,
    country: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('department_procedure_types')
        .update({ is_active: false })
        .eq('department_id', departmentId)
        .eq('procedure_type', procedureType)
        .eq('country', country);

      if (error) throw error;
      return true;
    } catch (error) {
      return false;
    }
  }

  async getSurgerySets(country: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('surgery_sets')
        .select('name')
        .eq('country', country)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data?.map(item => item.name) || [];
    } catch (error) {
      return [];
    }
  }

  async getImplantBoxes(country: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('implant_boxes')
        .select('name')
        .eq('country', country)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data?.map(item => item.name) || [];
    } catch (error) {
      return [];
    }
  }

  async addSurgerySet(name: string, country: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('surgery_sets')
        .insert({
          name: name,
          country: country,
          is_active: true
        });

      if (error) throw error;
      return true;
    } catch (error) {
      return false;
    }
  }

  async addImplantBox(name: string, country: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('implant_boxes')
        .insert({
          name: name,
          country: country,
          is_active: true
        });

      if (error) throw error;
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export named functions for backward compatibility
const service = new SupabaseDepartmentService();

export const getDepartments = (country: string) => service.getDepartments(country);
export const getProcedureTypesForDepartment = (departmentId: string, country: string) =>
  service.getProcedureTypesForDepartment(departmentId, country);
export const addProcedureTypeToDepartment = (departmentId: string, procedureType: string, country: string) =>
  service.addProcedureTypeToDepartment(departmentId, procedureType, country);
export const removeProcedureTypeFromDepartment = (departmentId: string, procedureType: string, country: string) =>
  service.removeProcedureTypeFromDepartment(departmentId, procedureType, country);
export const getSurgerySets = (country: string) => service.getSurgerySets(country);
export const getImplantBoxes = (country: string) => service.getImplantBoxes(country);
export const addSurgerySet = (name: string, country: string) => service.addSurgerySet(name, country);
export const addImplantBox = (name: string, country: string) => service.addImplantBox(name, country);

// Additional function for backward compatibility
export const getProcedureTypesForDepartmentIncludingInactive = async (
  departmentName: string,
  country: string
): Promise<string[]> => {
  try {
    // First get the department ID from the department name and country
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .select('id')
      .eq('name', departmentName)
      .eq('country', country)
      .single();

    if (deptError || !deptData) {
      return [];
    }

    // Then fetch procedure types using the department ID
    const { data, error } = await supabase
      .from('department_procedure_types')
      .select('procedure_type')
      .eq('department_id', deptData.id)
      .eq('country', country)
      .order('procedure_type');

    if (error) throw error;
    return data?.map(item => item.procedure_type) || [];
  } catch (error) {
    return [];
  }
};

export default service;