/**
 * Comprehensive Edit Sets Component - Independent CRUD Functionality
 * Each tab has its own dropdown selectors and CRUD operations
 *
 * Doctor Tab: Department dropdown → Manage Doctors CRUD
 * Procedure Types Tab: Department + Doctor dropdowns → Manage Procedure Types CRUD
 * Surgery & Implants Tab: Department + Doctor + Procedure Type dropdowns → Manage Surgery/Implants CRUD
 */

import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../../utils/authCompat';
import { hasPermission, PERMISSION_ACTIONS } from '../../utils/permissions';
import { useToast } from '../ToastContainer';
import { useSound } from '../../contexts/SoundContext';
import { supabase } from '../../lib/supabase';
import { normalizeCountry } from '../../utils/countryUtils';
import './ModernEditSets.css';

// Types for database records
interface Department {
  id: string;
  name: string;
  country: string;
}

interface Doctor {
  id: string;
  name: string;
  department_id: string;
  country: string;
  is_active: boolean;
}

interface DoctorProcedure {
  id: string;
  procedure_type: string;
  doctor_id: string;
  country: string;
  is_active: boolean;
}

interface DoctorProcedureSet {
  id: string;
  doctor_id: string;
  procedure_type: string;
  surgery_set_id?: string;
  implant_box_id?: string;
  country: string;
  surgery_set?: { name: string };
  implant_box?: { name: string };
}

const TABS = {
  DOCTORS: 'doctors',
  PROCEDURES: 'procedures',
  SURGERY_IMPLANTS: 'surgery-implants'
} as const;

type TabType = typeof TABS[keyof typeof TABS];

const ComprehensiveEditSets: React.FC = () => {
  const currentUser = getCurrentUser();
  const { showSuccess, showError } = useToast();
  const { playSound } = useSound();

  // Permission and country validation
  const userCountry = currentUser?.selectedCountry || currentUser?.country;
  const normalizedCountry = normalizeCountry(userCountry);

  if (!userCountry) {
    throw new Error('User country is required for Edit Sets functionality. Please select a country in your profile.');
  }

  const hasEditAccess = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EDIT_SETS) : false;
  if (!hasEditAccess) {
    throw new Error('You do not have permission to access Edit Sets. Please contact your administrator.');
  }

  // State management
  const [activeTab, setActiveTab] = useState<TabType>(TABS.DOCTORS);
  const [isLoading, setIsLoading] = useState(false);

  // Data state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorProcedures, setDoctorProcedures] = useState<DoctorProcedure[]>([]);
  const [doctorProcedureSets, setDoctorProcedureSets] = useState<DoctorProcedureSet[]>([]);

  // Tab-specific state
  // Doctor Tab
  const [selectedDepartmentForDoctors, setSelectedDepartmentForDoctors] = useState('');
  const [doctorFormData, setDoctorFormData] = useState({ name: '', isEditing: false, editId: '' });

  // Procedure Types Tab
  const [selectedDepartmentForProcedures, setSelectedDepartmentForProcedures] = useState('');
  const [selectedDoctorForProcedures, setSelectedDoctorForProcedures] = useState('');
  const [procedureFormData, setProcedureFormData] = useState({ procedureType: '', isEditing: false, editId: '' });

  // Surgery & Implants Tab
  const [selectedDepartmentForSurgery, setSelectedDepartmentForSurgery] = useState('');
  const [selectedDoctorForSurgery, setSelectedDoctorForSurgery] = useState('');
  const [selectedProcedureForSurgery, setSelectedProcedureForSurgery] = useState('');
  const [surgeryFormData, setSurgeryFormData] = useState({
    surgerySetName: '',
    implantBoxName: '',
    isEditing: false,
    editId: ''
  });

  // Load departments on component mount
  useEffect(() => {
    loadDepartments();
  }, [normalizedCountry]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load doctors when department changes
  useEffect(() => {
    if (selectedDepartmentForDoctors) {
      loadDoctorsForDepartment(selectedDepartmentForDoctors);
    }
  }, [selectedDepartmentForDoctors]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load procedure-specific doctors
  useEffect(() => {
    if (selectedDepartmentForProcedures) {
      loadDoctorsForDepartment(selectedDepartmentForProcedures, 'procedures');
    }
  }, [selectedDepartmentForProcedures]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load surgery-specific doctors
  useEffect(() => {
    if (selectedDepartmentForSurgery) {
      loadDoctorsForDepartment(selectedDepartmentForSurgery, 'surgery');
    }
  }, [selectedDepartmentForSurgery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load procedure types when doctor changes
  useEffect(() => {
    if (selectedDoctorForProcedures) {
      loadDoctorProcedures(selectedDoctorForProcedures);
    }
  }, [selectedDoctorForProcedures]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load surgery-specific procedure types
  useEffect(() => {
    if (selectedDoctorForSurgery) {
      loadDoctorProcedures(selectedDoctorForSurgery, 'surgery');
    }
  }, [selectedDoctorForSurgery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load surgery/implants when procedure type changes
  useEffect(() => {
    if (selectedDoctorForSurgery && selectedProcedureForSurgery) {
      loadDoctorProcedureSets(selectedDoctorForSurgery, selectedProcedureForSurgery);
    }
  }, [selectedDoctorForSurgery, selectedProcedureForSurgery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Data loading functions
  const loadDepartments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('country', normalizedCountry)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      // // // console.error('Error loading departments:', error);
      showError('Database Error', 'Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDoctorsForDepartment = async (departmentId: string, context?: string) => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('department_id', departmentId)
        .eq('country', normalizedCountry)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      if (context === 'procedures') {
        // Store for procedure type dropdown
        setDoctors(data || []);
      } else if (context === 'surgery') {
        // Store for surgery dropdown
        setDoctors(data || []);
      } else {
        // Default doctor tab
        setDoctors(data || []);
      }
    } catch (error) {
      // // // console.error('Error loading doctors:', error);
      showError('Database Error', 'Failed to load doctors');
    }
  };

  const loadDoctorProcedures = async (doctorId: string, context?: string) => {
    try {
      const { data, error } = await supabase
        .from('doctor_procedures')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('country', normalizedCountry)
        .eq('is_active', true)
        .order('procedure_type');

      if (error) throw error;
      setDoctorProcedures(data || []);
    } catch (error) {
      // // // console.error('Error loading doctor procedures:', error);
      showError('Database Error', 'Failed to load doctor procedures');
    }
  };

  const loadDoctorProcedureSets = async (doctorId: string, procedureType: string) => {
    try {
      const { data, error } = await supabase
        .from('doctor_procedure_sets')
        .select(`
          *,
          surgery_set:surgery_sets(name),
          implant_box:implant_boxes(name)
        `)
        .eq('doctor_id', doctorId)
        .eq('procedure_type', procedureType)
        .eq('country', normalizedCountry)
        .order('created_at');

      if (error) throw error;
      setDoctorProcedureSets(data || []);
    } catch (error) {
      // // // console.error('Error loading doctor procedure sets:', error);
      showError('Database Error', 'Failed to load doctor procedure sets');
    }
  };

  // CRUD operations for Doctors
  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorFormData.name.trim() || !selectedDepartmentForDoctors) return;

    try {
      setIsLoading(true);

      if (doctorFormData.isEditing) {
        const { error } = await supabase
          .from('doctors')
          .update({
            name: doctorFormData.name.trim(),
            department_id: selectedDepartmentForDoctors,
            country: normalizedCountry
          })
          .eq('id', doctorFormData.editId);

        if (error) throw error;
        showSuccess('Success', 'Doctor updated successfully');
      } else {
        const { error } = await supabase
          .from('doctors')
          .insert({
            name: doctorFormData.name.trim(),
            department_id: selectedDepartmentForDoctors,
            country: normalizedCountry,
            is_active: true
          });

        if (error) throw error;
        showSuccess('Success', 'Doctor added successfully');
      }

      setDoctorFormData({ name: '', isEditing: false, editId: '' });
      loadDoctorsForDepartment(selectedDepartmentForDoctors);
      playSound.success();
    } catch (error) {
      // // // console.error('Error saving doctor:', error);
      showError('Save Error', 'Failed to save doctor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!window.confirm('Are you sure you want to delete this doctor?')) return;

    try {
      const { error } = await supabase
        .from('doctors')
        .update({ is_active: false })
        .eq('id', doctorId);

      if (error) throw error;
      showSuccess('Success', 'Doctor deleted successfully');
      loadDoctorsForDepartment(selectedDepartmentForDoctors);
      playSound.success();
    } catch (error) {
      // // // console.error('Error deleting doctor:', error);
      showError('Delete Error', 'Failed to delete doctor');
    }
  };

  // CRUD operations for Doctor Procedures
  const handleProcedureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procedureFormData.procedureType.trim() || !selectedDoctorForProcedures) return;

    try {
      setIsLoading(true);

      if (procedureFormData.isEditing) {
        const { error } = await supabase
          .from('doctor_procedures')
          .update({
            procedure_type: procedureFormData.procedureType.trim(),
            doctor_id: selectedDoctorForProcedures,
            country: normalizedCountry
          })
          .eq('id', procedureFormData.editId);

        if (error) throw error;
        showSuccess('Success', 'Procedure type updated successfully');
      } else {
        const { error } = await supabase
          .from('doctor_procedures')
          .insert({
            procedure_type: procedureFormData.procedureType.trim(),
            doctor_id: selectedDoctorForProcedures,
            country: normalizedCountry,
            is_active: true
          });

        if (error) throw error;
        showSuccess('Success', 'Procedure type added successfully');
      }

      setProcedureFormData({ procedureType: '', isEditing: false, editId: '' });
      loadDoctorProcedures(selectedDoctorForProcedures);
      playSound.success();
    } catch (error) {
      // // // console.error('Error saving procedure type:', error);
      showError('Save Error', 'Failed to save procedure type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProcedureType = async (procedureId: string) => {
    if (!window.confirm('Are you sure you want to delete this procedure type?')) return;

    try {
      const { error } = await supabase
        .from('doctor_procedures')
        .update({ is_active: false })
        .eq('id', procedureId);

      if (error) throw error;
      showSuccess('Success', 'Procedure type deleted successfully');
      loadDoctorProcedures(selectedDoctorForProcedures);
      playSound.success();
    } catch (error) {
      // // // console.error('Error deleting procedure type:', error);
      showError('Delete Error', 'Failed to delete procedure type');
    }
  };

  // CRUD operations for Doctor Procedure Sets
  const handleSurgerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!surgeryFormData.surgerySetName.trim() && !surgeryFormData.implantBoxName.trim()) ||
        !selectedDoctorForSurgery || !selectedProcedureForSurgery) return;

    try {
      setIsLoading(true);

      // For new items, we need to create surgery_set or implant_box first if they don't exist
      let surgerySetId = null;
      let implantBoxId = null;

      if (surgeryFormData.surgerySetName.trim()) {
        // Check if surgery set exists, if not create it
        const { data: existingSet } = await supabase
          .from('surgery_sets')
          .select('id')
          .eq('name', surgeryFormData.surgerySetName.trim())
          .eq('country', normalizedCountry)
          .single();

        if (existingSet) {
          surgerySetId = existingSet.id;
        } else {
          const { data: newSet, error: setError } = await supabase
            .from('surgery_sets')
            .insert({
              name: surgeryFormData.surgerySetName.trim(),
              country: normalizedCountry,
              is_active: true
            })
            .select('id')
            .single();

          if (setError) throw setError;
          surgerySetId = newSet.id;
        }
      }

      if (surgeryFormData.implantBoxName.trim()) {
        // Check if implant box exists, if not create it
        const { data: existingBox } = await supabase
          .from('implant_boxes')
          .select('id')
          .eq('name', surgeryFormData.implantBoxName.trim())
          .eq('country', normalizedCountry)
          .single();

        if (existingBox) {
          implantBoxId = existingBox.id;
        } else {
          const { data: newBox, error: boxError } = await supabase
            .from('implant_boxes')
            .insert({
              name: surgeryFormData.implantBoxName.trim(),
              country: normalizedCountry,
              is_active: true
            })
            .select('id')
            .single();

          if (boxError) throw boxError;
          implantBoxId = newBox.id;
        }
      }

      if (surgeryFormData.isEditing) {
        const { error } = await supabase
          .from('doctor_procedure_sets')
          .update({
            surgery_set_id: surgerySetId,
            implant_box_id: implantBoxId,
            doctor_id: selectedDoctorForSurgery,
            procedure_type: selectedProcedureForSurgery,
            country: normalizedCountry
          })
          .eq('id', surgeryFormData.editId);

        if (error) throw error;
        showSuccess('Success', 'Doctor procedure set updated successfully');
      } else {
        const { error } = await supabase
          .from('doctor_procedure_sets')
          .insert({
            surgery_set_id: surgerySetId,
            implant_box_id: implantBoxId,
            doctor_id: selectedDoctorForSurgery,
            procedure_type: selectedProcedureForSurgery,
            country: normalizedCountry
          });

        if (error) throw error;
        showSuccess('Success', 'Doctor procedure set added successfully');
      }

      setSurgeryFormData({ surgerySetName: '', implantBoxName: '', isEditing: false, editId: '' });
      loadDoctorProcedureSets(selectedDoctorForSurgery, selectedProcedureForSurgery);
      playSound.success();
    } catch (error) {
      // // // console.error('Error saving doctor procedure set:', error);
      showError('Save Error', 'Failed to save doctor procedure set');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSurgeryImplant = async (procedureSetId: string) => {
    if (!window.confirm('Are you sure you want to delete this doctor procedure set?')) return;

    try {
      const { error } = await supabase
        .from('doctor_procedure_sets')
        .delete()
        .eq('id', procedureSetId);

      if (error) throw error;
      showSuccess('Success', 'Doctor procedure set deleted successfully');
      loadDoctorProcedureSets(selectedDoctorForSurgery, selectedProcedureForSurgery);
      playSound.success();
    } catch (error) {
      // // // console.error('Error deleting doctor procedure set:', error);
      showError('Delete Error', 'Failed to delete doctor procedure set');
    }
  };

  // Render functions for each tab
  const renderDoctorsTab = () => (
    <div className="tab-content">
      <div className="form-section">
        <h3>Manage Doctors</h3>

        <div className="form-group">
          <label htmlFor="department-select">Select Department:</label>
          <select
            id="department-select"
            value={selectedDepartmentForDoctors}
            onChange={(e) => setSelectedDepartmentForDoctors(e.target.value)}
            className="form-control"
          >
            <option value="">-- Select Department --</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>

        {selectedDepartmentForDoctors && (
          <form onSubmit={handleDoctorSubmit} className="add-form">
            <div className="form-group">
              <label htmlFor="doctor-name">Doctor Name:</label>
              <input
                id="doctor-name"
                type="text"
                value={doctorFormData.name}
                onChange={(e) => setDoctorFormData(prev => ({ ...prev, name: e.target.value }))}
                className="form-control"
                placeholder="Enter doctor name"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {doctorFormData.isEditing ? 'Update Doctor' : 'Add Doctor'}
            </button>
            {doctorFormData.isEditing && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDoctorFormData({ name: '', isEditing: false, editId: '' })}
              >
                Cancel
              </button>
            )}
          </form>
        )}
      </div>

      {selectedDepartmentForDoctors && doctors.length > 0 && (
        <div className="items-list">
          <h4>Doctors in Selected Department</h4>
          <div className="items-grid">
            {doctors.map(doctor => (
              <div key={doctor.id} className="item-card">
                <div className="item-info">
                  <h5>{doctor.name}</h5>
                </div>
                <div className="item-actions">
                  <button
                    className="btn btn-sm btn-edit"
                    onClick={() => setDoctorFormData({
                      name: doctor.name,
                      isEditing: true,
                      editId: doctor.id
                    })}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-delete"
                    onClick={() => handleDeleteDoctor(doctor.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProceduresTab = () => (
    <div className="tab-content">
      <div className="form-section">
        <h3>Manage Procedure Types</h3>

        <div className="form-group">
          <label htmlFor="procedure-department-select">Select Department:</label>
          <select
            id="procedure-department-select"
            value={selectedDepartmentForProcedures}
            onChange={(e) => {
              setSelectedDepartmentForProcedures(e.target.value);
              setSelectedDoctorForProcedures('');
            }}
            className="form-control"
          >
            <option value="">-- Select Department --</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>

        {selectedDepartmentForProcedures && (
          <div className="form-group">
            <label htmlFor="procedure-doctor-select">Select Doctor:</label>
            <select
              id="procedure-doctor-select"
              value={selectedDoctorForProcedures}
              onChange={(e) => setSelectedDoctorForProcedures(e.target.value)}
              className="form-control"
            >
              <option value="">-- Select Doctor --</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
              ))}
            </select>
          </div>
        )}

        {selectedDoctorForProcedures && (
          <form onSubmit={handleProcedureSubmit} className="add-form">
            <div className="form-group">
              <label htmlFor="procedure-type">Procedure Type:</label>
              <input
                id="procedure-type"
                type="text"
                value={procedureFormData.procedureType}
                onChange={(e) => setProcedureFormData(prev => ({ ...prev, procedureType: e.target.value }))}
                className="form-control"
                placeholder="Enter procedure type"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {procedureFormData.isEditing ? 'Update Procedure Type' : 'Add Procedure Type'}
            </button>
            {procedureFormData.isEditing && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setProcedureFormData({ procedureType: '', isEditing: false, editId: '' })}
              >
                Cancel
              </button>
            )}
          </form>
        )}
      </div>

      {selectedDoctorForProcedures && doctorProcedures.length > 0 && (
        <div className="items-list">
          <h4>Procedure Types for Selected Doctor</h4>
          <div className="items-grid">
            {doctorProcedures.map(procedure => (
              <div key={procedure.id} className="item-card">
                <div className="item-info">
                  <h5>{procedure.procedure_type}</h5>
                </div>
                <div className="item-actions">
                  <button
                    className="btn btn-sm btn-edit"
                    onClick={() => setProcedureFormData({
                      procedureType: procedure.procedure_type,
                      isEditing: true,
                      editId: procedure.id
                    })}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-delete"
                    onClick={() => handleDeleteProcedureType(procedure.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSurgeryImplantsTab = () => (
    <div className="tab-content">
      <div className="form-section">
        <h3>Manage Surgery Sets & Implant Boxes</h3>

        <div className="form-group">
          <label htmlFor="surgery-department-select">Select Department:</label>
          <select
            id="surgery-department-select"
            value={selectedDepartmentForSurgery}
            onChange={(e) => {
              setSelectedDepartmentForSurgery(e.target.value);
              setSelectedDoctorForSurgery('');
              setSelectedProcedureForSurgery('');
            }}
            className="form-control"
          >
            <option value="">-- Select Department --</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>

        {selectedDepartmentForSurgery && (
          <div className="form-group">
            <label htmlFor="surgery-doctor-select">Select Doctor:</label>
            <select
              id="surgery-doctor-select"
              value={selectedDoctorForSurgery}
              onChange={(e) => {
                setSelectedDoctorForSurgery(e.target.value);
                setSelectedProcedureForSurgery('');
              }}
              className="form-control"
            >
              <option value="">-- Select Doctor --</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
              ))}
            </select>
          </div>
        )}

        {selectedDoctorForSurgery && (
          <div className="form-group">
            <label htmlFor="surgery-procedure-select">Select Procedure Type:</label>
            <select
              id="surgery-procedure-select"
              value={selectedProcedureForSurgery}
              onChange={(e) => setSelectedProcedureForSurgery(e.target.value)}
              className="form-control"
            >
              <option value="">-- Select Procedure Type --</option>
              {doctorProcedures.map(procedure => (
                <option key={procedure.id} value={procedure.procedure_type}>
                  {procedure.procedure_type}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedProcedureForSurgery && (
          <form onSubmit={handleSurgerySubmit} className="add-form">
            <div className="form-group">
              <label htmlFor="surgery-set-name">Surgery Set Name (optional):</label>
              <input
                id="surgery-set-name"
                type="text"
                value={surgeryFormData.surgerySetName}
                onChange={(e) => setSurgeryFormData(prev => ({ ...prev, surgerySetName: e.target.value }))}
                className="form-control"
                placeholder="Enter surgery set name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="implant-box-name">Implant Box Name (optional):</label>
              <input
                id="implant-box-name"
                type="text"
                value={surgeryFormData.implantBoxName}
                onChange={(e) => setSurgeryFormData(prev => ({ ...prev, implantBoxName: e.target.value }))}
                className="form-control"
                placeholder="Enter implant box name"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {surgeryFormData.isEditing ? 'Update Surgery/Implant' : 'Add Surgery/Implant'}
            </button>
            {surgeryFormData.isEditing && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSurgeryFormData({ surgerySetName: '', implantBoxName: '', isEditing: false, editId: '' })}
              >
                Cancel
              </button>
            )}
          </form>
        )}
      </div>

      {selectedProcedureForSurgery && doctorProcedureSets.length > 0 && (
        <div className="items-list">
          <h4>Surgery Sets & Implant Boxes for Selected Procedure</h4>
          <div className="items-grid">
            {doctorProcedureSets.map(item => (
              <div key={item.id} className="item-card">
                <div className="item-info">
                  {item.surgery_set && <h5>Surgery Set: {item.surgery_set.name}</h5>}
                  {item.implant_box && <h5>Implant Box: {item.implant_box.name}</h5>}
                </div>
                <div className="item-actions">
                  <button
                    className="btn btn-sm btn-edit"
                    onClick={() => setSurgeryFormData({
                      surgerySetName: item.surgery_set?.name || '',
                      implantBoxName: item.implant_box?.name || '',
                      isEditing: true,
                      editId: item.id
                    })}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-delete"
                    onClick={() => handleDeleteSurgeryImplant(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="modern-edit-sets">

      <div className="edit-sets-tabs">
        <button
          className={`tab-button ${activeTab === TABS.DOCTORS ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.DOCTORS)}
        >
          👩‍⚕️ Doctors
        </button>
        <button
          className={`tab-button ${activeTab === TABS.PROCEDURES ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.PROCEDURES)}
        >
          🏥 Procedure Types
        </button>
        <button
          className={`tab-button ${activeTab === TABS.SURGERY_IMPLANTS ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.SURGERY_IMPLANTS)}
        >
          📦 Surgery & Implants
        </button>
      </div>

      <div className="edit-sets-content">
        {isLoading && <div className="loading-spinner">Loading...</div>}

        {activeTab === TABS.DOCTORS && renderDoctorsTab()}
        {activeTab === TABS.PROCEDURES && renderProceduresTab()}
        {activeTab === TABS.SURGERY_IMPLANTS && renderSurgeryImplantsTab()}
      </div>
    </div>
  );
};

export default ComprehensiveEditSets;