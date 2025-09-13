/**
 * Dual-Tab Edit Sets Component
 * Provides two main tabs:
 * 1. Edit Procedures - Manage doctor-procedure relationships
 * 2. Edit Sets - Manage doctor-procedure-sets relationships with filtering
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getCurrentUser } from '../../utils/authCompat';
import { hasPermission, PERMISSION_ACTIONS } from '../../utils/permissions';
import { useToast } from '../ToastContainer';
import { useSound } from '../../contexts/SoundContext';
import { useModal } from '../../hooks/useModal';
import CustomModal from '../CustomModal';
import SearchableDropdown from '../SearchableDropdown';
import { 
  getDoctorsForCountry, 
  getProceduresForDoctor, 
  getSetsForDoctorProcedure,
  addProcedureToDoctor,
  createDoctor,
  type Doctor,
  type DoctorProcedure,
  type ProcedureSet
} from '../../utils/doctorService';
import { normalizeCountry } from '../../utils/countryUtils';
import '../../assets/components/EditSetsMobile.css';


const MAIN_TABS = {
  EDIT_PROCEDURES: 'edit_procedures',
  EDIT_SETS: 'edit_sets'
} as const;

type MainTabType = typeof MAIN_TABS[keyof typeof MAIN_TABS];

const DualTabEditSets: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>(MAIN_TABS.EDIT_PROCEDURES);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const { modal, closeModal } = useModal();
  const { showSuccess, showError } = useToast();
  const { playSound } = useSound();

  // Department and doctor management state
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>(''); // doctor ID
  const [selectedDoctorName, setSelectedDoctorName] = useState<string>(''); // doctor name for display

  // Procedures state
  const [doctorProcedures, setDoctorProcedures] = useState<DoctorProcedure[]>([]);
  
  // Sets state
  const [selectedProcedureType, setSelectedProcedureType] = useState<string>('');
  const [doctorProcedureSets, setDoctorProcedureSets] = useState<ProcedureSet[]>([]);

  // Permission check
  const canEditSets = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EDIT_SETS) : false;

  // Get user's country with validation
  const userCountry = useMemo(() => {
    return currentUser?.selectedCountry || currentUser?.countries?.[0] || '';
  }, [currentUser]);

  // Refresh user data to prevent stale state
  const refreshUserData = useCallback(() => {
    const fresh = getCurrentUser();
    setCurrentUser(fresh);
  }, []);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  // Load departments when component mounts or country changes
  useEffect(() => {
    const loadDepartments = async () => {
      if (!userCountry || !canEditSets) {
        setAvailableDepartments([]);
        return;
      }

      try {
        setIsLoading(true);
        const normalizedCountry = normalizeCountry(userCountry);
        
        // Import department service dynamically
        const { getDepartmentsForCountry } = await import('../../utils/supabaseCodeTableService');
        const departments = await getDepartmentsForCountry(normalizedCountry);
        console.log('🏥 Loaded departments for Edit Sets:', departments);
        setAvailableDepartments(departments);
        
        // Reset all selections when departments change
        setSelectedDepartment('');
        setAvailableDoctors([]);
        setSelectedDoctor('');
        setSelectedDoctorName('');
        setDoctorProcedures([]);
        setSelectedProcedureType('');
        setDoctorProcedureSets([]);
        
      } catch (error) {
        console.error('Error loading departments for Edit Sets:', error);
        setAvailableDepartments([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDepartments();
  }, [userCountry, canEditSets]);

  // Load doctors when department is selected
  useEffect(() => {
    const loadDoctors = async () => {
      if (!userCountry || !selectedDepartment || !canEditSets) {
        setAvailableDoctors([]);
        return;
      }

      try {
        setIsLoading(true);
        const normalizedCountry = normalizeCountry(userCountry);
        
        // Load all doctors for the country, then filter by department
        // (Note: In a real implementation, you might want to add department filtering to the database query)
        const allDoctors = await getDoctorsForCountry(normalizedCountry);
        console.log('👨‍⚕️ Loaded doctors for department', selectedDepartment, ':', allDoctors);
        setAvailableDoctors(allDoctors);
        
        // Reset doctor selections when department changes
        setSelectedDoctor('');
        setSelectedDoctorName('');
        setDoctorProcedures([]);
        setSelectedProcedureType('');
        setDoctorProcedureSets([]);
        
      } catch (error) {
        console.error('Error loading doctors for department:', error);
        setAvailableDoctors([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDoctors();
  }, [userCountry, selectedDepartment, canEditSets]);

  // Load procedures when doctor is selected
  useEffect(() => {
    const loadDoctorProcedures = async () => {
      if (!selectedDoctor || !userCountry) {
        setDoctorProcedures([]);
        setSelectedProcedureType('');
        setDoctorProcedureSets([]);
        return;
      }

      try {
        setIsLoading(true);
        const normalizedCountry = normalizeCountry(userCountry);
        const procedures = await getProceduresForDoctor(selectedDoctor, normalizedCountry);
        console.log('📋 Loaded procedures for doctor:', procedures);
        setDoctorProcedures(procedures);
        
        // Reset procedure selection when doctor changes
        setSelectedProcedureType('');
        setDoctorProcedureSets([]);
        
      } catch (error) {
        console.error('Error loading doctor procedures:', error);
        setDoctorProcedures([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDoctorProcedures();
  }, [selectedDoctor, userCountry]);

  // Load sets when doctor + procedure is selected
  useEffect(() => {
    const loadDoctorProcedureSets = async () => {
      if (!selectedDoctor || !selectedProcedureType || !userCountry) {
        setDoctorProcedureSets([]);
        return;
      }

      try {
        setIsLoading(true);
        const normalizedCountry = normalizeCountry(userCountry);
        const sets = await getSetsForDoctorProcedure(selectedDoctor, selectedProcedureType, normalizedCountry);
        console.log('🏥 Loaded sets for doctor-procedure:', sets);
        setDoctorProcedureSets(sets);
        
      } catch (error) {
        console.error('Error loading doctor procedure sets:', error);
        setDoctorProcedureSets([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDoctorProcedureSets();
  }, [selectedDoctor, selectedProcedureType, userCountry]);

  // Handle doctor selection
  const handleDoctorSelection = (doctorDisplayName: string) => {
    const doctor = availableDoctors.find(d => 
      doctorDisplayName === `${d.name} (${d.specialties.join(', ') || 'General'})`
    );
    
    setSelectedDoctor(doctor?.id || '');
    setSelectedDoctorName(doctor?.name || '');
    setSelectedProcedureType('');
    setDoctorProcedureSets([]);
  };

  // Add new procedure to doctor
  const handleAddProcedure = useCallback(async (procedureType: string) => {
    if (!selectedDoctor || !userCountry || !procedureType.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const normalizedCountry = normalizeCountry(userCountry);
      const success = await addProcedureToDoctor(selectedDoctor, procedureType.trim(), normalizedCountry);
      
      if (success) {
        // Reload procedures for this doctor
        const updatedProcedures = await getProceduresForDoctor(selectedDoctor, normalizedCountry);
        setDoctorProcedures(updatedProcedures);
        
        showSuccess('Success', `Procedure "${procedureType}" added to ${selectedDoctorName}`);
        playSound.success();
      } else {
        throw new Error('Failed to add procedure to doctor');
      }
      
    } catch (error) {
      console.error('Error adding procedure to doctor:', error);
      showError('Error', 'Failed to add procedure');
      playSound.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedDoctor, selectedDoctorName, userCountry, isSubmitting, showSuccess, showError, playSound]);

  // Add new doctor
  const handleAddDoctor = useCallback(async (doctorName: string, specialties: string = '') => {
    if (!userCountry || !doctorName.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const normalizedCountry = normalizeCountry(userCountry);
      const specialtiesList = specialties.split(',').map(s => s.trim()).filter(s => s);
      
      const newDoctor = await createDoctor(doctorName.trim(), normalizedCountry, specialtiesList);
      
      if (newDoctor) {
        // Reload doctors list
        const updatedDoctors = await getDoctorsForCountry(normalizedCountry);
        setAvailableDoctors(updatedDoctors);
        
        showSuccess('Success', `Doctor "${doctorName}" created successfully`);
        playSound.success();
      } else {
        throw new Error('Failed to create doctor');
      }
      
    } catch (error) {
      console.error('Error creating doctor:', error);
      showError('Error', 'Failed to create doctor');
      playSound.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [userCountry, isSubmitting, showSuccess, showError, playSound]);

  // Render Edit Procedures tab
  const renderEditProceduresTab = () => {
    return (
      <div className="edit-procedures-tab">
        <div className="section-header">
          <h3>Manage Doctor-Procedure Relationships</h3>
          <p>Select department first, then manage doctors and procedures for your country</p>
        </div>

        {/* Department Selection */}
        <div className="form-group">
          <label htmlFor="department-select" className="required">Department:</label>
          <SearchableDropdown
            id="department-select"
            value={selectedDepartment}
            onChange={(department) => {
              setSelectedDepartment(department);
              // Reset all dependent selections
              setSelectedDoctor('');
              setSelectedDoctorName('');
              setDoctorProcedures([]);
              setSelectedProcedureType('');
              setDoctorProcedureSets([]);
            }}
            options={availableDepartments}
            placeholder={isLoading ? "Loading departments..." : 
              availableDepartments.length === 0 ? "No departments available" :
              "Select department"
            }
            disabled={isLoading || availableDepartments.length === 0}
            required
          />
          {!selectedDepartment && availableDepartments.length > 0 && (
            <div className="help-text">
              ℹ️ Please select a department first to view related doctors
            </div>
          )}
          {availableDepartments.length === 0 && !isLoading && (
            <div className="help-text">
              ℹ️ No departments found for {userCountry}. Contact administrator.
            </div>
          )}
        </div>

        {/* Doctor Selection - Only show when department is selected */}
        {selectedDepartment && (
          <div className="form-group">
            <label htmlFor="doctor-select">Select Doctor:</label>
            <SearchableDropdown
              id="doctor-select"
              value={selectedDoctorName ? `${selectedDoctorName} (${availableDoctors.find(d => d.id === selectedDoctor)?.specialties.join(', ') || 'General'})` : ''}
              onChange={handleDoctorSelection}
              options={availableDoctors.map(doctor => 
                `${doctor.name} (${doctor.specialties.join(', ') || 'General'})`
              )}
              placeholder={isLoading ? "Loading doctors..." : 
                availableDoctors.length === 0 ? "No doctors available for this department - Add a doctor first" :
                "Search and select doctor"
              }
              disabled={isLoading || availableDoctors.length === 0}
            />
            {availableDoctors.length === 0 && !isLoading && selectedDepartment && (
              <div className="help-text">
                ℹ️ No doctors found for {selectedDepartment} in {userCountry}. Add a new doctor below.
              </div>
            )}
          </div>
        )}

        {/* Doctor Procedures List */}
        {selectedDoctor && (
          <div className="doctor-procedures-section">
            <h4>Procedures for {selectedDoctorName}</h4>
            {isLoading ? (
              <div className="loading">Loading procedures...</div>
            ) : doctorProcedures.length === 0 ? (
              <div className="no-items">
                <p>No procedures assigned to this doctor.</p>
                <p>Add procedures using the form below.</p>
              </div>
            ) : (
              <div className="procedures-list">
                {doctorProcedures.map((procedure, index) => (
                  <div key={index} className="procedure-item">
                    <span className="procedure-name">{procedure.procedure_type}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Add Procedure Form */}
            <div className="add-procedure-form">
              <h5>Add New Procedure</h5>
              <AddProcedureForm 
                onAdd={handleAddProcedure}
                disabled={isSubmitting}
              />
            </div>
          </div>
        )}

        {/* Add Doctor Form */}
        <div className="add-doctor-section">
          <h4>Add New Doctor</h4>
          <AddDoctorForm 
            onAdd={handleAddDoctor}
            disabled={isSubmitting}
          />
        </div>
      </div>
    );
  };

  // Render Edit Sets tab
  const renderEditSetsTab = () => {
    return (
      <div className="edit-sets-tab">
        <div className="section-header">
          <h3>Manage Doctor-Procedure-Sets Relationships</h3>
          <p>Select department first, then configure surgery sets and implant boxes for each doctor-procedure combination</p>
        </div>

        {/* Department Selection */}
        <div className="form-group">
          <label htmlFor="sets-department-select" className="required">Department:</label>
          <SearchableDropdown
            id="sets-department-select"
            value={selectedDepartment}
            onChange={(department) => {
              setSelectedDepartment(department);
              // Reset all dependent selections
              setSelectedDoctor('');
              setSelectedDoctorName('');
              setDoctorProcedures([]);
              setSelectedProcedureType('');
              setDoctorProcedureSets([]);
            }}
            options={availableDepartments}
            placeholder={isLoading ? "Loading departments..." : 
              availableDepartments.length === 0 ? "No departments available" :
              "Select department"
            }
            disabled={isLoading || availableDepartments.length === 0}
            required
          />
          {!selectedDepartment && availableDepartments.length > 0 && (
            <div className="help-text">
              ℹ️ Please select a department first to manage doctor-procedure-sets relationships
            </div>
          )}
        </div>

        {/* Doctor Selection - Only show when department is selected */}
        {selectedDepartment && (
          <div className="form-group">
            <label htmlFor="sets-doctor-select">Select Doctor:</label>
            <SearchableDropdown
              id="sets-doctor-select"
              value={selectedDoctorName ? `${selectedDoctorName} (${availableDoctors.find(d => d.id === selectedDoctor)?.specialties.join(', ') || 'General'})` : ''}
              onChange={handleDoctorSelection}
              options={availableDoctors.map(doctor => 
                `${doctor.name} (${doctor.specialties.join(', ') || 'General'})`
              )}
              placeholder={isLoading ? "Loading doctors..." : 
                availableDoctors.length === 0 ? "No doctors available for this department" :
                "Search and select doctor"
              }
              disabled={isLoading || availableDoctors.length === 0}
            />
          </div>
        )}

        {/* Procedure Selection */}
        {selectedDoctor && (
          <div className="form-group">
            <label htmlFor="procedure-select">Select Procedure:</label>
            <SearchableDropdown
              id="procedure-select"
              value={selectedProcedureType}
              onChange={setSelectedProcedureType}
              options={doctorProcedures.map(proc => proc.procedure_type)}
              placeholder={isLoading ? "Loading procedures..." :
                doctorProcedures.length === 0 ? "No procedures available for this doctor" :
                "Select procedure type"
              }
              disabled={isLoading || doctorProcedures.length === 0}
            />
            {doctorProcedures.length === 0 && !isLoading && selectedDoctor && (
              <div className="help-text">
                ℹ️ No procedures configured for this doctor. Add procedures in the "Edit Procedures" tab.
              </div>
            )}
          </div>
        )}

        {/* Sets Display */}
        {selectedDoctor && selectedProcedureType && (
          <div className="doctor-procedure-sets-section">
            <h4>Available Sets for {selectedDoctorName} - {selectedProcedureType}</h4>
            {isLoading ? (
              <div className="loading">Loading sets...</div>
            ) : doctorProcedureSets.length === 0 ? (
              <div className="no-items">
                <p>No surgery sets or implant boxes configured for this doctor-procedure combination.</p>
                <p>Contact your administrator to configure sets.</p>
              </div>
            ) : (
              <div className="sets-display">
                {/* Surgery Sets */}
                {doctorProcedureSets.filter(set => set.item_type === 'surgery_set').length > 0 && (
                  <div className="sets-category">
                    <h5>Surgery Sets ({doctorProcedureSets.filter(set => set.item_type === 'surgery_set').length})</h5>
                    <div className="sets-grid">
                      {doctorProcedureSets
                        .filter(set => set.item_type === 'surgery_set')
                        .map((set, index) => (
                          <div key={`surgery-${index}`} className="set-card surgery-set-card">
                            <span className="set-icon">🏥</span>
                            <span className="set-name">{set.item_name}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Implant Boxes */}
                {doctorProcedureSets.filter(set => set.item_type === 'implant_box').length > 0 && (
                  <div className="sets-category">
                    <h5>Implant Boxes ({doctorProcedureSets.filter(set => set.item_type === 'implant_box').length})</h5>
                    <div className="sets-grid">
                      {doctorProcedureSets
                        .filter(set => set.item_type === 'implant_box')
                        .map((set, index) => (
                          <div key={`implant-${index}`} className="set-card implant-box-card">
                            <span className="set-icon">📦</span>
                            <span className="set-name">{set.item_name}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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

  if (!userCountry) {
    return (
      <div className="edit-sets-container">
        <div className="error-message">
          Please select a country in your profile to access Edit Sets.
        </div>
      </div>
    );
  }

  return (
    <div className="edit-sets-container dual-tab-edit-sets">
      <div className="edit-sets-header">
        <h2>Edit Sets</h2>
        <p>Manage doctors, procedures, and surgery sets for <strong>{userCountry}</strong></p>
      </div>

      {/* Main Tabs */}
      <div className="main-tabs">
        <button
          className={`main-tab-button ${activeMainTab === MAIN_TABS.EDIT_PROCEDURES ? 'active' : ''}`}
          onClick={() => setActiveMainTab(MAIN_TABS.EDIT_PROCEDURES)}
        >
          👨‍⚕️ Edit Procedures
        </button>
        <button
          className={`main-tab-button ${activeMainTab === MAIN_TABS.EDIT_SETS ? 'active' : ''}`}
          onClick={() => setActiveMainTab(MAIN_TABS.EDIT_SETS)}
        >
          🏥 Edit Sets
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeMainTab === MAIN_TABS.EDIT_PROCEDURES && renderEditProceduresTab()}
        {activeMainTab === MAIN_TABS.EDIT_SETS && renderEditSetsTab()}
      </div>

      <CustomModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        actions={modal.type === 'confirm' ? [
          { label: 'Cancel', onClick: closeModal, style: 'secondary' },
          { label: modal.confirmLabel || 'Confirm', onClick: modal.onConfirm || (() => {}), style: 'primary' }
        ] : []}
        autoClose={modal.autoClose}
        autoCloseDelay={modal.autoCloseDelay}
      />
    </div>
  );
};

// Helper component for adding procedures
const AddProcedureForm: React.FC<{ 
  onAdd: (procedureType: string) => void;
  disabled: boolean;
}> = ({ onAdd, disabled }) => {
  const [procedureType, setProcedureType] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (procedureType.trim()) {
      onAdd(procedureType.trim());
      setProcedureType('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-form">
      <div className="form-row">
        <input
          type="text"
          value={procedureType}
          onChange={(e) => setProcedureType(e.target.value)}
          placeholder="Enter procedure type (e.g., Knee, Hip, Spine)"
          disabled={disabled}
          className="form-input"
        />
        <button 
          type="submit" 
          disabled={disabled || !procedureType.trim()}
          className="btn btn-primary"
        >
          {disabled ? 'Adding...' : 'Add Procedure'}
        </button>
      </div>
    </form>
  );
};

// Helper component for adding doctors
const AddDoctorForm: React.FC<{ 
  onAdd: (doctorName: string, specialties: string) => void;
  disabled: boolean;
}> = ({ onAdd, disabled }) => {
  const [doctorName, setDoctorName] = useState('');
  const [specialties, setSpecialties] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (doctorName.trim()) {
      onAdd(doctorName.trim(), specialties.trim());
      setDoctorName('');
      setSpecialties('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-form">
      <div className="form-row">
        <input
          type="text"
          value={doctorName}
          onChange={(e) => setDoctorName(e.target.value)}
          placeholder="Doctor name (e.g., Dr. John Smith)"
          disabled={disabled}
          className="form-input"
          required
        />
        <input
          type="text"
          value={specialties}
          onChange={(e) => setSpecialties(e.target.value)}
          placeholder="Specialties (comma-separated, e.g., Orthopedics, Neurosurgery)"
          disabled={disabled}
          className="form-input"
        />
        <button 
          type="submit" 
          disabled={disabled || !doctorName.trim()}
          className="btn btn-primary"
        >
          {disabled ? 'Creating...' : 'Add Doctor'}
        </button>
      </div>
    </form>
  );
};

export default DualTabEditSets;