/**
 * BackupRestore Component - System backup and restore functionality
 * Handles database backup creation and restoration
 */

import React, { useState } from 'react';
import { getCurrentUser } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { useToast } from './ToastContainer';
import { useModal } from '../hooks/useModal';
import CustomModal from './CustomModal';
import '../assets/components/AdminComponents.css';

interface BackupInfo {
  filename: string;
  timestamp: string;
  size: string;
  tables: number;
  records: number;
}

const BackupRestore: React.FC = () => {
  const currentUser = getCurrentUser();
  const { showSuccess, showError } = useToast();
  const { modal, closeModal, showConfirm } = useModal();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupHistory, setBackupHistory] = useState<BackupInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Check permissions
  const canBackupRestore = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.BACKUP_RESTORE) : false;

  const handleCreateBackup = async () => {
    if (!canBackupRestore || isBackingUp) return;

    setIsBackingUp(true);
    try {
      // Create backup - this would integrate with your database backup service
      const backupData = await createSystemBackup();
      
      // Download backup file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tm-case-booking-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update backup history
      const newBackup: BackupInfo = {
        filename: a.download,
        timestamp: new Date().toISOString(),
        size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
        tables: backupData.tables?.length || 0,
        records: backupData.totalRecords || 0
      };
      setBackupHistory(prev => [newBackup, ...prev]);

      showSuccess('Backup Created', 'System backup has been created and downloaded successfully.');
    } catch (error) {
      console.error('Backup failed:', error);
      showError('Backup Failed', 'Failed to create system backup. Please try again.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRestoreBackup = () => {
    if (!selectedFile || !canBackupRestore) return;

    showConfirm(
      '⚠️ Restore Database',
      `Are you sure you want to restore from "${selectedFile.name}"?\n\nThis will overwrite all current data and cannot be undone.\n\nPlease ensure you have created a recent backup before proceeding.`,
      () => performRestore()
    );
  };

  const performRestore = async () => {
    if (!selectedFile || isRestoring) return;

    setIsRestoring(true);
    try {
      const fileContent = await selectedFile.text();
      const backupData = JSON.parse(fileContent);
      
      // Validate backup data structure
      if (!backupData.version || !backupData.timestamp || !backupData.tables) {
        throw new Error('Invalid backup file format');
      }

      // Perform restore - this would integrate with your database restore service
      await restoreSystemBackup(backupData);

      showSuccess('Restore Complete', 'System has been restored successfully. Please refresh the page.');
      setSelectedFile(null);
      
      // Clear the file input
      const fileInput = document.getElementById('backup-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Restore failed:', error);
      showError('Restore Failed', `Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // Mock backup creation function - replace with actual implementation
  const createSystemBackup = async () => {
    // This would integrate with your actual backup service
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      application: 'TM Case Booking',
      tables: [
        { name: 'cases', records: 150 },
        { name: 'users', records: 25 },
        { name: 'code_tables', records: 300 },
        { name: 'audit_logs', records: 1000 }
      ],
      totalRecords: 1475,
      data: {
        // This would contain the actual data from your database
        cases: [],
        users: [],
        code_tables: [],
        audit_logs: []
      }
    };
  };

  // Mock restore function - replace with actual implementation
  const restoreSystemBackup = async (backupData: any) => {
    // This would integrate with your actual restore service
    console.log('Restoring backup:', backupData);
    // Simulate restore time
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  if (!canBackupRestore) {
    return (
      <div className="permission-denied">
        <div className="permission-denied-content">
          <h2>🚫 Access Denied</h2>
          <p>You don't have permission to access backup and restore functions.</p>
          <p>Contact your system administrator for access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Backup & Restore</h2>
        <p>Manage system backups and data restoration</p>
      </div>

      <div className="admin-section">
        <div className="section-header">
          <h3>Create Backup</h3>
          <p>Create a complete backup of the system including all cases, users, and configurations</p>
        </div>
        
        <div className="backup-actions">
          <button
            onClick={handleCreateBackup}
            disabled={isBackingUp}
            className="btn btn-primary btn-lg"
          >
            {isBackingUp ? (
              <>
                <span className="spinner">⏳</span>
                Creating Backup...
              </>
            ) : (
              'Create Full Backup'
            )}
          </button>
          
          <div className="backup-info">
            <p>• Includes all case data, user accounts, and system settings</p>
            <p>• Downloaded as JSON file for secure storage</p>
            <p>• Recommended to create backups before major updates</p>
          </div>
        </div>
      </div>

      <div className="admin-section">
        <div className="section-header">
          <h3>Restore from Backup</h3>
          <p style={{color: '#dc3545', fontWeight: 'bold'}}>⚠️ Warning: This will overwrite all current data</p>
        </div>
        
        <div className="upload-area">
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <label htmlFor="backup-file" className="file-upload-label">
              <input
                id="backup-file"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="file-input"
              />
              <span className="btn btn-secondary">
                Select Backup File
              </span>
            </label>
            <p>Choose a JSON backup file to restore</p>
            
            {selectedFile && (
              <div className="selected-file">
                <div className="file-info">
                  <span className="file-name">{selectedFile.name}</span>
                  <span className="file-size">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="restore-actions">
          <button
            onClick={handleRestoreBackup}
            disabled={!selectedFile || isRestoring}
            className="btn btn-danger btn-lg"
          >
            {isRestoring ? (
              <>
                <span className="spinner">⏳</span>
                Restoring...
              </>
            ) : (
              'Restore from Backup'
            )}
          </button>
        </div>
      </div>

      {backupHistory.length > 0 && (
        <div className="admin-section">
          <div className="section-header">
            <h3>Recent Backups</h3>
            <p>History of backups created in this session</p>
          </div>
          
          <div className="backup-list">
            {backupHistory.map((backup, index) => (
              <div key={index} className="backup-item">
                <div className="backup-details">
                  <div className="backup-name">{backup.filename}</div>
                  <div className="backup-meta">
                    <span>📅 {new Date(backup.timestamp).toLocaleString()}</span>
                    <span>📏 {backup.size}</span>
                    <span>📊 {backup.tables} tables, {backup.records} records</span>
                  </div>
                </div>
              </div>
            ))}
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
            label: 'Restore',
            onClick: modal.onConfirm || closeModal,
            style: 'danger'
          }
        ] : undefined}
      />
    </div>
  );
};

export default BackupRestore;