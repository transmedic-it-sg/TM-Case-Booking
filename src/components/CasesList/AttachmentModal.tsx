import React, { useState, useRef } from 'react';

interface AttachmentModalProps {
  fileData: {
    data: string;
    name: string;
    type?: string;
    size?: number;
  };
  caseId: string;
  onClose: () => void;
  onReplace?: (newFile: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  canEdit?: boolean;
}

export const AttachmentModal: React.FC<AttachmentModalProps> = ({
  fileData,
  caseId,
  onClose,
  onReplace,
  onDelete,
  canEdit = false
}) => {
  const [isReplacing, setIsReplacing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isImage = fileData.type?.startsWith('image/');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileData.data;
    link.download = fileData.name;
    link.click();
  };

  const handleReplace = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onReplace) {
      setIsReplacing(true);
      try {
        await onReplace(file);
        onClose();
      } catch (error) {
      } finally {
        setIsReplacing(false);
      }
    }
  };

  const handleDelete = async () => {
    if (onDelete && window.confirm('Are you sure you want to delete this attachment?')) {
      setIsDeleting(true);
      try {
        await onDelete();
        onClose();
      } catch (error) {
        console.error('Failed to delete attachment:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div 
      className="attachment-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.8)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div style={{
        position: 'relative',
        background: 'white',
        borderRadius: '12px',
        maxWidth: '90%',
        maxHeight: '90%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>{fileData.name}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '4px 8px',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px'
        }}>
          {isImage ? (
            <img 
              src={fileData.data} 
              alt={fileData.name}
              style={{
                maxWidth: '100%',
                maxHeight: '60vh',
                objectFit: 'contain'
              }}
            />
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📄</div>
              <div style={{ color: '#666', fontSize: '14px' }}>
                {fileData.type || 'Document'}<br />
                {fileData.size ? `${(fileData.size / 1024).toFixed(1)} KB` : 'Unknown size'}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end',
          flexWrap: 'wrap'
        }}>
          <input
            ref={fileInputRef}
            type="file"
            accept={isImage ? 'image/*' : '*'}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          
          {canEdit && onReplace && (
            <button
              onClick={handleReplace}
              disabled={isReplacing}
              data-testid="replace-attachment"
              style={{
                background: '#f39c12',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: isReplacing ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isReplacing ? 0.6 : 1
              }}
            >
              {isReplacing ? 'Replacing...' : '🔄 Replace'}
            </button>
          )}
          
          {canEdit && onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              data-testid="delete-attachment"
              style={{
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isDeleting ? 0.6 : 1
              }}
            >
              {isDeleting ? 'Deleting...' : '🗑️ Delete'}
            </button>
          )}
          
          <button
            onClick={handleDownload}
            data-testid="download-attachment"
            style={{
              background: '#3498db',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            📥 Download
          </button>
          
          <button
            onClick={onClose}
            style={{
              background: '#95a5a6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};