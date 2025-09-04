/**
 * AmendmentForm Component - Case amendment form modal
 * Handles case amendments with validation
 */

import React, { useState, useEffect } from 'react';
import { AmendmentFormProps } from './types';
import TimePicker from '../common/TimePicker';
import FilterDatePicker from '../FilterDatePicker';
import MultiSelectDropdown from '../MultiSelectDropdown';
import SearchableDropdown from '../SearchableDropdown';
import { supabase } from '../../lib/supabase';
import { normalizeCountry } from '../../utils/countryUtils';

const AmendmentForm: React.FC<AmendmentFormProps> = ({
  caseItem,
  amendmentData,
  onSave,
  onCancel
}) => {
  // Initialize state with safe fallbacks
  const [formData, setFormData] = useState({
    hospital: caseItem?.hospital || '',
    department: caseItem?.department || '',
    dateOfSurgery: caseItem?.dateOfSurgery || '',
    procedureType: caseItem?.procedureType || '',
    procedureName: caseItem?.procedureName || '',
    doctorName: caseItem?.doctorName || '',
    timeOfProcedure: caseItem?.timeOfProcedure || '',
    specialInstruction: caseItem?.specialInstruction || '',
    surgerySetSelection: caseItem?.surgerySetSelection || [],
    implantBox: caseItem?.implantBox || [],
    amendmentReason: ''
  });

  // State variables for dropdowns
  const [availableProcedureTypes, setAvailableProcedureTypes] = useState<string[]>([]);
  const [availableHospitals, setAvailableHospitals] = useState<string[]>([]);
  const [surgerySetOptions, setSurgerySetOptions] = useState<string[]>([]);
  const [implantBoxOptions, setImplantBoxOptions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load procedure types based on department from Edit Sets
  useEffect(() => {
    const loadProcedureTypes = async () => {
      if (formData.department && caseItem.country) {
        try {
          const { getProcedureTypesForDepartmentIncludingInactive } = await import('../../utils/supabaseDepartmentService');
          const procedureTypes = await getProcedureTypesForDepartmentIncludingInactive(formData.department, caseItem.country);
          setAvailableProcedureTypes(procedureTypes);
        } catch (error) {
          console.error('Error loading procedure types:', error);
          setAvailableProcedureTypes([]);
        }
      }
    };

    loadProcedureTypes();
  }, [formData.department, caseItem.country]);

  // Load hospitals, surgery sets and implant boxes independently  
  useEffect(() => {
    const loadAllOptions = async () => {
      if (caseItem.country) {
        try {
          const normalizedCountry = normalizeCountry(caseItem.country);
          
          // Load hospitals from code_tables
          const { getSupabaseCodeTables } = await import('../../utils/supabaseCodeTableService');
          const countryTables = await getSupabaseCodeTables(normalizedCountry);
          const hospitalTable = countryTables.find(table => table.id === 'hospitals');
          const hospitals = hospitalTable?.items || [];
          setAvailableHospitals(hospitals.sort());
          
          // Load all surgery sets for this country
          const { data: surgerySets, error: surgerySetsError } = await supabase
            .from('surgery_sets')
            .select('name')
            .eq('country', normalizedCountry)
            .eq('is_active', true);

          if (surgerySetsError) {
            console.error('Error loading surgery sets:', surgerySetsError);
            setSurgerySetOptions([]);
          } else {
            setSurgerySetOptions((surgerySets || []).map((s: any) => s.name).sort());
          }

          // Load all implant boxes for this country
          const { data: implantBoxes, error: implantBoxesError } = await supabase
            .from('implant_boxes')
            .select('name')
            .eq('country', normalizedCountry)
            .eq('is_active', true);

          if (implantBoxesError) {
            console.error('Error loading implant boxes:', implantBoxesError);
            setImplantBoxOptions([]);
          } else {
            setImplantBoxOptions((implantBoxes || []).map((i: any) => i.name).sort());
          }

        } catch (error) {
          console.error('Error loading options:', error);
          setAvailableHospitals([]);
          setSurgerySetOptions([]);
          setImplantBoxOptions([]);
        }
      } else {
        setAvailableHospitals([]);
        setSurgerySetOptions([]);
        setImplantBoxOptions([]);
      }
    };
    
    loadAllOptions();
  }, [caseItem.country]);

  useEffect(() => {
    if (amendmentData) {
      setFormData(prev => ({ ...prev, ...amendmentData }));
    }
  }, [amendmentData]);

  // Handle case where caseItem is null or undefined after all hooks are called
  if (!caseItem) {
    console.error('AmendmentForm: caseItem is undefined or null');
    return (
      <div className="amendment-form-error">
        <p>Error: Case data is not available. Please refresh and try again.</p>
        <button onClick={onCancel} className="btn btn-secondary">Close</button>
      </div>
    );
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.hospital.trim()) {
      newErrors.hospital = 'Hospital is required';
    }
    // Department and procedureType validation removed - these fields are read-only in amendment
    if (!formData.dateOfSurgery) {
      newErrors.dateOfSurgery = 'Surgery date is required';
    }
    if (!formData.procedureName.trim()) {
      newErrors.procedureName = 'Procedure name is required';
    }
    if (!formData.amendmentReason.trim()) {
      newErrors.amendmentReason = 'Amendment reason is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Debug logging to track modal rendering
  console.log('🔍 AmendmentForm rendering for case:', caseItem?.caseReferenceNumber);
  
  return (
    <div className="amendment-form-overlay">
      <div className="amendment-form-modal">
        <div className="amendment-form-header">
          <h3>Amend Case: {caseItem.caseReferenceNumber}</h3>
          <button
            type="button"
            className="close-button"
            onClick={onCancel}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="amendment-form">
          <div className="form-grid">
            {/* Hospital */}
            <div className="form-group">
              <label className="required">Hospital</label>
              <SearchableDropdown
                id="amendment-hospital"
                value={formData.hospital}
                onChange={(value) => handleInputChange('hospital', value)}
                options={availableHospitals}
                placeholder="Search and select hospital"
                className={errors.hospital ? 'error' : ''}
                required
              />
              {errors.hospital && <span className="error-text">{errors.hospital}</span>}
            </div>

            {/* Department - Read Only */}
            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                value={formData.department}
                className="readonly-field"
                readOnly
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
              <small className="field-note">Department cannot be changed during amendment</small>
            </div>

            {/* Surgery Date */}
            <div className="form-group">
              <label className="required">Date of Surgery</label>
              <FilterDatePicker
                value={formData.dateOfSurgery}
                onChange={(value) => handleInputChange('dateOfSurgery', value)}
                placeholder="Select surgery date"
                className={errors.dateOfSurgery ? 'error' : ''}
              />
              {errors.dateOfSurgery && <span className="error-text">{errors.dateOfSurgery}</span>}
            </div>

            {/* Time of Procedure */}
            <div className="form-group">
              <label>Time of Procedure</label>
              <TimePicker
                value={formData.timeOfProcedure}
                onChange={(value) => handleInputChange('timeOfProcedure', value)}
                placeholder="Select time"
              />
            </div>

            {/* Procedure Type - Linked to Edit Sets */}
            <div className="form-group">
              <label className="required">Procedure Type</label>
              <select
                value={formData.procedureType}
                onChange={(e) => handleInputChange('procedureType', e.target.value)}
                className={errors.procedureType ? 'error' : ''}
                required
              >
                <option value="">Select Procedure Type</option>
                {availableProcedureTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.procedureType && <span className="error-text">{errors.procedureType}</span>}
            </div>

            {/* Procedure Name */}
            <div className="form-group">
              <label className="required">Procedure Name</label>
              <input
                type="text"
                value={formData.procedureName}
                onChange={(e) => handleInputChange('procedureName', e.target.value)}
                className={errors.procedureName ? 'error' : ''}
                placeholder="Enter procedure name"
              />
              {errors.procedureName && <span className="error-text">{errors.procedureName}</span>}
            </div>

            {/* Doctor Name */}
            <div className="form-group">
              <label>Doctor Name</label>
              <input
                type="text"
                value={formData.doctorName}
                onChange={(e) => handleInputChange('doctorName', e.target.value)}
                placeholder="Enter doctor name"
              />
            </div>

            {/* Special Instructions */}
            <div className="form-group full-width">
              <label>Special Instructions</label>
              <textarea
                value={formData.specialInstruction}
                onChange={(e) => handleInputChange('specialInstruction', e.target.value)}
                placeholder="Enter any special instructions"
                rows={3}
              />
            </div>
          </div>

          {/* Surgery Sets and Implant Boxes */}
          {(surgerySetOptions.length > 0 || implantBoxOptions.length > 0) && (
            <div className="sets-section">
              <h4>Surgery Sets & Implant Boxes</h4>
              
              {surgerySetOptions.length > 0 && (
                <div className="form-group full-width">
                  <MultiSelectDropdown
                    id="amendment-surgery-sets"
                    label="Surgery Set"
                    options={surgerySetOptions}
                    value={formData.surgerySetSelection}
                    onChange={(values) => handleInputChange('surgerySetSelection', values)}
                    placeholder="Select Surgery Sets..."
                  />
                </div>
              )}

              {implantBoxOptions.length > 0 && (
                <div className="form-group full-width">
                  <MultiSelectDropdown
                    id="amendment-implant-boxes"
                    label="Implant Box"
                    options={implantBoxOptions}
                    value={formData.implantBox}
                    onChange={(values) => handleInputChange('implantBox', values)}
                    placeholder="Select Implant Boxes..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Amendment Reason */}
          <div className="form-group full-width">
            <label className="required">Reason for Amendment</label>
            <textarea
              value={formData.amendmentReason}
              onChange={(e) => handleInputChange('amendmentReason', e.target.value)}
              placeholder="Please provide a reason for this amendment"
              rows={3}
              className={errors.amendmentReason ? 'error' : ''}
              required
            />
            {errors.amendmentReason && <span className="error-text">{errors.amendmentReason}</span>}
          </div>

          <div className="amendment-form-actions">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Save Amendment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(AmendmentForm);