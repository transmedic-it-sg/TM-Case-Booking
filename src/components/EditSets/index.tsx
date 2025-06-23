import React, { useState, useEffect } from 'react';
import { PROCEDURE_TYPES } from '../../types';
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
  addCustomProcedureType, 
  removeCustomProcedureType, 
  getCustomProcedureTypes,
  getHiddenProcedureTypesList,
  restoreProcedureType
} from '../../utils/storage';
import SetsList from './SetsList';

const EditSets: React.FC<EditSetsProps> = () => {
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
  const [hiddenProcedureTypes, setHiddenProcedureTypes] = useState<string[]>([]);
  const [showAddProcedureType, setShowAddProcedureType] = useState(false);
  const [newProcedureTypeName, setNewProcedureTypeName] = useState('');
  const [procedureTypeError, setProcedureTypeError] = useState('');

  const { showError, showSuccess } = useToast();
  const { playSound } = useSound();
  
  const currentUser = getCurrentUser();
  const canManageProcedureTypes = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EDIT_SETS) : false;

  // Load all procedure types on component mount
  useEffect(() => {
    const allTypes = getAllProcedureTypes();
    const hidden = getHiddenProcedureTypesList();
    setAllProcedureTypes(allTypes);
    setHiddenProcedureTypes(hidden);
    
    // Update selected procedure type if it doesn't exist in the loaded types
    if (!allTypes.includes(selectedProcedureType)) {
      setSelectedProcedureType(allTypes[0] || PROCEDURE_TYPES[0]);
    }
  }, []);

  // Initialize categorized sets on component mount
  useEffect(() => {
    const storedSets = getCategorizedSets();
    if (Object.keys(storedSets).length > 0) {
      setCategorizedSets(storedSets);
    } else {
      const initialSets = initializeCategorizedSets();
      setCategorizedSets(initialSets);
      saveCategorizedSets(initialSets);
    }
  }, []);

  // Save categorized sets to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(categorizedSets).length > 0) {
      saveCategorizedSets(categorizedSets);
    }
  }, [categorizedSets]);

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
    
    // Add to localStorage
    if (addCustomProcedureType(trimmedName)) {
      // Update local state
      const updatedTypes = getAllProcedureTypes();
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
  };

  const handleDeleteProcedureType = (typeName: string) => {
    const isBaseType = PROCEDURE_TYPES.includes(typeName as any);
    const actionWord = isBaseType ? 'hide' : 'delete';
    const confirmMessage = `Are you sure you want to ${actionWord} "${typeName}"?\n\n${isBaseType ? 'This will hide the procedure type from the list. You can restore it later.' : 'This will remove all associated surgery sets and implant boxes.'} This action ${isBaseType ? 'can be undone' : 'cannot be undone'}.`;
    
    if (confirm(confirmMessage)) {
      if (removeCustomProcedureType(typeName)) {
        // Update local state
        const updatedTypes = getAllProcedureTypes();
        const updatedHidden = getHiddenProcedureTypesList();
        setAllProcedureTypes(updatedTypes);
        setHiddenProcedureTypes(updatedHidden);
        
        // Remove from categorized sets if it's a custom type
        if (!isBaseType) {
          setCategorizedSets(prev => {
            const newSets = { ...prev };
            delete newSets[typeName];
            return newSets;
          });
        }
        
        // Switch to first available procedure type if current one was deleted
        if (selectedProcedureType === typeName) {
          setSelectedProcedureType(updatedTypes[0] || PROCEDURE_TYPES[0]);
        }
        
        playSound.delete();
        showSuccess(
          isBaseType ? 'Procedure Type Hidden' : 'Procedure Type Deleted', 
          `"${typeName}" has been ${isBaseType ? 'hidden' : 'removed'}`
        );
      } else {
        showError(`${actionWord.charAt(0).toUpperCase() + actionWord.slice(1)} Failed`, `Failed to ${actionWord} procedure type`);
      }
    }
  };

  const handleRestoreProcedureType = (typeName: string) => {
    const confirmMessage = `Are you sure you want to restore "${typeName}"?\n\nThis will make the procedure type available again in the procedure types list.`;
    
    if (confirm(confirmMessage)) {
      if (restoreProcedureType(typeName)) {
        // Update local state
        const updatedTypes = getAllProcedureTypes();
        const updatedHidden = getHiddenProcedureTypesList();
        setAllProcedureTypes(updatedTypes);
        setHiddenProcedureTypes(updatedHidden);
        
        playSound.success();
        showSuccess('Procedure Type Restored', `"${typeName}" has been restored to the procedure types list`);
      } else {
        showError('Restore Failed', 'Failed to restore procedure type');
      }
    }
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
        ...prev[selectedProcedureType],
        surgerySets: [...prev[selectedProcedureType].surgerySets, trimmedName]
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
        ...prev[selectedProcedureType],
        implantBoxes: [...prev[selectedProcedureType].implantBoxes, trimmedName]
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
        ...prev[selectedProcedureType],
        surgerySets: prev[selectedProcedureType].surgerySets.map(set => 
          set === oldName ? trimmedName : set
        )
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
        ...prev[selectedProcedureType],
        implantBoxes: prev[selectedProcedureType].implantBoxes.map(box => 
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
    
    if (confirm(confirmMessage)) {
      setCategorizedSets(prev => ({
        ...prev,
        [selectedProcedureType]: {
          ...prev[selectedProcedureType],
          surgerySets: prev[selectedProcedureType].surgerySets.filter(set => set !== name)
        }
      }));
      
      playSound.delete();
      showSuccess('Surgery Set Deleted', `"${name}" has been removed from ${selectedProcedureType}`);
    }
  };

  const handleDeleteImplantBox = (name: string) => {
    const confirmMessage = `Are you sure you want to delete "${name}"?\n\nThis action cannot be undone and may affect existing case bookings that reference this implant box.`;
    
    if (confirm(confirmMessage)) {
      setCategorizedSets(prev => ({
        ...prev,
        [selectedProcedureType]: {
          ...prev[selectedProcedureType],
          implantBoxes: prev[selectedProcedureType].implantBoxes.filter(box => box !== name)
        }
      }));
      
      playSound.delete();
      showSuccess('Implant Box Deleted', `"${name}" has been removed from ${selectedProcedureType}`);
    }
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
      const currentItems = type === 'surgery' 
        ? [...newSets[selectedProcedureType].surgerySets]
        : [...newSets[selectedProcedureType].implantBoxes];

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

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= currentArray.length) return;

    setCategorizedSets(prev => {
      const newSets = { ...prev };
      const swappedItems = swapItems(currentArray, index, newIndex);

      if (type === 'surgery') {
        newSets[selectedProcedureType].surgerySets = swappedItems;
      } else {
        newSets[selectedProcedureType].implantBoxes = swappedItems;
      }

      return newSets;
    });
  };

  return (
    <div className="edit-sets-container">
      <div className="edit-sets-header">
        <h2>Edit Surgery Sets & Implant Boxes</h2>
        <p>Manage available surgery sets and implant boxes for case bookings, organized by procedure type</p>
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
              <button
                className="close-form-button"
                onClick={() => {
                  setShowAddProcedureType(false);
                  setNewProcedureTypeName('');
                  setProcedureTypeError('');
                }}
              >
                ✕
              </button>
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

        {/* Hidden Procedure Types Section */}
        {canManageProcedureTypes && hiddenProcedureTypes.length > 0 && (
          <div className="hidden-procedure-types-section">
            <h4>Hidden Procedure Types</h4>
            <p className="section-description">These base procedure types have been hidden. Click restore to make them available again.</p>
            <div className="hidden-types-grid">
              {hiddenProcedureTypes.map((hiddenType) => (
                <div key={hiddenType} className="hidden-type-item">
                  <span className="hidden-type-name">{hiddenType}</span>
                  <button
                    className="restore-procedure-type-button"
                    onClick={() => handleRestoreProcedureType(hiddenType)}
                    title={`Restore ${hiddenType}`}
                  >
                    ↻ Restore
                  </button>
                </div>
              ))}
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
    </div>
  );
};

export default EditSets;