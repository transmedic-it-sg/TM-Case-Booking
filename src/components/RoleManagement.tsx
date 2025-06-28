import React, { useState, useEffect } from 'react';
import { Role } from './PermissionMatrix';
import { roles as defaultRoles, permissionActions as allActions, permissions as allPermissions } from '../data/permissionMatrixData';
import { 
  loadCustomRoles, 
  saveCustomRoles, 
  validateRole, 
  generateRoleId, 
  deleteCustomRole,
  getPredefinedColors 
} from '../utils/roleManagement';
import SearchableDropdown from './SearchableDropdown';
import CustomModal from './CustomModal';
import { useModal } from '../hooks/useModal';
import { useToast } from './ToastContainer';
import { useSound } from '../contexts/SoundContext';
import PermissionMatrix from './PermissionMatrix';
import './RoleManagement.css';

interface RoleManagementProps {
  onRoleUpdate?: (updatedRoles: Role[]) => void;
}

interface NewRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  color: string;
  basedOnRole?: string;
}

const predefinedColors = getPredefinedColors();

const RoleManagement: React.FC<RoleManagementProps> = ({ onRoleUpdate }) => {
  const [customRoles, setCustomRoles] = useState<Role[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>(defaultRoles);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<NewRole>({
    id: '',
    name: '',
    displayName: '',
    description: '',
    color: predefinedColors[0],
    basedOnRole: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { modal, closeModal, showConfirm } = useModal();
  const { showSuccess, showError } = useToast();
  const { playSound } = useSound();

  // Load custom roles from localStorage
  useEffect(() => {
    const customRolesData = loadCustomRoles();
    setCustomRoles(customRolesData);
    setAllRoles([...defaultRoles, ...customRolesData]);
  }, []);

  // Save custom roles to localStorage
  const saveCustomRolesData = (roles: Role[]) => {
    try {
      saveCustomRoles(roles);
      setCustomRoles(roles);
      const updatedAllRoles = [...defaultRoles, ...roles];
      setAllRoles(updatedAllRoles);
      onRoleUpdate?.(updatedAllRoles);
    } catch (error) {
      console.error('Error saving custom roles:', error);
      showError('Failed to save custom roles', 'Error');
    }
  };

  const validateNewRole = (): boolean => {
    const roleToValidate = {
      name: newRole.name,
      displayName: newRole.displayName,
      description: newRole.description,
      color: newRole.color,
      id: newRole.name
    };

    const validationErrors = validateRole(roleToValidate, allRoles);
    const errorObj = validationErrors.reduce((acc, error) => {
      // Map validation errors to form fields
      if (error.includes('Role name')) acc.name = error;
      else if (error.includes('Display name')) acc.displayName = error;
      else if (error.includes('Description')) acc.description = error;
      else if (error.includes('Color')) acc.color = error;
      return acc;
    }, {} as Record<string, string>);

    setErrors(errorObj);
    return validationErrors.length === 0;
  };

  const handleAddRole = () => {
    if (!validateNewRole()) return;

    const roleToAdd: Role = {
      id: newRole.name,
      name: newRole.name,
      displayName: newRole.displayName,
      description: newRole.description,
      color: newRole.color
    };

    const updatedCustomRoles = [...customRoles, roleToAdd];
    saveCustomRolesData(updatedCustomRoles);

    // Reset form
    setNewRole({
      id: '',
      name: '',
      displayName: '',
      description: '',
      color: predefinedColors[0],
      basedOnRole: ''
    });
    setShowAddRole(false);
    setErrors({});

    playSound.success();
    showSuccess('Role Created', `New role "${roleToAdd.displayName}" has been added successfully.`);
  };

  const handleDeleteRole = (roleId: string) => {
    const role = customRoles.find(r => r.id === roleId);
    if (!role) return;

    const confirmMessage = `Are you sure you want to delete the "${role.displayName}" role?\n\nThis action cannot be undone and will affect all users assigned to this role.`;
    
    showConfirm('Delete Role', confirmMessage, () => {
      try {
        deleteCustomRole(roleId);
        const updatedCustomRoles = customRoles.filter(r => r.id !== roleId);
        setCustomRoles(updatedCustomRoles);
        setAllRoles([...defaultRoles, ...updatedCustomRoles]);
        onRoleUpdate?.([...defaultRoles, ...updatedCustomRoles]);
        
        playSound.delete();
        showSuccess('Role Deleted', `Role "${role.displayName}" has been removed successfully.`);
      } catch (error) {
        showError('Failed to delete role', 'Error');
      }
    });
  };

  const handleManagePermissions = (roleId: string) => {
    setSelectedRoleForPermissions(roleId);
    setShowPermissionMatrix(true);
  };

  const handlePermissionChange = (actionId: string, roleId: string, allowed: boolean) => {
    // This would update the permissions for the specific role
    // For now, this is handled by the PermissionMatrix component itself
    console.log(`Permission change: ${actionId} for ${roleId} = ${allowed}`);
  };

  const closePermissionMatrix = () => {
    setShowPermissionMatrix(false);
    setSelectedRoleForPermissions(null);
  };

  // Use utility function for generating role ID

  const handleDisplayNameChange = (value: string) => {
    setNewRole(prev => ({
      ...prev,
      displayName: value,
      name: generateRoleId(value)
    }));
    setErrors(prev => ({ ...prev, displayName: '', name: '' }));
  };

  const baseRoleOptions = defaultRoles.map(role => ({
    value: role.id,
    label: `${role.displayName} - ${role.description}`
  }));

  return (
    <div className="role-management">
      <div className="role-management-header">
        <h2>Role Management Matrix</h2>
        <div className="admin-panel-buttons">
          <button
            onClick={() => showAddRole ? setShowAddRole(false) : setShowAddRole(true)}
            className="btn btn-primary btn-md add-role-button"
          >
            {showAddRole ? 'Cancel' : 'Add New Role'}
          </button>
        </div>
      </div>

      {showAddRole && (
        <div className="add-role-form">
          <h3>Add New Role</h3>
          <form onSubmit={(e) => { e.preventDefault(); handleAddRole(); }}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="displayName" className="required">Display Name</label>
                <input
                  type="text"
                  id="displayName"
                  value={newRole.displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="e.g., Super Admin, Regional Manager"
                  maxLength={50}
                  required
                />
                {errors.displayName && <span className="error-message">{errors.displayName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="roleName">Role ID (Auto-generated)</label>
                <input
                  type="text"
                  id="roleName"
                  value={newRole.name}
                  onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Automatically generated from display name"
                  maxLength={20}
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="description" className="required">Description</label>
                <textarea
                  id="description"
                  value={newRole.description}
                  onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the role's responsibilities and scope"
                  rows={3}
                  maxLength={200}
                  required
                />
                {errors.description && <span className="error-message">{errors.description}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="basedOnRole">Base Permissions On (Optional)</label>
                <SearchableDropdown
                  options={[{ value: '', label: 'Start with no permissions' }, ...baseRoleOptions]}
                  value={newRole.basedOnRole || ''}
                  onChange={(value) => setNewRole(prev => ({ ...prev, basedOnRole: value }))}
                  placeholder="Choose a role to copy permissions from"
                />
                <small className="form-helper-text">
                  Select a role to copy its permissions as a starting point
                </small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="color" className="required">Role Color</label>
                <div className="color-picker">
                  {predefinedColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${newRole.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewRole(prev => ({ ...prev, color }))}
                      title={color}
                    />
                  ))}
                </div>
                {errors.color && <span className="error-message">{errors.color}</span>}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowAddRole(false)}
                className="btn btn-outline-secondary btn-lg cancel-button"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary btn-lg submit-button"
                disabled={!newRole.displayName.trim() || !newRole.description.trim()}
              >
                Create Role
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="roles-table">
        <h3>Existing Roles</h3>
        <table>
          <thead>
            <tr>
              <th>Role Name</th>
              <th>Description</th>
              <th>Role ID</th>
              <th>Type</th>
              <th>Color</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Default System Roles */}
            {defaultRoles.map(role => (
              <tr key={role.id} className="default-role">
                <td>
                  <span className="role-display-name">{role.displayName}</span>
                </td>
                <td>{role.description}</td>
                <td>
                  <span className="role-id-badge">{role.id}</span>
                </td>
                <td>
                  <span className="role-type-badge system">System</span>
                </td>
                <td>
                  <div 
                    className="role-color-indicator" 
                    style={{ backgroundColor: role.color }}
                    title={role.color}
                  ></div>
                </td>
                <td>
                  <div className="role-actions">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleManagePermissions(role.id)}
                      title="Manage permissions for this role"
                    >
                      Permissions
                    </button>
                    <span className="role-protection-label">System Role</span>
                  </div>
                </td>
              </tr>
            ))}
            
            {/* Custom Roles */}
            {customRoles.map(role => (
              <tr key={role.id} className="custom-role">
                <td>
                  <span className="role-display-name">{role.displayName}</span>
                </td>
                <td>{role.description}</td>
                <td>
                  <span className="role-id-badge">{role.id}</span>
                </td>
                <td>
                  <span className="role-type-badge custom">Custom</span>
                </td>
                <td>
                  <div 
                    className="role-color-indicator" 
                    style={{ backgroundColor: role.color }}
                    title={role.color}
                  ></div>
                </td>
                <td>
                  <div className="role-actions">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleManagePermissions(role.id)}
                      title="Manage permissions for this role"
                    >
                      Permissions
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteRole(role.id)}
                      title="Delete role"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

      {/* Permission Management Modal */}
      {showPermissionMatrix && selectedRoleForPermissions && (
        <div className="permission-modal-overlay" onClick={closePermissionMatrix}>
          <div className="permission-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="permission-modal-header">
              <h2>
                🛡️ Manage Permissions: {allRoles.find(r => r.id === selectedRoleForPermissions)?.displayName}
              </h2>
              <button 
                className="permission-modal-close"
                onClick={closePermissionMatrix}
                title="Close Permission Manager"
              >
                ✕
              </button>
            </div>
            <div className="permission-modal-body">
              <PermissionMatrix
                roles={allRoles.filter(r => r.id === selectedRoleForPermissions)}
                actions={allActions}
                permissions={allPermissions}
                onPermissionChange={handlePermissionChange}
                readonly={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;