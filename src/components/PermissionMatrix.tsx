import React, { useState, useEffect } from 'react';
import '../assets/components/PermissionMatrix.css';

export interface PermissionAction {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  color: string;
}

export interface Permission {
  actionId: string;
  roleId: string;
  allowed: boolean;
  conditions?: string[];
}

interface PermissionMatrixProps {
  roles: Role[];
  actions: PermissionAction[];
  permissions: Permission[];
  onPermissionChange?: (actionId: string, roleId: string, allowed: boolean) => void;
  readonly?: boolean;
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  roles,
  actions,
  permissions,
  onPermissionChange,
  readonly = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRoleSummary, setShowRoleSummary] = useState<string | null>(null);
  
  // Debug logging
  useEffect(() => {
    console.log('🔴 PERMISSION MATRIX COMPONENT DEBUG:', {
      rolesReceived: roles?.length || 0,
      rolesData: roles,
      actionsReceived: actions?.length || 0,
      actionsData: actions?.slice(0, 3), // Show first 3 actions
      permissionsReceived: permissions?.length || 0,
      permissionsData: permissions?.slice(0, 5), // Show first 5 permissions
      isDataValid: roles?.length > 0 && actions?.length > 0,
      componentMounted: true
    });
    
    if (!roles || roles.length === 0) {
      console.error('❌ PERMISSION MATRIX: NO ROLES PROVIDED!');
    }
    if (!actions || actions.length === 0) {
      console.error('❌ PERMISSION MATRIX: NO ACTIONS PROVIDED!');
    }
    if (!permissions || permissions.length === 0) {
      console.warn('⚠️ PERMISSION MATRIX: NO PERMISSIONS PROVIDED (table will be empty)');
    }
  }, [roles, actions, permissions]);

  const categories = Array.from(new Set(actions.map(action => action.category)));

  const filteredActions = actions.filter(action => {
    const matchesCategory = selectedCategory === 'all' || action.category === selectedCategory;
    const matchesSearch = action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         action.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getPermission = (actionId: string, roleId: string): Permission | undefined => {
    return permissions.find(p => p.actionId === actionId && p.roleId === roleId);
  };

  const handlePermissionToggle = (actionId: string, roleId: string) => {
    console.log('🔄 PERMISSION TOGGLE - Toggle requested:', {
      actionId,
      roleId,
      readonly,
      hasOnPermissionChange: !!onPermissionChange,
      timestamp: new Date().toISOString()
    });
    
    // CRITICAL DEBUG: Check for specific problematic permissions
    if ((actionId === 'manage-doctors' && (roleId === 'operations' || roleId === 'operations-manager')) ||
        (actionId === 'manage-procedure-types' && roleId === 'operations')) {
      console.log('🚨 PERMISSION TOGGLE - CRITICAL DEBUG FOR PROBLEMATIC PERMISSION:', {
        actionId,
        roleId,
        readonly,
        hasCallback: !!onPermissionChange,
        permissions: permissions.filter(p => p.actionId === actionId),
        currentPermission: getPermission(actionId, roleId),
        callbackFunction: onPermissionChange?.toString().slice(0, 100)
      });
    }
    
    if (readonly || !onPermissionChange) {
      console.log('⚠️ PERMISSION TOGGLE - Blocked due to readonly or missing callback:', {
        readonly,
        hasCallback: !!onPermissionChange
      });
      return;
    }
    
    // Admin role permissions cannot be modified via UI - they are managed via SQL
    if (roleId === 'admin') {
      console.log('⚠️ PERMISSION TOGGLE - Blocked: Admin role cannot be modified via UI');
      return;
    }

    const currentPermission = getPermission(actionId, roleId);
    const newAllowed = !currentPermission?.allowed;
    
    console.log('🔄 PERMISSION TOGGLE - Toggle details:', {
      actionId,
      roleId,
      currentPermission,
      currentAllowed: currentPermission?.allowed,
      newAllowed
    });

    onPermissionChange(actionId, roleId, newAllowed);
    
    console.log('✅ PERMISSION TOGGLE - Callback invoked');
  };

  const getPermissionIcon = (allowed: boolean) => {
    return allowed ? '✓' : '✕';
  };

  const getPermissionClass = (allowed: boolean) => {
    return allowed ? 'permission-allowed' : 'permission-denied';
  };

  const getRoleSummary = (roleId: string) => {
    const rolePermissions = permissions.filter(p => p.roleId === roleId && p.allowed);
    const allowedActions = rolePermissions.map(p => {
      const action = actions.find(a => a.id === p.actionId);
      return action;
    }).filter(Boolean);

    const categorizedPermissions = allowedActions.reduce((acc, action) => {
      if (!action) return acc;
      if (!acc[action.category]) {
        acc[action.category] = [];
      }
      acc[action.category].push(action);
      return acc;
    }, {} as Record<string, PermissionAction[]>);

    return {
      total: allowedActions.length,
      byCategory: categorizedPermissions,
      allPermissions: allowedActions
    };
  };

  const handleShowRoleSummary = (roleId: string) => {
    setShowRoleSummary(roleId);
  };

  const handleCloseSummary = () => {
    setShowRoleSummary(null);
  };

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showRoleSummary) {
        handleCloseSummary();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showRoleSummary]);

  return (
    <>
      <div className="permission-matrix">
      <div className="permission-matrix-header">
        <h2>Role-Based Permission Matrix</h2>
        <div className="permission-controls">
          <div className="category-filter">
            <label htmlFor="category-select">Filter by Category:</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="search-filter">
            <label htmlFor="search-input">Search Actions:</label>
            <input
              id="search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search actions..."
            />
          </div>
        </div>
      </div>

      <div className="permission-matrix-table-container scrollable-matrix">
        <table className="permission-matrix-table">
          <thead>
            <tr>
              <th className="action-column">
                <div className="action-header">
                  <span>Actions & Permissions</span>
                  <small>{filteredActions.length} actions {filteredActions.length > 10 ? '(scrollable)' : ''}</small>
                </div>
              </th>
              {roles.map(role => (
                <th key={role.id} className="role-column">
                  <div className="role-header" style={{ backgroundColor: role.color }}>
                    <span className="role-name">{role.displayName}</span>
                    <button
                      className="role-summary-button"
                      onClick={() => handleShowRoleSummary(role.id)}
                      title={`View permission summary for ${role.displayName}`}
                    >
                      Details
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredActions.map(action => (
              <tr key={action.id} className="permission-row">
                <td className="action-cell">
                  <div className="action-info">
                    <span className="action-name">{action.name}</span>
                    <small className="action-description">{action.description}</small>
                    <span className="action-category" data-category={action.category}>{action.category}</span>
                  </div>
                </td>
                {roles.map(role => {
                  const permission = getPermission(action.id, role.id);
                  const isAllowed = permission?.allowed || false;
                  const isAdminRole = role.id === 'admin';

                  return (
                    <td key={`${action.id}-${role.id}`} className="permission-cell">
                      <button
                        className={`permission-toggle ${getPermissionClass(isAllowed)} ${readonly || isAdminRole ? 'readonly' : ''} ${isAdminRole ? 'admin-permission' : ''}`}
                        onClick={() => handlePermissionToggle(action.id, role.id)}
                        disabled={readonly || isAdminRole}
                        title={
                          isAdminRole 
                            ? `Admin permissions are managed via SQL only - ${isAllowed ? 'Allowed' : 'Denied'}`
                            : `${isAllowed ? 'Allowed' : 'Denied'} for ${role.displayName}`
                        }
                      >
                        <span className="permission-icon">
                          {getPermissionIcon(isAllowed)}
                        </span>
                      </button>
                      {permission?.conditions && permission.conditions.length > 0 && (
                        <div className="permission-conditions">
                          <small>Conditions apply</small>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="permission-matrix-legend">
        <div className="legend-item">
          <span className="legend-icon permission-allowed">✓</span>
          <span>Allowed</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon permission-denied">✕</span>
          <span>Denied</span>
        </div>
        <div className="legend-item">
          <span className="legend-text">Conditions apply</span>
          <span>Additional requirements must be met</span>
        </div>
      </div>

      {/* Role Summary Modal */}
      {showRoleSummary && (
        <div className="role-summary-overlay" onClick={handleCloseSummary}>
          <div className="role-summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="role-summary-header">
              <h3>
                {roles.find(r => r.id === showRoleSummary)?.displayName}
              </h3>
              <button
                className="role-summary-close"
                onClick={handleCloseSummary}
                aria-label="Close summary"
              >
                ✕
              </button>
            </div>

            <div className="role-summary-content">
              {(() => {
                const summary = getRoleSummary(showRoleSummary);
                const role = roles.find(r => r.id === showRoleSummary);

                return (
                  <div>
                    <div className="role-summary-stats">
                      <div className="stat-card">
                        <div className="stat-number">{summary.total}</div>
                        <div className="stat-label">Total Permissions</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number">{Object.keys(summary.byCategory).length}</div>
                        <div className="stat-label">Categories</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number">
                          {Math.round((summary.total / actions.length) * 100)}%
                        </div>
                        <div className="stat-label">Coverage</div>
                      </div>
                    </div>

                    <div className="role-summary-description">
                      <h4>Role Description</h4>
                      <p>{role?.description}</p>
                    </div>

                    <div className="permissions-by-category">
                      <h4>Permissions by Category</h4>
                      {Object.entries(summary.byCategory).map(([category, categoryActions]) => (
                        <div key={category} className="category-section">
                          <h5 className="category-title">
                            {category} ({categoryActions.length})
                          </h5>
                          <div className="permission-list">
                            {categoryActions.map(action => (
                              <div key={action.id} className="permission-item">
                                <span className="permission-name">{action.name}</span>
                                <span className="permission-description">{action.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {summary.total === 0 && (
                        <div className="no-permissions">
                          <p>This role has no permissions assigned.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      </div>

    </>
  );
};

export default PermissionMatrix;