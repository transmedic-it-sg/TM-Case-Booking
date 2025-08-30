/**
 * EnhancedAttachmentManager Component - File upload and management with versioning
 * Handles file attachments with re-upload, delete, and amendment history tracking
 */

import React, { useState } from 'react';
import { useEnhancedAttachments, AttachmentFile, AttachmentChange } from './hooks/useEnhancedAttachments';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDateTime } from '../../utils/dateFormat';

interface EnhancedAttachmentManagerProps {
  caseId: string;
  existingAttachments?: string[];
  onAttachmentsChange: (attachments: AttachmentFile[], changes: AttachmentChange[]) => void;
  maxFiles?: number;
  acceptedFileTypes?: string[];
  readOnly?: boolean;
}

const EnhancedAttachmentManager: React.FC<EnhancedAttachmentManagerProps> = ({
  caseId,
  existingAttachments = [],
  onAttachmentsChange,
  maxFiles = 5,
  acceptedFileTypes = ['image/*', '.pdf', '.doc', '.docx', '.txt'],
  readOnly = false
}) => {
  const { checkPermission } = usePermissions();
  const canUploadFiles = checkPermission('upload-files') && !readOnly;
  const canDeleteFiles = checkPermission('delete-files') && !readOnly;
  
  const [showAttachmentHistory, setShowAttachmentHistory] = useState(false);
  const [replaceFileId, setReplaceFileId] = useState<string | null>(null);

  const {
    attachments,
    allAttachments,
    attachmentChanges,
    addFiles,
    removeFile,
    replaceFile,
    clearAll,
    getFileInfo,
    handleDrop,
    handleDragOver,
    initializeAttachments,
    canAddMore,
    fileCount,
    totalChanges,
    hasChanges
  } = useEnhancedAttachments({
    maxFiles,
    acceptedTypes: acceptedFileTypes,
    caseId,
    onAttachmentsChange
  });

  // Initialize with existing attachments on first render
  React.useEffect(() => {
    if (existingAttachments.length > 0) {
      initializeAttachments(existingAttachments);
    }
  }, [existingAttachments.length, initializeAttachments]); // Only run when length changes

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (replaceFileId) {
        // Replace mode
        const file = e.target.files[0];
        if (file) {
          replaceFile(replaceFileId, file);
          setReplaceFileId(null);
        }
      } else {
        // Add mode
        addFiles(e.target.files);
      }
      // Reset input
      e.target.value = '';
    }
  };

  const handleReplaceFile = (attachmentId: string) => {
    setReplaceFileId(attachmentId);
    // Trigger file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  return (
    <div className="enhanced-attachment-manager">
      <div className="attachment-header">
        <h4 className="attachment-title">
          Attachments ({fileCount}/{maxFiles})
          {hasChanges && (
            <span className="changes-badge" title={`${totalChanges} changes made`}>
              {totalChanges} changes
            </span>
          )}
        </h4>
        <div className="attachment-actions">
          {fileCount > 0 && (
            <button
              type="button"
              className="btn btn-outline-info btn-sm"
              onClick={() => setShowAttachmentHistory(!showAttachmentHistory)}
              title="View attachment change history"
            >
              {showAttachmentHistory ? 'Hide History' : 'View History'}
            </button>
          )}
          {fileCount > 0 && canDeleteFiles && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={clearAll}
              title="Clear all attachments"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* File Upload Area */}
      {canAddMore && canUploadFiles && (
        <div
          className="file-upload-area"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="upload-content">
            <div className="upload-icon">📎</div>
            <div className="upload-text">
              <p>Drag and drop files here or</p>
              <label className="upload-button">
                <input
                  id="file-input"
                  type="file"
                  multiple={!replaceFileId} // Single file for replace mode
                  accept={acceptedFileTypes.join(',')}
                  onChange={handleFileInput}
                  className="file-input"
                />
                <span className="btn btn-outline-primary btn-sm">
                  {replaceFileId ? 'Select Replacement File' : 'Browse Files'}
                </span>
              </label>
              {replaceFileId && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm cancel-replace"
                  onClick={() => setReplaceFileId(null)}
                >
                  Cancel Replace
                </button>
              )}
            </div>
            <div className="upload-hint">
              Supported formats: Images, PDF, DOC, TXT (Max {maxFiles} files)
            </div>
          </div>
        </div>
      )}

      {/* Attachment List */}
      {fileCount > 0 && (
        <div className="attachment-list">
          {attachments.map((attachment) => {
            const fileInfo = getFileInfo(attachment);
            return (
              <div key={attachment.id} className={`attachment-item ${fileInfo.isNew ? 'new-attachment' : ''}`}>
                <div className="attachment-preview">
                  {fileInfo.isImage && fileInfo.preview ? (
                    <img
                      src={fileInfo.preview}
                      alt={fileInfo.name}
                      className="image-preview"
                    />
                  ) : (
                    <div className="file-icon">
                      {getFileIcon(fileInfo.type)}
                    </div>
                  )}
                </div>

                <div className="attachment-info">
                  <div className="file-name" title={fileInfo.name}>
                    {fileInfo.name}
                    {fileInfo.isNew && <span className="new-badge">NEW</span>}
                    {fileInfo.isReplaced && <span className="replaced-badge">REPLACED</span>}
                  </div>
                  <div className="file-details">
                    <span className="file-size">{fileInfo.size}</span>
                    <span className="file-type">{getFileTypeLabel(fileInfo.type)}</span>
                  </div>
                  <div className="file-metadata">
                    <span className="uploaded-by">by {fileInfo.uploadedBy}</span>
                    <span className="uploaded-at">{formatDateTime(fileInfo.uploadedAt)}</span>
                  </div>
                </div>

                <div className="attachment-controls">
                  {canUploadFiles && !fileInfo.isNew && (
                    <button
                      type="button"
                      className="replace-attachment"
                      onClick={() => handleReplaceFile(attachment.id)}
                      aria-label={`Replace ${fileInfo.name}`}
                      title="Replace with new file"
                      disabled={replaceFileId === attachment.id}
                    >
                      {replaceFileId === attachment.id ? '⏳' : '🔄'}
                    </button>
                  )}
                  {canDeleteFiles && (
                    <button
                      type="button"
                      className="remove-attachment"
                      onClick={() => removeFile(attachment.id)}
                      aria-label={`Remove ${fileInfo.name}`}
                      title="Remove attachment"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attachment Change History */}
      {showAttachmentHistory && attachmentChanges.length > 0 && (
        <div className="attachment-history">
          <h5>Attachment History</h5>
          <div className="history-list">
            {attachmentChanges.map((change, index) => (
              <div key={index} className={`history-item history-${change.type}`}>
                <div className="history-action">
                  {change.type === 'add' && '➕ Added'}
                  {change.type === 'delete' && '🗑️ Deleted'}
                  {change.type === 'replace' && '🔄 Replaced'}
                </div>
                <div className="history-details">
                  <span className="history-filename">
                    {change.type === 'replace' 
                      ? `${change.oldFileName} → ${change.fileName}`
                      : change.fileName
                    }
                  </span>
                  <span className="history-user">by {change.user}</span>
                  <span className="history-time">{formatDateTime(change.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permission Messages */}
      {!canUploadFiles && !canDeleteFiles && (
        <div className="permission-message">
          <p>📁 You don't have permission to manage files.</p>
          <p>Contact your administrator for file upload/download access.</p>
        </div>
      )}
      
      {!canUploadFiles && canDeleteFiles && (
        <div className="permission-message">
          <p>📁 You can view and delete files but cannot upload new ones.</p>
        </div>
      )}
      
      {canUploadFiles && !canDeleteFiles && (
        <div className="permission-message">
          <p>📁 You can upload files but cannot delete existing ones.</p>
        </div>
      )}

      {readOnly && (
        <div className="permission-message">
          <p>👀 Attachments are view-only for this case.</p>
        </div>
      )}
    </div>
  );
};

// Helper function to get file icon
const getFileIcon = (fileType: string): string => {
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('doc')) return '📝';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('text')) return '📃';
  return '📎';
};

// Helper function to get file type label
const getFileTypeLabel = (fileType: string): string => {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'text/plain': 'TXT',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/gif': 'GIF'
  };

  return typeMap[fileType] || fileType.split('/')[1]?.toUpperCase() || 'FILE';
};

export default React.memo(EnhancedAttachmentManager);