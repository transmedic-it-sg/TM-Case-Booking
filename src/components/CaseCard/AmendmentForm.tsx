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
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../../utils/fieldMappings';
import {
  getDoctorsForDepartment,
  getProceduresForDoctor,
  getSetsForDoctorProcedure,
  type DepartmentDoctor,
  type DoctorProcedure,
  type ProcedureSet
} from '../../utils/departmentDoctorService';

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
    doctorId: '', // Will be populated from doctorName
    doctorName: caseItem?.doctorName || '',
    timeOfProcedure: caseItem?.timeOfProcedure || '',
    specialInstruction: caseItem?.specialInstruction || '',
    surgerySetSelection: caseItem?.surgerySetSelection || [],
    implantBox: caseItem?.implantBox || [],
    amendmentReason: ''
  });

  // State for quantities - key is item name, value is quantity
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // State variables for dropdowns
  const [availableProcedureTypes, setAvailableProcedureTypes] = useState<string[]>([]);
  const [availableHospitals, setAvailableHospitals] = useState<string[]>([]);
  const [surgerySetOptions, setSurgerySetOptions] = useState<string[]>([]);
  const [implantBoxOptions, setImplantBoxOptions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingQuantities, setIsLoadingQuantities] = useState(false);
  
  // New state for doctor hierarchy
  const [availableDoctors, setAvailableDoctors] = useState<DepartmentDoctor[]>([]);
  const [availableDoctorProcedures, setAvailableDoctorProcedures] = useState<DoctorProcedure[]>([]);
  const [availableProcedureSets, setAvailableProcedureSets] = useState<ProcedureSet[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false);
  const [isLoadingSets, setIsLoadingSets] = useState(false);
  
  // Helper functions for doctor display
  const formatDoctorDisplayName = (doctor: DepartmentDoctor): string => {
    if (!doctor.name) return '';
    const trimmed = doctor.name.trim();
    // If name already starts with "Dr" or "Dr.", don't add another "Dr."
    if (trimmed.toLowerCase().startsWith('dr')) {
      return trimmed;
    }
    return `Dr. ${trimmed}`;
  };
  
  const getCurrentDoctorDisplayValue = (): string => {
    if (!formData.doctorId && formData.doctorName) {
      // If we have doctorName but no doctorId (existing case), use doctorName
      return formData.doctorName;
    }
    if (!formData.doctorId) return '';
    const currentDoctor = availableDoctors.find(d => d.id === formData.doctorId);
    return currentDoctor ? formatDoctorDisplayName(currentDoctor) : formData.doctorName || '';
  };

  // Load quantities when component mounts
  useEffect(() => {
    const loadQuantities = async () => {
      if (!caseItem?.id) return;

      setIsLoadingQuantities(true);
      try {
        const { data, error } = await supabase
          .from('case_booking_quantities')
          .select('item_name, quantity')
          .eq('case_booking_id', caseItem.id); // ⚠️ case_booking_id (caseBookingId) FK - NOT caseId

        if (error) {
        } else if (data && data.length > 0) {
          const quantityMap: Record<string, number> = {};
          data.forEach(item => {
            quantityMap[item.item_name] = item.quantity;
          });
          setQuantities(quantityMap);
        }
      } catch (err) {
      } finally {
        setIsLoadingQuantities(false);
      }
    };

    loadQuantities();
  }, [caseItem?.id]);

  // Initial load - try to find doctor ID and load all related data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!formData.department || !caseItem.country) return;

      try {
        setIsLoadingDoctors(true);
        const normalizedCountry = normalizeCountry(caseItem.country);
        const doctors = await getDoctorsForDepartment(formData.department, normalizedCountry);
        setAvailableDoctors(doctors);
        
        // Try to match existing doctor name with loaded doctors
        let matchedDoctorId: string | null = null;
        if (formData.doctorName) {
          const matchingDoctor = doctors.find(d => 
            d.name === formData.doctorName || 
            formatDoctorDisplayName(d) === formData.doctorName
          );
          if (matchingDoctor) {
            matchedDoctorId = matchingDoctor.id;
            setFormData(prev => ({ ...prev, doctorId: matchingDoctor.id }));
            
            // Load procedures for this doctor
            setIsLoadingProcedures(true);
            const procedures = await getProceduresForDoctor(matchingDoctor.id, normalizedCountry);
            setAvailableDoctorProcedures(procedures);
            setIsLoadingProcedures(false);
            
            // If we have a procedure type, load sets
            if (formData.procedureType) {
              setIsLoadingSets(true);
              const sets = await getSetsForDoctorProcedure(matchingDoctor.id, formData.procedureType, normalizedCountry);
              setAvailableProcedureSets(sets);
              
              // Update surgery set and implant box options
              const surgerySetNames = sets
                .filter(set => set.item_type === 'surgery_set')
                .map(set => set.item_name);
              const implantBoxNames = sets
                .filter(set => set.item_type === 'implant_box') // ⚠️ implant_box (implantBox)
                .map(set => set.item_name);
              
              setSurgerySetOptions(surgerySetNames);
              setImplantBoxOptions(implantBoxNames);
              setIsLoadingSets(false);
            }
          }
        }
      } catch (error) {
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    loadInitialData();
  }, []); // Run only once on mount

  // Load doctors when department is selected (for department changes)
  useEffect(() => {
    const loadDoctorsForDepartment = async () => {
      if (!formData.department || !caseItem.country) {
        setAvailableDoctors([]);
        return;
      }

      try {
        setIsLoadingDoctors(true);
        const normalizedCountry = normalizeCountry(caseItem.country);
        const doctors = await getDoctorsForDepartment(formData.department, normalizedCountry);
        setAvailableDoctors(doctors);
      } catch (error) {
        setAvailableDoctors([]);
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    loadDoctorsForDepartment();
  }, [formData.department, caseItem.country]);

  // Load procedures when doctor is selected
  useEffect(() => {
    const loadDoctorProcedures = async () => {
      if (!formData.doctorId || !caseItem.country) {
        setAvailableDoctorProcedures([]);
        setAvailableProcedureSets([]);
        return;
      }

      try {
        setIsLoadingProcedures(true);
        const normalizedCountry = normalizeCountry(caseItem.country);
        const procedures = await getProceduresForDoctor(formData.doctorId, normalizedCountry);
        setAvailableDoctorProcedures(procedures);
      } catch (error) {
        setAvailableDoctorProcedures([]);
      } finally {
        setIsLoadingProcedures(false);
      }
    };

    loadDoctorProcedures();
  }, [formData.doctorId, caseItem.country]);

  // Load surgery sets and implant boxes when doctor + procedure is selected
  useEffect(() => {
    const loadDoctorProcedureSets = async () => {
      if (!formData.doctorId || !formData.procedureType || !caseItem.country) {
        setAvailableProcedureSets([]);
        return;
      }

      try {
        setIsLoadingSets(true);
        const normalizedCountry = normalizeCountry(caseItem.country);
        const sets = await getSetsForDoctorProcedure(formData.doctorId, formData.procedureType, normalizedCountry);
        setAvailableProcedureSets(sets);

        // Update surgery set and implant box options
        const surgerySetNames = sets
          .filter(set => set.item_type === 'surgery_set')
          .map(set => set.item_name);
        const implantBoxNames = sets
          .filter(set => set.item_type === 'implant_box')
          .map(set => set.item_name);
        
        setSurgerySetOptions(surgerySetNames);
        setImplantBoxOptions(implantBoxNames);
      } catch (error) {
        setAvailableProcedureSets([]);
      } finally {
        setIsLoadingSets(false);
      }
    };

    loadDoctorProcedureSets();
  }, [formData.doctorId, formData.procedureType, caseItem.country]);

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

          // Load surgery sets respecting Edit Sets sort_order
          const { data: surgerySets, error: surgerySetsError } = await supabase
            .from('surgery_sets')
            .select('name, sort_order')
            .eq('country', normalizedCountry)
            .eq('is_active', true) // ⚠️ is_active (isActive)
            .order('sort_order', { ascending: true, nullsFirst: false })
            .order('name');

          if (surgerySetsError) {
            setSurgerySetOptions([]);
          } else {
            // Preserve the Edit Sets ordering by not sorting alphabetically
            setSurgerySetOptions((surgerySets || []).map((s: any) => s.name));
          }

          // Load implant boxes respecting Edit Sets sort_order
          const { data: implantBoxes, error: implantBoxesError } = await supabase
            .from('implant_boxes')
            .select('name, sort_order')
            .eq('country', normalizedCountry)
            .eq('is_active', true)
            .order('sort_order', { ascending: true, nullsFirst: false })
            .order('name');

          if (implantBoxesError) {
            setImplantBoxOptions([]);
          } else {
            // Preserve the Edit Sets ordering by not sorting alphabetically
            setImplantBoxOptions((implantBoxes || []).map((i: any) => i.name));
          }

        } catch (error) {
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
    if (amendmentData && Object.keys(amendmentData).length > 0) {
      setFormData(prev => ({ ...prev, ...amendmentData }));
    }
  }, [JSON.stringify(amendmentData)]); // Use JSON.stringify to avoid reference changes

  // Handle case where caseItem is null or undefined after all hooks are called
  if (!caseItem) {
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
    
    // Department is read-only in amendment, so no validation needed
    
    if (!formData.dateOfSurgery) {
      newErrors.dateOfSurgery = 'Date of Surgery is required';
    }
    
    if (!formData.doctorName.trim()) {
      newErrors.doctorName = 'Doctor is required';
    }
    
    if (!formData.procedureType.trim()) {
      newErrors.procedureType = 'Procedure Type is required';
    }
    
    if (!formData.procedureName.trim()) {
      newErrors.procedureName = 'Procedure Name is required';
    }
    
    // Surgery sets and implant boxes are optional (matching CaseBookingForm)
    
    if (!formData.amendmentReason.trim()) {
      newErrors.amendmentReason = 'Amendment reason is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Include quantities in the save data
      const saveData = {
        ...formData,
        quantities
      };
      onSave(saveData);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Debug logging removed to prevent infinite rendering
  
  return (
    <div className="amendment-form-overlay">
      <div className="amendment-form-modal">
        <form onSubmit={handleSubmit} className="amendment-form">
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
                value={formData.department || ''}
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

            {/* Procedure Name - matches CaseBookingForm order */}
            <div className="form-group">
              <label className="required">Procedure Name</label>
              <input
                type="text"
                value={formData.procedureName || ''}
                onChange={(e) => handleInputChange('procedureName', e.target.value)}
                className={errors.procedureName ? 'error' : ''}
                placeholder="Enter procedure name"
                required
              />
              {errors.procedureName && <span className="error-text">{errors.procedureName}</span>}
            </div>

            {/* Doctor - SearchableDropdown matching CaseBookingForm */}
            <div className="form-group">
              <label className="required">Doctor</label>
              <SearchableDropdown
                value={getCurrentDoctorDisplayValue()}
                onChange={(doctorDisplayName) => {
                  const selectedDoctor = availableDoctors.find(d =>
                    doctorDisplayName === formatDoctorDisplayName(d)
                  );
                  setFormData(prev => ({
                    ...prev,
                    doctorId: selectedDoctor?.id || '',
                    doctorName: selectedDoctor?.name || doctorDisplayName,
                    procedureType: '', // Reset procedure type when doctor changes
                    surgerySetSelection: [],
                    implantBox: []
                  }));
                }}
                options={availableDoctors.map(formatDoctorDisplayName)}
                placeholder={isLoadingDoctors ? "Loading doctors..." :
                  availableDoctors.length === 0 ? "No doctors available" :
                  "Search and select doctor"
                }
                className={errors.doctorName ? 'error' : ''}
                disabled={isLoadingDoctors}
                required
              />
              {errors.doctorName && <span className="error-text">{errors.doctorName}</span>}
              {availableDoctors.length === 0 && !isLoadingDoctors && (
                <div className="help-text">
                  ℹ️ No doctors found for this department. Contact your administrator to add doctors.
                </div>
              )}
            </div>

            {/* Procedure Type - SearchableDropdown based on selected doctor */}
            <div className="form-group">
              <label className="required">Procedure Type</label>
              <SearchableDropdown
                value={formData.procedureType || ''}
                onChange={(value) => {
                  handleInputChange('procedureType', value);
                  // Reset surgery sets and implant boxes when procedure type changes
                  setFormData(prev => ({
                    ...prev,
                    procedureType: value,
                    surgerySetSelection: [],
                    implantBox: []
                  }));
                }}
                options={availableDoctorProcedures.map(proc => proc.procedure_type)}
                placeholder={!formData.doctorId ? "Please select a doctor first" :
                  isLoadingProcedures ? "Loading procedures..." :
                  availableDoctorProcedures.length === 0 ? "No procedures available for this doctor" :
                  "Select procedure type"
                }
                className={errors.procedureType ? 'error' : ''}
                disabled={!formData.doctorId || isLoadingProcedures}
                required
              />
            </div>

            {/* Special Instructions */}
            <div className="form-group full-width">
              <label>Special Instructions</label>
              <textarea
                value={formData.specialInstruction || ''}
                onChange={(e) => handleInputChange('specialInstruction', e.target.value)}
                placeholder="Enter any special instructions"
                rows={3}
              />
            </div>

            {/* Surgery Sets with Quantities */}
            {surgerySetOptions.length > 0 && (
              <>
                <div className="form-group">
                  <MultiSelectDropdown
                    id="amendment-surgery-sets"
                    label="Surgery Sets"
                    options={surgerySetOptions}
                    value={formData.surgerySetSelection || []}
                    onChange={(values) => handleInputChange('surgerySetSelection', values)}
                    placeholder="Select Surgery Sets..."
                    disabled={!formData.procedureType}
                  />
                </div>
                
                {/* Surgery Sets Quantities */}
                {formData.surgerySetSelection.length > 0 && (
                  <div className="form-group" style={{ marginTop: '-0.5rem', paddingLeft: '1rem' }}>
                    <label style={{ fontSize: '0.9rem', color: '#6c757d' }}>Quantities:</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                      {formData.surgerySetSelection.map(set => (
                        <div key={set} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem' }}>{set}:</span>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={quantities[set] || 1}
                            onChange={(e) => {
                              const quantity = parseInt(e.target.value) || 1;
                              setQuantities(prev => ({ ...prev, [set]: quantity }));
                            }}
                            style={{
                              width: '60px',
                              padding: '4px 8px',
                              border: '1px solid #28a745',
                              borderRadius: '4px',
                              textAlign: 'center'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Implant Boxes with Quantities */}
            {implantBoxOptions.length > 0 && (
              <>
                <div className="form-group">
                  <MultiSelectDropdown
                    id="amendment-implant-boxes"
                    label="Implant Boxes"
                    options={implantBoxOptions}
                    value={formData.implantBox || []}
                    onChange={(values) => handleInputChange('implantBox', values)}
                    placeholder="Select Implant Boxes..."
                    disabled={!formData.procedureType}
                  />
                </div>
                
                {/* Implant Boxes Quantities */}
                {formData.implantBox.length > 0 && (
                  <div className="form-group" style={{ marginTop: '-0.5rem', paddingLeft: '1rem' }}>
                    <label style={{ fontSize: '0.9rem', color: '#6c757d' }}>Quantities:</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                      {formData.implantBox.map(box => (
                        <div key={box} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem' }}>{box}:</span>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={quantities[box] || 1}
                            onChange={(e) => {
                              const quantity = parseInt(e.target.value) || 1;
                              setQuantities(prev => ({ ...prev, [box]: quantity }));
                            }}
                            style={{
                              width: '60px',
                              padding: '4px 8px',
                              border: '1px solid #28a745',
                              borderRadius: '4px',
                              textAlign: 'center'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Amendment Reason */}
          <div className="form-group full-width">
            <label className="required">Reason for Amendment</label>
            <textarea
              value={formData.amendmentReason || ''}
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