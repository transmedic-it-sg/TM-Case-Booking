/**
 * Department-Based Edit Sets Component
 * Restores the original department-based filtering for Procedure Types, Surgery Sets, and Implant Boxes
 * Uses the proper department service for data management
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getCurrentUser } from '../../utils/authCompat';
import { hasPermission, PERMISSION_ACTIONS } from '../../utils/permissions';
import { getDepartments, getProcedureTypesForDepartment, addProcedureTypeToDepartment, removeProcedureTypeFromDepartment, getSurgerySets, getImplantBoxes, addSurgerySet, addImplantBox } from '../../utils/supabaseDepartmentService';
import { useToast } from '../ToastContainer';
import { useSound } from '../../contexts/SoundContext';
import { useModal } from '../../hooks/useModal';
import CustomModal from '../CustomModal';
import '../../assets/components/EditSetsMobile.css';

interface User {
  id: string;
  username: string;
  selectedCountry?: string; // Optional for compatibility
  countries: string[];
  role: string;
}

interface Department {
  id: string;
  name: string;
  country: string;
  is_active: boolean;
}

// interface CategorizedSets { // Removed - no longer used after simplification
//   [procedureType: string]: {
//     surgerySets: string[];
//     implantBoxes: string[];
//   };
// }

const TABS = {
  PROCEDURE_TYPES: 'procedure_types',
  SURGERY_SETS: 'surgery_sets', 
  IMPLANT_BOXES: 'implant_boxes'
} as const;

type TabType = typeof TABS[keyof typeof TABS];

const DepartmentEditSets: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TABS.PROCEDURE_TYPES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<string[]>([]);
  const [surgerySets, setSurgerySets] = useState<string[]>([]);
  const [implantBoxes, setImplantBoxes] = useState<string[]>([]);
  // const [categorizedSets, setCategorizedSets] = useState<CategorizedSets>({}); // Removed - no longer used after simplification
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const { modal, closeModal, showConfirm } = useModal();
  const { showSuccess, showError } = useToast();
  const { playSound } = useSound();

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

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

  // Load departments when user country is available
  useEffect(() => {
    const loadDepartments = async () => {
      if (!userCountry) {
        showError('Country Required', 'Please select a country in your profile to manage sets.');
        return;
      }

      if (!canEditSets) {
        return;
      }

      try {
        setIsLoading(true);
        const depts = await getDepartments(userCountry);
        setDepartments(depts);
        
        if (depts.length > 0) {
          setSelectedDepartment(depts[0].name);
        }
      } catch (error) {
        console.error('Error loading departments:', error);
        showError('Error', 'Failed to load departments');
      } finally {
        setIsLoading(false);
      }
    };

    loadDepartments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCountry, canEditSets]);

  // Load data based on active tab and selected department
  useEffect(() => {
    const loadTabData = async () => {
      if (!userCountry || !selectedDepartment || !canEditSets) return;

      try {
        setIsLoading(true);

        if (activeTab === TABS.PROCEDURE_TYPES) {
          const types = await getProcedureTypesForDepartment(selectedDepartment, userCountry);
          setProcedureTypes(types);
        } else if (activeTab === TABS.SURGERY_SETS) {
          const sets = await getSurgerySets(userCountry);
          setSurgerySets(sets);
          
          // Load categorized sets for this department to show which are assigned
          // const catSets = await getCategorizedSetsForDepartment(selectedDepartment, userCountry);
          // setCategorizedSets(catSets); // Removed - no longer used after removing assignment indicators
        } else if (activeTab === TABS.IMPLANT_BOXES) {
          const boxes = await getImplantBoxes(userCountry);
          setImplantBoxes(boxes);
          
          // Load categorized sets for this department to show which are assigned
          // const catSets = await getCategorizedSetsForDepartment(selectedDepartment, userCountry);
          // setCategorizedSets(catSets); // Removed - no longer used after removing assignment indicators
        }
      } catch (error) {
        console.error('Error loading tab data:', error);
        showError('Error', 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadTabData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userCountry, selectedDepartment, canEditSets]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    if (activeTab === TABS.PROCEDURE_TYPES) {
      return procedureTypes.filter(item => 
        item.toLowerCase().includes(query)
      );
    } else if (activeTab === TABS.SURGERY_SETS) {
      return surgerySets.filter(item => 
        item.toLowerCase().includes(query)
      );
    } else if (activeTab === TABS.IMPLANT_BOXES) {
      return implantBoxes.filter(item => 
        item.toLowerCase().includes(query)
      );
    }
    
    return [];
  }, [activeTab, searchQuery, procedureTypes, surgerySets, implantBoxes]);

  // Add new item
  const handleAddItem = useCallback(async (itemName: string) => {
    if (!userCountry || !itemName.trim() || isSubmitting || !canEditSets) return;

    try {
      setIsSubmitting(true);
      
      if (activeTab === TABS.PROCEDURE_TYPES) {
        const success = await addProcedureTypeToDepartment(selectedDepartment, itemName, userCountry);
        if (success) {
          setProcedureTypes(prev => [...prev, itemName].sort());
          showSuccess('Success', `${itemName} added successfully`);
          playSound.success();
        } else {
          throw new Error('Failed to add procedure type');
        }
      } else if (activeTab === TABS.SURGERY_SETS) {
        const success = await addSurgerySet(itemName, userCountry);
        if (success) {
          setSurgerySets(prev => [...prev, itemName].sort());
          showSuccess('Success', `${itemName} added successfully`);
          playSound.success();
        } else {
          throw new Error('Failed to add surgery set');
        }
      } else if (activeTab === TABS.IMPLANT_BOXES) {
        const success = await addImplantBox(itemName, userCountry);
        if (success) {
          setImplantBoxes(prev => [...prev, itemName].sort());
          showSuccess('Success', `${itemName} added successfully`);
          playSound.success();
        } else {
          throw new Error('Failed to add implant box');
        }
      }
      
    } catch (error) {
      console.error('Error adding item:', error);
      showError('Error', 'Failed to add item');
      playSound.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [activeTab, userCountry, selectedDepartment, isSubmitting, canEditSets, showSuccess, showError, playSound]);

  // Remove item
  const handleRemoveItem = useCallback((itemName: string) => {
    if (!userCountry || isSubmitting || !canEditSets) return;

    showConfirm(
      'Confirm Deletion',
      `Are you sure you want to remove "${itemName}"?`,
      async () => {

    try {
      setIsSubmitting(true);
      
      if (activeTab === TABS.PROCEDURE_TYPES) {
        const success = await removeProcedureTypeFromDepartment(selectedDepartment, itemName, userCountry);
        if (success) {
          setProcedureTypes(prev => prev.filter(item => item !== itemName));
          showSuccess('Success', `${itemName} removed successfully`);
          playSound.delete();
        } else {
          throw new Error('Failed to remove procedure type');
        }
      } else {
        // For surgery sets and implant boxes, we don't delete them but remove from department categorization
        showError('Not Implemented', 'Surgery Set and Implant Box removal is not yet implemented');
      }
      
    } catch (error) {
      console.error('Error removing item:', error);
      showError('Error', 'Failed to remove item');
      playSound.error();
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  }, [activeTab, userCountry, selectedDepartment, isSubmitting, canEditSets, showConfirm, showSuccess, showError, playSound]);


  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: string) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item);
  };

  const handleDragOver = (e: React.DragEvent, item: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(item);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = async (e: React.DragEvent, dropItem: string) => {
    e.preventDefault();
    setDragOverItem(null);
    
    if (!draggedItem || draggedItem === dropItem || !canEditSets) {
      setDraggedItem(null);
      return;
    }

    try {
      // Reorder the items array
      let newItems: string[] = [];
      
      if (activeTab === TABS.PROCEDURE_TYPES) {
        newItems = [...procedureTypes];
      } else if (activeTab === TABS.SURGERY_SETS) {
        newItems = [...surgerySets];
      } else if (activeTab === TABS.IMPLANT_BOXES) {
        newItems = [...implantBoxes];
      }

      const draggedIndex = newItems.indexOf(draggedItem);
      const dropIndex = newItems.indexOf(dropItem);
      
      if (draggedIndex !== -1 && dropIndex !== -1) {
        // Remove dragged item and insert at new position
        newItems.splice(draggedIndex, 1);
        newItems.splice(dropIndex, 0, draggedItem);
        
        // Update the state
        if (activeTab === TABS.PROCEDURE_TYPES) {
          setProcedureTypes(newItems);
        } else if (activeTab === TABS.SURGERY_SETS) {
          setSurgerySets(newItems);
        } else if (activeTab === TABS.IMPLANT_BOXES) {
          setImplantBoxes(newItems);
        }
        
        showSuccess('Success', 'Items reordered successfully');
        playSound.success();
      }
    } catch (error) {
      console.error('Error reordering items:', error);
      showError('Error', 'Failed to reorder items');
      playSound.error();
    } finally {
      setDraggedItem(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  // Add item dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const handleAddClick = () => {
    setNewItemName('');
    setShowAddDialog(true);
  };

  const handleAddSubmit = () => {
    if (newItemName.trim()) {
      handleAddItem(newItemName.trim());
      setShowAddDialog(false);
      setNewItemName('');
    }
  };

  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case TABS.PROCEDURE_TYPES: return 'Procedure Types';
      case TABS.SURGERY_SETS: return 'Surgery Sets';
      case TABS.IMPLANT_BOXES: return 'Implant Boxes';
      default: return '';
    }
  };

  const getAddButtonLabel = () => {
    switch (activeTab) {
      case TABS.PROCEDURE_TYPES: return 'Add Procedure Type';
      case TABS.SURGERY_SETS: return 'Add Surgery Set';
      case TABS.IMPLANT_BOXES: return 'Add Implant Box';
      default: return 'Add Item';
    }
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
    <div className="edit-sets-container">
      <div className="edit-sets-header">
        <h2>Edit Sets</h2>
        <div className="department-selector">
          <label>Department:</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            disabled={isLoading}
          >
            {departments.map(dept => (
              <option key={dept.id} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="tabs">
        {Object.values(TABS).map(tab => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {getTabLabel(tab)}
          </button>
        ))}
      </div>

      <div className="search-container">
        <div className="search-input-container">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            placeholder={`Search ${getTabLabel(activeTab).toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="action-buttons">
          {canEditSets && filteredItems.length > 1 && (
            <span className="drag-info">💡 Drag to reorder</span>
          )}
          <button
            className="add-button"
            onClick={handleAddClick}
            disabled={isSubmitting}
          >
            + {getAddButtonLabel()}
          </button>
        </div>
      </div>

      <div className={`items-list ${draggedItem ? 'drag-active' : ''}`}>
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div className="no-items">
            {searchQuery ? 'No matching items found' : `No ${getTabLabel(activeTab).toLowerCase()} available`}
          </div>
        ) : (
          filteredItems.map(item => (
            <div 
              key={item} 
              className={`item-row ${
                draggedItem === item ? 'dragging' : ''
              } ${
                dragOverItem === item ? 'drag-over' : ''
              }`}
              draggable={canEditSets && !isSubmitting}
              onDragStart={(e) => handleDragStart(e, item)}
              onDragOver={(e) => handleDragOver(e, item)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item)}
              onDragEnd={handleDragEnd}
            >
              {canEditSets && !isSubmitting && (
                <span className="drag-handle" title="Drag to reorder">
                  ⋮⋮
                </span>
              )}
              <span className="item-name">{item}</span>
              <button
                className="remove-button"
                onClick={() => handleRemoveItem(item)}
                disabled={isSubmitting || (activeTab !== TABS.PROCEDURE_TYPES)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Item Dialog */}
      <CustomModal
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        title={getAddButtonLabel()}
        message="Enter the name for the new item:"
        actions={[
          { label: 'Cancel', onClick: () => setShowAddDialog(false), style: 'secondary' },
          { 
            label: 'Add', 
            onClick: handleAddSubmit, 
            style: 'primary',
            disabled: !newItemName.trim() || isSubmitting
          }
        ]}
      />
      
      {showAddDialog && (
        <div className="add-item-dialog" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1001, backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <input
            type="text"
            placeholder="Enter name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddSubmit();
              }
            }}
            autoFocus
            style={{ width: '100%', padding: '8px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>
      )}

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

export default DepartmentEditSets;