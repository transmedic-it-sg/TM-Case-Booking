import React, { useState, useMemo } from 'react';
import { CaseBooking, SURGERY_SETS, IMPLANT_BOXES, PROCEDURE_TYPES, PROCEDURE_TYPE_MAPPINGS, DEPARTMENTS } from '../types';
import { saveCase, generateCaseReferenceNumber, getCategorizedSets } from '../utils/storage';
import { getCurrentUser } from '../utils/auth';
import MultiSelectDropdown from './MultiSelectDropdown';
import DatePicker from './DatePicker';

interface CaseBookingFormProps {
  onCaseSubmitted: () => void;
}

const CaseBookingForm: React.FC<CaseBookingFormProps> = ({ onCaseSubmitted }) => {
  const getDefaultDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 3);
    return today.toISOString().split('T')[0];
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

  const surgerySetOptions = useMemo(() => {
    if (!formData.procedureType) {
      return [...SURGERY_SETS];
    }
    
    // Try to get from categorized sets first
    const categorizedSets = getCategorizedSets();
    if (categorizedSets[formData.procedureType]?.surgerySets?.length > 0) {
      return categorizedSets[formData.procedureType].surgerySets;
    }
    
    // Fallback to static mapping
    const mapping = PROCEDURE_TYPE_MAPPINGS[formData.procedureType as keyof typeof PROCEDURE_TYPE_MAPPINGS];
    return mapping ? mapping.surgerySets : [...SURGERY_SETS];
  }, [formData.procedureType]);

  const implantBoxOptions = useMemo(() => {
    if (!formData.procedureType) {
      return [...IMPLANT_BOXES];
    }
    
    // Try to get from categorized sets first
    const categorizedSets = getCategorizedSets();
    if (categorizedSets[formData.procedureType]?.implantBoxes?.length > 0) {
      return categorizedSets[formData.procedureType].implantBoxes;
    }
    
    // Fallback to static mapping
    const mapping = PROCEDURE_TYPE_MAPPINGS[formData.procedureType as keyof typeof PROCEDURE_TYPE_MAPPINGS];
    return mapping ? mapping.implantBoxes : [...IMPLANT_BOXES];
  }, [formData.procedureType]);

  const availableDepartments = useMemo(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return [...DEPARTMENTS];
    }
    
    // Admin and IT users can access all departments
    if (currentUser.role === 'admin' || currentUser.role === 'it') {
      return [...DEPARTMENTS];
    }
    
    // Other users are restricted to their assigned departments
    if (currentUser.departments && currentUser.departments.length > 0) {
      return currentUser.departments.filter(dept => DEPARTMENTS.includes(dept as any));
    }
    
    // Fallback to all departments if user has no department restrictions
    return [...DEPARTMENTS];
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

  const handleMultiSelectChange = (field: 'surgerySetSelection' | 'implantBox', value: string) => {
    setFormData(prev => {
      const currentValues = prev[field];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      return { ...prev, [field]: newValues };
    });
  };

  const handleClearForm = () => {
    if (confirm('Are you sure you want to clear all inputs? This action cannot be undone.')) {
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
      alert('✅ All inputs have been successfully cleared!');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert('You must be logged in to submit a case');
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
      dateOfSurgery: '',
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
            <input
              type="text"
              id="hospital"
              value={formData.hospital}
              onChange={(e) => setFormData(prev => ({ ...prev, hospital: e.target.value }))}
              className={errors.hospital ? 'error' : ''}
            />
            {errors.hospital && <span className="error-text">{errors.hospital}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="department" className="required">Department</label>
            <select
              id="department"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              className={errors.department ? 'error' : ''}
            >
              <option value="">Select Department</option>
              {availableDepartments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
            {errors.department && <span className="error-text">{errors.department}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <DatePicker
              id="dateOfSurgery"
              label="Date of Surgery"
              value={formData.dateOfSurgery}
              onChange={(value) => setFormData(prev => ({ ...prev, dateOfSurgery: value }))}
              required={true}
              error={errors.dateOfSurgery}
              min={new Date().toISOString().split('T')[0]}
              placeholder="Select surgery date"
            />
          </div>

          <div className="form-group">
            <label htmlFor="timeOfProcedure">Time of Procedure</label>
            <div className="time-input-wrapper" onClick={() => (document.getElementById('timeOfProcedure') as HTMLInputElement)?.showPicker?.()}>
              <input
                type="time"
                id="timeOfProcedure"
                value={formData.timeOfProcedure}
                onChange={(e) => setFormData(prev => ({ ...prev, timeOfProcedure: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="procedureType" className="required">Procedure Type</label>
            <select
              id="procedureType"
              value={formData.procedureType}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                procedureType: e.target.value,
                surgerySetSelection: [],
                implantBox: []
              }))}
              className={errors.procedureType ? 'error' : ''}
            >
              <option value="">Select Procedure Type</option>
              {PROCEDURE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.procedureType && <span className="error-text">{errors.procedureType}</span>}
          </div>

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
              className="btn btn-outline-secondary btn-md clear-button"
            >
              🗑️ Clear Inputs
            </button>
            <button type="submit" className="btn btn-primary btn-lg submit-button">
              Submit Case Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaseBookingForm;