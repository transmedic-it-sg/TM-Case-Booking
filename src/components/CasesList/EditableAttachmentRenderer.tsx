/**
 * Enhanced AttachmentRenderer with edit capabilities for active forms
 * Provides replace and delete functionality for attachments in status forms
 */

import React, { useState } from 'react';
import { AttachmentRenderer, parseAttachments, type ParsedAttachment } from './AttachmentRenderer';
import { AttachmentModal } from './AttachmentModal';

interface EditableAttachmentRendererProps {
  attachments: string[];
  title?: string;
  maxThumbnailSize?: { width: number; height: number };
  showCount?: boolean;
  className?: string;
  onAttachmentsChange: (newAttachments: string[]) => void;
  canEdit?: boolean;
  currentUser?: { name: string } | null;
}

export const EditableAttachmentRenderer: React.FC<EditableAttachmentRendererProps> = ({
  attachments,
  title = "Uploaded files",
  maxThumbnailSize = { width: 100, height: 75 },
  showCount = true,
  className = "",
  onAttachmentsChange,
  canEdit = true,
  currentUser
}) => {
  const [selectedAttachment, setSelectedAttachment] = useState<{ data: ParsedAttachment; index: number } | null>(null);

  // Parse attachments for editing
  const parsedAttachments = parseAttachments(attachments);

  const handleAttachmentClick = (attachment: ParsedAttachment, index: number) => {
    if (canEdit) {
      setSelectedAttachment({ data: attachment, index });
    }
  };

  const handleReplace = (file: File) => {
    if (!selectedAttachment) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const fileData = {
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result as string,
            uploadedAt: new Date().toISOString(),
            uploadedBy: currentUser?.name || 'Unknown'
          };

          const newAttachments = [...attachments];
          newAttachments[selectedAttachment.index] = JSON.stringify(fileData);
          
          onAttachmentsChange(newAttachments);
          setSelectedAttachment(null);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleDelete = () => {
    if (!selectedAttachment) return Promise.resolve();

    const newAttachments = attachments.filter((_, index) => index !== selectedAttachment.index);
    onAttachmentsChange(newAttachments);
    setSelectedAttachment(null);
    return Promise.resolve();
  };

  const handleClose = () => {
    setSelectedAttachment(null);
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={`editable-attachment-renderer ${className}`}>
      <div className="attachment-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '12px',
        marginTop: '8px'
      }}>
        {parsedAttachments.map((attachment, index) => (
          <div
            key={index}
            className="attachment-item"
            onClick={() => handleAttachmentClick(attachment, index)}
            style={{
              cursor: canEdit ? 'pointer' : 'default',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              padding: '8px',
              backgroundColor: '#f8f9fa',
              position: 'relative',
              textAlign: 'center'
            }}
            title={canEdit ? 'Click to replace or delete' : attachment.name}
          >
            {attachment.type.startsWith('image/') && attachment.isValid ? (
              <img
                src={attachment.data}
                alt={attachment.name}
                style={{
                  maxWidth: `${maxThumbnailSize.width}px`,
                  maxHeight: `${maxThumbnailSize.height}px`,
                  objectFit: 'cover',
                  borderRadius: '4px'
                }}
              />
            ) : (
              <div
                style={{
                  width: `${maxThumbnailSize.width}px`,
                  height: `${maxThumbnailSize.height}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#e9ecef',
                  borderRadius: '4px',
                  fontSize: '24px'
                }}
              >
                📎
              </div>
            )}
            
            <div style={{ marginTop: '4px', fontSize: '12px', wordBreak: 'break-word' }}>
              {attachment.name}
            </div>
            
            {canEdit && (
              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  opacity: 0.8
                }}
                title="Click to edit"
              >
                ✏️
              </div>
            )}
          </div>
        ))}
      </div>

      {showCount && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#6c757d' }}>
          {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
          {canEdit && ' (click to edit)'}
        </div>
      )}

      {/* Attachment Modal for editing */}
      {selectedAttachment && (
        <AttachmentModal
          fileData={{
            data: selectedAttachment.data.data,
            name: selectedAttachment.data.name,
            type: selectedAttachment.data.type,
            size: selectedAttachment.data.size
          }}
          caseId="temp" // Not used in form editing
          onClose={handleClose}
          onReplace={canEdit ? handleReplace : undefined}
          onDelete={canEdit ? handleDelete : undefined}
          canEdit={canEdit}
        />
      )}
    </div>
  );
};