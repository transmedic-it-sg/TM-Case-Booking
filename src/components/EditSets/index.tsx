import React, { useState, useEffect } from 'react';
import { PROCEDURE_TYPES } from '../../types';
import { useToast } from '../ToastContainer';
import { useSound } from '../../contexts/SoundContext';
import { EditSetsProps, CategorizedSets, DraggedItem } from './types';
import { validateItemName } from './validation';
import { initializeCategorizedSets, reorderItems, swapItems } from './utils';
import { saveCategorizedSets, getCategorizedSets } from '../../utils/storage';
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

  const { showError, showSuccess } = useToast();
  const { playSound } = useSound();

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
        <h3>Select Procedure Type:</h3>
        <div className="procedure-tabs">
          {PROCEDURE_TYPES.map(procedureType => (
            <button
              key={procedureType}
              onClick={() => setSelectedProcedureType(procedureType)}
              className={`procedure-tab ${selectedProcedureType === procedureType ? 'active' : ''}`}
            >
              {procedureType}
            </button>
          ))}
        </div>
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