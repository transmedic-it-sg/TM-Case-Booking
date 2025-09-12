import React, { useState, useEffect } from 'react';
import { useToast } from '../ToastContainer';
import { useSound } from '../../contexts/SoundContext';
import { getCurrentUserSync } from '../../utils/authCompat';
import { hasPermission, PERMISSION_ACTIONS } from '../../utils/permissions';
import { supabase } from '../../lib/supabase';
import { normalizeCountry } from '../../utils/countryUtils';
import SearchableDropdown from '../SearchableDropdown';
import CustomModal from '../CustomModal';
import { useModal } from '../../hooks/useModal';

const IndependentEditSets: React.FC = () => {
  const { modal, closeModal, showConfirm } = useModal();
  const [surgerySets, setSurgerySets] = useState<string[]>([]);
  const [implantBoxes, setImplantBoxes] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [availableCountries] = useState<string[]>(['Singapore', 'Malaysia', 'Thailand']);
  
  // Add forms state
  const [showAddSurgerySet, setShowAddSurgerySet] = useState(false);
  const [showAddImplantBox, setShowAddImplantBox] = useState(false);
  const [newSurgerySetName, setNewSurgerySetName] = useState('');
  const [newImplantBoxName, setNewImplantBoxName] = useState('');
  const [surgerySetError, setSurgerySetError] = useState('');
  const [implantBoxError, setImplantBoxError] = useState('');

  const { showError, showSuccess } = useToast();
  const { playSound } = useSound();
  
  const currentUser = getCurrentUserSync();
  const canManageSets = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EDIT_SETS) : false;
  const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
  const isAdmin = currentUser?.role === 'admin';
  
  // Use selected country for Admin, otherwise use user's country
  const activeCountryName = isAdmin && selectedCountry ? selectedCountry : userCountry;

  // Load data when component mounts or country changes
  useEffect(() => {
    const loadData = async () => {
      if (!activeCountryName) return;
      
      try {
        const normalizedCountry = normalizeCountry(activeCountryName || 'Singapore');
        
        // Load all surgery sets for this country
        const { data: surgerySetsData, error: surgerySetsError } = await supabase
          .from('surgery_sets')
          .select('name')
          .eq('country', normalizedCountry)
          .eq('is_active', true)
          .order('name');

        if (surgerySetsError) {
          console.error('Error loading surgery sets:', surgerySetsError);
          setSurgerySets([]);
        } else {
          setSurgerySets((surgerySetsData || []).map((s: any) => s.name));
        }

        // Load all implant boxes for this country
        const { data: implantBoxesData, error: implantBoxesError } = await supabase
          .from('implant_boxes')
          .select('name')
          .eq('country', normalizedCountry)
          .eq('is_active', true)
          .order('name');

        if (implantBoxesError) {
          console.error('Error loading implant boxes:', implantBoxesError);
          setImplantBoxes([]);
        } else {
          setImplantBoxes((implantBoxesData || []).map((i: any) => i.name));
        }

      } catch (error) {
        console.error('Error loading sets and boxes:', error);
        setSurgerySets([]);
        setImplantBoxes([]);
      }
    };

    loadData();
  }, [activeCountryName]);

  // Initialize country for admin users
  useEffect(() => {
    if (isAdmin && !selectedCountry && userCountry) {
      setSelectedCountry(userCountry);
    }
  }, [isAdmin, selectedCountry, userCountry]);

  const handleAddSurgerySet = async () => {
    const trimmedName = newSurgerySetName.trim();
    
    if (!trimmedName) {
      setSurgerySetError('Surgery set name is required');
      return;
    }
    
    if (surgerySets.includes(trimmedName)) {
      setSurgerySetError('This surgery set already exists');
      return;
    }

    try {
      const normalizedCountry = normalizeCountry(activeCountryName || 'Singapore');
      
      const { error } = await supabase
        .from('surgery_sets')
        .insert([{
          name: trimmedName,
          country: normalizedCountry,
          is_active: true
        }]);

      if (error) {
        console.error('Error adding surgery set:', error);
        setSurgerySetError('Failed to add surgery set');
        return;
      }

      setSurgerySets(prev => [...prev, trimmedName].sort());
      setNewSurgerySetName('');
      setShowAddSurgerySet(false);
      setSurgerySetError('');
      playSound.success();
      showSuccess('Surgery Set Added', `"${trimmedName}" has been added successfully`);
      
    } catch (error) {
      console.error('Error adding surgery set:', error);
      setSurgerySetError('Failed to add surgery set');
    }
  };

  const handleAddImplantBox = async () => {
    const trimmedName = newImplantBoxName.trim();
    
    if (!trimmedName) {
      setImplantBoxError('Implant box name is required');
      return;
    }
    
    if (implantBoxes.includes(trimmedName)) {
      setImplantBoxError('This implant box already exists');
      return;
    }

    try {
      const normalizedCountry = normalizeCountry(activeCountryName || 'Singapore');
      
      const { error } = await supabase
        .from('implant_boxes')
        .insert([{
          name: trimmedName,
          country: normalizedCountry,
          is_active: true
        }]);

      if (error) {
        console.error('Error adding implant box:', error);
        setImplantBoxError('Failed to add implant box');
        return;
      }

      setImplantBoxes(prev => [...prev, trimmedName].sort());
      setNewImplantBoxName('');
      setShowAddImplantBox(false);
      setImplantBoxError('');
      playSound.success();
      showSuccess('Implant Box Added', `"${trimmedName}" has been added successfully`);
      
    } catch (error) {
      console.error('Error adding implant box:', error);
      setImplantBoxError('Failed to add implant box');
    }
  };

  const handleDeleteSurgerySet = (name: string) => {
    showConfirm('Delete Surgery Set', `Are you sure you want to delete "${name}"?`, async () => {
      try {
        const normalizedCountry = normalizeCountry(activeCountryName || 'Singapore');
        
        const { error } = await supabase
          .from('surgery_sets')
          .update({ is_active: false })
          .eq('name', name)
          .eq('country', normalizedCountry);

        if (error) {
          console.error('Error deleting surgery set:', error);
          showError('Delete Failed', 'Failed to delete surgery set');
          return;
        }

        setSurgerySets(prev => prev.filter(s => s !== name));
        playSound.delete();
        showSuccess('Surgery Set Deleted', `"${name}" has been deleted`);
        
      } catch (error) {
        console.error('Error deleting surgery set:', error);
        showError('Delete Failed', 'Failed to delete surgery set');
      }
    });
  };

  const handleDeleteImplantBox = (name: string) => {
    showConfirm('Delete Implant Box', `Are you sure you want to delete "${name}"?`, async () => {
      try {
        const normalizedCountry = normalizeCountry(activeCountryName || 'Singapore');
        
        const { error } = await supabase
          .from('implant_boxes')
          .update({ is_active: false })
          .eq('name', name)
          .eq('country', normalizedCountry);

        if (error) {
          console.error('Error deleting implant box:', error);
          showError('Delete Failed', 'Failed to delete implant box');
          return;
        }

        setImplantBoxes(prev => prev.filter(i => i !== name));
        playSound.delete();
        showSuccess('Implant Box Deleted', `"${name}" has been deleted`);
        
      } catch (error) {
        console.error('Error deleting implant box:', error);
        showError('Delete Failed', 'Failed to delete implant box');
      }
    });
  };

  if (!canManageSets) {
    return (
      <div className="permission-denied">
        <div className="permission-denied-content">
          <h2>🚫 Access Denied</h2>
          <p>You don't have permission to edit surgery sets and implant boxes.</p>
          <p>Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-sets-container">
      <div className="edit-sets-header">
        <div className="edit-sets-title-row">
          <h2>Manage Surgery Sets & Implant Boxes</h2>
          {isAdmin && (
            <div className="admin-country-selector">
              <label htmlFor="admin-country-select">Country:</label>
              <SearchableDropdown
                id="admin-country-select"
                value={selectedCountry || ''}
                onChange={setSelectedCountry}
                options={availableCountries}
                placeholder="Select country"
                className="country-select"
              />
            </div>
          )}
        </div>
        <p>Independent management of surgery sets and implant boxes (not linked to procedure types)
          <span> • <strong>Country: {activeCountryName}</strong></span>
        </p>
      </div>

      <div className="sets-grid">
        {/* Surgery Sets Section */}
        <div className="sets-section">
          <div className="sets-header">
            <h3>Surgery Sets ({surgerySets.length})</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddSurgerySet(true)}
            >
              + Add Surgery Set
            </button>
          </div>

          {showAddSurgerySet && (
            <div className="add-form">
              <div className="form-group">
                <input
                  type="text"
                  value={newSurgerySetName}
                  onChange={(e) => {
                    setNewSurgerySetName(e.target.value);
                    setSurgerySetError('');
                  }}
                  placeholder="Enter surgery set name"
                  className={surgerySetError ? 'error' : ''}
                />
                {surgerySetError && <span className="error-text">{surgerySetError}</span>}
              </div>
              <div className="form-actions">
                <button className="btn btn-primary btn-sm" onClick={handleAddSurgerySet}>
                  Add
                </button>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => {
                    setShowAddSurgerySet(false);
                    setNewSurgerySetName('');
                    setSurgerySetError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="sets-list">
            {surgerySets.map((set, index) => (
              <div key={index} className="set-item">
                <span className="set-name">{set}</span>
                <button
                  className="delete-button"
                  onClick={() => handleDeleteSurgerySet(set)}
                  title={`Delete ${set}`}
                >
                  ✕
                </button>
              </div>
            ))}
            {surgerySets.length === 0 && (
              <div className="empty-state">No surgery sets configured</div>
            )}
          </div>
        </div>

        {/* Implant Boxes Section */}
        <div className="sets-section">
          <div className="sets-header">
            <h3>Implant Boxes ({implantBoxes.length})</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddImplantBox(true)}
            >
              + Add Implant Box
            </button>
          </div>

          {showAddImplantBox && (
            <div className="add-form">
              <div className="form-group">
                <input
                  type="text"
                  value={newImplantBoxName}
                  onChange={(e) => {
                    setNewImplantBoxName(e.target.value);
                    setImplantBoxError('');
                  }}
                  placeholder="Enter implant box name"
                  className={implantBoxError ? 'error' : ''}
                />
                {implantBoxError && <span className="error-text">{implantBoxError}</span>}
              </div>
              <div className="form-actions">
                <button className="btn btn-primary btn-sm" onClick={handleAddImplantBox}>
                  Add
                </button>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => {
                    setShowAddImplantBox(false);
                    setNewImplantBoxName('');
                    setImplantBoxError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="sets-list">
            {implantBoxes.map((box, index) => (
              <div key={index} className="set-item">
                <span className="set-name">{box}</span>
                <button
                  className="delete-button"
                  onClick={() => handleDeleteImplantBox(box)}
                  title={`Delete ${box}`}
                >
                  ✕
                </button>
              </div>
            ))}
            {implantBoxes.length === 0 && (
              <div className="empty-state">No implant boxes configured</div>
            )}
          </div>
        </div>
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
            label: 'Delete',
            onClick: modal.onConfirm || closeModal,
            style: 'danger'
          }
        ] : undefined}
      />
    </div>
  );
};

export default IndependentEditSets;