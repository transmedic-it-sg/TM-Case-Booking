import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../utils/auth';
import { hasPermission } from '../data/permissionMatrixData';
import { useToast } from './ToastContainer';
import { useSound } from '../contexts/SoundContext';
import { 
  getCodeTables, 
  saveCodeTables, 
  getDefaultCodeTables, 
  initializeCodeTables,
  CodeTable 
} from '../utils/codeTable';

interface CodeTableSetupProps {}

const CodeTableSetup: React.FC<CodeTableSetupProps> = () => {
  const [codeTables, setCodeTables] = useState<CodeTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [showAddTable, setShowAddTable] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableDescription, setNewTableDescription] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editItemValue, setEditItemValue] = useState('');
  const [tableError, setTableError] = useState('');
  const [itemError, setItemError] = useState('');

  const { showError, showSuccess } = useToast();
  const { playSound } = useSound();
  
  const currentUser = getCurrentUser();
  const canManageCodeTables = currentUser ? hasPermission(currentUser.role, 'code-table-setup') : false;

  // Load code tables from localStorage
  useEffect(() => {
    initializeCodeTables();
    const tables = getCodeTables();
    
    // Filter tables based on user's country access
    const filteredTables = getFilteredTablesForUser(tables);
    setCodeTables(filteredTables);
    
    if (filteredTables.length > 0 && !selectedTable) {
      setSelectedTable(filteredTables[0].id);
    }
  }, []);

  // Filter code tables based on user's country access (VIEW ONLY - don't modify original data)
  const getFilteredTablesForUser = (tables: CodeTable[]): CodeTable[] => {
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
  };

  // Save code tables to localStorage whenever they change
  useEffect(() => {
    if (codeTables.length > 0) {
      // Only save if user has permission to modify AND is admin/IT (to prevent filtered data from being saved)
      if (canManageCodeTables && (currentUser?.role === 'admin' || currentUser?.role === 'it')) {
        saveCodeTables(codeTables);
      }
    }
  }, [codeTables, canManageCodeTables, currentUser?.role]);

  const getCurrentTable = (): CodeTable | undefined => {
    return codeTables.find(table => table.id === selectedTable);
  };

  const handleAddTable = () => {
    const trimmedName = newTableName.trim();
    const trimmedDescription = newTableDescription.trim();
    
    if (!trimmedName) {
      setTableError('Table name is required');
      return;
    }
    
    if (codeTables.some(table => table.name.toLowerCase() === trimmedName.toLowerCase())) {
      setTableError('A table with this name already exists');
      return;
    }
    
    if (trimmedName.length < 2) {
      setTableError('Table name must be at least 2 characters');
      return;
    }

    const newTable: CodeTable = {
      id: trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: trimmedName,
      description: trimmedDescription || 'Custom code table',
      items: []
    };

    setCodeTables(prev => [...prev, newTable]);
    setSelectedTable(newTable.id);
    setNewTableName('');
    setNewTableDescription('');
    setShowAddTable(false);
    setTableError('');
    
    playSound.success();
    showSuccess('Code Table Added', `"${trimmedName}" has been created successfully`);
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
    
    if (confirm(confirmMessage)) {
      setCodeTables(prev => prev.map(table => 
        table.id === selectedTable 
          ? { ...table, items: table.items.filter(item => item !== itemName) }
          : table
      ));
      
      playSound.delete();
      showSuccess('Item Deleted', `"${itemName}" has been removed from ${currentTable.name}`);
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

  const currentTable = getCurrentTable();

  return (
    <div className="code-table-setup">
      <div className="code-table-header">
        <h2>Code Table Setup</h2>
        <p>Manage system reference data and lookup tables</p>
      </div>

      <div className="table-selector">
        <div className="table-selector-header">
          <h3>Select Code Table:</h3>
        </div>
        
        <div className="table-tabs">
          {codeTables.map(table => (
            <button
              key={table.id}
              onClick={() => setSelectedTable(table.id)}
              className={`table-tab ${selectedTable === table.id ? 'active' : ''}`}
              title={table.description}
            >
              {table.name}
              <span className="item-count">({table.items.length})</span>
            </button>
          ))}
        </div>

      </div>

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
                {currentTable.items.map((item, index) => (
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
    </div>
  );
};

export default CodeTableSetup;