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
  caseSubmittedBy?: string; // Case creator for permission checks
  existingAttachments?: string[];
  onAttachmentsChange: (attachments: AttachmentFile[], changes: AttachmentChange[]) => void;
  maxFiles?: number;
  acceptedFileTypes?: string[];
  readOnly?: boolean;
}

const EnhancedAttachmentManager: React.FC<EnhancedAttachmentManagerProps> = ({
  caseId,
  caseSubmittedBy,
  existingAttachments = [],
  onAttachmentsChange,
  maxFiles = 5,
  acceptedFileTypes = ['image/*', '.pdf', '.doc', '.docx', '.txt'],
  readOnly = false
}) => {
  const { checkPermission } = usePermissions();

  // Import the new permission functions
  const { canManageAttachments, canViewAttachments } = React.useMemo(() => {
    return require('../../utils/permissions');
  }, []);

  // Get current user info
  const { getCurrentUser } = React.useMemo(() => {
    return require('../../utils/auth');
  }, []);

  const currentUser = getCurrentUser();

  // Enhanced permission checks
  const canManageFiles = currentUser && caseSubmittedBy ?
    canManageAttachments(currentUser.id, currentUser.role, caseSubmittedBy) && !readOnly :
    checkPermission('upload-files') && !readOnly;

  const canViewFiles = currentUser ?
    canViewAttachments(currentUser.id, currentUser.role) :
    checkPermission('download-files');

  const canUploadFiles = canManageFiles;
  const canDeleteFiles = canManageFiles;

  const [showAttachmentHistory, setShowAttachmentHistory] = useState(false);
  const [replaceFileId, setReplaceFileId] = useState<string | null>(null);

  const {
    attachments,
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

  // Initialize with existing attachments when case or attachments change
  React.useEffect(() => {
    if (existingAttachments.length > 0) {
      initializeAttachments(existingAttachments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, existingAttachments.length]); // Exclude initializeAttachments to prevent loops

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

  const handleViewAttachment = (attachment: AttachmentFile) => {
    const fileInfo = getFileInfo(attachment);

    if (!canViewFiles) {
      // // // console.warn('User does not have permission to view attachments');
      return;
    }

    // For images with preview, show in modal/popup
    if (fileInfo.isImage && fileInfo.preview) {
      const modalDiv = document.createElement('div');
      modalDiv.className = 'attachment-modal-overlay';

      // Create modal structure safely without innerHTML
      const modal = document.createElement('div');
      modal.className = 'attachment-modal';

      const header = document.createElement('div');
      header.className = 'attachment-modal-header';

      const title = document.createElement('h4');
      title.textContent = fileInfo.name; // Safe text assignment

      const closeBtn = document.createElement('button');
      closeBtn.className = 'attachment-modal-close';
      closeBtn.textContent = '✕';

      header.appendChild(title);
      header.appendChild(closeBtn);

      const body = document.createElement('div');
      body.className = 'attachment-modal-body';

      const img = document.createElement('img');
      img.src = fileInfo.preview; // Direct property assignment is safer
      img.alt = fileInfo.name;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '80vh';

      body.appendChild(img);

      const footer = document.createElement('div');
      footer.className = 'attachment-modal-footer';

      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'btn btn-outline-primary attachment-modal-download';
      downloadBtn.textContent = 'Download';
      footer.appendChild(downloadBtn);

      if (canUploadFiles) {
        const replaceBtn = document.createElement('button');
        replaceBtn.className = 'btn btn-outline-warning attachment-modal-replace';
        replaceBtn.textContent = 'Replace';
        footer.appendChild(replaceBtn);
      }

      modal.appendChild(header);
      modal.appendChild(body);
      modal.appendChild(footer);
      modalDiv.appendChild(modal);

      document.body.appendChild(modalDiv);

      const closeModal = () => {
        document.body.removeChild(modalDiv);
      };

      const downloadFile = () => {
        if (fileInfo.preview && fileInfo.preview.startsWith('data:')) {
          const link = document.createElement('a');
          link.href = fileInfo.preview;
          link.download = fileInfo.name;
          link.click();
        }
        closeModal();
      };

      const replaceFromModal = () => {
        closeModal();
        handleReplaceFile(attachment.id);
      };

      modalDiv.querySelector('.attachment-modal-close')?.addEventListener('click', closeModal);
      modalDiv.querySelector('.attachment-modal-download')?.addEventListener('click', downloadFile);
      if (canUploadFiles) {
        modalDiv.querySelector('.attachment-modal-replace')?.addEventListener('click', replaceFromModal);
      }
      modalDiv.addEventListener('click', (e) => {
        if (e.target === modalDiv) closeModal();
      });
    } else {
      // For other file types, trigger download
      if (fileInfo.preview && fileInfo.preview.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = fileInfo.preview;
        link.download = fileInfo.name;
        link.click();
      }
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
                <div
                  className={`attachment-preview ${canViewFiles ? 'clickable' : ''}`}
                  onClick={canViewFiles ? () => handleViewAttachment(attachment) : undefined}
                  title={canViewFiles ? `Click to ${fileInfo.isImage ? 'view' : 'download'} ${fileInfo.name}` : undefined}
                >
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
                  {canViewFiles && (
                    <div className="view-overlay">
                      <span className="view-icon">{fileInfo.isImage ? '👁️' : '⬇️'}</span>
                    </div>
                  )}
                </div>

                <div className="attachment-info">
                  <div
                    className={`file-name ${canViewFiles ? 'clickable' : ''}`}
                    title={canViewFiles ? `Click to ${fileInfo.isImage ? 'view' : 'download'} ${fileInfo.name}` : fileInfo.name}
                    onClick={canViewFiles ? () => handleViewAttachment(attachment) : undefined}
                  >
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