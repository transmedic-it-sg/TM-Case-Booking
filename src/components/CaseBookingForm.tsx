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

import React, { useState, useEffect } from 'react';
import { CaseBooking } from '../types';
import { getCurrentUserSync } from '../utils/authCompat';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { useRealtimeCases } from '../hooks/useRealtimeCases';
import { useRealtimeMasterDataQuery } from '../services/realtimeQueryService';
import TimePicker from './common/TimePicker';
import SearchableDropdown from './SearchableDropdown';
import MultiSelectDropdown from './MultiSelectDropdown';
import CustomModal from './CustomModal';
import { useModal } from '../hooks/useModal';
import FilterDatePicker from './FilterDatePicker';
import { addDaysForInput, getTodayForInput } from '../utils/dateFormat';
import { normalizeCountry } from '../utils/countryUtils';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';
import {
  getDoctorsForDepartment,
  getProceduresForDoctor,
  getSetsForDoctorProcedure,
  type DepartmentDoctor,
  type DoctorProcedure,
  type ProcedureSet
} from '../utils/departmentDoctorService';
import {
  type CaseQuantity
} from '../utils/doctorService';

interface CaseBookingFormProps {
  onCaseSubmitted: () => void;
  prefillData?: {
    dateOfSurgery?: string;
    department?: string;
  };
}

const CaseBookingForm: React.FC<CaseBookingFormProps> = ({ onCaseSubmitted, prefillData }) => {
  const currentUser = getCurrentUserSync();
  const { modal, closeModal, showConfirm, showSuccess, showError } = useModal();

  // Real-time cases hook for saving and generating reference numbers
  const { saveCase, generateCaseReferenceNumber } = useRealtimeCases({
    enableRealTime: true,
    enableTesting: true
  });

  // Real-time master data queries - always fresh data

  // Debug user country for hospitals loading issue
  const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
  const { data: departments = [] } = useRealtimeMasterDataQuery('departments', userCountry);
  const { data: hospitals = [] } = useRealtimeMasterDataQuery('hospitals', userCountry);
  const { data: procedures = [] } = useRealtimeMasterDataQuery('procedures', userCountry);

  // Debug query results
  const getDefaultDate = () => {
    return addDaysForInput(3);
  };

  const [formData, setFormData] = useState({
    hospital: '',
    department: prefillData?.department || '',
    dateOfSurgery: prefillData?.dateOfSurgery || getDefaultDate(),
    procedureType: '',
    procedureName: '',
    doctorName: '',
    doctorId: '', // New field for doctor hierarchy
    timeOfProcedure: '',
    surgerySetSelection: [] as string[],
    implantBox: [] as string[],
    specialInstruction: '',
    quantities: {} as Record<string, number> // New field for quantity tracking
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  // NOTE: availableProcedureTypes and availableHospitals now come from real-time queries above

  // New state for department-based doctor hierarchy
  const [availableDoctors, setAvailableDoctors] = useState<DepartmentDoctor[]>([]);
  const [availableDoctorProcedures, setAvailableDoctorProcedures] = useState<DoctorProcedure[]>([]);
  const [availableProcedureSets, setAvailableProcedureSets] = useState<ProcedureSet[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false);
  const [isLoadingSets, setIsLoadingSets] = useState(false);

  // Helper function to format doctor display name consistently
  const formatDoctorDisplayName = (doctor: DepartmentDoctor): string => {
    if (!doctor.name) return '';
    const trimmed = doctor.name.trim();
    // If name already starts with "Dr" or "Dr.", don't add another "Dr."
    if (trimmed.toLowerCase().startsWith('dr')) {
      return trimmed;
    }
    return `Dr. ${trimmed}`;
  };

  // Helper function to get current doctor display value
  const getCurrentDoctorDisplayValue = (): string => {
    if (!formData.doctorId) return '';
    const currentDoctor = availableDoctors.find(d => d.id === formData.doctorId);
    return currentDoctor ? formatDoctorDisplayName(currentDoctor) : '';
  };

  // Check for calendar pre-fill data on component mount
  useEffect(() => {
    // Calendar prefill now passed via props or URL params, not localStorage
    const prefillDate = null;
    const prefillDepartment = null;

    if (prefillDate && prefillDepartment) {
      const parsedDate = new Date(prefillDate);
      // Format date using local timezone to avoid timezone conversion issues
      const formattedDate = parsedDate.getFullYear() + '-' +
        String(parsedDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(parsedDate.getDate()).padStart(2, '0');

      setFormData(prev => ({
        ...prev,
        dateOfSurgery: formattedDate,
        department: prefillDepartment
      }));

      // Pre-fill data handled - no localStorage needed
    }
  }, []);

  // Load hospitals and doctors when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      if (!currentUser) return;

      const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
      if (!userCountry) return;

      try {
        const normalizedCountry = normalizeCountry(userCountry);

        // Load hospitals from Supabase code tables
        const { getSupabaseCodeTables, addSupabaseCodeTableItem } = await import('../utils/supabaseCodeTableService');
        let countryTables = await getSupabaseCodeTables(normalizedCountry);
        let hospitalTable = countryTables.find(table => table.id === 'hospitals');

        // If no hospitals exist for this country, seed them
        if (!hospitalTable || hospitalTable.items.length === 0) {
          const sampleHospitals = [
            `${userCountry} General Hospital`,
            `${userCountry} Medical Center`,
            `${userCountry} Specialist Hospital`,
            `${userCountry} Regional Hospital`
          ];

          for (const hospital of sampleHospitals) {
            try {
              await addSupabaseCodeTableItem('hospitals', hospital, normalizedCountry);
            } catch (error) {
              // Error seeding hospital - continue with others
            }
          }

          // Reload tables after seeding
          countryTables = await getSupabaseCodeTables(normalizedCountry);
          hospitalTable = countryTables.find(table => table.id === 'hospitals');
        }

        const hospitals = hospitalTable?.items || []; // Hospitals loaded via real-time query above

        // Doctors will be loaded when department is selected
        setAvailableDoctors([]);

      } catch (error) {
        // Error loading initial data - hospitals loaded via real-time query above
        setAvailableDoctors([]);
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.selectedCountry]);

  // Load doctors when department is selected (NEW: Department-based doctor loading)
  useEffect(() => {
    const loadDoctorsForDepartment = async () => {
      if (!formData.department || !currentUser) {
        setAvailableDoctors([]);
        setFormData(prev => ({ ...prev, doctorId: '', doctorName: '' }));
        return;
      }

      const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
      if (!userCountry) return;

      try {
        setIsLoadingDoctors(true);
        const normalizedCountry = normalizeCountry(userCountry);
        const doctors = await getDoctorsForDepartment(formData.department, normalizedCountry);
        setAvailableDoctors(doctors);

        // Clear doctor selection when department changes
        setFormData(prev => ({ ...prev, doctorId: '', doctorName: '' }));

      } catch (error) {
        // Error loading doctors for department
        setAvailableDoctors([]);
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    loadDoctorsForDepartment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.department, currentUser?.selectedCountry]);

  // Load procedures when doctor is selected
  useEffect(() => {
    const loadDoctorProcedures = async () => {
      if (!formData.doctorId || !currentUser) {
        setAvailableDoctorProcedures([]);
        setAvailableProcedureSets([]);
        setFormData(prev => ({ ...prev, procedureType: '', surgerySetSelection: [], implantBox: [], quantities: {} }));
        return;
      }

      const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
      if (!userCountry) return;

      try {
        setIsLoadingProcedures(true);
        const normalizedCountry = normalizeCountry(userCountry);
        const procedures = await getProceduresForDoctor(formData.doctorId, normalizedCountry);
        setAvailableDoctorProcedures(procedures);

        // Clear procedure selection and downstream data when doctor changes
        setFormData(prev => ({ ...prev, procedureType: '', surgerySetSelection: [], implantBox: [], quantities: {} }));
        setAvailableProcedureSets([]);

      } catch (error) {
        // Error loading doctor procedures
        setAvailableDoctorProcedures([]);
      } finally {
        setIsLoadingProcedures(false);
      }
    };

    loadDoctorProcedures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.doctorId, currentUser?.selectedCountry]);

  // Load surgery sets and implant boxes when doctor + procedure is selected
  useEffect(() => {
    const loadDoctorProcedureSets = async () => {
      if (!formData.doctorId || !formData.procedureType || !currentUser) {
        setAvailableProcedureSets([]);
        setFormData(prev => ({ ...prev, surgerySetSelection: [], implantBox: [], quantities: {} }));
        return;
      }

      const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
      if (!userCountry) return;

      try {
        setIsLoadingSets(true);
        const normalizedCountry = normalizeCountry(userCountry);
        const sets = await getSetsForDoctorProcedure(formData.doctorId, formData.procedureType, normalizedCountry);
        setAvailableProcedureSets(sets);

        // Auto-select all Surgery Sets and Implant Boxes after loading
        const surgerySetNames = sets
          .filter(set => set.item_type === 'surgery_set')
          .map(set => set.item_name);
        const implantBoxNames = sets
          .filter(set => set.item_type === 'implant_box') // ⚠️ implant_box (implantBox)
          .map(set => set.item_name);

        // Create quantities for all selected items (default quantity: 1)
        const newQuantities: Record<string, number> = {};
        [...surgerySetNames, ...implantBoxNames].forEach(itemName => {
          newQuantities[itemName] = 1;
        });

        setFormData(prev => ({ 
          ...prev, 
          surgerySetSelection: surgerySetNames, 
          implantBox: implantBoxNames, 
          quantities: newQuantities 
        }));

      } catch (error) {
        // Error loading doctor procedure sets
        setAvailableProcedureSets([]);
      } finally {
        setIsLoadingSets(false);
      }
    };

    loadDoctorProcedureSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.doctorId, formData.procedureType, currentUser?.selectedCountry]);

  // Use department-specific procedure types directly (no additional filtering needed)
  const filteredProcedureTypes = procedures;

  // Load department-specific procedure types and categorized sets when department changes
  useEffect(() => {
    let isActive = true; // Cleanup flag to prevent state updates if component unmounts

    const loadDepartmentData = async () => {
      if (formData.department && formData.department.trim()) {
        const user = getCurrentUserSync(); // Get current user inside the effect to avoid dependency issues
        if (user && isActive) {
          const userCountry = user.selectedCountry || user.countries?.[0];

          if (userCountry) {
            try {
              // Load procedure types for this department
              // Procedures now loaded via real-time query above - no manual fetching needed

              if (isActive) {
                // Procedures now loaded via real-time query - no manual setting needed
                // (departmentProcedureTypes.sort());
              }

              // Surgery Sets and Implant Boxes are now loaded independently

            } catch (error) {
              // Error loading department data
              // Fallback to empty data
              if (isActive) {
                // Procedures now loaded via real-time query - no manual setting needed
                // ([]);
              }
            }
          } else {
            if (isActive) {
              // Procedures now loaded via real-time query - no manual setting needed
              // ([]);
            }
          }
        } else {
          if (isActive) {
            // Procedures now loaded via real-time query - no manual setting needed
            // ([]);
          }
        }
      } else {
        // Clear data when no department selected
        if (isActive) {
          // Procedures now loaded via real-time query - no manual setting needed
          // ([]);
        }
      }
    };

    // Add a small delay to debounce rapid changes
    const timeoutId = setTimeout(() => {
      loadDepartmentData();
    }, 100);

    return () => {
      isActive = false; // Prevent state updates if component unmounts
      clearTimeout(timeoutId);
    };
  }, [formData.department]); // Remove currentUser dependency to prevent infinite loops

  // Clear procedure type when department changes to ensure compatibility
  useEffect(() => {
    if (formData.department && formData.procedureType && procedures.length > 0) {
      const isCurrentProcedureTypeValid = procedures.includes(formData.procedureType);
      if (!isCurrentProcedureTypeValid) {
        setFormData(prev => ({
          ...prev,
          procedureType: '',
          surgerySetSelection: [],
          implantBox: []
        }));
      }
    }
  }, [formData.department, formData.procedureType, procedures.length]); // Only depend on length to avoid frequent re-runs

  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

  // Load departments from Supabase using the fixed service
  useEffect(() => {
    const loadDepartments = async () => {
      if (!currentUser) {
        setAvailableDepartments([]);
        return;
      }

      const userCountry = currentUser.selectedCountry || currentUser.countries?.[0];
      if (userCountry) {
        try {
          // Use the STANDARDIZED data service - single source of truth for all dropdowns
          const { getStandardizedDepartments } = await import('../utils/standardizedDataService');
          const countrySpecificDepts = await getStandardizedDepartments(userCountry);

          // Admin and IT users can access all departments for their country
          if (currentUser.role === 'admin' || currentUser.role === 'it') {
            setAvailableDepartments(countrySpecificDepts.sort());
          } else {
            // Other users are restricted to their assigned departments
            const userDepartments = currentUser.departments || [];
            // Filter departments by user's assigned departments
            const userDepartmentNames = userDepartments;
            const filteredDepts = countrySpecificDepts.filter(dept => userDepartmentNames.includes(dept));

            // If no filtered departments, fall back to all available departments
            if (filteredDepts.length === 0) {
              setAvailableDepartments(countrySpecificDepts.sort());
            } else {
              setAvailableDepartments(filteredDepts.sort());
            }
          }
        } catch (error) {
          // Error loading departments from Supabase
          // No fallback - use empty array
          setAvailableDepartments([]); // Empty array if fails - forces user to contact support
        }
      } else {
        // No user or country - no departments available
        setAvailableDepartments([]);
      }
    };

    loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.selectedCountry]);

  // Check if user has permission to create cases
  const canCreateCase = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.CREATE_CASE) : false;

  if (!canCreateCase) {
    return (
      <div className="permission-denied">
        <div className="permission-denied-content">
          <h2>🚫 Access Denied</h2>
          <p>You don't have permission to create new cases.</p>
          <p>Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.hospital.trim()) {
      newErrors.hospital = 'Hospital is required';
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!formData.dateOfSurgery) {
      newErrors.dateOfSurgery = 'Date of Surgery is required';
    }

    if (!formData.doctorId.trim()) {
      newErrors.doctorId = 'Doctor is required';
    }

    if (!formData.procedureType.trim()) {
      newErrors.procedureType = 'Procedure Type is required';
    }

    if (!formData.procedureName.trim()) {
      newErrors.procedureName = 'Procedure Name is required';
    }

    // Surgery sets and implant boxes are now optional

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClearForm = () => {
    showConfirm(
      'Clear Form',
      'Are you sure you want to clear all inputs? This action cannot be undone.',
      () => {
        setFormData({
          hospital: '',
          department: '',
          dateOfSurgery: getDefaultDate(),
          procedureType: '',
          procedureName: '',
          doctorName: '',
          doctorId: '',
          timeOfProcedure: '',
          surgerySetSelection: [],
          implantBox: [],
          specialInstruction: '',
          quantities: {}
        });
        setErrors({});

        // Reset doctor hierarchy state
        setAvailableDoctorProcedures([]);
        setAvailableProcedureSets([]);

        // Show success popup
        showSuccess('All inputs have been successfully cleared!');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Using currentUser from component scope
    if (!currentUser) {
      showError('You must be logged in to submit a case');
      return;
    }

    try {
      const userCountry = normalizeCountry(currentUser.selectedCountry || currentUser.countries?.[0] || '');
      const caseReferenceNumber = await generateCaseReferenceNumber();

      const newCase: CaseBooking = {
        id: '', // Will be generated by Supabase
        caseReferenceNumber,
        ...formData,
        status: 'Case Booked',
        submittedBy: currentUser.id, // Use ID for database foreign key constraint
        submittedAt: new Date().toISOString(),
        country: userCountry
      };

      const savedCase = await saveCase(newCase);

      if (!savedCase) {
        showError('Failed to save case. Please check the console for more details and try again.');
        return;
      }

      // Save quantity data if any sets are selected
      console.log('CaseBookingForm Debug - Form data:', {
        surgerySetSelection: formData.surgerySetSelection,
        implantBox: formData.implantBox,
        quantities: formData.quantities,
        surgerySetCount: formData.surgerySetSelection.length,
        implantBoxCount: formData.implantBox.length,
        quantitiesKeysCount: Object.keys(formData.quantities).length
      });
      
      if ((formData.surgerySetSelection.length > 0 || formData.implantBox.length > 0) && Object.keys(formData.quantities).length > 0) {
        try {
          const { saveCaseQuantities } = await import('../utils/doctorService');
          const quantities: CaseQuantity[] = [];

          // Add surgery set quantities
          formData.surgerySetSelection.forEach(setName => {
            const quantity = formData.quantities[setName] || 1;
            quantities.push({
              item_type: 'surgery_set', // ⚠️ item_type (itemType) - NOT itemtype
              item_name: setName, // ⚠️ item_name (itemName) - NOT itemname
              quantity: quantity
            });
          });

          // Add implant box quantities
          formData.implantBox.forEach(boxName => {
            const quantity = formData.quantities[boxName] || 1;
            quantities.push({
              item_type: 'implant_box',
              item_name: boxName,
              quantity: quantity
            });
          });

          console.log('CaseBookingForm Debug - Quantities to save:', quantities);
          
          if (quantities.length > 0) {
            // Use the actual case ID from the saved case
            console.log('CaseBookingForm Debug - Saving quantities for case:', savedCase.id);
            const quantitiesSaved = await saveCaseQuantities(savedCase.id, quantities);
            console.log('CaseBookingForm Debug - Quantities save result:', quantitiesSaved);
            if (!quantitiesSaved) {
              console.error('CaseBookingForm Debug - Failed to save quantities');
              // Failed to save case quantities, but case was created successfully
            }
          } else {
            console.log('CaseBookingForm Debug - No quantities to save (empty array)');
          }
        } catch (error) {
          console.error('CaseBookingForm Debug - Exception saving quantities:', error);
          // Error saving case quantities
          // Don't fail the entire operation for quantity saving issues
        }
      } else {
        console.log('CaseBookingForm Debug - Skipping quantities save - condition not met');
      }

      // Add audit log for case creation
      try {
        const { auditCaseCreated } = await import('../utils/auditService');
        await auditCaseCreated(
          currentUser.name,
          currentUser.id,
          currentUser.role,
          caseReferenceNumber, // Use the generated reference number since newCase.id is empty
          caseReferenceNumber,
          currentUser.selectedCountry,
          newCase.department
        );
      } catch (error) {
        // Failed to log case creation audit
      }

      // Enhanced email notification temporarily disabled during TypeScript cleanup
      showSuccess('Case Submitted Successfully!', `Case ${newCase.caseReferenceNumber} has been submitted successfully.`);

      setFormData({
        hospital: '',
        department: '',
        dateOfSurgery: getDefaultDate(),
        procedureType: '',
        procedureName: '',
        doctorName: '',
        doctorId: '',
        timeOfProcedure: '',
        surgerySetSelection: [],
        implantBox: [],
        specialInstruction: '',
        quantities: {}
      });

      // Reset doctor hierarchy state
      setAvailableDoctorProcedures([]);
      setAvailableProcedureSets([]);

      onCaseSubmitted();
    } catch (error: any) {
      // Error saving case
      showError('Failed to save case. Please try again.');
      return;
    }
  };

  return (
    <div className="case-booking-form" data-testid="case-booking-form">
      <div className="card-header">
        <h2 className="card-title">New Case Booking</h2>
        <p className="card-subtitle">Fill out the details for your medical case booking</p>
      </div>

      <div className="card-content">
        <form onSubmit={handleSubmit}>
        <div className="form-row three-columns">
          <div className="form-group">
            <label htmlFor="hospital" className="required">Hospital</label>
            <SearchableDropdown
              id="hospital"
              value={formData.hospital}
              onChange={(value) => setFormData(prev => ({ ...prev, hospital: value }))}
              options={hospitals}
              placeholder="Search and select hospital"
              className={errors.hospital ? 'error' : ''}
              required
            />
            {errors.hospital && <span className="error-text">{errors.hospital}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="department" className="required">Department</label>
            <SearchableDropdown
              id="department"
              value={formData.department}
              onChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
              options={availableDepartments}
              placeholder="Search and select department"
              className={errors.department ? 'error' : ''}
              required
            />
            {errors.department && <span className="error-text">{errors.department}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="dateOfSurgery" className="required">Date of Surgery</label>
            <FilterDatePicker
              value={formData.dateOfSurgery}
              onChange={(value) => setFormData(prev => ({ ...prev, dateOfSurgery: value }))}
              placeholder="Select surgery date"
              min={getTodayForInput()}
              className={errors.dateOfSurgery ? 'error' : ''}
            />
            {errors.dateOfSurgery && <span className="error-text">{errors.dateOfSurgery}</span>}
          </div>
        </div>

        <div className="form-row two-columns">
          <div className="form-group">
            <label htmlFor="timeOfProcedure">Time of Procedure</label>
            <TimePicker
              id="timeOfProcedure"
              value={formData.timeOfProcedure}
              onChange={(value) => setFormData(prev => ({ ...prev, timeOfProcedure: value }))}
              placeholder="Select procedure time"
              step={15}
            />
          </div>

          <div className="form-group">
            <label htmlFor="procedureName" className="required">Procedure Name</label>
            <input
              type="text"
              id="procedureName"
              value={formData.procedureName}
              onChange={(e) => setFormData(prev => ({ ...prev, procedureName: e.target.value }))}
              className={errors.procedureName ? 'error' : ''}
              placeholder="Enter procedure name"
            />
            {errors.procedureName && <span className="error-text">{errors.procedureName}</span>}
          </div>
        </div>

        <div className="form-row two-columns">
          {/* Doctor Selection */}
          <div className="form-group">
            <label htmlFor="doctorId" className="required">Doctor</label>
          <SearchableDropdown
            id="doctorId"
            value={getCurrentDoctorDisplayValue()}
            onChange={(doctorDisplayName) => {
              const selectedDoctor = availableDoctors.find(d =>
                doctorDisplayName === formatDoctorDisplayName(d)
              );
              setFormData(prev => ({
                ...prev,
                doctorId: selectedDoctor?.id || '',
                doctorName: selectedDoctor?.name || '',
                procedureType: '',
                surgerySetSelection: [],
                implantBox: [],
                quantities: {}
              }));
            }}
            options={availableDoctors.map(formatDoctorDisplayName)}
            placeholder={isLoadingDoctors ? "Loading doctors..." :
              !formData.department ? "⚠️ Please select a department first" :
              availableDoctors.length === 0 ? "No doctors available - Contact admin to add doctors" :
              "Search and select doctor"
            }
            className={errors.doctorId ? 'error' : ''}
            disabled={isLoadingDoctors || availableDoctors.length === 0 || !formData.department}
            required
          />
          {errors.doctorId && <span className="error-text">{errors.doctorId}</span>}
          {formData.department && availableDoctors.length === 0 && !isLoadingDoctors && (
            <div className="help-text">
              ℹ️ No doctors found for your department. Contact your administrator to add doctors.
            </div>
          )}
          </div>

          {/* Procedure Type Selection - Regular Form Field */}
          <div className="form-group">
            <label htmlFor="doctorProcedureType" className="required">Procedure Type</label>
            <SearchableDropdown
              id="doctorProcedureType"
              value={formData.procedureType}
              onChange={(value) => setFormData(prev => ({
                ...prev,
                procedureType: value
                // Note: surgerySetSelection, implantBox, and quantities will be auto-populated by useEffect
              }))}
              options={availableDoctorProcedures.map(proc => proc.procedure_type)}
              placeholder={!formData.doctorId ? "Please select a doctor first" :
                isLoadingProcedures ? "Loading procedures..." :
                availableDoctorProcedures.length === 0 ? "No procedures available for this doctor" :
                "Select procedure type"
              }
              className={errors.procedureType ? 'error' : ''}
              disabled={!formData.doctorId || isLoadingProcedures || availableDoctorProcedures.length === 0}
              required
            />
            {errors.procedureType && <span className="error-text">{errors.procedureType}</span>}
          </div>
        </div>

        {/* Surgery Sets & Implant Boxes with Multi-Select Dropdowns */}
        {formData.doctorId && formData.procedureType && (
          <div className="form-section-procedure-sets">
            <h3>Surgery Sets & Implant Boxes</h3>
            <p className="section-subtitle">Available sets for {formData.doctorName} - {formData.procedureType}</p>

            {isLoadingSets ? (
              <div className="loading-sets">Loading available sets...</div>
            ) : availableProcedureSets.length === 0 ? (
              <div className="no-sets-message">
                <p>ℹ️ No surgery sets or implant boxes configured for this doctor-procedure combination.</p>
                <p>Contact your administrator to configure sets for this combination.</p>
              </div>
            ) : (
              <div className="procedure-sets-form">
                <div className="form-row two-columns">
                  {/* Surgery Sets */}
                  {availableProcedureSets.filter(set => set.item_type === 'surgery_set').length > 0 && (
                    <>
                      <div className="form-group">
                        <MultiSelectDropdown
                          id="case-booking-surgery-sets"
                          label="Surgery Sets"
                          options={availableProcedureSets
                            .filter(set => set.item_type === 'surgery_set')
                            .map(set => set.item_name)
                          }
                          value={formData.surgerySetSelection}
                          onChange={(values) => setFormData(prev => ({ ...prev, surgerySetSelection: values }))}
                          placeholder="Select Surgery Sets..."
                          required
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
                                  value={formData.quantities[set] || 1}
                                  onChange={(e) => {
                                    const quantity = Math.max(1, parseInt(e.target.value) || 1);
                                    setFormData(prev => ({
                                      ...prev,
                                      quantities: { ...prev.quantities, [set]: quantity }
                                    }));
                                  }}
                                  style={{
                                    width: '60px',
                                    padding: '0.25rem',
                                    borderRadius: '4px',
                                    border: '1px solid #ced4da'
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Implant Boxes */}
                  {availableProcedureSets.filter(set => set.item_type === 'implant_box').length > 0 && (
                    <>
                      <div className="form-group">
                        <MultiSelectDropdown
                          id="case-booking-implant-boxes"
                          label="Implant Boxes"
                          options={availableProcedureSets
                            .filter(set => set.item_type === 'implant_box')
                            .map(set => set.item_name)
                          }
                          value={formData.implantBox}
                          onChange={(values) => setFormData(prev => ({ ...prev, implantBox: values }))}
                          placeholder="Select Implant Boxes..."
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
                                  value={formData.quantities[box] || 1}
                                  onChange={(e) => {
                                    const quantity = Math.max(1, parseInt(e.target.value) || 1);
                                    setFormData(prev => ({
                                      ...prev,
                                      quantities: { ...prev.quantities, [box]: quantity }
                                    }));
                                  }}
                                  style={{
                                    width: '60px',
                                    padding: '0.25rem',
                                    borderRadius: '4px',
                                    border: '1px solid #ced4da'
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

              </div>
            )}
          </div>
        )}

        <div className="form-group form-section-special-instructions">
          <label htmlFor="specialInstruction">Special Instructions</label>
          <textarea
            id="specialInstruction"
            value={formData.specialInstruction}
            onChange={(e) => setFormData(prev => ({ ...prev, specialInstruction: e.target.value }))}
            rows={4}
            placeholder="Enter any additional notes or special instructions..."
          />
        </div>

        <div className="form-actions">
            <button
              type="button"
              onClick={handleClearForm}
              className="btn btn-outline-secondary btn-lg clear-button"
            >
              🗑️ Clear Form
            </button>
            <button type="submit" className="btn btn-primary btn-lg submit-button" data-testid="submit-case-button">
              Submit Case Booking
            </button>
          </div>
        </form>
      </div>
      <CustomModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        actions={modal.type === 'confirm' ? [
          {
            label: 'Cancel',
            onClick: closeModal,
            style: 'secondary'
          },
          {
            label: 'Confirm',
            onClick: modal.onConfirm || closeModal,
            style: 'danger'
          }
        ] : undefined}
        autoClose={modal.autoClose}
        autoCloseDelay={modal.autoCloseDelay}
      />
    </div>
  );
};

export default CaseBookingForm;