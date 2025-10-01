/**
 * Supabase Department Service - Department management with Supabase
 * Provides CRUD operations for departments and related data
 */

import { supabase } from '../lib/supabase';

export interface Department {
  id: string;
  name: string;
  country: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProcedureType {
  id: string;
  department_id: string;
  procedure_type: string;
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
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching departments:', error);
      return [];
    }
  }

  async getProcedureTypesForDepartment(departmentId: string, country: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('department_procedure_types')
        .select('procedure_type')
        .eq('department_id', departmentId)
        .eq('country', country)
        .eq('is_active', true)
        .eq('is_hidden', false)
        .order('procedure_type');

      if (error) throw error;
      return data?.map(item => item.procedure_type) || [];
    } catch (error) {
      console.error('Error fetching procedure types:', error);
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
      console.error('Error adding procedure type:', error);
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
      console.error('Error removing procedure type:', error);
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
      console.error('Error fetching surgery sets:', error);
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
      console.error('Error fetching implant boxes:', error);
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
      console.error('Error adding surgery set:', error);
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
      console.error('Error adding implant box:', error);
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
  departmentId: string, 
  country: string
): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('department_procedure_types')
      .select('procedure_type')
      .eq('department_id', departmentId)
      .eq('country', country)
      .order('procedure_type');

    if (error) throw error;
    return data?.map(item => item.procedure_type) || [];
  } catch (error) {
    console.error('Error fetching procedure types (including inactive):', error);
    return [];
  }
};

export default service;