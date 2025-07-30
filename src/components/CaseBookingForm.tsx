import React, { useState, useMemo, useEffect } from 'react';
import { CaseBooking, SURGERY_SETS, IMPLANT_BOXES, PROCEDURE_TYPE_MAPPINGS } from '../types';
import { CategorizedSets } from '../utils/storage';
import { saveCase, generateCaseReferenceNumber, getAllProcedureTypes, getCategorizedSets } from '../utils/storage';
import { getCurrentUser } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { 
  getHospitals, 
  getHospitalsForCountry,
  getDepartments, 
  initializeCodeTables,
  getDepartmentNamesForUser
} from '../utils/codeTable';
import MultiSelectDropdown from './MultiSelectDropdown';
import TimePicker from './common/TimePicker';
import SearchableDropdown from './SearchableDropdown';
import CustomModal from './CustomModal';
import { useModal } from '../hooks/useModal';
import FilterDatePicker from './FilterDatePicker';
import { addDaysForInput, getTodayForInput } from '../utils/dateFormat';
import { sendNewCaseNotificationEnhanced } from '../utils/enhancedEmailService';
import { normalizeCountry } from '../utils/countryUtils';

interface CaseBookingFormProps {
  onCaseSubmitted: () => void;
}

const CaseBookingForm: React.FC<CaseBookingFormProps> = ({ onCaseSubmitted }) => {
  const currentUser = getCurrentUser();
  const { modal, closeModal, showConfirm, showSuccess, showError } = useModal();

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
    timeOfProcedure: '',
    surgerySetSelection: [] as string[],
    implantBox: [] as string[],
    specialInstruction: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableProcedureTypes, setAvailableProcedureTypes] = useState<string[]>([]);
  const [availableHospitals, setAvailableHospitals] = useState<string[]>([]);
  const [categorizedSets, setCategorizedSets] = useState<CategorizedSets>({});

  // Load dynamic procedure types and initialize code tables on component mount
  useEffect(() => {
    const loadData = async () => {
      initializeCodeTables();
      // Using currentUser from component scope
      const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
      const allTypes = getAllProcedureTypes(userCountry);
      setAvailableProcedureTypes(allTypes.sort());
      
      // Load hospitals from Supabase code tables
      try {
        if (userCountry) {
          const normalizedCountry = normalizeCountry(userCountry);
          
          // Load hospitals from Supabase for this country
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
          
          const hospitals = hospitalTable?.items || [];
          setAvailableHospitals(hospitals.sort());
        } else {
          // Fallback to empty list if no country selected
          setAvailableHospitals([]);
        }
      } catch (error) {
        console.error('Error loading hospitals from Supabase, using fallback:', error);
        // Fallback to localStorage-based functions
        if (userCountry) {
          const hospitals = getHospitalsForCountry(userCountry);
          setAvailableHospitals(hospitals.sort());
        } else {
          const hospitals = getHospitals();
          setAvailableHospitals(hospitals.sort());
        }
      }
      
      // Load categorized sets from Supabase
      try {
        const normalizedCountry = normalizeCountry(userCountry || 'Singapore');
        const sets = await getCategorizedSets(normalizedCountry);
        setCategorizedSets(sets);
        // Loaded categorized sets successfully
      } catch (error) {
        console.error('Error loading categorized sets:', error);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate effect to handle currentUser changes - run only once to avoid infinite loops
  useEffect(() => {
    if (currentUser) {
      const userCountry = currentUser.selectedCountry || currentUser.countries?.[0];
      if (userCountry) {
        const allTypes = getAllProcedureTypes(userCountry);
        setAvailableProcedureTypes(allTypes.sort());
      }
    }
    // Remove dependencies to prevent infinite loops since currentUser can change on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const surgerySetOptions = useMemo(() => {
    if (!formData.procedureType) {
      return [...SURGERY_SETS].sort();
    }
    
    // Try to get from categorized sets first (loaded from Supabase)
    if (categorizedSets[formData.procedureType]?.surgerySets?.length > 0) {
      return categorizedSets[formData.procedureType].surgerySets.sort();
    }
    
    // Fallback to static mapping
    const mapping = PROCEDURE_TYPE_MAPPINGS[formData.procedureType as keyof typeof PROCEDURE_TYPE_MAPPINGS];
    return mapping ? [...mapping.surgerySets].sort() : [...SURGERY_SETS].sort();
  }, [formData.procedureType, categorizedSets]);

  const implantBoxOptions = useMemo(() => {
    if (!formData.procedureType) {
      return [...IMPLANT_BOXES].sort();
    }
    
    // Try to get from categorized sets first (loaded from Supabase)
    if (categorizedSets[formData.procedureType]?.implantBoxes?.length > 0) {
      return categorizedSets[formData.procedureType].implantBoxes.sort();
    }
    
    // Fallback to static mapping
    const mapping = PROCEDURE_TYPE_MAPPINGS[formData.procedureType as keyof typeof PROCEDURE_TYPE_MAPPINGS];
    return mapping ? [...mapping.implantBoxes].sort() : [...IMPLANT_BOXES].sort();
  }, [formData.procedureType, categorizedSets]);

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
          // Use the fixed Supabase service
          const { getSupabaseCodeTables } = await import('../utils/supabaseCodeTableService');
          const countryData = await getSupabaseCodeTables(userCountry);
          const departmentsTable = countryData.find(t => t.id === 'departments');
          const countrySpecificDepts = departmentsTable?.items || [];
          
          // Admin and IT users can access all departments for their country
          if (currentUser.role === 'admin' || currentUser.role === 'it') {
            setAvailableDepartments(countrySpecificDepts.sort());
          } else {
            // Other users are restricted to their assigned departments
            const userDepartments = currentUser.departments || [];
            const userDepartmentNames = getDepartmentNamesForUser(userDepartments, [userCountry]);
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
          // Fallback to global departments only if service fails
          setAvailableDepartments(getDepartments().sort());
        }
      } else {
        // Fallback to global departments
        setAvailableDepartments(getDepartments().sort());
      }
    };

    loadDepartments();
    // Include currentUser in dependencies but add proper null check to prevent infinite loops
  }, [currentUser?.id, currentUser?.selectedCountry, currentUser]);

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

    if (!formData.procedureType.trim()) {
      newErrors.procedureType = 'Procedure Type is required';
    }

    if (!formData.procedureName.trim()) {
      newErrors.procedureName = 'Procedure Name is required';
    }

    if (formData.surgerySetSelection.length === 0) {
      newErrors.surgerySetSelection = 'Surgery Set Selection is required';
    }

    if (formData.implantBox.length === 0) {
      newErrors.implantBox = 'Implant Box selection is required';
    }

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
          timeOfProcedure: '',
          surgerySetSelection: [],
          implantBox: [],
          specialInstruction: ''
        });
        setErrors({});
        
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
      const caseReferenceNumber = await generateCaseReferenceNumber(userCountry);
      
      const newCase: CaseBooking = {
        id: '', // Will be generated by Supabase
        caseReferenceNumber,
        ...formData,
        status: 'Case Booked',
        submittedBy: currentUser.id, // Use ID for database foreign key constraint
        submittedAt: new Date().toISOString(),
        country: userCountry
      };

      await saveCase(newCase);
      
      // Add audit log for case creation
      try {
        const { auditCaseCreated } = await import('../utils/auditService');
        await auditCaseCreated(
          currentUser.name,
          currentUser.id,
          currentUser.role,
          newCase.id,
          newCase.caseReferenceNumber,
          currentUser.selectedCountry,
          newCase.department
        );
      } catch (error) {
        console.error('Failed to log case creation audit:', error);
      }
      
      // Send enhanced email notification for new case with debugging
      sendNewCaseNotificationEnhanced(newCase).then(emailSent => {
        if (emailSent) {
          console.log('✅ Enhanced email notification sent for new case:', newCase.caseReferenceNumber);
        } else {
          console.warn('⚠️ Enhanced email notification failed for new case:', newCase.caseReferenceNumber);
          console.log('💡 Check browser console for detailed debugging information');
        }
      }).catch(error => {
        console.error('💥 Error in enhanced email notification:', error);
      });
      
      setFormData({
        hospital: '',
        department: '',
        dateOfSurgery: getDefaultDate(),
        procedureType: '',
        procedureName: '',
        doctorName: '',
        timeOfProcedure: '',
        surgerySetSelection: [],
        implantBox: [],
        specialInstruction: ''
      });

      onCaseSubmitted();
    } catch (error) {
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
              options={availableHospitals}
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
            <label htmlFor="procedureType" className="required">Procedure Type</label>
            <SearchableDropdown
              id="procedureType"
              value={formData.procedureType}
              onChange={(value) => setFormData(prev => ({ 
                ...prev, 
                procedureType: value,
                surgerySetSelection: [],
                implantBox: []
              }))}
              options={availableProcedureTypes}
              placeholder="Search and select procedure type"
              className={errors.procedureType ? 'error' : ''}
              required
            />
            {errors.procedureType && <span className="error-text">{errors.procedureType}</span>}
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

          <div className="form-group">
            <label htmlFor="doctorName">Doctor Name</label>
            <input
              type="text"
              id="doctorName"
              value={formData.doctorName}
              onChange={(e) => setFormData(prev => ({ ...prev, doctorName: e.target.value }))}
            />
          </div>
        </div>

        <div className="form-section-surgery-sets">
          <MultiSelectDropdown
            id="surgerySetSelection"
            label="Surgery Set"
            options={surgerySetOptions}
            value={formData.surgerySetSelection}
            onChange={(values) => setFormData(prev => ({ ...prev, surgerySetSelection: values }))}
            placeholder="Select surgery sets..."
            required={true}
          />
          {formData.surgerySetSelection.length > 0 && (
            <div className="selection-indicator">
              <span className="indicator-label">Selected ({formData.surgerySetSelection.length}): </span>
              <div className="selected-items-container">
                {formData.surgerySetSelection.map((item, index) => (
                  <span key={item} className="selected-item-badge">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          {errors.surgerySetSelection && <span className="error-text">{errors.surgerySetSelection}</span>}
        </div>

        <div className="form-section-implant-boxes">
          <MultiSelectDropdown
            id="implantBox"
            label="Implant Box"
            options={implantBoxOptions}
            value={formData.implantBox}
            onChange={(values) => setFormData(prev => ({ ...prev, implantBox: values }))}
            placeholder="Select implant boxes..."
            required={true}
          />
          {formData.implantBox.length > 0 && (
            <div className="selection-indicator">
              <span className="indicator-label">Selected ({formData.implantBox.length}): </span>
              <div className="selected-items-container">
                {formData.implantBox.map((item, index) => (
                  <span key={item} className="selected-item-badge">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          {errors.implantBox && <span className="error-text">{errors.implantBox}</span>}
        </div>

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