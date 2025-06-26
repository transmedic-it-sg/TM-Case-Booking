/**
 * AttachmentManager Component - File upload and management
 * Handles file attachments for case workflows
 */

import React from 'react';
import { AttachmentManagerProps } from './types';
import { useAttachments } from './hooks/useAttachments';

const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  caseId,
  attachments: initialAttachments = [],
  onAttachmentsChange,
  maxFiles = 5,
  acceptedFileTypes = ['image/*', '.pdf', '.doc', '.docx', '.txt']
}) => {
  const {
    attachments,
    previews,
    addFiles,
    removeFile,
    clearAll,
    getFileInfo,
    handleDrop,
    handleDragOver,
    canAddMore,
    fileCount
  } = useAttachments({
    maxFiles,
    acceptedTypes: acceptedFileTypes
  });

  // Sync with parent component
  React.useEffect(() => {
    onAttachmentsChange(attachments);
  }, [attachments, onAttachmentsChange]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  };

  return (
    <div className="attachment-manager">
      <div className="attachment-header">
        <h4 className="attachment-title">
          Attachments ({fileCount}/{maxFiles})
        </h4>
        {fileCount > 0 && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={clearAll}
          >
            Clear All
          </button>
        )}
      </div>

      {/* File Upload Area */}
      {canAddMore && (
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
                  type="file"
                  multiple
                  accept={acceptedFileTypes.join(',')}
                  onChange={handleFileInput}
                  className="file-input"
                />
                <span className="btn btn-outline-primary btn-sm">
                  Browse Files
                </span>
              </label>
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
          {attachments.map((file, index) => {
            const fileInfo = getFileInfo(file);
            return (
              <div key={index} className="attachment-item">
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
                  </div>
                  <div className="file-details">
                    <span className="file-size">{fileInfo.size}</span>
                    <span className="file-type">{getFileTypeLabel(fileInfo.type)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="remove-attachment"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${fileInfo.name}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Progress (if needed for future enhancement) */}
      {/* Could add upload progress indicators here */}
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

export default React.memo(AttachmentManager);