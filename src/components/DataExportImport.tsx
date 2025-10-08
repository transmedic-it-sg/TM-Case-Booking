/**
 * DataExportImport Component - Comprehensive data export and import functionality
 * Handles export/import for all system data including cases, users, code tables, and permissions
 */

import React, { useState, useEffect } from 'react';
import { getCurrentUserSync } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS, getRuntimePermissions } from '../utils/permissions';
import { useToast } from './ToastContainer';
import { useModal } from '../hooks/useModal';
import CustomModal from './CustomModal';
import { supabase } from '../lib/supabase';
import '../assets/components/AdminComponents.css';
import '../assets/components/DataExportImport.css';

interface ExportConfig {
  cases: boolean;
  users: boolean;
  code_tables: boolean;
  permissions: boolean;
  audit_logs: boolean;
  app_settings: boolean;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

interface DataEntity {
  name: string;
  description: string;
  table: string;
  exportEnabled: boolean;
  importEnabled: boolean;
  requiresAdmin: boolean;
  icon: string;
}

// Define data entities as a constant outside the component to avoid temporal dead zone
const DATA_ENTITIES: DataEntity[] = [
  {
    name: 'Case Bookings',
    description: 'All case booking records with status history and attachments',
    table: 'case_bookings',
    exportEnabled: true,
    importEnabled: true,
    requiresAdmin: false,
    icon: '📋'
  },
  {
    name: 'Users',
    description: 'User accounts with roles and department assignments',
    table: 'profiles',
    exportEnabled: true,
    importEnabled: true,
    requiresAdmin: true,
    icon: '👥'
  },
  {
    name: 'Code Tables',
    description: 'Hospitals, departments, procedures, and other reference data',
    table: 'code_tables',
    exportEnabled: true,
    importEnabled: true,
    requiresAdmin: false,
    icon: '📊'
  },
  {
    name: 'Permission Matrix',
    description: 'Role-based permissions configuration',
    table: 'permissions',
    exportEnabled: true,
    importEnabled: true,
    requiresAdmin: true,
    icon: '🔐'
  },
  {
    name: 'Audit Logs',
    description: 'System activity audit trail',
    table: 'audit_logs',
    exportEnabled: true,
    importEnabled: false,
    requiresAdmin: true,
    icon: '📝'
  },
  {
    name: 'System Settings',
    description: 'Application configuration and email settings',
    table: 'app_settings',
    exportEnabled: true,
    importEnabled: true,
    requiresAdmin: true,
    icon: '⚙️'
  }
];

const DataExportImport: React.FC = () => {
  const currentUser = getCurrentUserSync();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const { modal, closeModal, showConfirm } = useModal();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    cases: true,
    users: true,
    code_tables: true,
    permissions: true,
    audit_logs: false,
    app_settings: true
  });
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [currentDataPreview, setCurrentDataPreview] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // Check permissions
  const canExportData = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EXPORT_DATA) : false;
  const canImportData = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.IMPORT_DATA) : false;
  const isAdmin = currentUser?.role === 'admin';
  
  // Use the DATA_ENTITIES constant defined outside the component
  const dataEntities = DATA_ENTITIES;

  // Define loadDataPreview function before useEffect
  const loadDataPreview = async () => {
    try {
      const preview: any = {};
      
      // Get counts for each entity
      for (const entity of dataEntities) {
        if (entity.exportEnabled) {
          try {
            // For tables that might have RLS issues, try different approaches
            let count = 0;
            
            if (entity.table === 'code_tables') {
              // Use a simple select to get approximate count
              const { data, error } = await supabase
                .from(entity.table)
                .select('id')
                .limit(1000);
              
              if (!error && data) {
                count = data.length;
                // If we get 1000 records, there might be more
                if (data.length === 1000) {
                  count = 1000; // Show 1000+ 
                }
              }
            } else if (entity.table === 'users') {
              // For users table, try count query with user context
              const { count: userCount, error } = await supabase
                .from(entity.table)
                .select('*', { count: 'exact', head: true });
              
              if (!error) {
                count = userCount || 0;
              } else {
                // Fallback: try to get visible users
                const { data } = await supabase
                  .from(entity.table)
                  .select('id')
                  .limit(100);
                count = data?.length || 0;
              }
            } else {
              // Standard count query for other tables
              const { count: tableCount, error } = await supabase
                .from(entity.table)
                .select('*', { count: 'exact', head: true });
              
              if (!error) {
                count = tableCount || 0;
              } else {
                console.warn(`Failed to count ${entity.table}:`, error);
                // For tables we can't count, show estimated count
                const { data } = await supabase
                  .from(entity.table)
                  .select('id')
                  .limit(10);
                count = data?.length || 0;
              }
            }
            
            preview[entity.table] = count;
          } catch (entityError) {
            console.warn(`Error loading preview for ${entity.table}:`, entityError);
            preview[entity.table] = 0;
          }
        }
      }
      
      setCurrentDataPreview(preview);
    } catch (error) {
      console.error('Failed to load data preview:', error);
      // Set default preview with 0 counts
      const preview: any = {};
      dataEntities.forEach(entity => {
        if (entity.exportEnabled) {
          preview[entity.table] = 0;
        }
      });
      setCurrentDataPreview(preview);
    }
  };

  // Load current data preview on mount
  useEffect(() => {
    if (canExportData) {
      loadDataPreview();
    }
  }, [canExportData]);

  const handleExportData = async () => {
    if (!canExportData) {
      showError('Permission Denied', 'You do not have permission to export data');
      return;
    }

    setIsExporting(true);
    try {
      const exportData: any = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          exportedBy: currentUser?.username,
          country: currentUser?.selectedCountry,
          format: 'TM_CASE_BOOKING_EXPORT'
        },
        data: {}
      };

      // Export Case Bookings
      if (exportConfig.cases) {
        const { data: cases, error } = await supabase
          .from('case_bookings')
          .select(`
            *,
            status_history (*),
            attachments (*)
          `)
          .order('created_at', { ascending: false });

        if (!error && cases) {
          exportData.data.case_bookings = cases;
          showInfo('Exported', `${cases.length} case bookings exported`);
        }
      }

      // Export Users
      if (exportConfig.users && isAdmin) {
        const { data: users, error } = await supabase
          .from('profiles')
          .select('*')
          .order('username');

        if (!error && users) {
          // Remove sensitive data
          exportData.data.users = users.map((user: any) => ({
            ...user,
            password: undefined,
            sessionToken: undefined
          }));
          showInfo('Exported', `${users.length} users exported`);
        }
      }

      // Export Code Tables
      if (exportConfig.code_tables) {
        const { data: codeTableItems, error } = await supabase
          .from('code_tables')
          .select('*')
          .order('table_type, display_name');

        if (!error && codeTableItems) {
          exportData.data.code_tables = codeTableItems;
          showInfo('Exported', `${codeTableItems.length} code table items exported`);
        }
      }

      // Export Permissions
      if (exportConfig.permissions && isAdmin) {
        const permissions = await getRuntimePermissions();
        exportData.data.permissions = permissions;
        showInfo('Exported', `${permissions.length} permissions exported`);
      }

      // Export Audit Logs
      if (exportConfig.audit_logs && isAdmin) {
        const { data: logs, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10000); // Limit to last 10,000 entries

        if (!error && logs) {
          exportData.data.audit_logs = logs;
          showInfo('Exported', `${logs.length} audit log entries exported`);
        }
      }

      // Export App Settings
      if (exportConfig.app_settings && isAdmin) {
        const { data: settings, error } = await supabase
          .from('app_settings')
          .select('*');

        if (!error && settings) {
          exportData.data.app_settings = settings;
          showInfo('Exported', `${settings.length} app settings exported`);
        }
      }

      // Create and download the export file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tm_case_booking_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showSuccess('Export Complete', 'Data has been exported successfully');
    } catch (error) {
      showError('Export Failed', `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.json')) {
        showError('Invalid File Type', 'Please select a JSON export file');
        return;
      }

      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleImportData = () => {
    if (!selectedFile || !canImportData) return;

    showConfirm(
      '⚠️ Import Data',
      `Are you sure you want to import data from "${selectedFile.name}"?\n\n` +
      `This operation will:\n` +
      `• Add or update records in your database\n` +
      `• Preserve existing data not included in the import\n` +
      `• May affect system configuration if settings are included\n\n` +
      `Please ensure you have a recent backup before proceeding.`,
      () => performImport()
    );
  };

  const performImport = async () => {
    if (!selectedFile || isImporting) return;

    setIsImporting(true);
    const result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
      warnings: []
    };

    try {
      // Parse the import file
      const fileContent = await selectedFile.text();
      const importData = JSON.parse(fileContent);

      // Validate the import format
      if (!importData.metadata || importData.metadata.format !== 'TM_CASE_BOOKING_EXPORT') {
        throw new Error('Invalid import file format');
      }

      // Check version compatibility
      if (importData.metadata.version !== '1.0.0') {
        result.warnings.push(`Import file version ${importData.metadata.version} may not be fully compatible`);
      }

      // Import data in the correct order to maintain referential integrity
      
      // 1. Import Code Tables first (reference data)
      if (importData.data.code_tables) {
        const codeTableResult = await importCodeTables(importData.data.code_tables);
        result.imported += codeTableResult.imported;
        result.failed += codeTableResult.failed;
        result.errors.push(...codeTableResult.errors);
      }

      // 2. Import Users (if admin)
      if (importData.data.users && isAdmin) {
        const userResult = await importUsers(importData.data.users);
        result.imported += userResult.imported;
        result.failed += userResult.failed;
        result.errors.push(...userResult.errors);
      }

      // 3. Import Permissions (if admin)
      if (importData.data.permissions && isAdmin) {
        const permResult = await importPermissions(importData.data.permissions);
        result.imported += permResult.imported;
        result.failed += permResult.failed;
        result.errors.push(...permResult.errors);
      }

      // 4. Import Case Bookings
      if (importData.data.case_bookings) {
        const caseResult = await importCases(importData.data.case_bookings);
        result.imported += caseResult.imported;
        result.failed += caseResult.failed;
        result.errors.push(...caseResult.errors);
      }

      // 5. Import App Settings (if admin)
      if (importData.data.app_settings && isAdmin) {
        const settingsResult = await importAppSettings(importData.data.app_settings);
        result.imported += settingsResult.imported;
        result.failed += settingsResult.failed;
        result.errors.push(...settingsResult.errors);
      }

      result.success = result.failed === 0;
      setImportResults(result);

      if (result.success) {
        showSuccess('Import Complete', `Successfully imported ${result.imported} records`);
      } else {
        showWarning('Import Completed with Errors', `Imported ${result.imported} records, ${result.failed} failed`);
      }

    } catch (error) {
      result.errors.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setImportResults(result);
      showError('Import Failed', `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const importCodeTables = async (data: any[]): Promise<ImportResult> => {
    const result: ImportResult = { success: false, imported: 0, failed: 0, errors: [], warnings: [] };
    
    for (const item of data) {
      try {
        const { error } = await supabase
          .from('code_tables')
          .upsert(item, { onConflict: 'id' });
        
        if (error) throw error;
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Code table item ${item.item_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    result.success = result.failed === 0;
    return result;
  };

  const importUsers = async (data: any[]): Promise<ImportResult> => {
    const result: ImportResult = { success: false, imported: 0, failed: 0, errors: [], warnings: [] };
    
    for (const user of data) {
      try {
        // Don't import password or session data
        const cleanUser = { ...user, password: undefined, sessionToken: undefined };
        
        const { error } = await supabase
          .from('profiles')
          .upsert(cleanUser, { onConflict: 'username' });
        
        if (error) throw error;
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push(`User ${user.username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    result.success = result.failed === 0;
    return result;
  };

  const importPermissions = async (data: any[]): Promise<ImportResult> => {
    const result: ImportResult = { success: false, imported: 0, failed: 0, errors: [], warnings: [] };
    
    try {
      // Save permissions using the existing service
      const { saveRuntimePermissions } = await import('../utils/permissions');
      await saveRuntimePermissions(data);
      result.imported = data.length;
      result.success = true;
    } catch (error) {
      result.failed = data.length;
      result.errors.push(`Failed to import permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  };

  const importCases = async (data: any[]): Promise<ImportResult> => {
    const result: ImportResult = { success: false, imported: 0, failed: 0, errors: [], warnings: [] };
    
    for (const caseData of data) {
      try {
        // Import the main case record
        const { status_history, attachments, ...mainCase } = caseData;
        
        const { error: caseError } = await supabase
          .from('case_bookings')
          .upsert(mainCase, { onConflict: 'id' });
        
        if (caseError) throw caseError;
        
        // Import status history
        if (status_history && status_history.length > 0) {
          const { error: historyError } = await supabase
            .from('status_history')
            .upsert(status_history, { onConflict: 'id' });
          
          if (historyError) {
            result.warnings.push(`Case ${mainCase.caseReference}: Failed to import status history`);
          }
        }
        
        // Import attachments
        if (attachments && attachments.length > 0) {
          const { error: attachmentError } = await supabase
            .from('attachments')
            .upsert(attachments, { onConflict: 'id' });
          
          if (attachmentError) {
            result.warnings.push(`Case ${mainCase.caseReference}: Failed to import attachments`);
          }
        }
        
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Case ${caseData.caseReference}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    result.success = result.failed === 0;
    return result;
  };

  const importAppSettings = async (data: any[]): Promise<ImportResult> => {
    const result: ImportResult = { success: false, imported: 0, failed: 0, errors: [], warnings: [] };
    
    for (const setting of data) {
      try {
        // Skip certain sensitive settings
        const sensitiveKeys = ['maintenance_mode', 'system_version'];
        if (sensitiveKeys.includes(setting.setting_key)) {
          result.warnings.push(`Skipped sensitive setting: ${setting.setting_key}`);
          continue;
        }
        
        // Ensure user_id is present for proper RLS
        if (!setting.user_id) {
          result.warnings.push(`Skipping setting without user_id: ${setting.setting_key}`);
          continue;
        }
        
        const { error } = await supabase
          .from('app_settings')
          .upsert({
            user_id: setting.user_id,
            setting_key: setting.setting_key,
            setting_value: setting.setting_value,
            description: setting.description,
            created_at: setting.created_at,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error importing app setting:', error);
          throw error;
        }
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Setting ${setting.setting_key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    result.success = result.failed === 0;
    return result;
  };

  if (!canExportData && !canImportData) {
    return (
      <div className="admin-component">
        <div className="permission-denied-message">
          <h3>Access Denied</h3>
          <p>You don't have permission to export or import data.</p>
          <p>Please contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-component data-export-import">
      <>
        <div className="component-header">
          <h2>📦 Data Export & Import</h2>
          <p>Export system data for backup or import data from previous exports</p>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
        {canExportData && (
          <button
            className={`tab-button ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            📤 Export Data
          </button>
        )}
        {canImportData && (
          <button
            className={`tab-button ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            📥 Import Data
          </button>
        )}
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && canExportData && (
        <div className="export-section">
          <div className="section-card">
            <h3>📤 Export Configuration</h3>
            <p>Select the data you want to export. Current record counts are shown for each entity.</p>
            
            <div className="export-options">
              {dataEntities.map((entity) => {
                const key = entity.table.replace('_', '') as keyof ExportConfig;
                const isEnabled = exportConfig[key as keyof ExportConfig];
                const requiresAdminAccess = entity.requiresAdmin && !isAdmin;
                const count = currentDataPreview?.[entity.table] || 0;
                
                if (!entity.exportEnabled) return null;
                
                return (
                  <label
                    key={entity.table}
                    className={`export-option ${requiresAdminAccess ? 'disabled' : ''}`}
                    title={requiresAdminAccess ? 'Admin access required' : ''}
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled && !requiresAdminAccess}
                      disabled={requiresAdminAccess}
                      onChange={(e) => setExportConfig({
                        ...exportConfig,
                        [key]: e.target.checked
                      })}
                    />
                    <div className="option-content">
                      <div className="option-header">
                        <span className="option-icon">{entity.icon}</span>
                        <span className="option-name">{entity.name}</span>
                        <span className="record-count">{count.toLocaleString()} records</span>
                      </div>
                      <p className="option-description">{entity.description}</p>
                      {requiresAdminAccess && (
                        <span className="admin-required">🔒 Admin only</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="export-actions">
              <button
                className="btn btn-primary"
                onClick={handleExportData}
                disabled={isExporting || !Object.values(exportConfig).some(v => v)}
              >
                {isExporting ? '⏳ Exporting...' : '📤 Export Selected Data'}
              </button>
              
              <button
                className="btn btn-secondary"
                onClick={() => setExportConfig({
                  cases: true,
                  users: true,
                  code_tables: true,
                  permissions: true,
                  audit_logs: false,
                  app_settings: true
                })}
              >
                🔄 Reset Selection
              </button>
            </div>
          </div>

          <div className="info-card">
            <h4>ℹ️ Export Information</h4>
            <ul>
              <li>Exports are saved in JSON format for easy viewing and editing</li>
              <li>Sensitive data like passwords are automatically excluded</li>
              <li>Exported files can be imported back into any TM Case Booking instance</li>
              <li>Large exports may take a few moments to complete</li>
              <li>Audit logs are limited to the most recent 10,000 entries</li>
            </ul>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && canImportData && (
        <div className="import-section">
          <div className="section-card">
            <h3>📥 Import Data</h3>
            <p>Import data from a previously exported JSON file</p>

            <div className="file-upload-area">
              <input
                type="file"
                id="import-file"
                accept=".json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              <label htmlFor="import-file" className="file-upload-label">
                {selectedFile ? (
                  <div className="file-selected">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{selectedFile.name}</span>
                    <span className="file-size">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div className="file-placeholder">
                    <span className="upload-icon">📁</span>
                    <span>Click to select import file</span>
                    <span className="file-hint">JSON export files only</span>
                  </div>
                )}
              </label>
            </div>

            {selectedFile && (
              <div className="import-actions">
                <button
                  className="btn btn-warning"
                  onClick={handleImportData}
                  disabled={isImporting}
                >
                  {isImporting ? '⏳ Importing...' : '📥 Start Import'}
                </button>
                
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedFile(null);
                    setImportResults(null);
                  }}
                >
                  ❌ Clear Selection
                </button>
              </div>
            )}

            {importResults && (
              <div className={`import-results ${importResults.success ? 'success' : 'error'}`}>
                <h4>{importResults.success ? '✅ Import Complete' : '⚠️ Import Completed with Errors'}</h4>
                <div className="result-stats">
                  <span className="stat success">✅ {importResults.imported} imported</span>
                  <span className="stat error">❌ {importResults.failed} failed</span>
                </div>
                
                {importResults.warnings.length > 0 && (
                  <div className="warnings-list">
                    <h5>⚠️ Warnings:</h5>
                    <ul>
                      {importResults.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {importResults.errors.length > 0 && (
                  <div className="errors-list">
                    <h5>❌ Errors:</h5>
                    <ul>
                      {importResults.errors.slice(0, 10).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {importResults.errors.length > 10 && (
                        <li>... and {importResults.errors.length - 10} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="warning-card">
            <h4>⚠️ Import Warning</h4>
            <ul>
              <li>Importing data will add or update existing records</li>
              <li>Existing data not included in the import will be preserved</li>
              <li>Always backup your data before importing</li>
              <li>Large imports may take several minutes to complete</li>
              <li>Some settings require admin privileges to import</li>
            </ul>
          </div>
        </div>
      )}

        {/* Modal for confirmations */}
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
              label: modal.confirmLabel || 'Confirm',
              onClick: () => {
                if (modal.onConfirm) modal.onConfirm();
              },
              style: 'danger'
            }
          ] : undefined}
          autoClose={modal.autoClose}
          autoCloseDelay={modal.autoCloseDelay}
        />
      </>
    </div>
  );
};

export default DataExportImport;