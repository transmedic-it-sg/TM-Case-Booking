/**
 * DataImport Component - System data import functionality
 * Handles CSV/Excel data import for cases, users, and code tables
 */

import React, { useState } from 'react';
import { getCurrentUserSync } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { useToast } from './ToastContainer';
import { useModal } from '../hooks/useModal';
import CustomModal from './CustomModal';
import '../assets/components/AdminComponents.css';

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

interface ImportTemplate {
  name: string;
  description: string;
  filename: string;
  fields: string[];
  example: string[];
}

const DataImport: React.FC = () => {
  const currentUser = getCurrentUserSync();
  const { showSuccess, showError } = useToast();
  const { modal, closeModal, showConfirm } = useModal();
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'cases' | 'users' | 'code_tables'>('cases');
  const [importResults, setImportResults] = useState<ImportResult | null>(null);

  // Check permissions
  const canImportData = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.IMPORT_DATA) : false;

  const importTemplates: Record<string, ImportTemplate> = {
    cases: {
      name: 'Case Bookings',
      description: 'Import case booking data with hospitals, procedures, and scheduling',
      filename: 'case_bookings_template.csv',
      fields: ['Hospital', 'Department', 'Date of Surgery', 'Procedure Type', 'Procedure Name', 'Doctor Name', 'Time of Procedure', 'Special Instructions', 'Country'],
      example: ['Singapore General Hospital', 'Orthopedics', '2025-01-20', 'Knee', 'Knee Replacement', 'Dr. Smith', '09:00', 'Patient has allergies', 'Singapore']
    },
    users: {
      name: 'User Accounts',
      description: 'Import user accounts with roles and permissions',
      filename: 'users_template.csv',
      fields: ['Username', 'Name', 'Email', 'Role', 'Countries', 'Departments', 'Enabled'],
      example: ['john.smith', 'John Smith', 'john@example.com', 'operations', 'Singapore,Malaysia', 'Orthopedics,Cardiology', 'true']
    },
    code_tables: {
      name: 'Code Tables',
      description: 'Import code table items like hospitals, departments, and procedures',
      filename: 'code_tables_template.csv',
      fields: ['Table Type', 'Item Name', 'Country', 'Active'],
      example: ['hospitals', 'Singapore General Hospital', 'SG', 'true']
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['.csv', '.xlsx', '.xls'];
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

      if (!validTypes.includes(fileExtension)) {
        showError('Invalid File Type', 'Please select a CSV or Excel file (.csv, .xlsx, .xls)');
        return;
      }

      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleImportData = () => {
    if (!selectedFile || !canImportData) return;

    showConfirm(
      '📥 Import Data',
      `Are you sure you want to import ${importTemplates[importType].name} from "${selectedFile.name}"?\n\nThis will add new records to the system. Existing records with the same identifiers may be updated.\n\nPlease ensure your data follows the correct format.`,
      () => performImport()
    );
  };

  const performImport = async () => {
    if (!selectedFile || isImporting) return;

    setIsImporting(true);
    try {
      // Parse file content
      const fileContent = await parseImportFile(selectedFile);

      // Validate and import data
      const results = await importDataByType(importType, fileContent);

      setImportResults(results);

      if (results.success) {
        showSuccess('Import Complete', `Successfully imported ${results.imported} records`);
      } else {
        showError('Import Failed', `Import failed. ${results.errors.length} errors occurred.`);
      }

    } catch (error) {
      // // // console.error('Import failed:', error);
      showError('Import Failed', `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const parseImportFile = async (file: File): Promise<any[]> => {
    const text = await file.text();

    if (file.name.endsWith('.csv')) {
      return parseCSV(text);
    } else {
      throw new Error('Excel files not yet supported. Please use CSV format.');
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = { _rowNumber: index + 2 };

      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });

      return row;
    });
  };

  const importDataByType = async (type: string, data: any[]): Promise<ImportResult> => {
    const result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: []
    };

    try {
      switch (type) {
        case 'cases':
          await importCases(data, result);
          break;
        case 'users':
          await importUsers(data, result);
          break;
        case 'code_tables':
          await importCodeTables(data, result);
          break;
        default:
          throw new Error('Unknown import type');
      }

      result.success = result.failed === 0;
      return result;
    } catch (error) {
      result.errors.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  };

  const importCases = async (data: any[], result: ImportResult) => {
    // Mock implementation - replace with actual case import logic
    for (const row of data) {
      try {
        // Validate required fields
        if (!row.Hospital || !row.Department || !row['Date of Surgery']) {
          result.errors.push(`Row ${row._rowNumber}: Missing required fields`);
          result.failed++;
          continue;
        }

        // Simulate import
        await new Promise(resolve => setTimeout(resolve, 10));
        result.imported++;
      } catch (error) {
        result.errors.push(`Row ${row._rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.failed++;
      }
    }
  };

  const importUsers = async (data: any[], result: ImportResult) => {
    // Mock implementation - replace with actual user import logic
    for (const row of data) {
      try {
        // Validate required fields
        if (!row.Username || !row.Name || !row.Role) {
          result.errors.push(`Row ${row._rowNumber}: Missing required fields`);
          result.failed++;
          continue;
        }

        // Simulate import
        await new Promise(resolve => setTimeout(resolve, 10));
        result.imported++;
      } catch (error) {
        result.errors.push(`Row ${row._rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.failed++;
      }
    }
  };

  const importCodeTables = async (data: any[], result: ImportResult) => {
    // Mock implementation - replace with actual code table import logic
    for (const row of data) {
      try {
        // Validate required fields
        if (!row['Table Type'] || !row['Item Name']) {
          result.errors.push(`Row ${row._rowNumber}: Missing required fields`);
          result.failed++;
          continue;
        }

        // Simulate import
        await new Promise(resolve => setTimeout(resolve, 10));
        result.imported++;
      } catch (error) {
        result.errors.push(`Row ${row._rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.failed++;
      }
    }
  };

  const downloadTemplate = (type: string) => {
    const template = importTemplates[type];
    const csvContent = [
      template.fields.join(','),
      template.example.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = template.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!canImportData) {
    return (
      <div className="permission-denied">
        <div className="permission-denied-content">
          <h2>🚫 Access Denied</h2>
          <p>You don't have permission to import data.</p>
          <p>Contact your system administrator for access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Data Import</h2>
        <p>Import data from CSV or Excel files into the system</p>
      </div>

      <div className="admin-section">
        <div className="section-header">
          <h3>Select Import Type</h3>
          <p>Choose the type of data you want to import</p>
        </div>

        <div className="import-type-grid">
          {Object.entries(importTemplates).map(([key, template]) => (
            <div
              key={key}
              className={`import-type-card ${importType === key ? 'selected' : ''}`}
              onClick={() => setImportType(key as any)}
            >
              <h4>{template.name}</h4>
              <p>{template.description}</p>
              <div className="template-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadTemplate(key);
                  }}
                  className="btn btn-outline-secondary btn-sm"
                >
                  Download Template
                </button>
                <p>Click to select this import type</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <div className="section-header">
          <h3>Upload Data File</h3>
          <p>Select a CSV or Excel file containing your {importTemplates[importType].name.toLowerCase()} data</p>
        </div>

        <div className="upload-area">
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <label htmlFor="import-file" className="file-upload-label">
              <input
                id="import-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="file-input"
              />
              <span className="btn btn-primary">
                Choose File
              </span>
            </label>
            <p>Select a CSV or Excel file (.csv, .xlsx, .xls)</p>
          </div>

          {selectedFile && (
            <div className="selected-file">
              <div className="file-info">
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
              </div>
              <button
                onClick={handleImportData}
                disabled={isImporting}
                className="btn btn-success btn-lg"
              >
                {isImporting ? (
                  <>
                    <span className="spinner">⏳</span>
                    Importing...
                  </>
                ) : (
                  'Import Data'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {importResults && (
        <div className="admin-section">
          <div className="section-header">
            <h3>Import Results</h3>
            <p>Summary of the data import operation</p>
          </div>

          <div className={`results-summary ${importResults.success ? 'success' : 'warning'}`}>
            <div className="results-stats">
              <div className="stat-item success">
                <span className="stat-value">{importResults.imported}</span>
                <span className="stat-label">Imported</span>
              </div>
              {importResults.failed > 0 && (
                <div className="stat-item error">
                  <span className="stat-value">{importResults.failed}</span>
                  <span className="stat-label">Failed</span>
                </div>
              )}
            </div>

            {importResults.errors.length > 0 && (
              <div className="error-details">
                <h4>Errors:</h4>
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
            label: 'Import',
            onClick: modal.onConfirm || closeModal,
            style: 'primary'
          }
        ] : undefined}
      />
    </div>
  );
};

export default DataImport;