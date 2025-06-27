import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../utils/auth';
import { hasPermission } from '../data/permissionMatrixData';
import { useToast } from './ToastContainer';
import { useSound } from '../contexts/SoundContext';
import { COUNTRIES } from '../types';
import { 
  getCodeTables, 
  saveCodeTables, 
  initializeCodeTables,
  CodeTable 
} from '../utils/codeTable';
import CustomModal from './CustomModal';
import SearchableDropdown from './SearchableDropdown';
import { useModal } from '../hooks/useModal';

interface CodeTableSetupProps {}

const CodeTableSetup: React.FC<CodeTableSetupProps> = () => {
  const { modal, closeModal, showConfirm } = useModal();
  const [codeTables, setCodeTables] = useState<CodeTable[]>([]);
  const [countryBasedTables, setCountryBasedTables] = useState<CodeTable[]>([]);
  const [globalTables, setGlobalTables] = useState<CodeTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'global' | 'country'>('country');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editItemValue, setEditItemValue] = useState('');
  const [itemError, setItemError] = useState('');

  const { showSuccess } = useToast();
  const { playSound } = useSound();
  
  const currentUser = getCurrentUser();
  const canManageCodeTables = currentUser ? hasPermission(currentUser.role, 'code-table-setup') : false;

  // Categorize tables into global and country-based
  const categorizeCodeTables = useCallback((tables: CodeTable[]) => {
    const countryBased: CodeTable[] = [];
    const global: CodeTable[] = [];
    
    tables.forEach(table => {
      if (table.id === 'countries') {
        // Countries is global
        global.push(table);
      } else if (table.id === 'hospitals' || table.id === 'departments') {
        // Hospitals and Departments are country-based
        countryBased.push(table);
      } else {
        // Default to country-based for future tables
        countryBased.push(table);
      }
    });
    
    return { countryBased, global };
  }, []);

  // Filter code tables based on user's country access (VIEW ONLY - don't modify original data)
  const getFilteredTablesForUser = useCallback((tables: CodeTable[]): CodeTable[] => {
    if (!currentUser) return tables;
    
    // Admin and IT can see and modify all tables
    if (currentUser.role === 'admin' || currentUser.role === 'it') {
      return tables;
    }
    
    // For other users, filter based on their assigned countries (VIEW ONLY)
    return tables.map(table => {
      if (table.id === 'countries' && currentUser.countries && currentUser.countries.length > 0) {
        // Filter countries based on user's assigned countries FOR DISPLAY ONLY
        return {
          ...table,
          items: table.items.filter(country => currentUser.countries?.includes(country))
        };
      }
      return table;
    });
  }, [currentUser]);

  // Initialize selected country with user's first country or current selection
  useEffect(() => {
    if (currentUser && !selectedCountry) {
      const userCountry = currentUser.selectedCountry || currentUser.countries?.[0] || 'Singapore';
      setSelectedCountry(userCountry);
    }
  }, [currentUser, selectedCountry]);

  // Load code tables from localStorage based on selected country
  useEffect(() => {
    if (!selectedCountry) return;
    
    initializeCodeTables();
    
    // Load global tables (countries)
    const globalTablesData = getCodeTables(); // No country parameter for global
    const filteredGlobalTables = getFilteredTablesForUser(globalTablesData.filter(t => t.id === 'countries'));
    
    // Load country-based tables (hospitals, departments)
    const countryTablesData = getCodeTables(selectedCountry);
    const filteredCountryTables = getFilteredTablesForUser(countryTablesData.filter(t => t.id !== 'countries'));
    
    // Categorize tables
    const allTables = [...filteredGlobalTables, ...filteredCountryTables];
    const { countryBased, global } = categorizeCodeTables(allTables);
    
    setGlobalTables(global);
    setCountryBasedTables(countryBased);
    setCodeTables(allTables);
    
    // Set initial selection based on category
    if (!selectedTable) {
      const initialTables = selectedCategory === 'global' ? global : countryBased;
      if (initialTables.length > 0) {
        setSelectedTable(initialTables[0].id);
      }
    }
  }, [getFilteredTablesForUser, selectedTable, selectedCountry, selectedCategory, categorizeCodeTables]);

  // Save code tables to localStorage whenever they change
  useEffect(() => {
    if (codeTables.length > 0 && selectedCountry) {
      // Only save if user has permission to modify AND is admin/IT (to prevent filtered data from being saved)
      if (canManageCodeTables && (currentUser?.role === 'admin' || currentUser?.role === 'it')) {
        saveCodeTables(codeTables, selectedCountry);
      }
    }
  }, [codeTables, canManageCodeTables, currentUser?.role, selectedCountry]);

  const getCurrentTable = (): CodeTable | undefined => {
    return codeTables.find(table => table.id === selectedTable);
  };

  const getCurrentCategoryTables = (): CodeTable[] => {
    return selectedCategory === 'global' ? globalTables : countryBasedTables;
  };

  const getTableOptions = () => {
    const currentTables = getCurrentCategoryTables();
    return currentTables.map(table => ({
      value: table.id,
      label: `${table.name} (${table.items.length})`
    }));
  };



  const handleAddItem = () => {
    const trimmedName = newItemName.trim();
    const currentTable = getCurrentTable();
    
    if (!trimmedName) {
      setItemError('Item name is required');
      return;
    }
    
    if (!currentTable) {
      setItemError('No table selected');
      return;
    }
    
    if (currentTable.items.includes(trimmedName)) {
      setItemError('This item already exists in the table');
      return;
    }
    
    if (trimmedName.length < 1) {
      setItemError('Item name must be at least 1 character');
      return;
    }

    setCodeTables(prev => prev.map(table => 
      table.id === selectedTable 
        ? { ...table, items: [...table.items, trimmedName] }
        : table
    ));
    
    setNewItemName('');
    setShowAddItem(false);
    setItemError('');
    
    playSound.success();
    showSuccess('Item Added', `"${trimmedName}" has been added to ${currentTable.name}`);
  };

  const handleEditItem = (oldName: string, newName: string) => {
    const trimmedName = newName.trim();
    const currentTable = getCurrentTable();
    
    if (!trimmedName) {
      setItemError('Item name is required');
      return;
    }
    
    if (!currentTable) {
      setItemError('No table selected');
      return;
    }
    
    if (trimmedName !== oldName && currentTable.items.includes(trimmedName)) {
      setItemError('This item already exists in the table');
      return;
    }

    setCodeTables(prev => prev.map(table => 
      table.id === selectedTable 
        ? { 
            ...table, 
            items: table.items.map(item => item === oldName ? trimmedName : item) 
          }
        : table
    ));
    
    setEditingItem(null);
    setEditItemValue('');
    playSound.success();
    showSuccess('Item Updated', `"${oldName}" has been renamed to "${trimmedName}"`);
  };

  const handleDeleteItem = (itemName: string) => {
    const currentTable = getCurrentTable();
    if (!currentTable) return;

    const confirmMessage = `Are you sure you want to delete "${itemName}" from ${currentTable.name}?\n\nThis action cannot be undone.`;
    
    showConfirm('Delete Item', confirmMessage, () => {
      setCodeTables(prev => prev.map(table => 
        table.id === selectedTable 
          ? { ...table, items: table.items.filter(item => item !== itemName) }
          : table
      ));
      
      playSound.delete();
      showSuccess('Item Deleted', `"${itemName}" has been removed from ${currentTable.name}`);
    });
  };

  const startEditItem = (itemName: string) => {
    setEditingItem(itemName);
    setEditItemValue(itemName);
  };

  if (!canManageCodeTables) {
    return (
      <div className="code-table-setup">
        <div className="permission-denied-message">
          <h3>Access Denied</h3>
          <p>You don't have permission to access Code Table Setup.</p>
          <p>Please contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  const currentTable = getCurrentTable();

  return (
    <div className="code-table-setup">
      <div className="code-table-header">
        <h2>Code Table Setup</h2>
        <p>Manage system reference data and lookup tables</p>
      </div>

      {/* Country Selection - Only show for Admin/IT users and Country-Based Tables */}
      {(currentUser?.role === 'admin' || currentUser?.role === 'it') && selectedCategory === 'country' && (
        <div className="country-selector">
          <div className="country-selector-header">
            <h3>🌍 Select Country:</h3>
            <p>Country-based code tables are managed separately for each country</p>
          </div>
          <div className="country-dropdown">
            <SearchableDropdown
              options={[...COUNTRIES]}
              value={selectedCountry}
              onChange={(value) => setSelectedCountry(value)}
              placeholder="Select a country..."
              className="country-select-dropdown"
            />
          </div>
        </div>
      )}

      {/* Category Selection */}
      <div className="category-selector">
        <div className="category-selector-header">
          <h3>📊 Code Table Categories:</h3>
          <p>Select the type of code tables to manage</p>
        </div>
        
        <div className="category-tabs">
          <button
            onClick={() => {
              setSelectedCategory('country');
              setSelectedTable('');
              // Set default country if not set when switching to country-based
              if (!selectedCountry && currentUser) {
                const userCountry = currentUser.selectedCountry || currentUser.countries?.[0] || 'Singapore';
                setSelectedCountry(userCountry);
              }
            }}
            className={`category-tab ${selectedCategory === 'country' ? 'active' : ''}`}
          >
            🏥 Country-Based Tables
            <span className="category-count">({countryBasedTables.length})</span>
          </button>
          <button
            onClick={() => {
              setSelectedCategory('global');
              setSelectedTable('');
            }}
            className={`category-tab ${selectedCategory === 'global' ? 'active' : ''}`}
          >
            🌍 Global Tables
            <span className="category-count">({globalTables.length})</span>
          </button>
        </div>
      </div>

      {/* Table Selection - Only show when category is selected and conditions are met */}
      {(selectedCategory === 'global' || (selectedCategory === 'country' && selectedCountry)) && (
        <div className="table-selector">
          <div className="table-selector-header">
            <h3>
              {selectedCategory === 'global' 
                ? '🌍 Select Global Code Table:' 
                : `🏥 Select Code Table for ${selectedCountry}:`
              }
            </h3>
            <p>
              {selectedCategory === 'global'
                ? 'These tables apply to all countries'
                : 'These tables are specific to the selected country'
              }
            </p>
          </div>
          
          <div className="table-dropdown">
            <SearchableDropdown
              options={getTableOptions()}
              value={selectedTable}
              onChange={setSelectedTable}
              placeholder="Select a code table..."
              className="table-select-dropdown"
            />
          </div>
        </div>
      )}

      {/* Current Table Items */}
      {currentTable && (
        <div className="table-content">
          <div className="table-content-header">
            <div className="table-info">
              <h3>{currentTable.name}</h3>
              <p>{currentTable.description}</p>
              <span className="item-count">{currentTable.items.length} items</span>
            </div>
            <button
              className="btn btn-primary btn-sm add-item-button"
              onClick={() => setShowAddItem(true)}
              title="Add new item"
            >
              + Add Item
            </button>
          </div>

          {/* Add Item Form */}
          {showAddItem && (
            <div className="add-item-form">
              <div className="form-group">
                <label htmlFor="itemName">Item Name:</label>
                <input
                  type="text"
                  id="itemName"
                  value={newItemName}
                  onChange={(e) => {
                    setNewItemName(e.target.value);
                    setItemError('');
                  }}
                  placeholder="Enter item name"
                  maxLength={100}
                />
                {itemError && (
                  <span className="error-message">{itemError}</span>
                )}
              </div>
              <div className="form-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddItem}
                  disabled={!newItemName.trim()}
                >
                  Add Item
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowAddItem(false);
                    setNewItemName('');
                    setItemError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="items-list">
            {currentTable.items.length === 0 ? (
              <div className="empty-state">
                <p>No items in this table yet.</p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddItem(true)}
                >
                  Add First Item
                </button>
              </div>
            ) : (
              <div className="items-grid">
                {currentTable.items.sort().map((item, index) => (
                  <div key={index} className="item-card">
                    {editingItem === item ? (
                      <div className="edit-item-form">
                        <input
                          type="text"
                          value={editItemValue}
                          onChange={(e) => setEditItemValue(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleEditItem(item, editItemValue);
                            }
                          }}
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleEditItem(item, editItemValue)}
                            disabled={!editItemValue.trim()}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditingItem(null);
                              setEditItemValue('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="item-display">
                        <span className="item-name">{item}</span>
                        <div className="item-actions">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => startEditItem(item)}
                            title="Edit item"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDeleteItem(item)}
                            title="Delete item"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
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

export default CodeTableSetup;