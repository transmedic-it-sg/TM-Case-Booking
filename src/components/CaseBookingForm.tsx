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
}

const CaseBookingForm: React.FC<CaseBookingFormProps> = ({ onCaseSubmitted }) => {
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
    department: '',
    dateOfSurgery: getDefaultDate(),
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

  // Helper function to format doctor display name
  const formatDoctorDisplayName = (doctor: DepartmentDoctor): string => {
    return `Dr. ${doctor.name}`;
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

      // Clear the pre-fill data from localStorage
      localStorage.removeItem('calendar_prefill_date');
      localStorage.removeItem('calendar_prefill_department');
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
              console.error('Error seeding hospital:', hospital, error);
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
        console.error('Error loading initial data:', error);
        // Hospitals loaded via real-time query above
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
        console.error('Error loading doctors for department:', error);
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
        console.error('Error loading doctor procedures:', error);
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

        // Clear set selections and quantities when doctor/procedure changes
        setFormData(prev => ({ ...prev, surgerySetSelection: [], implantBox: [], quantities: {} }));

      } catch (error) {
        console.error('Error loading doctor procedure sets:', error);
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
              console.error('Error loading department data:', error);
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
    if (formData.department && formData.procedureType) {
      const isCurrentProcedureTypeValid = filteredProcedureTypes.includes(formData.procedureType);
      if (!isCurrentProcedureTypeValid) {
        setFormData(prev => ({
          ...prev,
          procedureType: '',
          surgerySetSelection: [],
          implantBox: []
        }));
      }
    }
  }, [formData.department, formData.procedureType, filteredProcedureTypes]);

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
          // Use the CORRECT code table service instead of the wrong departments table
          const { getDepartmentsForCountry } = await import('../utils/supabaseCodeTableService');
          const countrySpecificDepts = await getDepartmentsForCountry(userCountry);

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
          console.error('Error loading departments from Supabase:', error);
          // Try alternative service as fallback - no hardcoded data
          try {
            const { getDepartments } = await import('../services/constantsService');
            const fallbackDepartments = await getDepartments(userCountry);
            setAvailableDepartments(fallbackDepartments.sort());
          } catch (fallbackError) {
            console.error('All department loading methods failed:', fallbackError);
            setAvailableDepartments([]); // Empty array if all fails - forces user to contact support
          }
        }
      } else {
        // Try to get departments for the country using alternative service
        try {
          const { getDepartments } = await import('../services/constantsService');
          const departments = await getDepartments(userCountry);
          setAvailableDepartments(departments.sort());
        } catch (error) {
          console.error('Error loading departments for country:', error);
          setAvailableDepartments([]);
        }
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
      const userCountry = normalizeCountry(currentUser.selectedCountry || 'Singapore');
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
        showError('Failed to save case. Please try again.');
        return;
      }

      // Save quantity data if any sets are selected
      if ((formData.surgerySetSelection.length > 0 || formData.implantBox.length > 0) && Object.keys(formData.quantities).length > 0) {
        try {
          const { saveCaseQuantities } = await import('../utils/doctorService');
          const quantities: CaseQuantity[] = [];

          // Add surgery set quantities
          formData.surgerySetSelection.forEach(setName => {
            const quantity = formData.quantities[setName] || 1;
            quantities.push({
              item_type: 'surgery_set',
              item_name: setName,
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

          if (quantities.length > 0) {
            // Use the actual case ID from the saved case
            const quantitiesSaved = await saveCaseQuantities(savedCase.id, quantities);
            if (!quantitiesSaved) {
              console.warn('Failed to save case quantities, but case was created successfully');
            }
          }
        } catch (error) {
          console.error('Error saving case quantities:', error);
          // Don't fail the entire operation for quantity saving issues
        }
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
        console.error('Failed to log case creation audit:', error);
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
      console.error('Error saving case:', error);
      showError('Failed to save case. Please try again.');
      return;
    }
  };

  return (
    <div className="case-booking-form">
      <div className="card-header">
        <h2 className="card-title">New Case Booking</h2>
        <p className="card-subtitle">Fill out the details for your medical case booking</p>
      </div>

      <div className="card-content">
        <form onSubmit={handleSubmit}>
        <div className="form-row">
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
        </div>

        <div className="form-row">
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
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="procedureName" className="required">Procedure Name</label>
            <input
              type="text"
              id="procedureName"
              value={formData.procedureName}
              onChange={(e) => setFormData(prev => ({ ...prev, procedureName: e.target.value }))}
              className={errors.procedureName ? 'error' : ''}
            />
            {errors.procedureName && <span className="error-text">{errors.procedureName}</span>}
          </div>
        </div>

        {/* Doctor Selection - Regular Form Field */}
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
              availableDoctors.length === 0 ? "No doctors available - Contact admin to add doctors" :
              "Search and select doctor"
            }
            className={errors.doctorId ? 'error' : ''}
            disabled={isLoadingDoctors || availableDoctors.length === 0 || !formData.department}
            required
          />
          {errors.doctorId && <span className="error-text">{errors.doctorId}</span>}
          {!formData.department && (
            <div className="help-text">
              ℹ️ Please select a department first
            </div>
          )}
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
              procedureType: value,
              surgerySetSelection: [],
              implantBox: [],
              quantities: {}
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
          {formData.doctorId && availableDoctorProcedures.length === 0 && !isLoadingProcedures && (
            <div className="help-text">
              ℹ️ No procedures configured for this doctor. Contact your administrator.
            </div>
          )}
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
                <div className="form-row">
                  {/* Surgery Sets Multi-Select Dropdown */}
                  {availableProcedureSets.filter(set => set.item_type === 'surgery_set').length > 0 && (
                    <div className="form-group">
                      <MultiSelectDropdown
                        id="surgerySetSelection"
                        label="Surgery Sets"
                        options={availableProcedureSets
                          .filter(set => set.item_type === 'surgery_set')
                          .map(set => set.item_name)
                        }
                        value={formData.surgerySetSelection}
                        onChange={(selectedSets: string[]) => {
                          setFormData(prev => {
                            const newQuantities = { ...prev.quantities };

                            // Add quantities for newly selected sets
                            selectedSets.forEach((setName: string) => {
                              if (!prev.surgerySetSelection.includes(setName) && !newQuantities[setName]) {
                                newQuantities[setName] = 1;
                              }
                            });

                            // Remove quantities for deselected sets
                            prev.surgerySetSelection.forEach(setName => {
                              if (!selectedSets.includes(setName)) {
                                delete newQuantities[setName];
                              }
                            });

                            return {
                              ...prev,
                              surgerySetSelection: selectedSets,
                              quantities: newQuantities
                            };
                          });
                        }}
                        placeholder="Select surgery sets..."
                        className="multi-select-dropdown"
                      />
                    </div>
                  )}

                  {/* Implant Boxes Multi-Select Dropdown */}
                  {availableProcedureSets.filter(set => set.item_type === 'implant_box').length > 0 && (
                    <div className="form-group">
                      <MultiSelectDropdown
                        id="implantBoxSelection"
                        label="Implant Boxes"
                        options={availableProcedureSets
                          .filter(set => set.item_type === 'implant_box')
                          .map(set => set.item_name)
                        }
                        value={formData.implantBox}
                        onChange={(selectedBoxes: string[]) => {
                          setFormData(prev => {
                            const newQuantities = { ...prev.quantities };

                            // Add quantities for newly selected boxes
                            selectedBoxes.forEach((boxName: string) => {
                              if (!prev.implantBox.includes(boxName) && !newQuantities[boxName]) {
                                newQuantities[boxName] = 1;
                              }
                            });

                            // Remove quantities for deselected boxes
                            prev.implantBox.forEach(boxName => {
                              if (!selectedBoxes.includes(boxName)) {
                                delete newQuantities[boxName];
                              }
                            });

                            return {
                              ...prev,
                              implantBox: selectedBoxes,
                              quantities: newQuantities
                            };
                          });
                        }}
                        placeholder="Select implant boxes..."
                        className="multi-select-dropdown"
                      />
                    </div>
                  )}
                </div>

                {/* Quantity Inputs for Selected Items */}
                {(formData.surgerySetSelection.length > 0 || formData.implantBox.length > 0) && (
                  <div className="quantities-section">
                    <h4>Quantities</h4>
                    <div className="quantities-grid">
                      {formData.surgerySetSelection.map(setName => (
                        <div key={`qty-surgery-${setName}`} className="quantity-item">
                          <label>{setName}</label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={formData.quantities[setName] || 1}
                            onChange={(e) => {
                              const quantity = Math.max(1, parseInt(e.target.value) || 1);
                              setFormData(prev => ({
                                ...prev,
                                quantities: {
                                  ...prev.quantities,
                                  [setName]: quantity
                                }
                              }));
                            }}
                            className="quantity-field"
                          />
                        </div>
                      ))}
                      {formData.implantBox.map(boxName => (
                        <div key={`qty-implant-${boxName}`} className="quantity-item">
                          <label>{boxName}</label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={formData.quantities[boxName] || 1}
                            onChange={(e) => {
                              const quantity = Math.max(1, parseInt(e.target.value) || 1);
                              setFormData(prev => ({
                                ...prev,
                                quantities: {
                                  ...prev.quantities,
                                  [boxName]: quantity
                                }
                              }));
                            }}
                            className="quantity-field"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
            <button type="submit" className="btn btn-primary btn-lg submit-button">
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