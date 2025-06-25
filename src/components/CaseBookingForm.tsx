import React, { useState, useMemo, useEffect } from 'react';
import { CaseBooking, SURGERY_SETS, IMPLANT_BOXES, PROCEDURE_TYPE_MAPPINGS } from '../types';
import { saveCase, generateCaseReferenceNumber, getCategorizedSets, getAllProcedureTypes } from '../utils/storage';
import { getCurrentUser } from '../utils/auth';
import { getHospitals, getDepartments, initializeCodeTables } from '../utils/codeTable';
import MultiSelectDropdown from './MultiSelectDropdown';
import TimePicker from './common/TimePicker';
import SearchableDropdown from './SearchableDropdown';
import CustomModal from './CustomModal';
import { useModal } from '../hooks/useModal';
import { addDaysForInput, getTodayForInput } from '../utils/dateFormat';

interface CaseBookingFormProps {
  onCaseSubmitted: () => void;
}

const CaseBookingForm: React.FC<CaseBookingFormProps> = ({ onCaseSubmitted }) => {
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

  // Load dynamic procedure types and initialize code tables on component mount
  useEffect(() => {
    initializeCodeTables();
    const currentUser = getCurrentUser();
    const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
    const allTypes = getAllProcedureTypes(userCountry);
    setAvailableProcedureTypes(allTypes.sort());
    
    // Load hospitals from code tables
    const hospitals = getHospitals();
    setAvailableHospitals(hospitals.sort());
  }, []);

  const surgerySetOptions = useMemo(() => {
    if (!formData.procedureType) {
      return [...SURGERY_SETS].sort();
    }
    
    // Try to get from categorized sets first
    const currentUser = getCurrentUser();
    const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
    const categorizedSets = getCategorizedSets(userCountry);
    if (categorizedSets[formData.procedureType]?.surgerySets?.length > 0) {
      return categorizedSets[formData.procedureType].surgerySets.sort();
    }
    
    // Fallback to static mapping
    const mapping = PROCEDURE_TYPE_MAPPINGS[formData.procedureType as keyof typeof PROCEDURE_TYPE_MAPPINGS];
    return mapping ? [...mapping.surgerySets].sort() : [...SURGERY_SETS].sort();
  }, [formData.procedureType]);

  const implantBoxOptions = useMemo(() => {
    if (!formData.procedureType) {
      return [...IMPLANT_BOXES].sort();
    }
    
    // Try to get from categorized sets first
    const currentUser = getCurrentUser();
    const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
    const categorizedSets = getCategorizedSets(userCountry);
    if (categorizedSets[formData.procedureType]?.implantBoxes?.length > 0) {
      return categorizedSets[formData.procedureType].implantBoxes.sort();
    }
    
    // Fallback to static mapping
    const mapping = PROCEDURE_TYPE_MAPPINGS[formData.procedureType as keyof typeof PROCEDURE_TYPE_MAPPINGS];
    return mapping ? [...mapping.implantBoxes].sort() : [...IMPLANT_BOXES].sort();
  }, [formData.procedureType]);

  const availableDepartments = useMemo(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return getDepartments().sort();
    }
    
    // Admin and IT users can access all departments
    if (currentUser.role === 'admin' || currentUser.role === 'it') {
      return getDepartments().sort();
    }
    
    // Other users are restricted to their assigned departments
    return getDepartments(currentUser.departments).sort();
  }, []);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      showError('You must be logged in to submit a case');
      return;
    }

    const caseReferenceNumber = generateCaseReferenceNumber();
    
    const newCase: CaseBooking = {
      id: Date.now().toString(),
      caseReferenceNumber,
      ...formData,
      status: 'Case Booked',
      submittedBy: currentUser.name,
      submittedAt: new Date().toISOString(),
      country: currentUser.selectedCountry || 'Singapore'
    };

    saveCase(newCase);
    
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
            <input
              type="date"
              id="dateOfSurgery"
              value={formData.dateOfSurgery}
              onChange={(e) => setFormData(prev => ({ ...prev, dateOfSurgery: e.target.value }))}
              className={errors.dateOfSurgery ? 'error' : ''}
              min={getTodayForInput()}
              required
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
              🗑️ Clear Inputs
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