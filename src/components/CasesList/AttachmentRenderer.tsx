/**
 * ⚠️ CRITICAL: Centralized attachment rendering component to prevent code duplication
 * and improve attachment functionality reliability
 * 
 * ATTACHMENT HANDLING RULES:
 * - All attachments stored as JSON strings in database arrays
 * - Parse once, memoize results to prevent repeated JSON.parse calls
 * - Graceful error handling for malformed attachment data
 * - Consistent UI across all attachment displays
 */

import React, { useMemo } from 'react';
import { 
  CASE_BOOKINGS_FIELDS, 
  STATUS_HISTORY_FIELDS
} from '../../utils/fieldMappings';

export interface ParsedAttachment {
  name: string;
  type: string;
  size: number;
  data: string;
  uploadedAt?: string;
  isValid: boolean;
}

interface AttachmentRendererProps {
  attachments: string[];  // ⚠️ Raw JSON string array from database
  title?: string;
  maxThumbnailSize?: { width: number; height: number };
  showCount?: boolean;
  className?: string;
}

/**
 * Parse attachment JSON strings with comprehensive error handling
 * ⚠️ CRITICAL: Memoized to prevent repeated parsing operations
 */
export const parseAttachments = (attachments: string[]): ParsedAttachment[] => {
  if (!Array.isArray(attachments)) {
    console.warn('AttachmentRenderer: Invalid attachments array received');
    return [];
  }

  return attachments.map((attachment, index) => {
    try {
      const parsed = JSON.parse(attachment);
      
      // Validate required fields
      if (!parsed.name || !parsed.type || !parsed.data) {
        console.warn(`AttachmentRenderer: Missing required fields in attachment ${index}`);
        return {
          name: `Invalid file ${index + 1}`,
          type: 'application/octet-stream',
          size: 0,
          data: '',
          isValid: false
        };
      }

      return {
        name: parsed.name,
        type: parsed.type,
        size: parsed.size || 0,
        data: parsed.data,
        uploadedAt: parsed.uploadedAt,
        isValid: true
      };
    } catch (error) {
      console.error(`AttachmentRenderer: Failed to parse attachment ${index}:`, error);
      return {
        name: `Corrupted file ${index + 1}`,
        type: 'application/octet-stream',
        size: 0,
        data: '',
        isValid: false
      };
    }
  });
};

/**
 * Format file size with proper units
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Create modal for full-size image viewing
 */
const showImageModal = (imageData: string, fileName: string) => {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; 
    top: 0; 
    left: 0; 
    width: 100%; 
    height: 100%; 
    background: rgba(0,0,0,0.8); 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    z-index: 1000;
    cursor: pointer;
  `;
  
  const img = document.createElement('img');
  img.src = imageData;
  img.alt = fileName;
  img.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 8px;';
  
  modal.appendChild(img);
  modal.onclick = () => document.body.removeChild(modal);
  document.body.appendChild(modal);
};

/**
 * Render individual attachment with proper error handling
 */
const AttachmentItem: React.FC<{ 
  attachment: ParsedAttachment; 
  index: number;
  maxThumbnailSize: { width: number; height: number };
}> = ({ attachment, index, maxThumbnailSize }) => {
  if (!attachment.isValid) {
    return (
      <div key={index} className="attachment-preview-item error">
        <div className="file-attachment error">
          <div className="file-icon">❌</div>
          <div className="attachment-info">
            <div className="file-name" title={attachment.name}>
              {attachment.name}
            </div>
            <div className="file-error">Invalid file data</div>
          </div>
        </div>
      </div>
    );
  }

  const isImage = attachment.type.startsWith('image/');
  const fileName = attachment.name.length > 20 
    ? attachment.name.substring(0, 20) + '...' 
    : attachment.name;

  if (isImage) {
    return (
      <div key={index} className="attachment-preview-item">
        <div className="image-attachment">
          <img
            src={attachment.data}
            alt={attachment.name}
            className="attachment-thumbnail clickable-image"
            style={{ 
              maxWidth: `${maxThumbnailSize.width}px`, 
              maxHeight: `${maxThumbnailSize.height}px`, 
              borderRadius: '4px', 
              border: '1px solid #ddd', 
              cursor: 'pointer',
              objectFit: 'cover'
            }}
            onClick={() => showImageModal(attachment.data, attachment.name)}
            onError={(e) => {
              console.error('Failed to load attachment image:', attachment.name);
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="attachment-info">
            <div className="file-name" title={attachment.name}>{fileName}</div>
            <div className="file-size">({formatFileSize(attachment.size)})</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={index} className="attachment-preview-item">
      <div className="file-attachment">
        <div className="file-icon">📄</div>
        <div className="attachment-info">
          <div className="file-name" title={attachment.name}>{fileName}</div>
          <div className="file-size">({formatFileSize(attachment.size)})</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Main AttachmentRenderer component
 * ⚠️ CRITICAL: Memoized parsing and rendering to prevent performance issues
 */
export const AttachmentRenderer: React.FC<AttachmentRendererProps> = ({
  attachments,
  title = 'Attachments',
  maxThumbnailSize = { width: 100, height: 75 },
  showCount = true,
  className = 'attachment-preview-grid'
}) => {
  // ⚠️ CRITICAL: Memoize parsing to prevent repeated JSON.parse operations
  const parsedAttachments = useMemo(() => {
    return parseAttachments(attachments);
  }, [attachments]);

  // Filter out invalid attachments for count
  const validAttachments = useMemo(() => {
    return parsedAttachments.filter(att => att.isValid);
  }, [parsedAttachments]);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="attachment-section">
      <div className="attachment-header">
        <strong>
          {title}
          {showCount && ` (${validAttachments.length})`}
          {validAttachments.length !== parsedAttachments.length && (
            <span className="attachment-error-count">
              {' '}({parsedAttachments.length - validAttachments.length} errors)
            </span>
          )}
        </strong>
      </div>
      <div className={className}>
        {parsedAttachments.map((attachment, index) => (
          <AttachmentItem
            key={index}
            attachment={attachment}
            index={index}
            maxThumbnailSize={maxThumbnailSize}
          />
        ))}
      </div>
    </div>
  );
};

export default AttachmentRenderer;