import React, { useState, useEffect } from 'react';
import PermissionMatrix from './PermissionMatrix';
import { getAllRoles, getAllMatrixRoles, permissionActions } from '../data/permissionMatrixData';
import { getSupabaseRoles } from '../utils/supabaseUserService';
import { Role, Permission } from './PermissionMatrix';
import { 
  getSupabasePermissions, 
  saveSupabasePermissions, 
  updateSupabasePermission, 
  resetSupabasePermissions 
} from '../utils/supabasePermissionService';
import { useModal } from '../hooks/useModal';
import CustomModal from './CustomModal';
import './PermissionMatrixPage.css';

const PermissionMatrixPage: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const { modal, closeModal, showConfirm, showSuccess } = useModal();

  // Load permissions and roles on component mount
  useEffect(() => {
    // Load roles from database
    const loadRoles = async () => {
      try {
        const databaseRoles = await getSupabaseRoles();
        // Filter out admin role from matrix display
        const matrixRoles = databaseRoles.filter(role => role.id !== 'admin');
        setRoles(matrixRoles);
      } catch (error) {
        console.error('Error loading roles from database:', error);
        // Fallback to static roles
        const allMatrixRoles = getAllMatrixRoles();
        setRoles(allMatrixRoles);
      }
    };
    
    // Load permissions from Supabase
    const loadPermissions = async () => {
      try {
        const supabasePermissions = await getSupabasePermissions();
        setPermissions(supabasePermissions);
      } catch (error) {
        console.error('Error loading permissions:', error);
      }
    };
    
    loadRoles();
    loadPermissions();
  }, []);

  // Listen for role updates in localStorage and custom events
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'case-booking-custom-roles') {
        // Reload roles from database
        reloadRoles();
      }
    };

    const handleRolesUpdated = () => {
      // Reload roles from database
      reloadRoles();
    };

    const reloadRoles = async () => {
      try {
        const databaseRoles = await getSupabaseRoles();
        const matrixRoles = databaseRoles.filter(role => role.id !== 'admin');
        setRoles(matrixRoles);
      } catch (error) {
        console.error('Error reloading roles:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('rolesUpdated', handleRolesUpdated);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('rolesUpdated', handleRolesUpdated);
    };
  }, []);

  const handlePermissionChange = async (actionId: string, roleId: string, allowed: boolean) => {
    try {
      // Update the permission in Supabase
      await updateSupabasePermission(roleId, actionId, allowed);
      
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
    } catch (error) {
      console.error('Error updating permission:', error);
    }
  };

  const handleReset = async () => {
    try {
      await resetSupabasePermissions();
      const defaultPermissions = await getSupabasePermissions();
      setPermissions(defaultPermissions);
      setIsEditing(false);
    } catch (error) {
      console.error('Error resetting permissions:', error);
    }
  };

  const handleSave = () => {
    const changedPermissions = permissions.filter(p => p.allowed).length;
    const title = 'Confirm Save Changes';
    const message = `Are you sure you want to save the current permission configuration?\n\nThis will update ${changedPermissions} permission(s) and affect system access immediately.`;
    
    showConfirm(title, message, async () => {
      try {
        // Permissions are already saved in real-time via updateSupabasePermission
        // But we can still save the current state to ensure consistency
        await saveSupabasePermissions(permissions);
        setIsEditing(false);
        showSuccess('Permissions saved successfully!');
      } catch (error) {
        console.error('Error saving permissions:', error);
        showSuccess('Error saving permissions. Please try again.');
      }
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
        <div className="role-definitions-header">
          <div className="role-definitions-title">
            <h3>Role Definitions</h3>
          </div>
        </div>
        <div className="role-definitions">
          {getAllRoles().map(role => (
            <div key={role.id} className="role-definition">
              <div className="role-badge" style={{ backgroundColor: role.color }}>
                {role.displayName}
              </div>
              <p>{role.description}</p>
            </div>
          ))}
        </div>
        
        <div className="system-notes">
          <div className="role-details-header">
            <h4>Role Details:</h4>
          </div>
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