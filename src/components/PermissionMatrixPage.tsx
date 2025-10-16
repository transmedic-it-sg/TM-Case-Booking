import React, { useState, useEffect } from 'react';
import PermissionMatrix from './PermissionMatrix';
import { permissionActions } from '../data/permissionMatrixData';
import { useRealtimePermissions } from '../hooks/useRealtimePermissions';
import { useModal } from '../hooks/useModal';
import CustomModal from './CustomModal';
import '../assets/components/PermissionMatrixPage.css';

const PermissionMatrixPage: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { modal, closeModal, showConfirm, showSuccess } = useModal();

  // Real-time permissions hook
  const {
    permissions,
    roles,
    isLoading,
    error,
    refreshPermissions,
    updatePermission,
    savePermissions,
    resetPermissions,
    isMutating,
    validateComponent,
    getTestingReport
  } = useRealtimePermissions({
    enableRealTime: true,
    enableTesting: true
  });

  // Component validation for testing
  useEffect(() => {
    const runValidation = async () => {
      try {
        await validateComponent();
      } catch (error) {
        console.error('Validation error:', error);
      }
    };

    if (!isLoading) {
      runValidation();
    }
  }, [isLoading, validateComponent]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 PERMISSION MATRIX DEBUG:', {
      isLoading,
      error,
      rolesCount: roles?.length || 0,
      permissionsCount: permissions?.length || 0,
      actionsCount: permissionActions?.length || 0,
      roles,
      permissions: permissions?.slice(0, 5) // Show first 5 permissions
    });
  }, [isLoading, error, roles, permissions]);

  // Real-time error handling
  useEffect(() => {
    if (error) {
    }
  }, [error]);

  // Handle permission change - using real-time hook
  const handlePermissionChange = async (actionId: string, roleId: string, allowed: boolean) => {try {
      await updatePermission(actionId, roleId, allowed);} catch (error) {
    }
  };

  // Handle reset - using real-time hook
  const handleReset = async () => {try {
      await resetPermissions();
      setIsEditing(false);} catch (error) {
    }
  };

  // Handle save - using real-time hook
  const handleSave = () => {
    const changedPermissions = permissions.filter(p => p.allowed).length;
    const title = 'Confirm Save Changes';
    const message = `Are you sure you want to save the current permission configuration?\n\nThis will update ${changedPermissions} permission(s) and affect system access immediately.`;

    showConfirm(title, message, async () => {try {
        await savePermissions(permissions);
        setIsEditing(false);
        showSuccess('Permissions saved successfully!');} catch (error) {
        showSuccess('Error saving permissions. Please try again.');
      }
    });
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
          {isEditing ? (
            <div className="edit-actions">
              <button
                className="save-button"
                onClick={handleSave}
                disabled={isMutating}
              >
                {isMutating ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                className="cancel-button"
                onClick={handleReset}
                disabled={isMutating}
              >
                {isMutating ? 'Resetting...' : 'Cancel'}
              </button>
            </div>
          ) : (
            <button
              className="edit-button"
              onClick={() => setIsEditing(true)}
              disabled={isLoading || isMutating}
            >
              Edit Permissions
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message" style={{ margin: '20px 0', padding: '10px', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', color: '#721c24' }}>
          <span>{typeof error === 'string' ? error : error.message}</span>
        </div>
      )}


      {/* Loading State */}
      {isLoading && (
        <div className="loading-state" style={{ textAlign: 'center', padding: '20px' }}>
          <p>Loading permissions...</p>
        </div>
      )}

      <PermissionMatrix
        roles={roles}
        actions={permissionActions}
        permissions={permissions}
        onPermissionChange={isEditing && !isMutating ? handlePermissionChange : undefined}
        readonly={!isEditing || isMutating}
      />

      <div className="permission-notes">
        <div className="role-definitions-header">
          <div className="role-definitions-title">
            <h3>Role Definitions</h3>
          </div>
        </div>
        <div className="role-definitions">
          {roles && Array.isArray(roles) && roles.length > 0 && roles.map(role => {
            // Type assertion for role object
            const roleObj = role as { id: string; color: string; displayName: string; description: string };
            return roleObj && roleObj.id ? (
              <div key={roleObj.id} className="role-definition">
                <div className="role-badge" style={{ backgroundColor: roleObj.color }}>
                  {roleObj.displayName}
                </div>
                <p>{roleObj.description}</p>
              </div>
            ) : null;
          })}
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