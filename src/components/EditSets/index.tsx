import React, { useState, useEffect } from 'react';
import { PROCEDURE_TYPES, COUNTRIES } from '../../types';
import { getCountries, getDepartments } from '../../utils/codeTable';
import { useToast } from '../ToastContainer';
import { useSound } from '../../contexts/SoundContext';
import { getCurrentUser } from '../../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../../utils/permissions';
import { EditSetsProps, CategorizedSets, DraggedItem } from './types';
import { validateItemName } from './validation';
import { initializeCategorizedSets, reorderItems, swapItems } from './utils';
import { 
  saveCategorizedSets, 
  getCategorizedSets, 
  getAllProcedureTypes, 
  getProcedureTypesForDepartment,
  addProcedureTypeToDepartment,
  removeProcedureTypeFromDepartment,
  getCategorizedSetsForDepartment,
  saveCategorizedSetsForDepartment
} from '../../utils/storage';
// Removed cache versioning - was causing UX disruptions
// import { forceCacheVersionUpdate } from '../../utils/cacheVersionService';
import SetsList from './SetsList';
import CustomModal from '../CustomModal';
import SearchableDropdown from '../SearchableDropdown';
import { useModal } from '../../hooks/useModal';
import '../../assets/components/EditSetsMobile.css';

const EditSets: React.FC<EditSetsProps> = () => {
  const { modal, closeModal, showConfirm } = useModal();
  const [categorizedSets, setCategorizedSets] = useState<CategorizedSets>({});
  const [selectedProcedureType, setSelectedProcedureType] = useState<string>(PROCEDURE_TYPES[0]);
  const [showAddSurgerySet, setShowAddSurgerySet] = useState(false);
  const [showAddImplantBox, setShowAddImplantBox] = useState(false);
  const [newSurgerySetName, setNewSurgerySetName] = useState('');
  const [newImplantBoxName, setNewImplantBoxName] = useState('');
  const [editingSurgerySet, setEditingSurgerySet] = useState<string | null>(null);
  const [editingImplantBox, setEditingImplantBox] = useState<string | null>(null);
  const [editSurgerySetValue, setEditSurgerySetValue] = useState('');
  const [editImplantBoxValue, setEditImplantBoxValue] = useState('');
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [surgerySetError, setSurgerySetError] = useState('');
  const [implantBoxError, setImplantBoxError] = useState('');
  const [allProcedureTypes, setAllProcedureTypes] = useState<string[]>([]);
  const [showAddProcedureType, setShowAddProcedureType] = useState(false);
  const [newProcedureTypeName, setNewProcedureTypeName] = useState('');
  const [procedureTypeError, setProcedureTypeError] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

  const { showError, showSuccess } = useToast();
  const { playSound } = useSound();
  
  const currentUser = getCurrentUser();
  const canManageProcedureTypes = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EDIT_SETS) : false;
  const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
  const isAdmin = currentUser?.role === 'admin';
  
  // Use selected country for Admin, otherwise use user's country
  const activeCountryName = isAdmin && selectedCountry ? selectedCountry : userCountry;
  
  // Convert country name to country code for database operations
  const getCountryCode = (country: string) => {
    const countryMap: { [key: string]: string } = {
      'Singapore': 'SG',
      'Malaysia': 'MY',
      'Philippines': 'PH',
      'Indonesia': 'ID',
      'Vietnam': 'VN',
      'Hong Kong': 'HK',
      'Thailand': 'TH'
    };
    return countryMap[country] || 'SG';
  };
  
  const activeCountry = getCountryCode(activeCountryName || 'Singapore');

  // Load countries from Global-Table and initialize selected country for Admin users
  useEffect(() => {
    const globalCountries = getCountries();
    const countries = globalCountries.length > 0 ? globalCountries : [...COUNTRIES];
    setAvailableCountries(countries);
    
    if (isAdmin && !selectedCountry) {
      setSelectedCountry(userCountry || countries[0]);
    }
  }, [isAdmin, selectedCountry, userCountry]);

  // Load departments when country changes
  useEffect(() => {
    const departments = getDepartments();
    setAvailableDepartments(departments);
    
    // Set default department if none selected
    if (!selectedDepartment && departments.length > 0) {
      setSelectedDepartment(departments[0]);
    }
  }, [selectedCountry, selectedDepartment]);

  // Load procedure types for the selected department
  useEffect(() => {
    const loadProcedureTypes = async () => {
      try {
        let departmentTypes: string[] = [];
        
        if (selectedDepartment) {
          departmentTypes = await getProcedureTypesForDepartment(selectedDepartment, activeCountry);
        } else {
          // Fallback to all procedure types if no department selected
          departmentTypes = getAllProcedureTypes(activeCountry);
        }
        
        setAllProcedureTypes(departmentTypes);
        
        // Update selected procedure type if it doesn't exist in the loaded types
        if (!departmentTypes.includes(selectedProcedureType)) {
          setSelectedProcedureType(departmentTypes[0] || PROCEDURE_TYPES[0]);
        }
      } catch (error) {
        console.error('Error loading procedure types:', error);
        // Fallback to default procedure types
        setAllProcedureTypes([...PROCEDURE_TYPES]);
        if (!PROCEDURE_TYPES.includes(selectedProcedureType as any)) {
          setSelectedProcedureType(PROCEDURE_TYPES[0]);
        }
      }
    };
    
    loadProcedureTypes();
  }, [selectedDepartment, selectedProcedureType, activeCountry]);

  // Initialize categorized sets for the selected department
  useEffect(() => {
    const loadSets = async () => {
      if (selectedDepartment) {
        const storedSets = await getCategorizedSetsForDepartment(selectedDepartment, activeCountry);
        if (Object.keys(storedSets).length > 0) {
          setCategorizedSets(storedSets);
        } else {
          // Initialize with empty sets - do not auto-save empty data
          const initialSets = initializeCategorizedSets();
          setCategorizedSets(initialSets);
          console.log('No existing categorized sets found, starting with empty sets');
        }
      } else {
        // Fallback to global sets if no department selected
        const storedSets = await getCategorizedSets(activeCountry);
        if (Object.keys(storedSets).length > 0) {
          setCategorizedSets(storedSets);
        } else {
          // Initialize with empty sets - do not auto-save empty data
          const initialSets = initializeCategorizedSets();
          setCategorizedSets(initialSets);
          console.log('No existing global categorized sets found, starting with empty sets');
        }
      }
    };
    loadSets();
  }, [selectedDepartment, activeCountry]);

  // Ensure selectedProcedureType exists in categorizedSets
  useEffect(() => {
    if (selectedProcedureType && !categorizedSets[selectedProcedureType]) {
      setCategorizedSets(prev => ({
        ...prev,
        [selectedProcedureType]: {
          surgerySets: [],
          implantBoxes: []
        }
      }));
    }
  }, [selectedProcedureType, categorizedSets]);

  // Save categorized sets whenever they change (debounced)
  useEffect(() => {
    const saveChanges = async () => {
      if (Object.keys(categorizedSets).length > 0) {
        try {
          if (selectedDepartment) {
            // Check if department has procedure types before trying to save
            const procedureTypes = await getProcedureTypesForDepartment(selectedDepartment, activeCountry);
            if (procedureTypes.length > 0) {
              await saveCategorizedSetsForDepartment(selectedDepartment, categorizedSets, activeCountry);
              console.log(`Categorized sets saved successfully for department: ${selectedDepartment}`);
            } else {
              console.log(`Skipping save for department ${selectedDepartment} - no procedure types found`);
            }
          } else {
            await saveCategorizedSets(categorizedSets, activeCountry);
            console.log('Categorized sets saved successfully to global storage');
          }
        } catch (error) {
          console.warn('Error saving categorized sets (will retry later):', error);
        }
      }
    };
    
    // Debounce the save operation to prevent race conditions
    const timeoutId = setTimeout(async () => {
      try {
        await saveChanges();
      } finally {
        // Save operation completed
      }
    }, 1000); // Wait 1 second before saving to reduce frequency
    
    return () => clearTimeout(timeoutId);
  }, [categorizedSets, selectedDepartment, activeCountry]);

  // Procedure Type Management Functions
  const handleAddProcedureType = () => {
    const trimmedName = newProcedureTypeName.trim();
    
    if (!trimmedName) {
      setProcedureTypeError('Procedure type name is required');
      return;
    }
    
    if (allProcedureTypes.includes(trimmedName)) {
      setProcedureTypeError('This procedure type already exists');
      return;
    }
    
    if (trimmedName.length < 2) {
      setProcedureTypeError('Procedure type name must be at least 2 characters');
      return;
    }
    
    if (trimmedName.length > 50) {
      setProcedureTypeError('Procedure type name must be less than 50 characters');
      return;
    }
    
    // Add to department-specific storage
    const addProcedureTypeAsync = async () => {
      try {
        if (!selectedDepartment) {
          setProcedureTypeError('Please select a department first');
          return;
        }
        
        const success = await addProcedureTypeToDepartment(selectedDepartment, trimmedName, activeCountry);
        
        if (success) {
          // Update local state
          const updatedTypes = await getProcedureTypesForDepartment(selectedDepartment, activeCountry);
          setAllProcedureTypes(updatedTypes);
          
          // Initialize empty sets for the new procedure type
          setCategorizedSets(prev => ({
            ...prev,
            [trimmedName]: {
              surgerySets: [],
              implantBoxes: []
            }
          }));
          
          // Reset form
          setNewProcedureTypeName('');
          setShowAddProcedureType(false);
          setProcedureTypeError('');
          
          // Switch to the new procedure type
          setSelectedProcedureType(trimmedName);
          
          
          playSound.success();
          showSuccess('Procedure Type Added', `"${trimmedName}" has been added successfully`);
        } else {
          setProcedureTypeError('Failed to add procedure type');
        }
      } catch (error) {
        console.error('Error adding procedure type:', error);
        setProcedureTypeError('Failed to add procedure type');
      }
    };
    
    addProcedureTypeAsync();
  };

  const handleDeleteProcedureType = (typeName: string) => {
    const confirmMessage = `Are you sure you want to delete "${typeName}" from ${selectedDepartment}?\n\nThis will remove all associated surgery sets and implant boxes for this department only. This action cannot be undone.`;
    
    showConfirm('Delete Procedure Type', confirmMessage, () => {
      const deleteProcedureTypeAsync = async () => {
        try {
          if (!selectedDepartment) {
            showError('Delete Failed', 'No department selected');
            return;
          }
          
          const success = await removeProcedureTypeFromDepartment(selectedDepartment, typeName, activeCountry);
          
          if (success) {
            // Update local state for this department
            const updatedTypes = await getProcedureTypesForDepartment(selectedDepartment, activeCountry);
            setAllProcedureTypes(updatedTypes);
            
            // Remove from categorized sets for this department
            setCategorizedSets(prev => {
              const newSets = { ...prev };
              delete newSets[typeName];
              return newSets;
            });
            
            // Switch to first available procedure type if current one was deleted
            if (selectedProcedureType === typeName) {
              setSelectedProcedureType(updatedTypes[0] || '');
            }
            
            
            playSound.delete();
            showSuccess(
              'Procedure Type Deleted', 
              `"${typeName}" has been removed from ${selectedDepartment}`
            );
          } else {
            showError('Delete Failed', 'Failed to delete procedure type from department');
          }
        } catch (error) {
          console.error('Error deleting procedure type:', error);
          showError('Delete Failed', 'Failed to delete procedure type from department');
        }
      };
      
      deleteProcedureTypeAsync();
    });
  };


  const handleAddSurgerySet = () => {
    const validation = validateItemName(
      newSurgerySetName,
      'surgery',
      categorizedSets,
      selectedProcedureType
    );

    setSurgerySetError(validation.error);

    if (!validation.isValid) {
      playSound.error();
      showError('Validation Error', validation.error);
      return;
    }

    const trimmedName = newSurgerySetName.trim();
    setCategorizedSets(prev => ({
      ...prev,
      [selectedProcedureType]: {
        surgerySets: [...(prev[selectedProcedureType]?.surgerySets || []), trimmedName],
        implantBoxes: prev[selectedProcedureType]?.implantBoxes || []
      }
    }));
    
    setNewSurgerySetName('');
    setShowAddSurgerySet(false);
    playSound.success();
    showSuccess('Surgery Set Added', `"${trimmedName}" has been added to ${selectedProcedureType}`);
  };

  const handleAddImplantBox = () => {
    const validation = validateItemName(
      newImplantBoxName,
      'implant',
      categorizedSets,
      selectedProcedureType
    );

    setImplantBoxError(validation.error);

    if (!validation.isValid) {
      playSound.error();
      showError('Validation Error', validation.error);
      return;
    }

    const trimmedName = newImplantBoxName.trim();
    setCategorizedSets(prev => ({
      ...prev,
      [selectedProcedureType]: {
        surgerySets: prev[selectedProcedureType]?.surgerySets || [],
        implantBoxes: [...(prev[selectedProcedureType]?.implantBoxes || []), trimmedName]
      }
    }));
    
    setNewImplantBoxName('');
    setShowAddImplantBox(false);
    playSound.success();
    showSuccess('Implant Box Added', `"${trimmedName}" has been added to ${selectedProcedureType}`);
  };

  const handleEditSurgerySet = (oldName: string, newName: string) => {
    const validation = validateItemName(
      newName,
      'surgery',
      categorizedSets,
      selectedProcedureType,
      oldName
    );

    if (!validation.isValid) {
      playSound.error();
      showError('Validation Error', validation.error);
      return;
    }

    const trimmedName = newName.trim();
    setCategorizedSets(prev => ({
      ...prev,
      [selectedProcedureType]: {
        surgerySets: (prev[selectedProcedureType]?.surgerySets || []).map(set => 
          set === oldName ? trimmedName : set
        ),
        implantBoxes: prev[selectedProcedureType]?.implantBoxes || []
      }
    }));
    
    setEditingSurgerySet(null);
    setEditSurgerySetValue('');
    playSound.success();
    showSuccess('Surgery Set Updated', `"${oldName}" has been renamed to "${trimmedName}"`);
  };

  const handleEditImplantBox = (oldName: string, newName: string) => {
    const validation = validateItemName(
      newName,
      'implant',
      categorizedSets,
      selectedProcedureType,
      oldName
    );

    if (!validation.isValid) {
      playSound.error();
      showError('Validation Error', validation.error);
      return;
    }

    const trimmedName = newName.trim();
    setCategorizedSets(prev => ({
      ...prev,
      [selectedProcedureType]: {
        surgerySets: prev[selectedProcedureType]?.surgerySets || [],
        implantBoxes: (prev[selectedProcedureType]?.implantBoxes || []).map(box => 
          box === oldName ? trimmedName : box
        )
      }
    }));
    
    setEditingImplantBox(null);
    setEditImplantBoxValue('');
    playSound.success();
    showSuccess('Implant Box Updated', `"${oldName}" has been renamed to "${trimmedName}"`);
  };

  const handleDeleteSurgerySet = (name: string) => {
    const confirmMessage = `Are you sure you want to delete "${name}"?\n\nThis action cannot be undone and may affect existing case bookings that reference this surgery set.`;
    
    showConfirm('Delete Surgery Set', confirmMessage, () => {
      setCategorizedSets(prev => ({
        ...prev,
        [selectedProcedureType]: {
          surgerySets: (prev[selectedProcedureType]?.surgerySets || []).filter(set => set !== name),
          implantBoxes: prev[selectedProcedureType]?.implantBoxes || []
        }
      }));
      
      playSound.delete();
      showSuccess('Surgery Set Deleted', `"${name}" has been removed from ${selectedProcedureType}`);
    });
  };

  const handleDeleteImplantBox = (name: string) => {
    const confirmMessage = `Are you sure you want to delete "${name}"?\n\nThis action cannot be undone and may affect existing case bookings that reference this implant box.`;
    
    showConfirm('Delete Implant Box', confirmMessage, () => {
      setCategorizedSets(prev => ({
        ...prev,
        [selectedProcedureType]: {
          surgerySets: prev[selectedProcedureType]?.surgerySets || [],
          implantBoxes: (prev[selectedProcedureType]?.implantBoxes || []).filter(box => box !== name)
        }
      }));
      
      playSound.delete();
      showSuccess('Implant Box Deleted', `"${name}" has been removed from ${selectedProcedureType}`);
    });
  };

  const startEditSurgerySet = (name: string) => {
    setEditingSurgerySet(name);
    setEditSurgerySetValue(name);
  };

  const startEditImplantBox = (name: string) => {
    setEditingImplantBox(name);
    setEditImplantBoxValue(name);
  };

  // Drag and Drop handlers
  const handleDragStart = (type: 'surgery' | 'implant', index: number) => {
    setDraggedItem({ type, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = (type: 'surgery' | 'implant', dropIndex: number) => {
    if (!draggedItem || draggedItem.type !== type) return;

    const { index: dragIndex } = draggedItem;
    if (dragIndex === dropIndex) return;

    setCategorizedSets(prev => {
      const newSets = { ...prev };
      
      // Ensure the procedure type exists
      if (!newSets[selectedProcedureType]) {
        newSets[selectedProcedureType] = {
          surgerySets: [],
          implantBoxes: []
        };
      }
      
      const currentItems = type === 'surgery' 
        ? [...(newSets[selectedProcedureType].surgerySets || [])]
        : [...(newSets[selectedProcedureType].implantBoxes || [])];

      const reorderedItems = reorderItems(currentItems, dragIndex, dropIndex);

      if (type === 'surgery') {
        newSets[selectedProcedureType].surgerySets = reorderedItems;
      } else {
        newSets[selectedProcedureType].implantBoxes = reorderedItems;
      }

      return newSets;
    });

    setDraggedItem(null);
  };

  // Arrow movement handlers
  const moveItem = (type: 'surgery' | 'implant', index: number, direction: 'up' | 'down') => {
    const currentArray = type === 'surgery' 
      ? categorizedSets[selectedProcedureType]?.surgerySets || []
      : categorizedSets[selectedProcedureType]?.implantBoxes || [];

    let newIndex: number;
    
    switch (direction) {
      case 'up':
        newIndex = index - 1;
        break;
      case 'down':
        newIndex = index + 1;
        break;
      default:
        return;
    }
    
    // Check if move is valid
    if (newIndex < 0 || newIndex >= currentArray.length || newIndex === index) return;

    setCategorizedSets(prev => {
      const newSets = { ...prev };
      
      // Ensure the procedure type exists
      if (!newSets[selectedProcedureType]) {
        newSets[selectedProcedureType] = {
          surgerySets: [],
          implantBoxes: []
        };
      }
      
      // Use simple swap for up/down moves
      const reorderedItems = swapItems(currentArray, index, newIndex);

      if (type === 'surgery') {
        newSets[selectedProcedureType].surgerySets = reorderedItems;
      } else {
        newSets[selectedProcedureType].implantBoxes = reorderedItems;
      }

      return newSets;
    });
  };

  return (
    <div className="edit-sets-container">
      <div className="edit-sets-header">
        <div className="edit-sets-title-row">
          <h2>Edit Surgery Sets & Implant Boxes</h2>
          {isAdmin && (
            <div className="admin-country-selector">
              <label htmlFor="admin-country-select">Country:</label>
              <SearchableDropdown
                id="admin-country-select"
                value={selectedCountry || ''}
                onChange={setSelectedCountry}
                options={availableCountries}
                placeholder="Search and select country"
                className="country-select"
              />
            </div>
          )}
        </div>
        <p>Manage available surgery sets and implant boxes for case bookings, organised by procedure type
          <span> • <strong>Country: {activeCountry}</strong></span>
        </p>
      </div>

      {/* Department Filter */}
      <div className="department-filter-section">
        <div className="department-filter-header">
          <h3>Filter by Department:</h3>
          <p className="filter-description">Select a department to see related procedure types</p>
        </div>
        <div className="department-filter-dropdown">
          <SearchableDropdown
            id="department-filter-select"
            value={selectedDepartment || ''}
            onChange={setSelectedDepartment}
            options={availableDepartments}
            placeholder="Select department"
            className="department-filter-select"
          />
        </div>
      </div>

      {/* Procedure Type Selector */}
      <div className="procedure-type-selector">
        <div className="procedure-type-header">
          <h3>Select Procedure Type:</h3>
          {canManageProcedureTypes && (
            <button
              className="btn btn-primary btn-sm add-procedure-type-button"
              onClick={() => setShowAddProcedureType(true)}
              title="Add new procedure type"
            >
              + Add Procedure Type
            </button>
          )}
        </div>
        
        <div className="procedure-tabs">
          {allProcedureTypes.map(procedureType => {
            const isCustomType = !PROCEDURE_TYPES.includes(procedureType as any);
            return (
              <div key={procedureType} className="procedure-tab-container">
                <button
                  onClick={() => setSelectedProcedureType(procedureType)}
                  className={`procedure-tab ${selectedProcedureType === procedureType ? 'active' : ''}`}
                >
                  {procedureType}
                  {isCustomType && <span className="custom-type-indicator">★</span>}
                </button>
                {canManageProcedureTypes && (
                  <button
                    className="delete-procedure-type-button"
                    onClick={() => handleDeleteProcedureType(procedureType)}
                    title={`${isCustomType ? 'Delete' : 'Hide'} ${procedureType}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Procedure Type Form */}
        {showAddProcedureType && (
          <div className="add-procedure-type-form">
            <div className="form-header">
              <h4>Add New Procedure Type</h4>
            </div>
            <div className="form-content">
              <div className="form-group">
                <label htmlFor="procedureTypeName">Procedure Type Name:</label>
                <input
                  type="text"
                  id="procedureTypeName"
                  value={newProcedureTypeName}
                  onChange={(e) => {
                    setNewProcedureTypeName(e.target.value);
                    setProcedureTypeError('');
                  }}
                  placeholder="Enter procedure type name (e.g., Ankle, Wrist)"
                  maxLength={50}
                />
                {procedureTypeError && (
                  <span className="error-message">{procedureTypeError}</span>
                )}
              </div>
              <div className="form-actions">
                <button
                  className="btn btn-primary btn-md"
                  onClick={handleAddProcedureType}
                  disabled={!newProcedureTypeName.trim()}
                >
                  Add Procedure Type
                </button>
                <button
                  className="btn btn-secondary btn-md"
                  onClick={() => {
                    setShowAddProcedureType(false);
                    setNewProcedureTypeName('');
                    setProcedureTypeError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="sets-grid">
        <SetsList
          title={`Surgery Sets for ${selectedProcedureType}`}
          type="surgery"
          items={categorizedSets[selectedProcedureType]?.surgerySets || []}
          editingItem={editingSurgerySet}
          editValue={editSurgerySetValue}
          draggedItem={draggedItem}
          showAddForm={showAddSurgerySet}
          addValue={newSurgerySetName}
          addError={surgerySetError}
          onShowAdd={() => setShowAddSurgerySet(true)}
          onAddValueChange={(value) => {
            setNewSurgerySetName(value);
            setSurgerySetError('');
          }}
          onAdd={handleAddSurgerySet}
          onCancelAdd={() => {
            setShowAddSurgerySet(false);
            setNewSurgerySetName('');
            setSurgerySetError('');
          }}
          onEdit={startEditSurgerySet}
          onSave={handleEditSurgerySet}
          onCancelEdit={() => {
            setEditingSurgerySet(null);
            setEditSurgerySetValue('');
          }}
          onDelete={handleDeleteSurgerySet}
          onMove={moveItem}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onEditValueChange={setEditSurgerySetValue}
        />

        <SetsList
          title={`Implant Boxes for ${selectedProcedureType}`}
          type="implant"
          items={categorizedSets[selectedProcedureType]?.implantBoxes || []}
          editingItem={editingImplantBox}
          editValue={editImplantBoxValue}
          draggedItem={draggedItem}
          showAddForm={showAddImplantBox}
          addValue={newImplantBoxName}
          addError={implantBoxError}
          onShowAdd={() => setShowAddImplantBox(true)}
          onAddValueChange={(value) => {
            setNewImplantBoxName(value);
            setImplantBoxError('');
          }}
          onAdd={handleAddImplantBox}
          onCancelAdd={() => {
            setShowAddImplantBox(false);
            setNewImplantBoxName('');
            setImplantBoxError('');
          }}
          onEdit={startEditImplantBox}
          onSave={handleEditImplantBox}
          onCancelEdit={() => {
            setEditingImplantBox(null);
            setEditImplantBoxValue('');
          }}
          onDelete={handleDeleteImplantBox}
          onMove={moveItem}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onEditValueChange={setEditImplantBoxValue}
        />
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

export default EditSets;