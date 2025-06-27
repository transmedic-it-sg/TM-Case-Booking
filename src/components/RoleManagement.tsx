import React, { useState, useEffect } from 'react';
import { Role } from './PermissionMatrix';
import { roles as defaultRoles } from '../data/permissionMatrixData';
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
        <h3>Role Management</h3>
        <p>Manage system roles and their permissions</p>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddRole(true)}
        >
          + Add New Role
        </button>
      </div>

      {/* Default Roles */}
      <div className="roles-section">
        <h4>Default System Roles</h4>
        <div className="roles-grid">
          {defaultRoles.map(role => (
            <div key={role.id} className="role-card default-role">
              <div className="role-header" style={{ backgroundColor: role.color }}>
                <span className="role-name">{role.displayName}</span>
                <span className="role-badge">System</span>
              </div>
              <div className="role-content">
                <p className="role-description">{role.description}</p>
                <div className="role-meta">
                  <span className="role-id">ID: {role.id}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Roles */}
      {customRoles.length > 0 && (
        <div className="roles-section">
          <h4>Custom Roles ({customRoles.length})</h4>
          <div className="roles-grid">
            {customRoles.map(role => (
              <div key={role.id} className="role-card custom-role">
                <div className="role-header" style={{ backgroundColor: role.color }}>
                  <span className="role-name">{role.displayName}</span>
                  <span className="role-badge">Custom</span>
                </div>
                <div className="role-content">
                  <p className="role-description">{role.description}</p>
                  <div className="role-meta">
                    <span className="role-id">ID: {role.id}</span>
                  </div>
                  <div className="role-actions">
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDeleteRole(role.id)}
                      title="Delete role"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {showAddRole && (
        <div className="modal-overlay" onClick={() => setShowAddRole(false)}>
          <div className="add-role-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Role</h3>
              <button
                className="close-button"
                onClick={() => setShowAddRole(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label htmlFor="displayName">Display Name *</label>
                <input
                  type="text"
                  id="displayName"
                  value={newRole.displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="e.g., Super Admin, Regional Manager"
                  maxLength={50}
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

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  value={newRole.description}
                  onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the role's responsibilities and scope"
                  rows={3}
                  maxLength={200}
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
                <small className="help-text">
                  Select a role to copy its permissions as a starting point
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="color">Role Color *</label>
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

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddRole(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddRole}
                disabled={!newRole.displayName.trim() || !newRole.description.trim()}
              >
                Create Role
              </button>
            </div>
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

export default RoleManagement;