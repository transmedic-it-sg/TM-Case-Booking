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
  initializeCountryCodeTables,
  CodeTable 
} from '../utils/codeTable';
import {
  categorizeCodeTables,
  getFilteredTablesForUser,
  getUserAccessibleCountries,
  requiresDoubleConfirmation,
  getDeleteConfirmationMessages
} from '../utils/codeTableHelpers';
import CustomModal from './CustomModal';
import SearchableDropdown from './SearchableDropdown';
import { useModal } from '../hooks/useModal';
// import { debugCodeTables } from '../utils/debugCodeTables';

interface CodeTableSetupProps {}

const CodeTableSetup: React.FC<CodeTableSetupProps> = () => {
  const { modal, closeModal, showConfirm } = useModal();
  const [codeTables, setCodeTables] = useState<CodeTable[]>([]);
  const [countryBasedTables, setCountryBasedTables] = useState<CodeTable[]>([]);
  const [globalTables, setGlobalTables] = useState<CodeTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'global' | 'country'>('global');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editItemValue, setEditItemValue] = useState('');
  const [itemError, setItemError] = useState('');
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [isManualUpdate, setIsManualUpdate] = useState(false);

  const { showSuccess } = useToast();
  const { playSound } = useSound();
  
  const currentUser = getCurrentUser();
  const canManageCodeTables = currentUser ? hasPermission(currentUser.role, 'code-table-setup') : false;

  // Use utility functions for table operations
  const getFilteredTablesForUserWrapper = useCallback((tables: CodeTable[]) => 
    getFilteredTablesForUser(tables, currentUser), [currentUser]);

  // Initialize selected country with user's first country or current selection
  useEffect(() => {
    if (currentUser && !selectedCountry) {
      const userCountry = currentUser.selectedCountry || currentUser.countries?.[0] || 'Singapore';
      setSelectedCountry(userCountry);
    }
  }, [currentUser, selectedCountry]);

  // Load available countries from Global-Tables
  useEffect(() => {
    // Initialize global tables first to ensure countries table exists
    initializeCodeTables();
    
    // Load global tables to get available countries
    const globalTablesData = getCodeTables(); // No country parameter for global
    const countriesTable = globalTablesData.find(t => t.id === 'countries');
    
    // Use countries from Global-Tables, fallback to COUNTRIES constant if empty
    const countries = countriesTable && countriesTable.items.length > 0 
      ? countriesTable.items 
      : [...COUNTRIES];
    
    setAvailableCountries(countries);
    
    // Set initial country if not already set
    if (!selectedCountry && currentUser) {
      const userCountry = currentUser.selectedCountry || currentUser.countries?.[0] || countries[0];
      if (countries.includes(userCountry)) {
        setSelectedCountry(userCountry);
      } else if (countries.length > 0) {
        setSelectedCountry(countries[0]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); // selectedCountry intentionally excluded to avoid infinite loop

  // Load code tables from localStorage
  useEffect(() => {
    // Always initialize global tables first
    initializeCodeTables();
    
    // Load ALL tables from global storage (includes countries, hospitals, departments)
    const allTablesData = getCodeTables(); // Gets all default tables from global storage
    
    // Categorize tables into global and country-based using helper function
    const { global: globalOnly } = categorizeCodeTables(allTablesData);
    
    // Apply user filtering to global tables
    const filteredGlobalTables = getFilteredTablesForUserWrapper(globalOnly);
    
    // Update global tables immediately
    setGlobalTables(filteredGlobalTables);
    
    // If country is selected, also load country-based tables
    if (selectedCountry) {
      // Reset selected table when country changes to avoid showing wrong data
      setSelectedTable('');
      setShowAddItem(false);
      setEditingItem(null);
      
      // Initialize country-specific tables for the selected country
      initializeCountryCodeTables(selectedCountry);
      
      // Load country-based tables (hospitals, departments) from country-specific storage
      const countryTablesData = getCodeTables(selectedCountry);
      const filteredCountryTables = getFilteredTablesForUserWrapper(countryTablesData);
      
      // Set country-based tables
      setCountryBasedTables(filteredCountryTables);
      
      // Combine all tables for the unified codeTables array
      setCodeTables([...filteredGlobalTables, ...filteredCountryTables]);
    } else {
      // No country selected - don't show any country-based tables
      setCountryBasedTables([]);
      setCodeTables(filteredGlobalTables);
    }
  }, [selectedCountry, getFilteredTablesForUserWrapper]);

  // Set initial table selection when category changes or tables are loaded
  useEffect(() => {
    if (!selectedTable) {
      const initialTables = selectedCategory === 'global' ? globalTables : countryBasedTables;
      if (initialTables.length > 0) {
        setSelectedTable(initialTables[0].id);
      }
    }
  }, [selectedCategory, globalTables, countryBasedTables, selectedTable]);

  // Save code tables to localStorage whenever they change (but not during manual updates)
  useEffect(() => {
    if (!isManualUpdate && codeTables.length > 0 && canManageCodeTables && (currentUser?.role === 'admin' || currentUser?.role === 'it')) {
      // Save global tables and country-based tables separately
      const { countryBased, global } = categorizeCodeTables(codeTables);
      
      // Save global tables (no country parameter)
      if (global.length > 0) {
        saveCodeTables(global);
      }
      
      // Save country-based tables (with country parameter)
      if (countryBased.length > 0 && selectedCountry) {
        saveCodeTables(countryBased, selectedCountry);
      }
    }
    
    // Reset manual update flag
    if (isManualUpdate) {
      setIsManualUpdate(false);
    }
  }, [codeTables, canManageCodeTables, currentUser?.role, selectedCountry, isManualUpdate]);

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

    const isGlobalTable = selectedCategory === 'global';
    
    // Set manual update flag to prevent automatic save
    setIsManualUpdate(true);
    
    // Update the appropriate state arrays and save immediately
    if (isGlobalTable) {
      setGlobalTables(prev => {
        const updated = prev.map(table => 
          table.id === selectedTable 
            ? { ...table, items: [...table.items, trimmedName] }
            : table
        );
        saveCodeTables(updated); // Save global tables immediately
        return updated;
      });
    } else {
      setCountryBasedTables(prev => {
        const updated = prev.map(table => 
          table.id === selectedTable 
            ? { ...table, items: [...table.items, trimmedName] }
            : table
        );
        saveCodeTables(updated, selectedCountry); // Save country tables immediately
        return updated;
      });
    }
    
    // Update the combined codeTables array
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

    const isGlobalTable = selectedCategory === 'global';
    
    // Set manual update flag to prevent automatic save
    setIsManualUpdate(true);
    
    // Update the appropriate state arrays and save immediately
    if (isGlobalTable) {
      setGlobalTables(prev => {
        const updated = prev.map(table => 
          table.id === selectedTable 
            ? { 
                ...table, 
                items: table.items.map(item => item === oldName ? trimmedName : item) 
              }
            : table
        );
        saveCodeTables(updated); // Save global tables immediately
        return updated;
      });
    } else {
      setCountryBasedTables(prev => {
        const updated = prev.map(table => 
          table.id === selectedTable 
            ? { 
                ...table, 
                items: table.items.map(item => item === oldName ? trimmedName : item) 
              }
            : table
        );
        saveCodeTables(updated, selectedCountry); // Save country tables immediately
        return updated;
      });
    }
    
    // Update the combined codeTables array
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
    setItemError('');
    playSound.success();
    showSuccess('Item Updated', `"${oldName}" has been renamed to "${trimmedName}"`);
  };

  const handleDeleteItem = (itemName: string) => {
    const currentTable = getCurrentTable();
    if (!currentTable) return;

    const isGlobal = requiresDoubleConfirmation(selectedCategory);
    const confirmMessages = getDeleteConfirmationMessages(itemName, currentTable.name, isGlobal, selectedCountry);
    
    if (isGlobal && confirmMessages.first && confirmMessages.second) {
      // Double confirmation for Global Tables
      showConfirm(confirmMessages.first.title, confirmMessages.first.message, () => {
        showConfirm(confirmMessages.second.title, confirmMessages.second.message, () => {
          deleteItemFromTable(itemName, currentTable);
        });
      });
    } else if (confirmMessages.single) {
      // Single confirmation for country-based tables
      showConfirm(confirmMessages.single.title, confirmMessages.single.message, () => {
        deleteItemFromTable(itemName, currentTable);
      });
    }
  };

  const deleteItemFromTable = (itemName: string, table: any) => {
    const isGlobalTable = selectedCategory === 'global';
    
    // Set manual update flag to prevent automatic save
    setIsManualUpdate(true);
    
    // Update the appropriate state arrays and save immediately
    if (isGlobalTable) {
      setGlobalTables(prev => {
        const updated = prev.map(t => 
          t.id === selectedTable 
            ? { ...t, items: t.items.filter(item => item !== itemName) }
            : t
        );
        saveCodeTables(updated); // Save global tables immediately
        return updated;
      });
    } else {
      setCountryBasedTables(prev => {
        const updated = prev.map(t => 
          t.id === selectedTable 
            ? { ...t, items: t.items.filter(item => item !== itemName) }
            : t
        );
        saveCodeTables(updated, selectedCountry); // Save country tables immediately
        return updated;
      });
    }
    
    // Update the combined codeTables array
    setCodeTables(prev => prev.map(t => 
      t.id === selectedTable 
        ? { ...t, items: t.items.filter(item => item !== itemName) }
        : t
    ));
    
    playSound.delete();
    showSuccess('Item Deleted', `"${itemName}" has been removed from ${table.name}`);
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
              options={getUserAccessibleCountries(availableCountries, currentUser)}
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
              // Always ensure a country is selected when switching to country-based
              if (!selectedCountry && availableCountries.length > 0) {
                const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0] || availableCountries[0];
                setSelectedCountry(userCountry);
              }
            }}
            className={`category-tab ${selectedCategory === 'country' ? 'active' : ''}`}
            disabled={availableCountries.length === 0}
            title={availableCountries.length === 0 ? 'No countries available' : 'Manage country-specific tables'}
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
            title="Manage tables that apply to all countries"
          >
            🌍 Global Tables
            <span className="category-count">({globalTables.length})</span>
          </button>
        </div>
      </div>

      {/* Table Selection - Only show when category is selected and conditions are met */}
      {(selectedCategory === 'global' && globalTables.length > 0) || (selectedCategory === 'country' && selectedCountry && countryBasedTables.length > 0) ? (
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
      ) : (
        <div className="table-selector">
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            color: '#6c757d'
          }}>
            {selectedCategory === 'global' ? (
              <div>
                <h4>🌍 No Global Tables Available</h4>
                <p>Global tables are being loaded or there are no global tables configured.</p>
                <button 
                  onClick={() => {
                    console.log('Reinitializing global tables...');
                    initializeCodeTables();
                    window.location.reload();
                  }}
                  className="btn btn-secondary"
                >
                  Reinitialize Tables
                </button>
              </div>
            ) : (
              <div>
                <h4>🏥 {selectedCountry ? `No Tables Available for ${selectedCountry}` : 'Select a Country First'}</h4>
                <p>{selectedCountry ? 
                  'Country-based tables are being loaded or there are no tables configured for this country.' :
                  'Please select a country above to view and manage country-based tables.'
                }</p>
                {selectedCountry && (
                  <button 
                    onClick={() => {
                      console.log(`Reinitializing tables for ${selectedCountry}...`);
                      initializeCountryCodeTables(selectedCountry);
                      window.location.reload();
                    }}
                    className="btn btn-secondary"
                  >
                    Reinitialize {selectedCountry} Tables
                  </button>
                )}
              </div>
            )}
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