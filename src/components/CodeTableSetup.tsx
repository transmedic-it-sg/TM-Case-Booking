import React, { useState, useEffect, useMemo } from 'react';
import { getCurrentUserSync } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { useToast } from './ToastContainer';
import { useSound } from '../contexts/SoundContext';
import { COUNTRIES } from '../types';
import {
  getSupabaseCodeTables,
  addSupabaseCodeTableItem,
  updateSupabaseCodeTableItem,
  removeSupabaseCodeTableItem,
  CodeTable
} from '../utils/supabaseCodeTableService';
import {
  categorizeCodeTables,
  getFilteredTablesForUser,
  getDeleteConfirmationMessages
} from '../utils/codeTableHelpers';
import CustomModal from './CustomModal';
import SearchableDropdown from './SearchableDropdown';
import { useModal } from '../hooks/useModal';

interface CodeTableSetupProps {}

const CodeTableSetup: React.FC<CodeTableSetupProps> = () => {
  const { modal, closeModal, showConfirm, showError } = useModal();
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
  const [isLoading, setIsLoading] = useState(true);

  const { showSuccess } = useToast();
  const { playSound } = useSound();

  const currentUser = getCurrentUserSync();
  const canManageCodeTables = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.CODE_TABLE_SETUP) : false;
  const canManageGlobalTables = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.GLOBAL_TABLES) : false;

  // Calculate current table based on state - this will recalculate when tables change
  const currentTable = useMemo(() => {
    const currentTables = selectedCategory === 'global' ? globalTables : countryBasedTables;
    return currentTables.find(table => table.id === selectedTable);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, globalTables, countryBasedTables, selectedTable, isManualUpdate]);

  // Removed unused wrapper function to fix ESLint warning

  // Initialize selected country with user's first country or current selection
  useEffect(() => {
    if (currentUser && !selectedCountry) {
      const userCountry = currentUser.selectedCountry || currentUser.countries?.[0] || '';
      setSelectedCountry(userCountry);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, selectedCountry]);

  // Load available countries from Global-Tables - run only once on mount
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);

      try {
        // Load global tables from Supabase to get available countries
        const globalTablesData = await getSupabaseCodeTables(); // No country parameter for global
        let countriesTable = globalTablesData.find(t => t.id === 'countries');

        // If countries table doesn't exist or is empty, seed it with COUNTRIES constant
        if (!countriesTable || countriesTable.items.length === 0) {// Don't seed countries as they should already be in the database
          // If needed, this should be done through database migrations
        }

        // Use countries from Supabase, fallback to COUNTRIES constant if still empty
        const countries = countriesTable && countriesTable.items.length > 0
          ? countriesTable.items
          : [...COUNTRIES];

        // Filter out "Global" as it's not a real country for login
        const filteredCountries = countries.filter(country => country !== 'Global');

        setAvailableCountries(filteredCountries);

        // Set initial country if not already set
        if (!selectedCountry && currentUser) {
          const userCountry = currentUser.selectedCountry || currentUser.countries?.[0] || countries[0];
          if (countries.includes(userCountry)) {
            setSelectedCountry(userCountry);
          } else if (countries.length > 0) {
            setSelectedCountry(countries[0]);
          }
        }
      } catch (error) {
        // Fallback to constants if Supabase fails
        setAvailableCountries([...COUNTRIES]);
        if (!selectedCountry && currentUser) {
          const userCountry = currentUser.selectedCountry || currentUser.countries?.[0] || COUNTRIES[0];
          setSelectedCountry(userCountry);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run only once on mount

  // Load code tables from Supabase - optimized to prevent infinite loops
  useEffect(() => {
    if (!currentUser || isLoading) return;

    const loadTables = async () => {
      try {
        // Load global tables from Supabase (countries, global departments, etc.)
        const globalTablesData = await getSupabaseCodeTables(); // Gets all global tables from Supabase

        // Categorize tables into global and country-based using helper function
        const { global: globalOnly } = categorizeCodeTables(globalTablesData);

        // Apply user filtering to global tables
        const filteredGlobalTables = getFilteredTablesForUser(globalOnly, currentUser);

        // Update global tables immediately
        setGlobalTables(filteredGlobalTables);

        // Load country-based tables with actual data from Supabase
        let countryBasedTablesData = [];

        // Load all country-specific data in one call
        try {
          const countryData = await getSupabaseCodeTables(selectedCountry);// Find existing tables or create empty ones
          const hospitalsTable = countryData.find(t => t.id === 'hospitals') || {
            id: 'hospitals',
            name: 'Hospitals',
            description: 'Manage hospitals for each country',
            items: []
          };

          const departmentsTable = countryData.find(t => t.id === 'departments') || {
            id: 'departments',
            name: 'Departments',
            description: 'Manage departments for each country',
            items: []
          };

          countryBasedTablesData = [hospitalsTable, departmentsTable];

        } catch (error) {
          // Fallback to empty tables
          countryBasedTablesData = [
            {
              id: 'hospitals',
              name: 'Hospitals',
              description: 'Manage hospitals for each country',
              items: []
            },
            {
              id: 'departments',
              name: 'Departments',
              description: 'Manage departments for each country',
              items: []
            }
          ];
        }

        // Apply user filtering to country-based tables
        const filteredCountryTables = getFilteredTablesForUser(countryBasedTablesData, currentUser);
        setCountryBasedTables(filteredCountryTables);
      } catch (error) {
        // You could add fallback to localStorage here if needed
      }
    };

    loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role, selectedCountry, isLoading]);

  // Set initial table selection when category changes or tables are loaded
  useEffect(() => {
    const currentTables = selectedCategory === 'global' ? globalTables : countryBasedTables;

    // If no table is selected or current table doesn't exist in current category
    if (!selectedTable || !currentTables.find(t => t.id === selectedTable)) {
      if (currentTables.length > 0) {
        setSelectedTable(currentTables[0].id);
      } else {
        setSelectedTable('');
      }
    }
  }, [selectedCategory, globalTables, countryBasedTables, selectedTable]);

  // Save code tables to localStorage whenever they change (but not during manual updates)
  // Removed automatic save to prevent infinite loops - saving is now handled in individual operations
  useEffect(() => {
    // Reset manual update flag
    if (isManualUpdate) {
      setIsManualUpdate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManualUpdate]);

  const getCurrentTable = (): CodeTable | undefined => {
    // Look in the appropriate category-specific array
    const currentTables = selectedCategory === 'global' ? globalTables : countryBasedTables;
    return currentTables.find(table => table.id === selectedTable);
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

  const handleAddItem = async () => {
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

    // Global tables are read-only
    if (isGlobalTable) {
      setItemError('Global tables are read-only and cannot be modified');
      return;
    }

    // Set manual update flag to prevent automatic save
    setIsManualUpdate(true);

    try {
      // Legacy country code kept for potential future use
      // const countryCode = getLegacyCountryCode(selectedCountry) || 'SG';

      // Add item to Supabase using the selected country (supabaseService will handle normalization)
      const success = await addSupabaseCodeTableItem(selectedTable, trimmedName, selectedCountry);

      if (!success) {
        setItemError('Failed to add item. It may already exist.');
        return;
      }

      // Update local state only if Supabase operation succeeded
      setCountryBasedTables(prev => {
        return prev.map(table =>
          table.id === selectedTable
            ? { ...table, items: [...table.items, trimmedName].sort() }
            : table
        );
      });

      setNewItemName('');
      setShowAddItem(false);
      setItemError('');

      playSound.success();
      showSuccess('Item Added', `"${trimmedName}" has been added to ${currentTable.name}`);

    } catch (error) {
      setItemError('Failed to add item. Please try again.');
    }
  };

  const handleEditItem = async (oldName: string, newName: string) => {
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

    // Global tables are read-only
    if (isGlobalTable) {
      setItemError('Global tables are read-only and cannot be modified');
      return;
    }

    // Set manual update flag to prevent automatic save
    setIsManualUpdate(true);

    try {
      // Legacy country code kept for potential future use
      // const countryCode = getLegacyCountryCode(selectedCountry) || 'SG';

      // Update item in Supabase using the selected country (supabaseService will handle normalization)
      const success = await updateSupabaseCodeTableItem(selectedTable, oldName, trimmedName, selectedCountry);

      if (!success) {
        setItemError('Failed to update item. The new name may already exist.');
        return;
      }

      // Update local state only if Supabase operation succeeded
      setCountryBasedTables(prev => {
        return prev.map(table =>
          table.id === selectedTable
            ? {
                ...table,
                items: table.items.map(item => item === oldName ? trimmedName : item)
              }
            : table
        );
      });

      setEditingItem(null);
      setEditItemValue('');
      setItemError('');
      playSound.success();
      showSuccess('Item Updated', `"${oldName}" has been renamed to "${trimmedName}"`);

    } catch (error) {
      setItemError('Failed to update item. Please try again.');
    }
  };

  const handleDeleteItem = (itemName: string) => {
    const currentTable = getCurrentTable();
    if (!currentTable) return;

    const isGlobalTable = selectedCategory === 'global';

    // Global tables are read-only
    if (isGlobalTable) {
      showError('Action Not Allowed', 'Global tables are read-only and cannot be modified');
      return;
    }

    const confirmMessages = getDeleteConfirmationMessages(itemName, currentTable.name, false, selectedCountry);

    // Single confirmation for country-based tables only
    if (confirmMessages.single) {
      showConfirm(confirmMessages.single.title, confirmMessages.single.message, () => {
        deleteItemFromTable(itemName, currentTable);
      });
    }
  };

  const deleteItemFromTable = async (itemName: string, table: CodeTable) => {
    const isGlobalTable = selectedCategory === 'global';

    // Global tables are read-only - this should not be called
    if (isGlobalTable) {
      showError('Action Not Allowed', 'Global tables are read-only and cannot be modified');
      return;
    }

    // Set manual update flag to prevent unnecessary re-renders during update
    setIsManualUpdate(true);

    try {
      // Legacy country code kept for potential future use
      // const countryCode = getLegacyCountryCode(selectedCountry) || 'SG';

      // Remove item from Supabase using the selected country (supabaseService will handle normalization)
      const success = await removeSupabaseCodeTableItem(selectedTable, itemName, selectedCountry);

      if (!success) {
        showError('Delete Failed', `Failed to delete "${itemName}" from ${table.name}`);
        return;
      }

      // Force refresh from database to ensure we have the latest data
      // Import the forceRefreshCodeTables function
      const { forceRefreshCodeTables } = await import('../utils/supabaseCodeTableService');
      await forceRefreshCodeTables(selectedCountry);

      // CRITICAL FIX: Update local state after database deletion
      // Reload the table data to reflect the deletion in the UI
      const updatedCountryData = await getSupabaseCodeTables(selectedCountry);
      const hospitalsTable = updatedCountryData.find(t => t.id === 'hospitals') || {
        id: 'hospitals',
        name: 'Hospitals',
        description: 'Manage hospitals for each country',
        items: []
      };
      const departmentsTable = updatedCountryData.find(t => t.id === 'departments') || {
        id: 'departments',
        name: 'Departments',
        description: 'Manage departments for each country',
        items: []
      };
      
      // Update the country-based tables state to reflect the deletion
      setCountryBasedTables([hospitalsTable, departmentsTable]);

      playSound.delete();
      showSuccess('Item Deleted', `"${itemName}" has been removed from ${table.name}`);
    } catch (error) {
      showError('Delete Failed', `Failed to delete "${itemName}" from ${table.name}`);
    }
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

  if (isLoading) {
    return (
      <div className="code-table-setup">
        <div className="code-table-header">
          <h2>Code Table Setup</h2>
          <p>Loading code tables...</p>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
          fontSize: '1.2rem',
          color: '#6c757d'
        }}>
          🔄 Loading data...
        </div>
      </div>
    );
  }

  return (
    <div className="code-table-setup">
      <div className="code-table-header">
        <h2>Code Table Setup</h2>
        <p>Manage system reference data and lookup tables</p>
      </div>

      {/* Country-Based Tables Section - Show country selection for admin only */}
      {selectedCategory === 'country' && countryBasedTables.length > 0 && currentUser?.role === 'admin' && (
        <div className="country-selector">
          <div className="country-selector-header">
            <h3>🏥 Country Selection:</h3>
            <p>Select the country to manage</p>
          </div>

          <div className="dropdown-input-container" style={{ maxWidth: '300px' }}>
            <label htmlFor="country-select">Country:</label>
            <SearchableDropdown
              options={availableCountries.map(country => ({
                value: country,
                label: country
              }))}
              value={selectedCountry}
              onChange={setSelectedCountry}
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
            title={canManageGlobalTables ? "Manage tables that apply to all countries" : "View global tables (read-only access)"}
          >
            🌍 Global Tables
            <span className="category-count">({globalTables.length})</span>
            {!canManageGlobalTables && <span className="read-only-indicator">👁️</span>}
          </button>
        </div>
      </div>

      {/* Table Selection - Only show when category is selected and conditions are met */}
      {(selectedCategory === 'global' && globalTables.length > 0) || (selectedCategory === 'country' && countryBasedTables.length > 0) ? (
        <div className="table-selector">
          <div className="table-selector-header">
            <h3>
              {selectedCategory === 'global'
                ? '🌍 Select Global Code Table:'
                : '🏥 Select Country-Based Code Table:'
              }
            </h3>
            <p>
              {selectedCategory === 'global'
                ? 'These tables apply to all countries'
                : 'These tables are specific to individual countries'
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
                  onClick={async () => {
                    try {
                      // Reload global tables from Supabase
                      const globalTablesData = await getSupabaseCodeTables();
                      const { global: globalOnly } = categorizeCodeTables(globalTablesData);
                      const filteredGlobalTables = getFilteredTablesForUser(globalOnly, currentUser);
                      setGlobalTables(filteredGlobalTables);
                    } catch (error) {
                    }
                  }}
                  className="btn btn-secondary"
                >
                  Reinitialize Tables
                </button>
              </div>
            ) : (
              <div>
                <h4>🏥 No Country-Based Tables Available</h4>
                <p>Country-based tables are being loaded or there are no tables configured yet.</p>
                <button
                  onClick={async () => {
                    try {
                      // Reload global tables to get countries and create unified country-based tables
                      const globalTablesData = await getSupabaseCodeTables();
                      const { global: globalOnly } = categorizeCodeTables(globalTablesData);
                      const filteredGlobalTables = getFilteredTablesForUser(globalOnly, currentUser);
                      setGlobalTables(filteredGlobalTables);

                      // Create generic country-based tables structure
                      const genericCountryTables = [
                        {
                          id: 'hospitals',
                          name: 'Hospitals',
                          description: 'Manage hospitals for each country',
                          items: []
                        },
                        {
                          id: 'departments',
                          name: 'Departments',
                          description: 'Manage departments for each country',
                          items: []
                        }
                      ];
                      setCountryBasedTables(genericCountryTables);

                    } catch (error) {
                    }
                  }}
                  className="btn btn-secondary"
                >
                  Reinitialize Country Tables
                </button>
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
            {selectedCategory !== 'global' && (
              <button
                className="btn btn-primary btn-sm add-item-button"
                onClick={() => setShowAddItem(true)}
                title="Add new item"
              >
                + Add Item
              </button>
            )}
            {selectedCategory === 'global' && (
              <span className="read-only-badge" title="Global tables are read-only">
                📖 Read-Only
              </span>
            )}
          </div>

          {/* Add Item Form - Only for country tables */}
          {showAddItem && selectedCategory !== 'global' && (
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
                {selectedCategory !== 'global' && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowAddItem(true)}
                  >
                    Add First Item
                  </button>
                )}
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
                        {selectedCategory !== 'global' && (
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
                        )}
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