/**
 * Doctors-Only Edit Sets Component - Clean Implementation
 * Currently implements only the Doctors tab with proper error handling
 * Future: Will be extended to include Procedure Types and Surgery Sets tabs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../../utils/authCompat';
import { hasPermission, PERMISSION_ACTIONS } from '../../utils/permissions';
import { useToast } from '../ToastContainer';
import { useSound } from '../../contexts/SoundContext';
import SearchableDropdown from '../SearchableDropdown';
import { 
  getDepartmentsForCountry,
  getDoctorsForDepartment,
  addDoctorToDepartment,
  removeDoctorFromSystem,
  type Department,
  type DepartmentDoctor
} from '../../utils/departmentDoctorService';
import { normalizeCountry } from '../../utils/countryUtils';
import '../../assets/components/EditSetsMobile.css';

const DoctorsOnlyEditSets: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser] = useState(getCurrentUser());
  const { showSuccess, showError } = useToast();
  const { playSound } = useSound();

  // State variables for department-based hierarchy
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [availableDoctors, setAvailableDoctors] = useState<DepartmentDoctor[]>([]);

  // Modal states
  const [showAddDoctor, setShowAddDoctor] = useState(false);

  // Form states
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorSpecialties, setNewDoctorSpecialties] = useState('');

  // Error handling
  const [error, setError] = useState<string>('');

  // Permission check
  const canEditDoctors = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EDIT_DOCTORS) : false;
  
  // Backward compatibility - if user has old edit-sets permission, grant access
  const hasLegacyEditSets = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EDIT_SETS) : false;
  const hasEditAccess = canEditDoctors || hasLegacyEditSets;

  // Get user's country
  const userCountry = currentUser?.selectedCountry || currentUser?.country;

  // Clear error helper
  const clearError = useCallback(() => setError(''), []);

  // Load departments when component mounts
  useEffect(() => {
    if (!userCountry) return;

    const loadDepartments = async () => {
      try {
        setIsLoading(true);
        clearError();
        const normalizedCountry = normalizeCountry(userCountry);
        const departments = await getDepartmentsForCountry(normalizedCountry);
        setAvailableDepartments(departments);
      } catch (error) {
        console.error('Error loading departments:', error);
        setError('Failed to load departments');
      } finally {
        setIsLoading(false);
      }
    };

    loadDepartments();
  }, [userCountry, clearError]);

  // Load doctors when department is selected
  useEffect(() => {
    if (!selectedDepartment || !userCountry) {
      setAvailableDoctors([]);
      return;
    }

    const loadDoctors = async () => {
      try {
        setIsLoading(true);
        clearError();
        const normalizedCountry = normalizeCountry(userCountry);
        const doctors = await getDoctorsForDepartment(selectedDepartment.name, normalizedCountry);
        setAvailableDoctors(doctors);
      } catch (error) {
        console.error('Error loading doctors:', error);
        setError('Failed to load doctors');
      } finally {
        setIsLoading(false);
      }
    };

    loadDoctors();
  }, [selectedDepartment, userCountry, clearError]);

  // Add doctor handler
  const handleAddDoctor = useCallback(async () => {
    if (!newDoctorName.trim() || !selectedDepartment || !userCountry || isSubmitting) return;

    try {
      setIsSubmitting(true);
      clearError();

      // Validation
      if (newDoctorName.trim().length < 2) {
        setError('Doctor name must be at least 2 characters long');
        showError('Validation Error', 'Doctor name must be at least 2 characters long');
        playSound.error();
        return;
      }

      const normalizedCountry = normalizeCountry(userCountry);
      const specialtiesArray = newDoctorSpecialties.trim() 
        ? newDoctorSpecialties.trim().split(',').map(s => s.trim()) 
        : [];
      
      const result = await addDoctorToDepartment(
        newDoctorName.trim(),
        selectedDepartment.name,
        normalizedCountry,
        specialtiesArray
      );

      if (result.success) {
        // Reload doctors list
        const doctors = await getDoctorsForDepartment(selectedDepartment.name, normalizedCountry);
        setAvailableDoctors(doctors);
        
        showSuccess('Success', `Doctor "${newDoctorName.trim()}" added successfully`);
        playSound.success();
        
        // Reset form
        setNewDoctorName('');
        setNewDoctorSpecialties('');
        setShowAddDoctor(false);
      } else {
        throw new Error(result.error || 'Failed to add doctor');
      }
      
    } catch (error) {
      console.error('Error adding doctor:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add doctor';
      setError(errorMessage);
      showError('Error', errorMessage);
      playSound.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [newDoctorName, newDoctorSpecialties, selectedDepartment, userCountry, isSubmitting, showSuccess, showError, playSound, clearError]);

  // Delete doctor handler
  const handleDeleteDoctor = useCallback(async (doctor: DepartmentDoctor) => {
    if (!doctor || !userCountry || isSubmitting) return;

    try {
      setIsSubmitting(true);
      clearError();
      
      const normalizedCountry = normalizeCountry(userCountry);
      const result = await removeDoctorFromSystem(doctor.id, normalizedCountry);
      
      if (result.success) {
        // Reload doctors list
        if (selectedDepartment) {
          const doctors = await getDoctorsForDepartment(selectedDepartment.name, normalizedCountry);
          setAvailableDoctors(doctors);
        }
        
        showSuccess('Success', `Doctor "${doctor.name}" removed successfully`);
        playSound.success();
      } else {
        throw new Error(result.error || 'Failed to remove doctor');
      }
      
    } catch (error) {
      console.error('Error removing doctor:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove doctor';
      setError(errorMessage);
      showError('Error', errorMessage);
      playSound.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [userCountry, selectedDepartment, isSubmitting, showSuccess, showError, playSound, clearError]);

  // Permission check
  if (!hasEditAccess) {
    return (
      <div className="edit-sets-container">
        <div className="access-denied">
          <h3>Access Denied</h3>
          <p>You don't have permission to edit doctors. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-sets-container">
      <div className="edit-sets-header">
        <h2>Edit Doctors</h2>
        <p>Manage doctors by department</p>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={clearError} className="btn-close">×</button>
        </div>
      )}

      {/* Department Selection */}
      <div className="department-selection">
        <label htmlFor="department-select">Select Department:</label>
        <SearchableDropdown
          options={availableDepartments.map(dept => ({ value: dept.name, label: dept.name }))}
          value={selectedDepartment?.name || ''}
          onChange={(value) => {
            const dept = availableDepartments.find(d => d.name === value);
            setSelectedDepartment(dept || null);
          }}
          placeholder="Choose a department..."
          disabled={isLoading || isSubmitting}
        />
      </div>

      {/* Doctors List */}
      {selectedDepartment && (
        <div className="doctors-section">
          <div className="section-header">
            <h3>Doctors in {selectedDepartment.name}</h3>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddDoctor(true)}
              disabled={isLoading || isSubmitting}
            >
              + Add Doctor
            </button>
          </div>

          {isLoading ? (
            <div className="loading">Loading doctors...</div>
          ) : (
            <div className="items-list">
              {availableDoctors.length === 0 ? (
                <div className="empty-state">
                  <p>No doctors found in this department.</p>
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => setShowAddDoctor(true)}
                    disabled={isSubmitting}
                  >
                    Add First Doctor
                  </button>
                </div>
              ) : (
                availableDoctors.map((doctor, index) => (
                  <div key={doctor.id} className="item-card">
                    <div className="item-info">
                      <h4>{doctor.name}</h4>
                      {doctor.specialties && (
                        <p className="specialties">Specialties: {doctor.specialties}</p>
                      )}
                    </div>
                    <div className="item-actions">
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleDeleteDoctor(doctor)}
                        disabled={isSubmitting}
                        title="Remove doctor"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Doctor Modal */}
      {showAddDoctor && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Doctor</h3>
              <button
                className="btn-close"
                onClick={() => setShowAddDoctor(false)}
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="doctor-name">Doctor Name *</label>
                <input
                  type="text"
                  id="doctor-name"
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(e.target.value)}
                  placeholder="Enter doctor's full name"
                  disabled={isSubmitting}
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label htmlFor="doctor-specialties">Specialties (Optional)</label>
                <input
                  type="text"
                  id="doctor-specialties"
                  value={newDoctorSpecialties}
                  onChange={(e) => setNewDoctorSpecialties(e.target.value)}
                  placeholder="e.g., Cardiology, Orthopedics"
                  disabled={isSubmitting}
                  maxLength={200}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddDoctor(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddDoctor}
                disabled={isSubmitting || !newDoctorName.trim()}
              >
                {isSubmitting ? 'Adding...' : 'Add Doctor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorsOnlyEditSets;