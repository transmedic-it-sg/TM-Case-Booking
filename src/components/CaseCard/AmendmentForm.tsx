/**
 * AmendmentForm Component - Case amendment form modal
 * Handles case amendments with validation
 */

import React, { useState, useEffect } from 'react';
import { AmendmentFormProps } from './types';
import { getAllProcedureTypes } from '../../utils/storage';
import { getDepartments } from '../../utils/codeTable';
import TimePicker from '../common/TimePicker';
import FilterDatePicker from '../FilterDatePicker';

const AmendmentForm: React.FC<AmendmentFormProps> = ({
  caseItem,
  amendmentData,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    hospital: caseItem.hospital || '',
    department: caseItem.department || '',
    dateOfSurgery: caseItem.dateOfSurgery || '',
    procedureType: caseItem.procedureType || '',
    procedureName: caseItem.procedureName || '',
    doctorName: caseItem.doctorName || '',
    timeOfProcedure: caseItem.timeOfProcedure || '',
    specialInstruction: caseItem.specialInstruction || '',
    surgerySetSelection: caseItem.surgerySetSelection || [],
    implantBox: caseItem.implantBox || []
  });

  const [departments, setDepartments] = useState<string[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load departments and procedure types
    const loadData = async () => {
      const depts = getDepartments();
      const procedures = getAllProcedureTypes();
      setDepartments(depts);
      setProcedureTypes(procedures);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (amendmentData) {
      setFormData(prev => ({ ...prev, ...amendmentData }));
    }
  }, [amendmentData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.hospital.trim()) {
      newErrors.hospital = 'Hospital is required';
    }
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }
    if (!formData.dateOfSurgery) {
      newErrors.dateOfSurgery = 'Surgery date is required';
    }
    if (!formData.procedureType) {
      newErrors.procedureType = 'Procedure type is required';
    }
    if (!formData.procedureName.trim()) {
      newErrors.procedureName = 'Procedure name is required';
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
              <input
                type="text"
                value={formData.hospital}
                onChange={(e) => handleInputChange('hospital', e.target.value)}
                className={errors.hospital ? 'error' : ''}
                placeholder="Enter hospital name"
              />
              {errors.hospital && <span className="error-text">{errors.hospital}</span>}
            </div>

            {/* Department */}
            <div className="form-group">
              <label className="required">Department</label>
              <select
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className={errors.department ? 'error' : ''}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {errors.department && <span className="error-text">{errors.department}</span>}
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

            {/* Procedure Type */}
            <div className="form-group">
              <label className="required">Procedure Type</label>
              <select
                value={formData.procedureType}
                onChange={(e) => handleInputChange('procedureType', e.target.value)}
                className={errors.procedureType ? 'error' : ''}
              >
                <option value="">Select Procedure Type</option>
                {procedureTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
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

          {/* Amendment Reason */}
          <div className="amendment-reason">
            <label className="required">Reason for Amendment</label>
            <textarea
              placeholder="Please provide a reason for this amendment"
              rows={2}
              required
            />
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