import React, { useState, useEffect } from 'react';
import PermissionMatrix from './PermissionMatrix';
import { getAllRoles, permissionActions } from '../data/permissionMatrixData';
import { Role, Permission } from './PermissionMatrix';
import { getRuntimePermissions, saveRuntimePermissions, updatePermission, resetPermissions } from '../utils/permissions';
import { useModal } from '../hooks/useModal';
import CustomModal from './CustomModal';
import './PermissionMatrixPage.css';

const PermissionMatrixPage: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const { modal, closeModal, showConfirm, showSuccess } = useModal();

  // Load runtime permissions and roles on component mount
  useEffect(() => {
    // Load roles including custom ones
    const allRoles = getAllRoles();
    setRoles(allRoles);
    
    const runtimePermissions = getRuntimePermissions();
    
    // Debug: Check if admin has code-table-setup permission
    const adminCodeTablePerm = runtimePermissions.find(p => 
      p.roleId === 'admin' && p.actionId === 'code-table-setup'
    );
    console.log('Admin code-table-setup permission:', adminCodeTablePerm);
    
    // Auto-fix if missing
    if (!adminCodeTablePerm || !adminCodeTablePerm.allowed) {
      console.log('Admin code-table-setup permission missing or disabled, fixing...');
      updatePermission('admin', 'code-table-setup', true);
      const fixedPermissions = getRuntimePermissions();
      setPermissions(fixedPermissions);
    } else {
      setPermissions(runtimePermissions);
    }
  }, []);

  const handlePermissionChange = (actionId: string, roleId: string, allowed: boolean) => {
    // Update the permission in the runtime service
    updatePermission(roleId, actionId, allowed);
    
    // Update local state
    setPermissions(prevPermissions => {
      const existingIndex = prevPermissions.findIndex(
        p => p.actionId === actionId && p.roleId === roleId
      );

      if (existingIndex >= 0) {
        // Update existing permission
        const updated = [...prevPermissions];
        updated[existingIndex] = { ...updated[existingIndex], allowed };
        return updated;
      } else {
        // Add new permission
        return [...prevPermissions, { actionId, roleId, allowed }];
      }
    });
  };

  const handleReset = () => {
    resetPermissions();
    const defaultPermissions = getRuntimePermissions();
    setPermissions(defaultPermissions);
    setIsEditing(false);
  };

  const handleSave = () => {
    const changedPermissions = permissions.filter(p => p.allowed).length;
    const title = 'Confirm Save Changes';
    const message = `Are you sure you want to save the current permission configuration?\n\nThis will update ${changedPermissions} permission(s) and affect system access immediately.`;
    
    showConfirm(title, message, () => {
      // Permissions are already saved in real-time via updatePermission
      // But we can still save the current state to ensure consistency
      saveRuntimePermissions(permissions);
      setIsEditing(false);
      showSuccess('Permissions saved successfully!');
    });
  };


  const exportPermissions = () => {
    const dataStr = JSON.stringify(permissions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `permissions_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="permission-matrix-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1>Permission Management</h1>
          </div>
          <div className="header-description-section">
            <p>Configure role-based access control for the Case Booking Application</p>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="export-button"
            onClick={exportPermissions}
          >
            Export Permissions
          </button>
          
          {isEditing ? (
            <div className="edit-actions">
              <button 
                className="save-button"
                onClick={handleSave}
              >
                Save Changes
              </button>
              <button 
                className="cancel-button"
                onClick={handleReset}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              className="edit-button"
              onClick={() => setIsEditing(true)}
            >
              Edit Permissions
            </button>
          )}
        </div>
      </div>


      <PermissionMatrix
        roles={roles}
        actions={permissionActions}
        permissions={permissions}
        onPermissionChange={isEditing ? handlePermissionChange : undefined}
        readonly={!isEditing}
      />

      <div className="permission-notes">
        <h3>Role Definitions</h3>
        <div className="role-definitions">
          {roles.map(role => (
            <div key={role.id} className="role-definition">
              <div className="role-badge" style={{ backgroundColor: role.color }}>
                {role.displayName}
              </div>
              <p>{role.description}</p>
            </div>
          ))}
        </div>
        
        <div className="system-notes">
          <h4>Important Notes:</h4>
          <ul>
            <li><strong>Admin</strong> role has full access to all system functions</li>
            <li><strong>Status transitions</strong> follow a strict workflow order</li>
            <li><strong>File operations</strong> are tied to specific role responsibilities</li>
            <li><strong>User management</strong> is restricted to Admin role only</li>
            <li><strong>System settings</strong> require Admin or IT role access</li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal */}
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
            label: 'Confirm',
            onClick: modal.onConfirm || closeModal,
            style: 'primary'
          }
        ] : undefined}
        autoClose={modal.type === 'success'}
        autoCloseDelay={3000}
      />
    </div>
  );
};

export default PermissionMatrixPage;