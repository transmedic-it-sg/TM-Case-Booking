/**
 * Enhanced Edit Sets Component - Department-Based 3-Tab System
 * Hierarchy: Country -> Department -> Doctor -> Procedure Type -> Surgery Sets & Implant Boxes
 * 1. Doctors - Manage doctors by department (CRUD operations)
 * 2. Procedure Types - Manage procedures for selected doctor (CRUD operations)
 * 3. Surgery and Implants - Manage sets for selected doctor + procedure combination
 */

import React, { useState, useEffect, useMemo } from 'react';
import { getCurrentUser } from '../../utils/authCompat';
import { hasPermission, PERMISSION_ACTIONS } from '../../utils/permissions';
import { useToast } from '../ToastContainer';
import { useSound } from '../../contexts/SoundContext';
import SearchableDropdown from '../SearchableDropdown';
import { 
  getDepartmentsForCountry,
  getDoctorsForDepartment,
  getProceduresForDoctor, 
  getSetsForDoctorProcedure,
  addDoctorToDepartment,
  removeDoctorFromSystem,
  type Department,
  type DepartmentDoctor,
  type DoctorProcedure,
  type ProcedureSet
} from '../../utils/departmentDoctorService';
import { 
  addProcedureToDoctor,
  deleteDoctorProcedure
} from '../../utils/doctorService';
import { normalizeCountry } from '../../utils/countryUtils';
import '../../assets/components/EditSetsMobile.css';

const MAIN_TABS = {
  DOCTORS: 'doctors',
  PROCEDURE_TYPES: 'procedure_types',
  SURGERY_AND_IMPLANTS: 'surgery_and_implants'
} as const;

type MainTabType = typeof MAIN_TABS[keyof typeof MAIN_TABS];

const EnhancedEditSets: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>(MAIN_TABS.DOCTORS);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSets, setIsLoadingSets] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser] = useState(getCurrentUser());
  const { showSuccess, showError } = useToast();
  const { playSound } = useSound();

  // State variables for department-based hierarchy
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [availableDoctors, setAvailableDoctors] = useState<DepartmentDoctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DepartmentDoctor | null>(null);
  const [doctorProcedures, setDoctorProcedures] = useState<DoctorProcedure[]>([]);
  const [selectedProcedureType, setSelectedProcedureType] = useState<string>('');
  const [procedureSets, setProcedureSets] = useState<ProcedureSet[]>([]);

  // Modal states
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [showEditDoctor, setShowEditDoctor] = useState(false);
  const [showAddProcedure, setShowAddProcedure] = useState(false);
  const [showEditProcedure, setShowEditProcedure] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newProcedureType, setNewProcedureType] = useState('');
  const [editingDoctor, setEditingDoctor] = useState<DepartmentDoctor | null>(null);
  const [editingProcedure, setEditingProcedure] = useState<string>('');
  const [editedDoctorName, setEditedDoctorName] = useState('');
  const [editedProcedureType, setEditedProcedureType] = useState('');
  
  // State for reordering
  const [doctorOrder, setDoctorOrder] = useState<string[]>([]);
  const [procedureOrder, setProcedureOrder] = useState<string[]>([]);

  // Permission check
  const canEditSets = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EDIT_SETS) : false;

  // Get user's country with validation
  const userCountry = useMemo(() => {
    const country = currentUser?.selectedCountry || currentUser?.countries?.[0] || '';
    if (!country) {
      console.warn('No country available for user:', currentUser);
    }
    return country;
  }, [currentUser]);

  // Error state management
  const [error, setError] = useState<string>('');
  const clearError = () => setError('');

  // Load departments for the country
  useEffect(() => {
    const loadDepartments = async () => {
      if (!userCountry || !canEditSets) {
        setAvailableDepartments([]);
        return;
      }

      try {
        setIsLoading(true);
        const departments = await getDepartmentsForCountry(normalizeCountry(userCountry));
        console.log('🏥 Loaded departments for', userCountry, ':', departments);
        setAvailableDepartments(departments);
        
        // Reset all selections
        setSelectedDepartment(null);
        setAvailableDoctors([]);
        setSelectedDoctor(null);
        setDoctorProcedures([]);
        setSelectedProcedureType('');
        setProcedureSets([]);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error loading departments:', error);
        setError(`Failed to load departments: ${errorMsg}`);
        showError('Error', 'Failed to load departments');
      } finally {
        setIsLoading(false);
      }
    };

    loadDepartments();
  }, [userCountry, canEditSets, showError]);

  // Load doctors when department is selected
  useEffect(() => {
    const loadDoctorsForDepartment = async () => {
      if (!selectedDepartment || !userCountry) {
        setAvailableDoctors([]);
        return;
      }

      try {
        setIsLoading(true);
        const doctors = await getDoctorsForDepartment(selectedDepartment.name, normalizeCountry(userCountry));
        console.log('👨‍⚕️ Loaded doctors for department', selectedDepartment.name, ':', doctors);
        setAvailableDoctors(doctors);
        
        // Reset doctor-dependent selections
        setSelectedDoctor(null);
        setDoctorProcedures([]);
        setSelectedProcedureType('');
        setProcedureSets([]);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error loading doctors for department:', error);
        setError(`Failed to load doctors for ${selectedDepartment.name}: ${errorMsg}`);
        showError('Error', 'Failed to load doctors for department');
      } finally {
        setIsLoading(false);
      }
    };

    loadDoctorsForDepartment();
  }, [selectedDepartment, userCountry, showError]);

  // Load procedures when doctor changes
  useEffect(() => {
    const loadProcedures = async () => {
      if (!selectedDoctor || !userCountry) {
        setDoctorProcedures([]);
        return;
      }

      try {
        setIsLoading(true);
        const procedures = await getProceduresForDoctor(selectedDoctor.id, normalizeCountry(userCountry));
        console.log('🔬 Loaded procedures for', selectedDoctor.name, ':', procedures);
        setDoctorProcedures(procedures);
        
        // Reset procedure selection
        setSelectedProcedureType('');
        setProcedureSets([]);
      } catch (error) {
        console.error('Error loading procedures:', error);
        showError('Error', 'Failed to load procedures');
      } finally {
        setIsLoading(false);
      }
    };

    loadProcedures();
  }, [selectedDoctor, userCountry, showError]);

  // Load sets when doctor + procedure changes
  useEffect(() => {
    const loadSets = async () => {
      if (!selectedDoctor || !selectedProcedureType || !userCountry) {
        setProcedureSets([]);
        setIsLoadingSets(false);
        return;
      }

      try {
        setIsLoadingSets(true);
        console.log('🔄 Loading sets for', selectedDoctor.name, '-', selectedProcedureType);
        const sets = await getSetsForDoctorProcedure(selectedDoctor.id, selectedProcedureType, normalizeCountry(userCountry));
        console.log('📦 Loaded sets for', selectedDoctor.name, '-', selectedProcedureType, ':', sets.length, 'items');
        setProcedureSets(sets);
      } catch (error) {
        console.error('Error loading sets:', error);
        showError('Error', 'Failed to load sets');
        setProcedureSets([]);
      } finally {
        setIsLoadingSets(false);
      }
    };

    // Add a small delay to prevent flickering
    const timeoutId = setTimeout(() => {
      loadSets();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedDoctor, selectedProcedureType, userCountry, showError]);

  // CRUD Operations for Department-Based System
  const handleAddDoctor = async () => {
    if (!newDoctorName.trim() || !selectedDepartment || !userCountry || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const result = await addDoctorToDepartment(
        newDoctorName.trim(),
        selectedDepartment.name,
        normalizeCountry(userCountry),
        [] // Empty specialties for now
      );
      
      if (result.success) {
        showSuccess('Success', `Doctor "${newDoctorName}" added to ${selectedDepartment.name} successfully`);
        playSound.success();
        setNewDoctorName('');
        setShowAddDoctor(false);
        
        // Reload doctors for this department
        const doctors = await getDoctorsForDepartment(selectedDepartment.name, normalizeCountry(userCountry));
        setAvailableDoctors(doctors);
      } else {
        throw new Error(result.error || 'Failed to add doctor');
      }
    } catch (error) {
      console.error('Error adding doctor:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to add doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
    if (!userCountry || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const result = await removeDoctorFromSystem(doctorId, normalizeCountry(userCountry));
      
      if (result.success) {
        showSuccess('Success', `Doctor "${doctorName}" removed successfully`);
        playSound.success();
        
        // Reload doctors for this department
        if (selectedDepartment) {
          const doctors = await getDoctorsForDepartment(selectedDepartment.name, normalizeCountry(userCountry));
          setAvailableDoctors(doctors);
          
          // Reset selection if deleted doctor was selected
          if (selectedDoctor && selectedDoctor.id === doctorId) {
            setSelectedDoctor(null);
            setDoctorProcedures([]);
            setSelectedProcedureType('');
            setProcedureSets([]);
          }
        }
      } else {
        throw new Error(result.error || 'Failed to remove doctor');
      }
    } catch (error) {
      console.error('Error removing doctor:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to remove doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProcedure = async () => {
    if (!newProcedureType.trim() || !selectedDoctor || !userCountry || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const success = await addProcedureToDoctor(selectedDoctor.id, newProcedureType.trim(), normalizeCountry(userCountry));
      
      if (success) {
        showSuccess('Success', `Procedure type "${newProcedureType}" added to ${selectedDoctor.name} successfully`);
        playSound.success();
        setNewProcedureType('');
        setShowAddProcedure(false);
        
        // Reload procedures
        const procedures = await getProceduresForDoctor(selectedDoctor.id, normalizeCountry(userCountry));
        setDoctorProcedures(procedures);
      } else {
        throw new Error('Failed to add procedure type');
      }
    } catch (error) {
      console.error('Error adding procedure:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to add procedure type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProcedure = async (procedureType: string) => {
    if (!selectedDoctor || !userCountry || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const success = await deleteDoctorProcedure(selectedDoctor.id, procedureType, normalizeCountry(userCountry));
      
      if (success) {
        showSuccess('Success', `Procedure type "${procedureType}" removed from ${selectedDoctor.name} successfully`);
        playSound.success();
        
        // Reload procedures
        const procedures = await getProceduresForDoctor(selectedDoctor.id, normalizeCountry(userCountry));
        setDoctorProcedures(procedures);
        
        // Reset selection if deleted procedure was selected
        if (selectedProcedureType === procedureType) {
          setSelectedProcedureType('');
        }
      } else {
        throw new Error('Failed to remove procedure type');
      }
    } catch (error) {
      console.error('Error removing procedure:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to remove procedure type');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit functions
  const handleEditDoctor = (doctor: DepartmentDoctor) => {
    setEditingDoctor(doctor);
    setEditedDoctorName(doctor.name);
    setShowEditDoctor(true);
  };

  const handleUpdateDoctor = async () => {
    if (!editingDoctor || !editedDoctorName.trim() || !userCountry || isSubmitting) return;

    try {
      setIsSubmitting(true);
      // For now, we'll just update the name using a direct Supabase call
      // In a full implementation, you'd want a proper service function
      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase
        .from('doctors')
        .update({ name: editedDoctorName.trim() })
        .eq('id', editingDoctor.id)
        .eq('country', normalizeCountry(userCountry));

      if (error) {
        throw new Error(error.message);
      }

      showSuccess('Success', `Doctor name updated to "${editedDoctorName}" successfully`);
      playSound.success();
      setShowEditDoctor(false);
      setEditingDoctor(null);
      setEditedDoctorName('');
      
      // Reload doctors for this department
      if (selectedDepartment) {
        const doctors = await getDoctorsForDepartment(selectedDepartment.name, normalizeCountry(userCountry));
        setAvailableDoctors(doctors);
        
        // Update selected doctor if it was the one being edited
        if (selectedDoctor && selectedDoctor.id === editingDoctor.id) {
          const updatedDoctor = doctors.find(d => d.id === editingDoctor.id);
          setSelectedDoctor(updatedDoctor || null);
        }
      }
    } catch (error) {
      console.error('Error updating doctor:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to update doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProcedure = (procedureType: string) => {
    setEditingProcedure(procedureType);
    setEditedProcedureType(procedureType);
    setShowEditProcedure(true);
  };

  const handleUpdateProcedure = async () => {
    if (!editingProcedure || !editedProcedureType.trim() || !selectedDoctor || !userCountry || isSubmitting) return;

    try {
      setIsSubmitting(true);
      // For now, we'll update using a direct Supabase call
      // In a full implementation, you'd want a proper service function
      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase
        .from('doctor_procedures')
        .update({ procedure_type: editedProcedureType.trim() })
        .eq('doctor_id', selectedDoctor.id)
        .eq('procedure_type', editingProcedure)
        .eq('country', normalizeCountry(userCountry));

      if (error) {
        throw new Error(error.message);
      }

      showSuccess('Success', `Procedure type updated to "${editedProcedureType}" successfully`);
      playSound.success();
      setShowEditProcedure(false);
      setEditingProcedure('');
      setEditedProcedureType('');
      
      // Reload procedures
      const procedures = await getProceduresForDoctor(selectedDoctor.id, normalizeCountry(userCountry));
      setDoctorProcedures(procedures);
      
      // Update selected procedure if it was the one being edited
      if (selectedProcedureType === editingProcedure) {
        setSelectedProcedureType(editedProcedureType.trim());
      }
    } catch (error) {
      console.error('Error updating procedure:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to update procedure');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reordering functions
  const moveDoctorUp = (doctorId: string) => {
    const currentIndex = availableDoctors.findIndex(d => d.id === doctorId);
    if (currentIndex > 0) {
      const newDoctors = [...availableDoctors];
      [newDoctors[currentIndex], newDoctors[currentIndex - 1]] = [newDoctors[currentIndex - 1], newDoctors[currentIndex]];
      setAvailableDoctors(newDoctors);
    }
  };

  const moveDoctorDown = (doctorId: string) => {
    const currentIndex = availableDoctors.findIndex(d => d.id === doctorId);
    if (currentIndex < availableDoctors.length - 1) {
      const newDoctors = [...availableDoctors];
      [newDoctors[currentIndex], newDoctors[currentIndex + 1]] = [newDoctors[currentIndex + 1], newDoctors[currentIndex]];
      setAvailableDoctors(newDoctors);
    }
  };

  const moveProcedureUp = (procedureType: string) => {
    const currentIndex = doctorProcedures.findIndex(p => p.procedure_type === procedureType);
    if (currentIndex > 0) {
      const newProcedures = [...doctorProcedures];
      [newProcedures[currentIndex], newProcedures[currentIndex - 1]] = [newProcedures[currentIndex - 1], newProcedures[currentIndex]];
      setDoctorProcedures(newProcedures);
    }
  };

  const moveProcedureDown = (procedureType: string) => {
    const currentIndex = doctorProcedures.findIndex(p => p.procedure_type === procedureType);
    if (currentIndex < doctorProcedures.length - 1) {
      const newProcedures = [...doctorProcedures];
      [newProcedures[currentIndex], newProcedures[currentIndex + 1]] = [newProcedures[currentIndex + 1], newProcedures[currentIndex]];
      setDoctorProcedures(newProcedures);
    }
  };

  // Render Doctors tab
  const renderDoctorsTab = () => (
    <div className="doctors-tab">
      {/* Department Selection */}
      <div className="form-group">
        <label htmlFor="department-select" className="required">Department:</label>
        <SearchableDropdown
          id="department-select"
          value={selectedDepartment ? selectedDepartment.name : ''}
          onChange={(deptName) => {
            const dept = availableDepartments.find(d => d.name === deptName);
            setSelectedDepartment(dept || null);
          }}
          options={availableDepartments.map(d => d.name)}
          placeholder={isLoading ? "Loading departments..." : "Select department"}
          disabled={isLoading}
          required
        />
      </div>

      {selectedDepartment && (
        <>
          <div className="section-header">
            <h4>Doctors in {selectedDepartment.name}</h4>
            <button
              className="add-item-button"
              onClick={() => setShowAddDoctor(true)}
              disabled={isSubmitting}
            >
              + Add Doctor
            </button>
          </div>

          {isLoading ? (
            <div className="loading">Loading doctors...</div>
          ) : (
            <div className="items-list">
              {availableDoctors.length === 0 ? (
                <div className="no-items-message">No doctors found in {selectedDepartment.name}</div>
              ) : (
                availableDoctors.map((doctor, index) => (
                  <div key={doctor.id} className="list-item">
                    <div className="reorder-controls">
                      <button
                        className="reorder-btn"
                        onClick={() => moveDoctorUp(doctor.id)}
                        title="Move up"
                        disabled={index === 0 || isSubmitting}
                      >
                        ▲
                      </button>
                      <button
                        className="reorder-btn"
                        onClick={() => moveDoctorDown(doctor.id)}
                        title="Move down"
                        disabled={index === availableDoctors.length - 1 || isSubmitting}
                      >
                        ▼
                      </button>
                    </div>
                    <div className="item-details">
                      <span className="item-name">{doctor.name}</span>
                      <span className="item-meta">
                        {doctor.specialties.length > 0 ? doctor.specialties.join(', ') : 'No specialties'}
                      </span>
                    </div>
                    <div className="item-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditDoctor(doctor)}
                        title="Edit doctor"
                        disabled={isSubmitting}
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteDoctor(doctor.id, doctor.name)}
                        title="Remove doctor"
                        disabled={isSubmitting}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Add Doctor Modal */}
      {showAddDoctor && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Add New Doctor to {selectedDepartment?.name}</h4>
            <input
              type="text"
              value={newDoctorName}
              onChange={(e) => setNewDoctorName(e.target.value)}
              placeholder="Enter doctor name (e.g., Dr. John Smith)"
              disabled={isSubmitting}
            />
            <div className="modal-actions">
              <button onClick={() => setShowAddDoctor(false)} disabled={isSubmitting}>Cancel</button>
              <button onClick={handleAddDoctor} disabled={isSubmitting || !newDoctorName.trim() || !selectedDepartment}>
                Add Doctor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {showEditDoctor && editingDoctor && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Edit Doctor: {editingDoctor.name}</h4>
            <input
              type="text"
              value={editedDoctorName}
              onChange={(e) => setEditedDoctorName(e.target.value)}
              placeholder="Enter doctor name (e.g., Dr. John Smith)"
              disabled={isSubmitting}
            />
            <div className="modal-actions">
              <button onClick={() => setShowEditDoctor(false)} disabled={isSubmitting}>Cancel</button>
              <button onClick={handleUpdateDoctor} disabled={isSubmitting || !editedDoctorName.trim()}>
                Update Doctor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Procedure Types tab
  const renderProcedureTypesTab = () => (
    <div className="procedures-tab">
      {/* Department Selection */}
      <div className="form-group">
        <label htmlFor="department-select-proc" className="required">Department:</label>
        <SearchableDropdown
          id="department-select-proc"
          value={selectedDepartment ? selectedDepartment.name : ''}
          onChange={(deptName) => {
            const dept = availableDepartments.find(d => d.name === deptName);
            setSelectedDepartment(dept || null);
            // Reset doctor and procedure selections when department changes
            setSelectedDoctor(null);
            setSelectedProcedureType('');
          }}
          options={availableDepartments.map(d => d.name)}
          placeholder={isLoading ? "Loading departments..." : "Select department"}
          disabled={isLoading}
          required
        />
      </div>

      {selectedDepartment && (
        <div className="form-group">
          <label htmlFor="doctor-select-proc" className="required">Doctor:</label>
          <SearchableDropdown
            id="doctor-select-proc"
            value={selectedDoctor ? selectedDoctor.name : ''}
            onChange={(doctorName) => {
              const doctor = availableDoctors.find(d => d.name === doctorName);
              setSelectedDoctor(doctor || null);
              setSelectedProcedureType('');
            }}
            options={availableDoctors.map(d => d.name)}
            placeholder={isLoading ? "Loading doctors..." : availableDoctors.length === 0 ? "No doctors in this department" : "Select doctor"}
            disabled={isLoading || availableDoctors.length === 0}
            required
          />
        </div>
      )}

      {selectedDepartment && selectedDoctor && (
        <div className="procedures-section">
          <div className="section-header">
            <h4>Procedures for {selectedDoctor.name}</h4>
            <button
              className="add-item-button"
              onClick={() => setShowAddProcedure(true)}
              disabled={isSubmitting}
            >
              + Add Procedure Type
            </button>
          </div>

          {isLoading ? (
            <div className="loading">Loading procedure types...</div>
          ) : (
            <div className="items-list">
              {doctorProcedures.length === 0 ? (
                <div className="no-items-message">No procedure types found for this doctor</div>
              ) : (
                doctorProcedures.map((procedure, index) => (
                  <div key={procedure.procedure_type} className="list-item">
                    <div className="reorder-controls">
                      <button
                        className="reorder-btn"
                        onClick={() => moveProcedureUp(procedure.procedure_type)}
                        title="Move up"
                        disabled={index === 0 || isSubmitting}
                      >
                        ▲
                      </button>
                      <button
                        className="reorder-btn"
                        onClick={() => moveProcedureDown(procedure.procedure_type)}
                        title="Move down"
                        disabled={index === doctorProcedures.length - 1 || isSubmitting}
                      >
                        ▼
                      </button>
                    </div>
                    <div className="item-details">
                      <span className="item-name">{procedure.procedure_type}</span>
                    </div>
                    <div className="item-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditProcedure(procedure.procedure_type)}
                        title="Edit procedure type"
                        disabled={isSubmitting}
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteProcedure(procedure.procedure_type)}
                        title="Remove procedure type"
                        disabled={isSubmitting}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Procedure Modal */}
      {showAddProcedure && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Add New Procedure Type for {selectedDoctor?.name}</h4>
            <input
              type="text"
              value={newProcedureType}
              onChange={(e) => setNewProcedureType(e.target.value)}
              placeholder="Enter procedure type (e.g., Total Hip Replacement)"
              disabled={isSubmitting}
            />
            <div className="modal-actions">
              <button onClick={() => setShowAddProcedure(false)} disabled={isSubmitting}>Cancel</button>
              <button onClick={handleAddProcedure} disabled={isSubmitting || !newProcedureType.trim()}>
                Add Procedure Type
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Procedure Modal */}
      {showEditProcedure && editingProcedure && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Edit Procedure Type: {editingProcedure}</h4>
            <input
              type="text"
              value={editedProcedureType}
              onChange={(e) => setEditedProcedureType(e.target.value)}
              placeholder="Enter procedure type (e.g., Total Hip Replacement)"
              disabled={isSubmitting}
            />
            <div className="modal-actions">
              <button onClick={() => setShowEditProcedure(false)} disabled={isSubmitting}>Cancel</button>
              <button onClick={handleUpdateProcedure} disabled={isSubmitting || !editedProcedureType.trim()}>
                Update Procedure Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Surgery and Implants tab
  const renderSurgeryAndImplantsTab = () => (
    <div className="sets-tab">
      {/* Department Selection */}
      <div className="form-group">
        <label htmlFor="department-select-sets" className="required">Department:</label>
        <SearchableDropdown
          id="department-select-sets"
          value={selectedDepartment ? selectedDepartment.name : ''}
          onChange={(deptName) => {
            const dept = availableDepartments.find(d => d.name === deptName);
            setSelectedDepartment(dept || null);
            setSelectedDoctor(null);
            setSelectedProcedureType('');
          }}
          options={availableDepartments.map(d => d.name)}
          placeholder={isLoading ? "Loading departments..." : "Select department"}
          disabled={isLoading}
          required
        />
      </div>

      {selectedDepartment && (
        <div className="form-group">
          <label htmlFor="doctor-select-sets" className="required">Doctor:</label>
          <SearchableDropdown
            id="doctor-select-sets"
            value={selectedDoctor ? selectedDoctor.name : ''}
            onChange={(doctorName) => {
              const doctor = availableDoctors.find(d => d.name === doctorName);
              setSelectedDoctor(doctor || null);
              setSelectedProcedureType('');
            }}
            options={availableDoctors.map(d => d.name)}
            placeholder={isLoading ? "Loading doctors..." : availableDoctors.length === 0 ? "No doctors in this department" : "Select doctor"}
            disabled={isLoading || availableDoctors.length === 0}
            required
          />
        </div>
      )}

      {selectedDepartment && selectedDoctor && (
        <div className="form-group">
          <label htmlFor="procedure-select-sets" className="required">Procedure Type:</label>
          <SearchableDropdown
            id="procedure-select-sets"
            value={selectedProcedureType}
            onChange={setSelectedProcedureType}
            options={doctorProcedures.map(p => p.procedure_type)}
            placeholder={isLoading ? "Loading procedures..." : doctorProcedures.length === 0 ? "No procedures for this doctor" : "Select procedure type"}
            disabled={isLoading || doctorProcedures.length === 0}
            required
          />
        </div>
      )}

      {selectedDepartment && selectedDoctor && selectedProcedureType && (
        <div className="sets-management">
          <div className="sets-section">
            <div className="section-header">
              <h4>Surgery Sets & Implant Boxes for {selectedDoctor.name} - {selectedProcedureType}</h4>
            </div>

            {isLoadingSets ? (
              <div className="loading-sets">
                <p>🔄 Loading surgery sets and implant boxes...</p>
              </div>
            ) : (
              <>
                <div className="sets-columns">
              <div className="sets-column">
                <div className="column-header">
                  <h5>Surgery Sets ({procedureSets.filter(s => s.item_type === 'surgery_set').length})</h5>
                </div>
                
                <div className="items-list">
                  {procedureSets.filter(s => s.item_type === 'surgery_set').length === 0 ? (
                    <div className="no-items-message">No surgery sets configured for this procedure</div>
                  ) : (
                    procedureSets
                      .filter(s => s.item_type === 'surgery_set')
                      .map((set) => (
                        <div key={set.item_id} className="list-item">
                          <span className="item-name">{set.item_name}</span>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="sets-column">
                <div className="column-header">
                  <h5>Implant Boxes ({procedureSets.filter(s => s.item_type === 'implant_box').length})</h5>
                </div>
                
                <div className="items-list">
                  {procedureSets.filter(s => s.item_type === 'implant_box').length === 0 ? (
                    <div className="no-items-message">No implant boxes configured for this procedure</div>
                  ) : (
                    procedureSets
                      .filter(s => s.item_type === 'implant_box')
                      .map((box) => (
                        <div key={box.item_id} className="list-item">
                          <span className="item-name">{box.item_name}</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

                <div className="info-message">
                  <p><strong>Note:</strong> Surgery sets and implant boxes are managed by the system based on procedure requirements. This view shows what is currently available for {selectedDoctor.name} when performing {selectedProcedureType} procedures.</p>
                  <p>To add or modify sets, please contact your system administrator.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Error state
  if (error) {
    return (
      <div className="edit-sets-container">
        <div className="error-message">
          <h3>⚠️ Error</h3>
          <p>{error}</p>
          <button onClick={clearError} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Permission check
  if (!canEditSets) {
    return (
      <div className="edit-sets-container">
        <div className="permission-message">
          <p>🔒 You don't have permission to edit sets.</p>
          <p>Contact your administrator for access.</p>
        </div>
      </div>
    );
  }

  // No country available
  if (!userCountry) {
    return (
      <div className="edit-sets-container">
        <div className="error-message">
          <h3>⚙️ Configuration Required</h3>
          <p>No country is configured for your account. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-edit-sets">
      <div className="tabs-header">
        <button
          className={`tab-button ${activeMainTab === MAIN_TABS.DOCTORS ? 'active' : ''}`}
          onClick={() => setActiveMainTab(MAIN_TABS.DOCTORS)}
        >
          Doctors
        </button>
        <button
          className={`tab-button ${activeMainTab === MAIN_TABS.PROCEDURE_TYPES ? 'active' : ''}`}
          onClick={() => setActiveMainTab(MAIN_TABS.PROCEDURE_TYPES)}
        >
          Procedure Types
        </button>
        <button
          className={`tab-button ${activeMainTab === MAIN_TABS.SURGERY_AND_IMPLANTS ? 'active' : ''}`}
          onClick={() => setActiveMainTab(MAIN_TABS.SURGERY_AND_IMPLANTS)}
        >
          Surgery and Implants
        </button>
      </div>

      <div className="tab-content">
        {activeMainTab === MAIN_TABS.DOCTORS && renderDoctorsTab()}
        {activeMainTab === MAIN_TABS.PROCEDURE_TYPES && renderProcedureTypesTab()}
        {activeMainTab === MAIN_TABS.SURGERY_AND_IMPLANTS && renderSurgeryAndImplantsTab()}
      </div>
    </div>
  );
};

export default EnhancedEditSets;